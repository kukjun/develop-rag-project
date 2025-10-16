import "dotenv/config";
import * as fs from "fs/promises";
import * as path from "path";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { parseMarkdownToDocuments } from "./utils/md-parser";
import { generateChunks } from "./utils/chunk-generator";
import { Chunk } from "./types/chunk";
import { logger } from "./utils/logger";

/**
 * MD 파일에서 Chunks 생성
 */
async function processMarkdownFile(filePath: string): Promise<Chunk[]> {
  logger.info(`Processing: ${filePath}`);

  // 1. 파일 읽기
  const content = await fs.readFile(filePath, "utf-8");

  // 2. Frontmatter + Documents 파싱 (LangChain MarkdownTextSplitter 사용)
  const { frontmatter, documents } = await parseMarkdownToDocuments(content);

  // 3. Chunks 생성
  const chunks = generateChunks(frontmatter, documents);

  logger.info(`  Generated ${chunks.length} chunks`);
  return chunks;
}

/**
 * 모든 MD 파일 처리
 */
async function processAllMarkdownFiles(): Promise<Chunk[]> {
  const dataDir = path.join(
    __dirname,
    "..",
    "..",
    "data",
    "processed",
    "cancers"
  );
  const files = await fs.readdir(dataDir);
  const mdFiles = files.filter((f) => f.endsWith(".md"));

  logger.info(`Found ${mdFiles.length} markdown files\n`);

  const allChunks: Chunk[] = [];

  for (const file of mdFiles) {
    const filePath = path.join(dataDir, file);
    const chunks = await processMarkdownFile(filePath);
    allChunks.push(...chunks);
  }

  return allChunks;
}

/**
 * Chunks를 PGVector에 삽입
 */
async function insertToVectorDB(chunks: Chunk[]): Promise<void> {
  logger.info(`\nInserting ${chunks.length} chunks to PGVector...`);

  // OpenAI Embeddings 초기화
  logger.info("Initializing OpenAI Embeddings...");
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "text-embedding-3-small",
  });
  logger.info("✓ OpenAI Embeddings initialized");

  // Chunks를 LangChain Document로 변환
  logger.info("Converting chunks to LangChain Documents...");
  const documents = chunks.map(
    (chunk) =>
      new Document({
        pageContent: chunk.content,
        metadata: chunk.metadata,
      })
  );
  logger.info(`✓ Converted ${documents.length} documents`);

  // PGVector 설정
  const config = {
    postgresConnectionOptions: {
      type: "postgres",
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

  // PGVector에 문서 삽입
  logger.info("Creating PGVector store and inserting documents...");
  await PGVectorStore.fromDocuments(documents, embeddings, config);

  logger.info("✅ Successfully inserted all chunks to PGVector");

  // 샘플 chunk 출력
  logger.info("\nSample chunks with metadata:");
  chunks.slice(0, 3).forEach((chunk, i) => {
    logger.info(`\n${"=".repeat(60)}`);
    logger.info(`[${i + 1}] Chunk ID: ${chunk.id}`);
    logger.info(`${"=".repeat(60)}`);

    logger.info("\n📋 Metadata:");
    logger.info(JSON.stringify(chunk.metadata, null, 2));

    logger.info("\n📄 Content Preview:");
    logger.info(chunk.content.substring(0, 200) + "...\n");
  });
}

/**
 * 메인 실행
 */
async function main() {
  try {
    // 1. 모든 MD 파일 처리
    const chunks = await processAllMarkdownFiles();

    logger.info(`\nTotal chunks generated: ${chunks.length}`);

    // 2. Vector DB에 삽입
    await insertToVectorDB(chunks);

    logger.info("\n✅ Insert completed!");
  } catch (error) {
    logger.error("Error:", error);
    process.exit(1);
  }
}

// 실행
main();
