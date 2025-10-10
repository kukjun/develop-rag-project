/**
 * 한글 카테고리명 → 영어 디렉토리명 매핑
 */
const CATEGORY_MAP: Record<string, string> = {
  요약설명: "summary",
  암이란: "overview",
  예방: "prevention",
  진단: "diagnosis",
  치료: "treatment",
  생활가이드: "lifestyle",
};

/**
 * 한글 페이지명 → 영어 파일명 매핑
 */
const PAGE_MAP: Record<string, string> = {
  // 암이란
  발생부위: "location",
  "정의 및 종류": "definition",
  관련통계: "statistics",

  // 예방
  위험요인: "risk-factors",
  예방법: "prevention-methods",
  조기검진: "early-screening",

  // 진단
  일반적증상: "symptoms",
  진단방법: "diagnosis-methods",
  감별진단: "differential-diagnosis",
  진행단계: "stages",

  // 치료
  치료방법: "treatment-methods",
  "치료의 부작용": "side-effects",
  "재발 및 전이": "recurrence",
  치료현황: "treatment-status",

  // 생활가이드
  "일상생활 가이드": "daily-life",
  식생활: "diet",
  "운동 및 재활": "exercise",
  "간세포암종 진료가이드라인": "hcc-treatment-guidelines",
  일상생활: "daily-living",
  장루관리: "stoma-care",
  성생활: "sexual-life",
  "임신과 출산": "pregnancy-childbirth",
  특수기구: "special-equipment",
};

/**
 * 한글 카테고리명을 영어로 변환
 */
export function translateCategory(koreanName: string): string {
  return CATEGORY_MAP[koreanName] || slugify(koreanName);
}

/**
 * 한글 페이지명을 영어로 변환
 */
export function translatePage(koreanName: string): string {
  return PAGE_MAP[koreanName] || slugify(koreanName);
}

/**
 * 한글을 영어 slug로 변환 (매핑에 없는 경우 사용)
 */
function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-가-힣]/g, "")
    .replace(/-+/g, "-");
}
