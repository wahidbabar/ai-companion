import { currentUser } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { MemoryManager } from "@/lib/memory";
import { rateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Document } from "@langchain/core/documents";

type Params = Promise<{ chatId: string }>;

const CHAT_MODEL = "gpt-4o-mini";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request, { params }: { params: Params }) {
  try {
    const { prompt, regenerate = false } = await request.json();
    const { chatId } = await params;
    const memoryManager = await MemoryManager.getInstance();

    const user = await currentUser();
    if (!user || !user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const identifier = request.url + "-" + user.id;
    try {
      const { success } = await rateLimit(identifier);
      if (!success) {
        return new NextResponse("Rate limit exceeded", { status: 429 });
      }
    } catch (error) {
      console.error("[CHAT_POST] Rate limit check failed (Redis down?):", error);
      // Don't hard-fail on rate-limit errors — proceed without limiting.
    }

    const companion = await prismadb.companion.findUnique({
      where: { id: chatId },
    });
    if (!companion) {
      return new NextResponse("Companion not found", { status: 404 });
    }

    // On regenerate we reuse the existing last user turn, so we don't record
    // a new user message, embedding, or history entry for it.
    if (!regenerate) {
      await prismadb.message.create({
        data: {
          content: prompt,
          role: "user",
          userId: user.id,
          companionId: chatId,
        },
      });

      await memoryManager.storeInPinecone(prompt, chatId, user.id);
    }

    const companionKey = {
      companionName: companion.id,
      userId: user.id,
      modelName: CHAT_MODEL,
    };

    let records = "";
    try {
      records = await memoryManager.readLatestHistory(companionKey);
    } catch (error) {
      console.error("[CHAT_POST] readLatestHistory failed:", error);
    }
    if (records.length === 0) {
      try {
        await memoryManager.seedChatHistory(
          companion.seed,
          "\n\n",
          companionKey
        );
      } catch (error) {
        console.error("[CHAT_POST] Error seeding chat history:", error);
      }
    }

    if (!regenerate) {
      try {
        await memoryManager.writeToHistory(
          "User: " + prompt + "\n",
          companionKey
        );
      } catch (error) {
        console.error(
          "[CHAT_POST] Error writing user prompt to history:",
          error
        );
      }
    }

    let similarDocs: Document[] = [];
    try {
      similarDocs = await memoryManager.vectorSearch(prompt, companion.id, user.id);
    } catch (error) {
      console.error("[CHAT_POST] Vector search failed:", error);
    }

    const relevantHistory = similarDocs
      .map((doc: Document) => doc.pageContent)
      .join("\n");

    // Snippets of the long-term memories retrieved for this reply, sent to the
    // client (via a header) so the UI can surface what the RAG layer recalled.
    const retrievedMemories = similarDocs.map((doc: Document) => ({
      text: doc.pageContent.slice(0, 300),
    }));
    const memoriesHeader = Buffer.from(
      JSON.stringify(retrievedMemories)
    ).toString("base64");

    let latestHistory = "";
    try {
      latestHistory = await memoryManager.readLatestHistory(companionKey);
    } catch (error) {
      console.error("[CHAT_POST] readLatestHistory (2) failed:", error);
    }

    const fullHistory = `${latestHistory}\n${relevantHistory}`;

    // The system message defines who the companion is and gives it the
    // retrieved context (recent Redis history + relevant Pinecone memories).
    // The user message is the latest thing the user actually typed.
    const systemPrompt = `You are ${companion.name}. Respond naturally as yourself, in the first person.
Do not use any prefixes or labels like "User:" or "${companion.name}:".
Stay in character and answer only what the user asks — do not invent extra dialogue or speak on the user's behalf.

${companion.instructions}

Context from previous conversations (use it to stay consistent; do not repeat it verbatim):
${fullHistory}`;

    // Ask OpenAI for a streamed completion. If the account is out of credits,
    // OpenAI rejects this request up front with an "insufficient_quota" error,
    // which we catch here and surface to the user as HTTP 402 (Payment Required).
    let openaiStream;
    try {
      openaiStream = await openai.chat.completions.create({
        model: CHAT_MODEL,
        stream: true,
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      });
    } catch (error) {
      if (
        error instanceof OpenAI.APIError &&
        error.code === "insufficient_quota"
      ) {
        return NextResponse.json(
          {
            error:
              "The AI is temporarily unavailable because the OpenAI account is out of credits. Please add credits and try again.",
          },
          { status: 402 }
        );
      }

      console.error("[CHAT_POST] OpenAI request failed:", error);
      return NextResponse.json(
        { error: "The AI service failed to respond. Please try again." },
        { status: 500 }
      );
    }

    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    let responseText = "";

    (async () => {
      try {
        for await (const chunk of openaiStream) {
          const token = chunk.choices[0]?.delta?.content ?? "";
          if (token) {
            responseText += token;
            await writer.write(encoder.encode(token));
          }
        }
      } catch (error) {
        console.error("[CHAT_POST] Streaming error:", error);
      } finally {
        try {
          const cleanedResponse = responseText.trim();

          await prismadb.message.create({
            data: {
              content: cleanedResponse,
              role: "system",
              userId: user.id,
              companionId: chatId,
            },
          });

          await memoryManager.storeInPinecone(cleanedResponse, chatId, user.id);

          await memoryManager.writeToHistory(
            `${companion.name}: ${cleanedResponse}\n`,
            companionKey
          );
        } catch (error) {
          console.error(
            "[CHAT_POST] Error saving system response to database or history:",
            error
          );
        } finally {
          await writer.close();
        }
      }
    })();

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Memories": memoriesHeader,
      },
    });
  } catch (error) {
    console.error("[CHAT_POST] Fatal error occurred:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
