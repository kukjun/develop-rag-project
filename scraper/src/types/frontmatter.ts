/**
 * Markdown frontmatter 구조
 */
export interface Frontmatter {
  disease_id: string;              // 영문 ID (예: "stomach_cancer")
  disease_name: string;            // 한글명 (예: "위암")
  disease_name_en: string;         // 영문명 (예: "Stomach Cancer")
  category: 'cancer' | 'chronic_disease';
  source: string;                  // 출처 (예: "국가암정보센터")
  source_url: string;              // 원본 URL
  collected_date: string;          // 수집일 (YYYY-MM-DD)
  verified: boolean;               // 검증 완료 여부
  verified_by: string | null;      // 검증자
  verified_date: string | null;    // 검증 날짜 (YYYY-MM-DD)
  tags?: string[];                 // 태그 (선택)
}

/**
 * 암 종류별 영문명 매핑
 */
export const CANCER_NAME_EN: Record<string, string> = {
  stomach: 'Stomach Cancer',
  liver: 'Liver Cancer',
  colorectal: 'Colorectal Cancer',
  breast: 'Breast Cancer',
  cervical: 'Cervical Cancer',
  lung: 'Lung Cancer',
  thyroid: 'Thyroid Cancer',
};

/**
 * Frontmatter를 YAML 문자열로 변환
 */
export function frontmatterToYAML(fm: Frontmatter): string {
  const lines = [
    '---',
    `disease_id: ${fm.disease_id}`,
    `disease_name: ${fm.disease_name}`,
    `disease_name_en: ${fm.disease_name_en}`,
    `category: ${fm.category}`,
    `source: ${fm.source}`,
    `source_url: ${fm.source_url}`,
    `collected_date: ${fm.collected_date}`,
    `verified: ${fm.verified}`,
    `verified_by: ${fm.verified_by || 'null'}`,
    `verified_date: ${fm.verified_date || 'null'}`,
  ];

  if (fm.tags && fm.tags.length > 0) {
    lines.push('tags:');
    fm.tags.forEach((tag) => lines.push(`  - ${tag}`));
  }

  lines.push('---');
  return lines.join('\n');
}
