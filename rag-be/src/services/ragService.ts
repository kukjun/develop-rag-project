import { ChatOpenAI } from "@langchain/openai";
import { initializeVectorStore } from "./vectorStore";
import { logger } from "../utils/logger";

export interface SourceDocument {
  disease_name: string;
  content: string;
  section?: string;
}

export interface StreamResult {
  type: 'sources' | 'chunk' | 'done';
  sources?: SourceDocument[];
  chunk?: string;
}

/**
 * Default RAG Mode - 직접 검색 방식 (Streaming)
 */
export async function* generateAnswerStream(query: string): AsyncGenerator<StreamResult> {
  // 1. VectorStore 초기화
  const vectorStore = await initializeVectorStore();

  // 2. 유사 문서 검색
  logger.info("🔍 Searching for relevant documents...");
  const retrievedDocs = await vectorStore.similaritySearch(query, 3);
  logger.info(`✓ Found ${retrievedDocs.length} documents`);

  // 3. 검색된 문서 정보를 먼저 전송
  const sources: SourceDocument[] = retrievedDocs.map((doc) => ({
    disease_name: doc.metadata.disease_name || "Unknown",
    content: doc.pageContent.substring(0, 200) + "...", // 미리보기
    section: doc.metadata.section,
  }));

  yield { type: 'sources', sources };

  // 4. 검색된 문서를 컨텍스트로 구성
  const context = retrievedDocs
    .map(
      (doc, idx) =>
        `[문서 ${idx + 1}]\n출처: ${doc.metadata.disease_name || "Unknown"}\n내용: ${doc.pageContent}`
    )
    .join("\n\n");

  // 5. LLM 초기화
  const llm = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-4o-mini",
    temperature: 0,
    streaming: true,
  });

  // 6. 프롬프트 구성 및 스트리밍 답변 생성
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

  logger.info("⏳ Generating streaming answer...");

  const stream = await llm.stream(prompt);

  for await (const chunk of stream) {
    const content = chunk.content;
    if (typeof content === 'string' && content) {
      yield { type: 'chunk', chunk: content };
    }
  }

  yield { type: 'done' };

  logger.info("✓ Answer generation completed");
}
