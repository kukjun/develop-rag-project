import matter from "gray-matter";
import { MarkdownTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { MarkdownFrontmatter } from "../types/chunk";

/**
 * Markdown 파일을 LangChain Documents로 파싱
 */
export async function parseMarkdownToDocuments(fileContent: string): Promise<{
  frontmatter: MarkdownFrontmatter;
  documents: Document[];
}> {
  // 1. Frontmatter 추출
  const { data, content } = matter(fileContent);
  const frontmatter = data as MarkdownFrontmatter;

  // 2. MarkdownTextSplitter로 헤더 기준 분할
  const splitter = MarkdownTextSplitter.fromLanguage("markdown", {
    chunkSize: 2000,
    chunkOverlap: 200,
  });

  // 3. Documents 생성 (헤더 계층 메타데이터 포함)
  const documents = await splitter.createDocuments([content]);

  return { frontmatter, documents };
}
