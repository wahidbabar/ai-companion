import { Redis } from "@upstash/redis";
import { Document } from "@langchain/core/documents";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";

export type CompanionKey = {
  companionName: string;
  modelName: string;
  userId: string;
};

export class MemoryManager {
  private static instance: MemoryManager;
  private history: Redis;
  private vectorDBClient: Pinecone;
  private embeddings: OpenAIEmbeddings;
  private readonly CHAT_HISTORY_LIMIT = 30;

  private constructor() {
    this.history = Redis.fromEnv();

    this.vectorDBClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    // OpenAI's text-embedding-3-small produces 1536-dimensional vectors,
    // which must match the dimension of the Pinecone index ("companion").
    this.embeddings = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY,
      model: "text-embedding-3-small",
    });
  }

  public static async getInstance(): Promise<MemoryManager> {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  private generateRedisCompanionKey(companionKey: CompanionKey): string {
    return `chat:${companionKey.companionName}:${companionKey.modelName}:${companionKey.userId}`;
  }

  public async vectorSearch(
    query: string,
    companionId: string,
    userId: string
  ): Promise<Document[]> {
    try {
      const index = this.vectorDBClient.index(process.env.PINECONE_INDEX!);

      const vectorStore = await PineconeStore.fromExistingIndex(
        this.embeddings,
        {
          pineconeIndex: index,
        }
      );

      // Scope the search to this user's memories with this companion, so one
      // user's private conversation can never surface in another user's chat.
      const results = await vectorStore.similaritySearch(query, 3, {
        companionId,
        userId,
      });

      return results;
    } catch (error) {
      console.error("Vector search error:", error);
      return [];
    }
  }

  public async writeToHistory(
    text: string,
    companionKey: CompanionKey
  ): Promise<void> {
    if (!this.validateCompanionKey(companionKey)) {
      throw new Error("Invalid companion key");
    }

    const key = this.generateRedisCompanionKey(companionKey);

    await this.history.zadd(key, {
      score: Date.now(),
      member: text,
    });

    await this.trimHistory(key);
  }

  public async readLatestHistory(companionKey: CompanionKey): Promise<string> {
    if (!this.validateCompanionKey(companionKey)) {
      throw new Error("Invalid companion key");
    }

    const key = this.generateRedisCompanionKey(companionKey);
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    const messages = await this.history.zrange(key, oneDayAgo, Date.now(), {
      byScore: true,
    });

    return messages.slice(-this.CHAT_HISTORY_LIMIT).join("\n");
  }

  public async seedChatHistory(
    seedContent: string,
    delimiter: string = "\n",
    companionKey: CompanionKey
  ): Promise<void> {
    const key = this.generateRedisCompanionKey(companionKey);
    const content = seedContent.split(delimiter);

    const pipeline = this.history.pipeline();
    content.forEach((line, index) => {
      pipeline.zadd(key, {
        score: Date.now() + index,
        member: line.trim(),
      });
    });

    await pipeline.exec();
  }

  public async storeInPinecone(
    text: string,
    companionId: string,
    userId: string
  ): Promise<void> {
    try {
      const index = this.vectorDBClient.index(process.env.PINECONE_INDEX!);

      // Generate embeddings for the text
      const embeddings = await this.embeddings.embedQuery(text);

      // Store embeddings in Pinecone, tagged with both the companion and the
      // user so retrieval can be scoped to the owner of the memory.
      await index.upsert([
        {
          id: `${companionId}-${userId}-${Date.now()}`, // Unique ID for the embedding
          values: embeddings,
          metadata: {
            text: text,
            companionId: companionId,
            userId: userId,
          },
        },
      ]);
    } catch (error) {
      console.error("Error storing embeddings in Pinecone:", error);
    }
  }

  private async trimHistory(key: string): Promise<void> {
    const count = await this.history.zcard(key);
    if (count > this.CHAT_HISTORY_LIMIT) {
      await this.history.zremrangebyrank(
        key,
        0,
        count - this.CHAT_HISTORY_LIMIT - 1
      );
    }
  }

  private validateCompanionKey(companionKey: CompanionKey): boolean {
    return !!(
      companionKey &&
      companionKey.companionName &&
      companionKey.modelName &&
      companionKey.userId
    );
  }
}
