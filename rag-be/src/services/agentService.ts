import { ChatOpenAI } from "@langchain/openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { logger } from "../utils/logger";
import { StreamResult, SourceDocument } from "./ragService";

// 검색된 문서를 저장할 변수 (Agent 내부에서 접근하기 위해)
let retrievedDocuments: SourceDocument[] = [];

/**
 * Retrieve Tool 생성
 */
async function createRetrieveTool() {
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

  logger.info("Connecting to PGVector for tool...");
  const vectorStore = await PGVectorStore.initialize(embeddings, config);
  logger.info("✓ PGVector connected for tool");

  const retrieveSchema = z.object({ query: z.string() });

  // @ts-ignore
  const retrieve = tool(
    async ({ query }) => {
      const retrievedDocs = await vectorStore.similaritySearch(query, 3);

      // 검색된 문서 정보 저장
      retrievedDocuments = retrievedDocs.map((doc) => ({
        disease_name: doc.metadata.disease_name || "Unknown",
        content: doc.pageContent.substring(0, 200) + "...",
        section: doc.metadata.section,
      }));

      const serialized = retrievedDocs
        .map(
          (doc) =>
            `Source: ${doc.metadata.disease_name || "Unknown"}\nContent: ${doc.pageContent}`
        )
        .join("\n\n");
      return [serialized, retrievedDocs];
    },
    {
      name: "retrieve_medical_info",
      description: "의료 정보 데이터베이스에서 질문과 관련된 문서를 검색합니다.",
      schema: retrieveSchema,
      responseFormat: "content_and_artifact",
    }
  );

  return retrieve;
}

/**
 * AI Agent Mode - Tool 사용 방식 (Streaming)
 */
export async function* generateAnswerWithAgentStream(query: string): AsyncGenerator<StreamResult> {
  logger.info("🤖 Creating AI Agent with retrieve tool...");

  // 초기화
  retrievedDocuments = [];

  // 1. Retrieve Tool 생성
  const retrieveTool = await createRetrieveTool();
  logger.info("✓ Tool created");

  // 2. System prompt
  const systemPrompt = `당신은 의료 정보 전문가입니다.

# 답변 지침
- 의학 관련된 질문이 오면, 반드시 retrieve_medical_info 도구로 관련 문서를 먼저 검색하세요.
- 의학과 관련되지 않은 질문은 그냥 답변하세요.
- 검색된 문서의 내용만을 기반으로 답변하세요
- 의학적으로 정확하고 신뢰할 수 있는 정보만 제공하세요
- 검색 결과에 없는 내용은 "제공된 문서에는 해당 정보가 없습니다"라고 답하세요
- 한국어로 친절하고 이해하기 쉽게 답변하세요
- 검색한 문서의 출처를 언급하세요`;

  // 3. LLM 초기화
  const llm = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-4o-mini",
    temperature: 0,
    streaming: true,
  });

  // 4. React Agent 생성
  logger.info("⏳ Creating React Agent...");
  // @ts-ignore
  const agent = createReactAgent({
    llm,
    tools: [retrieveTool],
    messageModifier: systemPrompt,
  });
  logger.info("✓ Agent created");

  // 5. Agent 실행 (스트리밍)
  logger.info("🔄 Agent is processing your query...");

  const stream = await agent.stream(
    { messages: [{ role: "user", content: query }] },
    { streamMode: "values" }
  );

  let sourcesEmitted = false;

  for await (const step of stream) {
    const lastMessage = step.messages[step.messages.length - 1];
    const messageType = lastMessage._getType();

    // Tool이 실행된 후 sources를 전송
    if (messageType === "tool" && !sourcesEmitted && retrievedDocuments.length > 0) {
      yield { type: 'sources', sources: retrievedDocuments };
      sourcesEmitted = true;
    }

    // AI의 최종 응답만 스트리밍 (tool_calls가 없는 경우)
    if (
      messageType === "ai" &&
      (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0)
    ) {
      const content =
        typeof lastMessage.content === "string"
          ? lastMessage.content
          : Array.isArray(lastMessage.content)
          ? lastMessage.content.map((c: any) => c.text || c).join("")
          : JSON.stringify(lastMessage.content);

      if (content && content.length > 0) {
        yield { type: 'chunk', chunk: content };
      }
    }
  }

  yield { type: 'done' };

  logger.info("✓ Agent answer generation completed");
}
