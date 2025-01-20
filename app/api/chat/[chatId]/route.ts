import { currentUser } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { MemoryManager } from "@/lib/memory";
import { rateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";
import { Document } from "@langchain/core/documents";

type Params = Promise<{ chatId: string }>;

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export async function POST(request: Request, { params }: { params: Params }) {
  try {
    const { prompt } = await request.json();
    const { chatId } = await params;

    const user = await currentUser();
    if (!user || !user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const identifier = request.url + "-" + user.id;
    const { success } = await rateLimit(identifier);
    if (!success) {
      return new NextResponse("Rate limit exceeded", { status: 429 });
    }

    const companion = await prismadb.companion.findUnique({
      where: { id: chatId },
    });

    if (!companion) {
      return new NextResponse("Companion not found", { status: 404 });
    }

    await prismadb.message.create({
      data: {
        content: prompt,
        role: "user",
        userId: user.id,
        companionId: chatId,
      },
    });

    const companionKey = {
      companionName: companion.id,
      userId: user.id,
      modelName: "HuggingFaceH4/zephyr-7b-beta",
    };

    const memoryManager = await MemoryManager.getInstance();
    const records = await memoryManager.readLatestHistory(companionKey);

    if (records.length === 0) {
      await memoryManager.seedChatHistory(companion.seed, "\n\n", companionKey);
    }

    await memoryManager.writeToHistory("User: " + prompt + "\n", companionKey);

    let similarDocs: Document[] = [];
    try {
      similarDocs = await memoryManager.vectorSearch(
        records,
        companion.id + ".txt"
      );
    } catch (error) {
      console.error("[CHAT_POST] Vector search error:", error);
    }

    const relevantHistory = similarDocs
      .map((doc: Document) => doc.pageContent)
      .join("\n");

    const promptTemplate = `
      ONLY generate plain sentences without prefix of who is speaking. DO NOT use ${companion.name}: prefix.
      
      ${companion.instructions}

      Below are relevant details about ${companion.name}'s past and the conversation you are in.
      ${relevantHistory}
      User: ${prompt}
      ${companion.name}:
    `;

    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    const textStream = await hf.textGenerationStream({
      model: "HuggingFaceH4/zephyr-7b-beta",
      inputs: promptTemplate,
      parameters: {
        max_new_tokens: 2048,
        temperature: 0.7,
        repetition_penalty: 1.1,
      },
    });

    let responseText = "";

    (async () => {
      try {
        for await (const chunk of textStream) {
          responseText += chunk.token.text;
          await writer.write(encoder.encode(chunk.token.text));
        }
      } catch (error) {
        console.error("[CHAT_POST] Streaming error:", error);
      } finally {
        // Clean the response text before saving
        const cleanedResponse = responseText.replace(/\s*<\/s>\s*$/, "");

        await prismadb.message.create({
          data: {
            content: cleanedResponse,
            role: "system",
            userId: user.id,
            companionId: chatId,
          },
        });

        await memoryManager.writeToHistory(
          `${companion.name}: ${cleanedResponse}\n`,
          companionKey
        );

        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("[CHAT_POST] Fatal error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
