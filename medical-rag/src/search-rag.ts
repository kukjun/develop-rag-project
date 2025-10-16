import "dotenv/config";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatOpenAI } from "@langchain/openai";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { logger } from "./utils/logger";

/**
 * PGVector 초기화
 */
async function initializeVectorStore() {
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "text-embedding-3-small",
  });

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

  logger.info("Connecting to PGVector...");
  const vectorStore = await PGVectorStore.initialize(embeddings, config);
  logger.info("✓ PGVector connected");

  return vectorStore;
}

/**
 * RAG 기반 답변 생성 (Tool 없이 직접 검색)
 */
async function generateAnswer(query: string): Promise<string> {
  const totalStartTime = Date.now();

  // 1. VectorStore 초기화
  const vectorStore = await initializeVectorStore();

  // 2. 유사 문서 검색
  logger.info("\n🔍 Searching for relevant documents...");
  const searchStartTime = Date.now();
  const retrievedDocs = await vectorStore.similaritySearch(query, 3);
  logger.info(
    `✓ Found ${retrievedDocs.length} documents (${
      Date.now() - searchStartTime
    }ms)`
  );

  // 3. 검색된 문서를 컨텍스트로 구성
  const context = retrievedDocs
    .map(
      (doc, idx) =>
        `[문서 ${idx + 1}]\n출처: ${
          doc.metadata.disease_name || "Unknown"
        }\n내용: ${doc.pageContent}`
    )
    .join("\n\n");

  logger.info("\n📄 Retrieved Context:");
  logger.info(context);

  // 4. LLM 초기화
  logger.info("⏳ Initializing LLM...");
  const llm = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-5-nano",
    temperature: 1,
  });

  // 5. 프롬프트 구성 및 답변 생성
  logger.info("⏳ Generating answer...");
  const prompt = `당신은 의료 정보 전문가입니다.

아래 검색된 문서를 참고하여 사용자의 질문에 답변해주세요.

# 답변 지침
- 검색된 문서의 내용만을 기반으로 답변하세요
- 의학적으로 정확하고 신뢰할 수 있는 정보만 제공하세요
- 검색 결과에 없는 내용은 "제공된 문서에는 해당 정보가 없습니다"라고 답하세요
- 한국어로 친절하고 이해하기 쉽게 답변하세요
- 답변 끝에 참고한 문서의 출처를 명시하세요

# 검색된 문서
${context}

# 사용자 질문
${query}

# 답변`;

  const answerStartTime = Date.now();
  const response = await llm.invoke(prompt);
  logger.info(`✓ Answer generated (${Date.now() - answerStartTime}ms)`);
  logger.info(`⏱️  Total execution time: ${Date.now() - totalStartTime}ms`);

  return response.content as string;
}

/**
 * 메인 실행
 */
async function main() {
  const mainStartTime = Date.now();
  try {
    logger.info("=".repeat(60));
    logger.info("Medical RAG with Direct Search");
    logger.info("=".repeat(60));

    // 테스트 쿼리
    const query = "대장암의 증상은 무엇인가요?";

    logger.info(`\n❓ Query: ${query}\n`);

    // RAG로 답변 생성
    const answer = await generateAnswer(query);

    logger.info("\n📝 Final Answer:");
    logger.info("=".repeat(60));
    logger.info(answer);
    logger.info("=".repeat(60));
    logger.info(`\n⏱️  Total execution time: ${Date.now() - mainStartTime}ms`);
  } catch (error) {
    logger.error("Search failed:", error);
    process.exit(1);
  }
}

// 실행
main();
