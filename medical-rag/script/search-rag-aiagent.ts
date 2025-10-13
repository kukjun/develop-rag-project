import "dotenv/config";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatOpenAI } from "@langchain/openai";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { logger } from "./utils/logger";
import { z } from "zod";
import { tool } from "@langchain/core/tools";

/**
 * PGVector 초기화 및 Retrieve Tool 생성
 */
async function createRetrieveTool() {
  // OpenAI Embeddings 초기화
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "text-embedding-3-small",
  });

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

  // PGVector 연결
  logger.info("Connecting to PGVector...");
  const vectorStore = await PGVectorStore.initialize(embeddings, config);
  logger.info("✓ PGVector connected");

  // Retrieve Tool 생성
  const retrieveSchema = z.object({ query: z.string() });

  // @ts-ignore - LangGraph 타입 추론 깊이 문제
  const retrieve = tool(
    async ({ query }) => {
      const retrievedDocs = await vectorStore.similaritySearch(query, 3);
      const serialized = retrievedDocs
        .map(
          (doc) =>
            `Source: ${doc.metadata.disease_name || "Unknown"}\nContent: ${
              doc.pageContent
            }`
        )
        .join("\n\n");
      return [serialized, retrievedDocs];
    },
    {
      name: "retrieve_medical_info",
      description:
        "의료 정보 데이터베이스에서 질문과 관련된 문서를 검색합니다.",
      schema: retrieveSchema,
      responseFormat: "content_and_artifact",
    }
  );

  return retrieve;
}

/**
 * AI Agent를 이용한 RAG 기반 답변 생성
 */
async function generateAnswerWithAgent(query: string): Promise<string> {
  const totalStartTime = Date.now();
  logger.info("\n🤖 Creating AI Agent with retrieve tool...");

  // 1. Retrieve Tool 생성
  const toolStartTime = Date.now();
  const retrieveTool = await createRetrieveTool();
  logger.info(`✓ Tool created (${Date.now() - toolStartTime}ms)`);

  // 2. System prompt 구성
  const systemPrompt = `당신은 의료 정보 전문가입니다.

# 답변 지침
- 의학 관련된 질문이 오면, 반드시 retrieve_medical_info 도구로 관련 문서를 먼저 검색하세요.
- 의학과 관련되지 않은 질문은 그냥 답변하세요.
- 검색된 문서의 내용만을 기반으로 답변하세요
- 의학적으로 정확하고 신뢰할 수 있는 정보만 제공하세요
- 검색 결과에 없는 내용은 "제공된 문서에는 해당 정보가 없습니다"라고 답하세요
- 한국어로 친절하고 이해하기 쉽게 답변하세요
- 검색한 문서의 출처를 언급하세요`;

  // 3. LLM 초기화 (Chat 모델 사용)
  logger.info("⏳ Initializing LLM...");
  const llmStartTime = Date.now();
  const llm = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-5-nano",
    temperature: 1,
  });
  logger.info(`✓ LLM initialized (${Date.now() - llmStartTime}ms)`);

  // 4. React Agent 생성 (시스템 프롬프트를 Agent 설정에 포함)
  logger.info("⏳ Creating React Agent...");
  const agentStartTime = Date.now();
  // @ts-ignore - LangGraph 타입 추론 깊이 문제
  const agent = createReactAgent({
    llm,
    tools: [retrieveTool],
    messageModifier: systemPrompt, // 시스템 프롬프트를 Agent에 미리 설정
  });
  logger.info(`✓ Agent created (${Date.now() - agentStartTime}ms)`);
  logger.info(`⏱️  Total setup time: ${Date.now() - totalStartTime}ms`);

  // 5. Agent 실행 (사용자 입력만 전달) - 스트리밍으로 각 단계 확인
  logger.info("\n🔄 Agent is processing your query...\n");

  const stream = await agent.stream(
    { messages: [{ role: "user", content: query }] },
    { streamMode: "values" }
  );

  let finalAnswer = "";

  // 각 단계의 메시지를 실시간으로 확인
  for await (const step of stream) {
    const lastMessage = step.messages[step.messages.length - 1];
    const messageType = lastMessage._getType();

    logger.info(`\n${"=".repeat(60)}`);
    logger.info(`📨 Step ${step.messages.length}: ${messageType}`);

    // 전체 메시지 구조 출력 (디버깅)
    logger.info(`🔍 Full message structure:`);
    logger.info(
      JSON.stringify(
        {
          type: messageType,
          content: lastMessage.content,
          tool_calls: lastMessage.tool_calls,
          name: lastMessage.name,
          additional_kwargs: lastMessage.additional_kwargs,
        },
        null,
        2
      )
    );

    // Tool 호출 여부 확인
    if (
      messageType === "ai" &&
      lastMessage.tool_calls &&
      lastMessage.tool_calls.length > 0
    ) {
      logger.info(`\n🔧 Tool Called: ${lastMessage.tool_calls[0].name}`);
      logger.info(
        `   Arguments: ${JSON.stringify(lastMessage.tool_calls[0].args)}`
      );
    }

    // Tool의 응답 확인
    if (messageType === "tool") {
      const content =
        typeof lastMessage.content === "string"
          ? lastMessage.content
          : JSON.stringify(lastMessage.content);
      logger.info(`\n📦 [Tool Response]: ${content.substring(0, 300)}...`);
    }

    // AI의 최종 응답 확인 (tool_calls가 없거나 빈 배열인 경우)
    if (
      messageType === "ai" &&
      (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0)
    ) {
      const content =
        typeof lastMessage.content === "string"
          ? lastMessage.content
          : Array.isArray(lastMessage.content)
          ? lastMessage.content.map((c) => c.text || c).join("")
          : JSON.stringify(lastMessage.content);

      logger.info(`\n🤖 [AI Final Answer]:`);
      logger.info(content);

      if (content && content.length > 0) {
        finalAnswer = content;
      }
    }
  }

  logger.info("\n" + "=".repeat(60));

  return finalAnswer;
}

/**
 * 메인 실행
 */
async function main() {
  const mainStartTime = Date.now();
  try {
    logger.info("=".repeat(60));
    logger.info("Medical RAG with AI Agent & PGVector");
    logger.info("=".repeat(60));

    // 테스트 쿼리
    const query = "김치찌개 잘 끓이는 법";

    logger.info(`\n❓ Query: ${query}\n`);

    // AI Agent로 답변 생성 (자동으로 retrieve tool 호출)
    const agentStartTime = Date.now();
    const answer = await generateAnswerWithAgent(query);
    logger.info(`\n⏱️  Agent execution time: ${Date.now() - agentStartTime}ms`);

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
