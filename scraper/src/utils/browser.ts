import { chromium, Browser, Page } from "playwright";
import { logger } from "./logger";
import { CancerMenuStructure, MenuCategory, DetailPage } from "../types/menu";
import { translateCategory, translatePage } from "./translator";

let browser: Browser | null = null;

/**
 * Playwright 브라우저 인스턴스 초기화
 */
export async function initBrowser(): Promise<Browser> {
  if (browser) {
    return browser;
  }

  logger.info("Initializing browser...");
  browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  logger.info("Browser initialized");
  return browser;
}

/**
 * 브라우저 종료
 */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
    logger.info("Browser closed");
  }
}

/**
 * 페이지 생성 및 기본 설정
 */
export async function createPage(): Promise<Page> {
  const browserInstance = await initBrowser();
  const page = await browserInstance.newPage();

  // 타임아웃 설정
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(30000);

  // User-Agent 설정 (봇 차단 방지)
  await page.setExtraHTTPHeaders({
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  return page;
}

/**
 * URL에서 HTML 컨텐츠 가져오기
 */
export async function fetchPageHTML(url: string): Promise<string> {
  const page = await createPage();

  try {
    logger.info(`Fetching: ${url}`);
    // networkidle 대신 load 사용 (백그라운드 요청 때문에 timeout 발생)
    await page.goto(url, { waitUntil: "load", timeout: 60000 });

    // 메인 컨텐츠가 로드될 때까지 대기
    await page.waitForTimeout(2000);

    const html = await page.content();

    logger.info(`Successfully fetched: ${url}`);

    return html;
  } catch (error) {
    logger.error(`Failed to fetch ${url}:`, error);
    throw error;
  } finally {
    await page.close();
  }
}
/**
 * 페이지에서 메뉴 구조 추출 (XPath 사용)
 * #cancerMenu의 ul[1]~ul[6] 순회하여 카테고리와 상세 페이지 목록 추출
 */
export async function extractMenuStructure(
  page: Page,
  cancerId: string,
  cancerName: string
): Promise<CancerMenuStructure> {
  logger.info(`Extracting menu structure for ${cancerId}...`);

  // 1. cancer_seq 추출 (요약설명 링크에서)
  const summaryLink = await page.locator('#cancerMenu ul:nth-of-type(1) li.category a').getAttribute('href');
  const cancerSeqMatch = summaryLink?.match(/cancer_seq=(\d+)/);
  const cancerSeq = cancerSeqMatch ? cancerSeqMatch[1] : '';

  // 2. ul[2]~ul[6] 순회하여 카테고리 추출
  const categories: MenuCategory[] = [];

  for (let ulIndex = 2; ulIndex <= 6; ulIndex++) {
    const ulSelector = `#cancerMenu ul:nth-of-type(${ulIndex})`;

    // 카테고리명 추출 (li.category > span)
    const categoryNameElement = await page.locator(`${ulSelector} li.category span`).first();
    const categoryName = await categoryNameElement.textContent();

    if (!categoryName) {
      logger.warn(`No category name found for ul[${ulIndex}]`);
      continue;
    }

    const categoryNameEn = translateCategory(categoryName.trim());
    logger.info(`Found category: ${categoryName} -> ${categoryNameEn}`);

    // 카테고리 내 페이지 목록 추출
    const pages: DetailPage[] = [];
    const pageLinks = await page.locator(`${ulSelector} li:not(.category) a`).all();

    for (const link of pageLinks) {
      const title = (await link.textContent())?.trim() || '';
      const url = (await link.getAttribute('href')) || '';

      if (title && url) {
        const titleEn = translatePage(title);
        pages.push({ title, titleEn, url });
        logger.info(`  - ${title} -> ${titleEn}`);
      }
    }

    categories.push({
      name: categoryName.trim(),
      nameEn: categoryNameEn,
      pages,
    });
  }

  return {
    cancerId,
    cancerName,
    cancerSeq,
    source: '국가암정보센터',
    categories,
  };
}
