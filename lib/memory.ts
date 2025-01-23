import { Redis } from "@upstash/redis";
import { Document } from "@langchain/core/documents";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";

export type CompanionKey = {
  companionName: string;
  modelName: string;
  userId: string;
};

export class MemoryManager {
  private static instance: MemoryManager;
  private history: Redis;
  private vectorDBClient: Pinecone;
  private embeddings: HuggingFaceInferenceEmbeddings;
  private readonly CHAT_HISTORY_LIMIT = 30;

  private constructor() {
    this.history = Redis.fromEnv();

    this.vectorDBClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    this.embeddings = new HuggingFaceInferenceEmbeddings({
      apiKey: process.env.HUGGINGFACE_API_KEY,
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
    companionId: string
  ): Promise<Document[]> {
    try {
      const index = this.vectorDBClient.index(process.env.PINECONE_INDEX!);

      const vectorStore = await PineconeStore.fromExistingIndex(
        this.embeddings,
        {
          pineconeIndex: index,
        }
      );

      // Perform similarity search with companion ID context
      const results = await vectorStore.similaritySearch(query, 3, {
        companionId: companionId,
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
