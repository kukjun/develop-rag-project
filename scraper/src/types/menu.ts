/**
 * 상세 페이지 정보
 */
export interface DetailPage {
  title: string;        // 한글 제목 (예: "발생부위")
  titleEn: string;      // 영어 파일명 (예: "location")
  url: string;          // 상대 URL (스크래핑용)
}

/**
 * 카테고리 정보
 */
export interface MenuCategory {
  name: string;         // 한글 카테고리명 (예: "암이란")
  nameEn: string;       // 영어 디렉토리명 (예: "overview")
  pages: DetailPage[];  // 카테고리 내 페이지 목록
}

/**
 * 암 종류별 전체 메뉴 구조
 */
export interface CancerMenuStructure {
  cancerId: string;           // 암 ID (예: "breast")
  cancerName: string;         // 암 한글명 (예: "유방암")
  cancerSeq: string;          // cancer_seq 파라미터 (예: "4757")
  source: string;             // 출처 (예: "국가암정보센터")
  categories: MenuCategory[]; // 카테고리 목록
}
