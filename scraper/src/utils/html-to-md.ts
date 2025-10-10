import TurndownService from "turndown";
import * as cheerio from "cheerio";
import { logger } from "./logger";

/**
 * Turndown 서비스 초기화
 */
function createTurndownService(): TurndownService {
  const turndown = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
  });

  // 불필요한 요소 제거 규칙
  turndown.remove(["script", "style", "nav", "footer", "header"]);

  return turndown;
}

/**
 * HTML에서 메인 컨텐츠 영역 추출
 * 국가암정보센터의 경우 #div_page 영역 (단, #cancerMenu 제외)
 */
export function extractMainContent(html: string): string {
  const $ = cheerio.load(html);

  // #div_page 영역 선택
  const divPage = $("#div_page");

  if (divPage.length === 0) {
    logger.warn("#div_page not found, using #contents");
    const contents = $("#contents").html();
    return contents || $("body").html() || html;
  }

  // #cancerMenu 제거
  divPage.find("#cancerMenu").remove();
  // #inner-tab 제거
  divPage.find(".inner-tab").remove();
  // 이미지 제거
  divPage.find("img").remove();
  // 비디오 메뉴 제거
  divPage.find(".video_menu").remove();
  // dictionary button 제거
  divPage.find(".dictionary__wrap").remove();

  const mainContent = divPage.html();

  if (!mainContent) {
    logger.warn("Main content is empty after processing");
    return "";
  }

  return mainContent;
}

/**
 * HTML을 Markdown으로 변환
 */
export function convertHTMLToMarkdown(html: string): string {
  try {
    // 1. 메인 컨텐츠 추출
    const content = extractMainContent(html);

    // 2. Turndown으로 변환
    const turndown = createTurndownService();
    let markdown = turndown.turndown(content);

    // 3. 후처리 (불필요한 공백 제거 등)
    markdown = cleanupMarkdown(markdown);

    return markdown;
  } catch (error) {
    logger.error("Failed to convert HTML to Markdown:", error);
    throw error;
  }
}

/**
 * Markdown 후처리 (정리)
 */
function cleanupMarkdown(markdown: string): string {
  return (
    markdown
      // 연속된 빈 줄 제거 (3개 이상 → 2개)
      .replace(/\n{3,}/g, "\n\n")
      // 앞뒤 공백 제거
      .trim()
      // 마지막에 개행 추가
      .concat("\n")
  );
}
