import { currentUser } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { MemoryManager } from "@/lib/memory";
import { rateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";
import { Document } from "@langchain/core/documents";

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

type Params = Promise<{ chatId: string }>;

export async function POST(request: Request, { params }: { params: Params }) {
  try {
    console.log("[CHAT_POST] Starting request processing");

    const { prompt } = await request.json();
    const { chatId } = await params;
    console.log("[CHAT_POST] Chat ID:", chatId);

    const user = await currentUser();
    if (!user || !user.id) {
      console.log("[CHAT_POST] Unauthorized access attempt");
      return new NextResponse("Unauthorized", { status: 401 });
    }
    console.log("[CHAT_POST] User ID:", user.id);

    const identifier = request.url + "-" + user.id;
    const { success } = await rateLimit(identifier);
    if (!success) {
      console.log("[CHAT_POST] Rate limit exceeded for user:", user.id);
      return new NextResponse("Rate limit exceeded", { status: 429 });
    }

    console.log("[CHAT_POST] Updating companion in database");
    const companion = await prismadb.companion.update({
      where: { id: chatId },
      data: {
        messages: {
          create: {
            content: prompt,
            role: "user",
            userId: user.id,
          },
        },
      },
    });

    if (!companion) {
      console.log("[CHAT_POST] Companion not found:", chatId);
      return new NextResponse("Companion not found", { status: 404 });
    }

    const name = companion.id;
    const companion_file_name = name + ".txt";
    console.log("[CHAT_POST] Companion file name:", companion_file_name);

    const companionKey = {
      companionName: name,
      userId: user.id,
      modelName: "llama2-13b",
    };

    console.log("[CHAT_POST] Initializing MemoryManager");
    const memoryManager = await MemoryManager.getInstance();

    console.log("[CHAT_POST] Reading chat history");
    const records = await memoryManager.readLatestHistory(companionKey);
    console.log("[CHAT_POST] History records count:", records.length);

    if (records.length === 0) {
      console.log("[CHAT_POST] Seeding chat history");
      await memoryManager.seedChatHistory(companion.seed, "\n\n", companionKey);
    }

    await memoryManager.writeToHistory("User: " + prompt + "\n", companionKey);

    let similarDocs: Document[] = [];
    console.log("[CHAT_POST] Performing vector search");
    try {
      const recentChatHistory = await memoryManager.readLatestHistory(
        companionKey
      );
      console.log(
        "[CHAT_POST] Vector search input length:",
        recentChatHistory.length
      );

      similarDocs = await memoryManager.vectorSearch(
        recentChatHistory,
        companion_file_name
      );
      console.log("[CHAT_POST] Similar documents found:", similarDocs.length);
    } catch (error: unknown) {
      console.error("[CHAT_POST] Vector search error:", {
        error,
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : "No stack trace",
      });
      throw error;
    }

    let relevantHistory = "";
    if (similarDocs.length > 0) {
      relevantHistory = similarDocs
        .map((doc: Document) => doc.pageContent)
        .join("\n");
      console.log(
        "[CHAT_POST] Relevant history length:",
        relevantHistory.length
      );
    }

    const recentChatHistory = await memoryManager.readLatestHistory(
      companionKey
    );
    const prompt_template = `
      ONLY generate plain sentences without prefix of who is speaking. DO NOT use ${companion.name}: prefix.
      
      ${companion.instructions}

      Below are relevant details about ${companion.name}'s past and the conversation you are in.
      ${relevantHistory}
      ${recentChatHistory}\n${companion.name}:
    `;
    console.log(
      "[CHAT_POST] Generated prompt template length:",
      prompt_template.length
    );

    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    console.log("[CHAT_POST] Starting text generation stream");
    const textStream = await hf.textGenerationStream({
      model: "HuggingFaceH4/zephyr-7b-beta",
      inputs: prompt_template,
      parameters: {
        max_new_tokens: 2048,
        temperature: 0.7,
        repetition_penalty: 1.1,
      },
    });

    let aiMessage = await prismadb.message.create({
      data: {
        content: "",
        role: "system",
        userId: user.id,
        companionId: chatId,
      },
    });

    let responseText = "";
    let lastUpdateTime = Date.now();
    const UPDATE_INTERVAL = 1000; // Update DB every 1 second

    (async () => {
      try {
        for await (const chunk of textStream) {
          responseText += chunk.token.text;
          await writer.write(encoder.encode(chunk.token.text));

          // Only update the database periodically to avoid flooding
          const currentTime = Date.now();
          if (currentTime - lastUpdateTime >= UPDATE_INTERVAL) {
            await memoryManager.writeToHistory(responseText, companionKey);

            // Update the existing message instead of creating a new one
            await prismadb.message.update({
              where: { id: aiMessage.id },
              data: { content: responseText },
            });

            lastUpdateTime = currentTime;
          }
        }

        // Final update to ensure we have the complete message
        if (responseText.length > 0) {
          await memoryManager.writeToHistory(responseText, companionKey);
          await prismadb.message.update({
            where: { id: aiMessage.id },
            data: { content: responseText },
          });
        }
      } catch (error) {
        console.error("[CHAT_POST] Streaming error:", error);
        // Delete the AI message if streaming failed
        await prismadb.message.delete({
          where: { id: aiMessage.id },
        });
      } finally {
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
