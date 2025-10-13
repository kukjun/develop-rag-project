import { OpenAIEmbeddings } from "@langchain/openai";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { logger } from "../utils/logger";

export async function initializeVectorStore() {
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "text-embedding-3-small",
  });

  const config = {
    postgresConnectionOptions: {
      type: "postgres" as const,
      host: process.env.PGVECTOR_HOST || "localhost",
      port: parseInt(process.env.PGVECTOR_PORT || "5433"),
      user: process.env.PGVECTOR_USER || "postgres",
      password: process.env.PGVECTOR_PASSWORD || "password",
      database: process.env.PGVECTOR_DATABASE || "medical_rag",
    },
    tableName: "medical_rag_embeddings",
    columns: {
      idColumnName: "id",
      vectorColumnName: "embedding",
      contentColumnName: "content",
      metadataColumnName: "metadata",
    },
  };

  logger.info("Connecting to PGVector...");
  const vectorStore = await PGVectorStore.initialize(embeddings, config);
  logger.info("✓ PGVector connected");

  return vectorStore;
}
