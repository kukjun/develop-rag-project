import pLimit from "p-limit";
import { CANCER_TARGETS } from "./config/targets";
import {
  fetchPageHTML,
  closeBrowser,
  createPage,
  extractMenuStructure,
} from "./utils/browser";
import { saveDetailHTML, saveMenuStructure } from "./utils/storage";
import { logger } from "./utils/logger";
import { CancerMenuStructure } from "./types/menu";

/**
 * 지정된 시간만큼 대기 (ms)
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 재시도 로직을 포함한 함수 실행
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  retryDelay: number = 10000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      logger.warn(`Retry ${attempt}/${maxRetries} after ${retryDelay}ms...`);
      await delay(retryDelay);
    }
  }
  throw new Error("Unexpected error in withRetry");
}

/**
 * 단일 상세 페이지 스크래핑
 */
async function scrapeDetailPage(
  baseUrl: string,
  relativeUrl: string,
  cancerId: string,
  categoryDir: string | null,
  filename: string
): Promise<void> {
  await withRetry(
    async () => {
      // 상대 URL을 절대 URL로 변환
      const fullUrl = new URL(relativeUrl, baseUrl).href;

      logger.info(`  Fetching: ${filename}.html`);
      const html = await fetchPageHTML(fullUrl);
      await saveDetailHTML(cancerId, categoryDir, filename, html);
    },
    3,
    60000
  ); // 재시도 딜레이 10초 → 60초 (1분)
}

/**
 * 단일 암 종류의 모든 페이지 스크래핑
 */
async function scrapeSingleCancer(
  id: string,
  name: string,
  url: string
): Promise<void> {
  try {
    logger.info(`Starting scraping: ${name} (${id})`);

    // 1. 메인 페이지 접근 및 메뉴 구조 추출
    const page = await createPage();
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(2000);

    const menuStructure: CancerMenuStructure = await extractMenuStructure(
      page,
      id,
      name
    );
    const baseUrl =
      new URL(url).origin +
      new URL(url).pathname.split("/").slice(0, -1).join("/") +
      "/";

    // 2. 요약설명 페이지 저장
    logger.info(`Scraping summary page...`);
    const summaryHtml = await page.content();
    await saveDetailHTML(id, null, "summary", summaryHtml);

    // 2-1. 메뉴 구조를 JSON으로 저장 (순서 보장용)
    await saveMenuStructure(id, menuStructure);

    await page.close();

    // 3. 각 카테고리의 상세 페이지 스크래핑
    const limit = pLimit(1); // 동시 요청 1개로 제한

    for (const category of menuStructure.categories) {
      logger.info(`Scraping category: ${category.name} (${category.nameEn})`);

      const tasks = category.pages.map((page) =>
        limit(async () => {
          await scrapeDetailPage(
            baseUrl,
            page.url,
            id,
            category.nameEn,
            page.titleEn
          );
        })
      );

      await Promise.all(tasks);
    }

    logger.info(`Completed scraping: ${name} (${id})`);
  } catch (error) {
    logger.error(`Failed to scrape ${name} (${id}):`, error);
    throw error;
  }
}

/**
 * 모든 7대암 데이터 스크래핑
 */
async function scrapeAll(): Promise<void> {
  const limit = pLimit(1); // 동시에 1개 암 종류만 처리 (rate limiting)

  logger.info(`Starting to scrape ${CANCER_TARGETS.length} cancer types...`);

  const tasks = CANCER_TARGETS.map((target) =>
    limit(() => scrapeSingleCancer(target.id, target.name, target.url))
  );

  try {
    await Promise.all(tasks);
    logger.info("All scraping completed successfully!");
  } catch (error) {
    logger.error("Some scraping tasks failed:", error);
    throw error;
  } finally {
    await closeBrowser();
  }
}

/**
 * 메인 실행
 */
async function main() {
  try {
    await scrapeAll();
    process.exit(0);
  } catch (error) {
    logger.error("Scraping failed:", error);
    process.exit(1);
  }
}

// 실행
if (require.main === module) {
  main();
}

export { scrapeSingleCancer, scrapeAll };
