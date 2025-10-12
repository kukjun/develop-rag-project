import { Document } from '@langchain/core/documents';
import { Chunk, ChunkMetadata, MarkdownFrontmatter } from '../types/chunk';

/**
 * LangChain Documents를 Chunk 배열로 변환
 */
export function generateChunks(
  frontmatter: MarkdownFrontmatter,
  documents: Document[]
): Chunk[] {
  const chunks: Chunk[] = [];

  documents.forEach((doc, index) => {
    const metadata: ChunkMetadata = {
      // Frontmatter 정보
      disease_id: frontmatter.disease_id,
      disease_name: frontmatter.disease_name,
      disease_name_en: frontmatter.disease_name_en,
      category: frontmatter.category,
      source: frontmatter.source,
      source_url: frontmatter.source_url,
      collected_date: frontmatter.collected_date,

      // 계층 정보
      level: 0,
      title: extractTitle(doc.pageContent),
      breadcrumb: [],

      // 태그
      tags: frontmatter.tags || [],

      // LangChain의 원본 메타데이터 병합 (loc 등)
      ...doc.metadata,
    };

    // Chunk ID 생성
    const id = `${frontmatter.disease_id}_chunk_${index.toString().padStart(3, '0')}`;

    chunks.push({
      id,
      content: doc.pageContent,
      metadata: metadata as any, // ChunkMetadata에 LangChain metadata 타입 추가됨
    });
  });

  return chunks;
}

/**
 * 컨텐츠에서 첫 번째 헤더 추출
 */
function extractTitle(content: string): string {
  const match = content.match(/^#+ (.+)$/m);
  return match ? match[1].trim() : 'Untitled';
}
