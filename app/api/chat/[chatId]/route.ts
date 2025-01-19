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
    const companion = await prismadb.companion.findUnique({
      where: { id: chatId },
    });

    if (!companion) {
      console.log("[CHAT_POST] Companion not found:", chatId);
      return new NextResponse("Companion not found", { status: 404 });
    }

    // Save the user's message to the database immediately
    console.log("[CHAT_POST] Saving user message to database");
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

    console.log("[CHAT_POST] Initializing MemoryManager");
    const memoryManager = await MemoryManager.getInstance();

    console.log("[CHAT_POST] Reading chat history");
    const records = await memoryManager.readLatestHistory(companionKey);

    // If there's no history, seed it
    if (records.length === 0) {
      console.log("[CHAT_POST] Seeding chat history");
      await memoryManager.seedChatHistory(companion.seed, "\n\n", companionKey);
    }

    // Write user's message to memory
    console.log("[CHAT_POST] Writing user message to history");
    await memoryManager.writeToHistory("User: " + prompt + "\n", companionKey);

    // Perform vector search
    let similarDocs: Document[] = [];
    try {
      console.log("[CHAT_POST] Performing vector search");
      similarDocs = await memoryManager.vectorSearch(
        records,
        companion.id + ".txt"
      );
      console.log("[CHAT_POST] Similar documents found:", similarDocs.length);
    } catch (error) {
      console.error("[CHAT_POST] Vector search error:", error);
    }

    let relevantHistory = similarDocs
      .map((doc: Document) => doc.pageContent)
      .join("\n");
    console.log("[CHAT_POST] Relevant history length:", relevantHistory.length);

    // Prepare the prompt template
    const promptTemplate = `
      ONLY generate plain sentences without prefix of who is speaking. DO NOT use ${companion.name}: prefix.
      
      ${companion.instructions}

      Below are relevant details about ${companion.name}'s past and the conversation you are in.
      ${relevantHistory}
      User: ${prompt}
      ${companion.name}:
    `;
    console.log(
      "[CHAT_POST] Generated prompt template length:",
      promptTemplate.length
    );

    // Set up streaming response
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    console.log("[CHAT_POST] Starting text generation stream");
    const textStream = await hf.textGenerationStream({
      model: "HuggingFaceH4/zephyr-7b-beta",
      inputs: promptTemplate,
      parameters: {
        max_new_tokens: 2048,
        temperature: 0.7,
        repetition_penalty: 1.1,
      },
    });

    // Create a placeholder for the AI message
    let aiMessage = await prismadb.message.create({
      data: {
        content: "",
        role: "system",
        userId: user.id,
        companionId: chatId,
      },
    });

    let responseText = "";
    const UPDATE_INTERVAL = 1000; // Update DB every 1 second
    let lastUpdateTime = Date.now();

    (async () => {
      try {
        for await (const chunk of textStream) {
          responseText += chunk.token.text;
          await writer.write(encoder.encode(chunk.token.text));

          const currentTime = Date.now();
          if (currentTime - lastUpdateTime >= UPDATE_INTERVAL) {
            await prismadb.message.update({
              where: { id: aiMessage.id },
              data: { content: responseText },
            });
            lastUpdateTime = currentTime;
          }
        }

        // Finalize the AI message in the database
        await prismadb.message.update({
          where: { id: aiMessage.id },
          data: { content: responseText },
        });

        // Save the AI response to memory
        await memoryManager.writeToHistory(
          `${companion.name}: ${responseText}\n`,
          companionKey
        );
      } catch (error) {
        console.error("[CHAT_POST] Streaming error:", error);
        await prismadb.message.delete({ where: { id: aiMessage.id } });
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
