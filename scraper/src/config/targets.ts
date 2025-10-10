export interface CancerTarget {
  id: string;
  name: string;
  url: string;
  category: string;
}

/**
 * 7대암 스크래핑 타겟 목록
 * 국가암정보센터 기준
 */
export const CANCER_TARGETS: CancerTarget[] = [
  {
    id: "stomach",
    name: "위암",
    url: "https://www.cancer.go.kr/lay1/program/S1T211C213/cancer/view.do?cancer_seq=4661",
    category: "암",
  },
  {
    id: "liver",
    name: "간암",
    url: "https://www.cancer.go.kr/lay1/program/S1T211C216/cancer/view.do?cancer_seq=3317",
    category: "암",
  },
  {
    id: "colorectal",
    name: "대장암",
    url: "https://www.cancer.go.kr/lay1/program/S1T211C214/cancer/view.do?cancer_seq=3797",
    category: "암",
  },
  {
    id: "breast",
    name: "유방암",
    url: "https://www.cancer.go.kr/lay1/program/S1T211C217/cancer/view.do?cancer_seq=4757",
    category: "암",
  },
  {
    id: "cervical",
    name: "자궁경부암",
    url: "https://www.cancer.go.kr/lay1/program/S1T211C223/cancer/view.do?cancer_seq=4877",
    category: "암",
  },
  {
    id: "lung",
    name: "폐암",
    url: "https://www.cancer.go.kr/lay1/program/S1T211C215/cancer/view.do?cancer_seq=5237",
    category: "암",
  },
  {
    id: "thyroid",
    name: "갑상선암",
    url: "https://www.cancer.go.kr/lay1/program/S1T211C212/cancer/view.do?cancer_seq=3341",
    category: "암",
  },
];

export interface CancerDetailTarget {
  title: string;
}

export const CANCER_DETAIL_TARGET: CancerDetailTarget[] = [
  {
    title: "암이란",
  },
  {
    title: "예방",
  },
  {
    title: "진단",
  },
  {
    title: "치료",
  },
  {
    title: "생활가이드",
  },
];
