/**
 * Chunk 메타데이터
 */
export interface ChunkMetadata {
  // Frontmatter 정보
  disease_id: string;
  disease_name: string;
  disease_name_en: string;
  category: 'cancer' | 'chronic_disease';
  source: string;
  source_url: string;
  collected_date: string;

  // 계층 정보
  level: number;                // 1, 2, 3
  title: string;                // 현재 섹션 제목
  parent_title?: string;        // 부모 섹션 제목
  breadcrumb: string[];         // ["암이란", "발생부위"]

  // 태그
  tags: string[];
}

/**
 * RAG Chunk
 */
export interface Chunk {
  id: string;                   // 고유 ID (예: "breast_overview_location_001")
  content: string;              // 실제 텍스트 내용
  metadata: ChunkMetadata;
}

/**
 * Markdown Frontmatter
 */
export interface MarkdownFrontmatter {
  disease_id: string;
  disease_name: string;
  disease_name_en: string;
  category: 'cancer' | 'chronic_disease';
  source: string;
  source_url: string;
  collected_date: string;
  verified: boolean;
  verified_by: string | null;
  verified_date: string | null;
  tags?: string[];
}

/**
 * Markdown 섹션
 */
export interface MarkdownSection {
  level: number;                // 헤더 레벨 (1, 2, 3)
  title: string;                // 섹션 제목
  content: string;              // 섹션 내용
  children: MarkdownSection[];  // 하위 섹션
}
