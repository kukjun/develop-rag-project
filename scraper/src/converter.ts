import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from './utils/logger';
import { convertHTMLToMarkdown } from './utils/html-to-md';
import { Frontmatter, frontmatterToYAML, CANCER_NAME_EN } from './types/frontmatter';
import { CANCER_TARGETS } from './config/targets';
import { readMenuStructure } from './utils/storage';

/**
 * 단일 암 종류의 HTML 파일들을 Markdown으로 변환
 */
async function convertSingleCancer(
  cancerId: string,
  cancerName: string,
  sourceUrl: string
): Promise<void> {
  try {
    logger.info(`Starting conversion: ${cancerName} (${cancerId})`);

    const htmlBaseDir = path.join(process.cwd(), '..', 'data', 'raw', 'html', cancerId);
    const outputDir = path.join(process.cwd(), '..', 'data', 'processed', 'cancers');

    // 출력 디렉토리 생성
    await fs.mkdir(outputDir, { recursive: true });

    // 메뉴 구조 읽기 (순서 보장)
    const menuStructure = await readMenuStructure(cancerId);
    logger.info(`Loaded menu structure with ${menuStructure.categories.length} categories`);

    // 순서대로 Markdown 병합
    let markdownContent = '';

    // 1. 요약설명 (summary.html)
    const summaryPath = path.join(htmlBaseDir, 'summary.html');
    try {
      const summaryHtml = await fs.readFile(summaryPath, 'utf-8');
      const summaryMd = convertHTMLToMarkdown(summaryHtml);
      markdownContent += '# 요약설명\n\n' + summaryMd + '\n\n';
      logger.info('Converted: summary.html');
    } catch (error) {
      logger.warn('Summary file not found, skipping...');
    }

    // 2. 카테고리 순서대로 변환
    for (const category of menuStructure.categories) {
      logger.info(`Converting category: ${category.name} (${category.nameEn})`);
      markdownContent += `# ${category.name}\n\n`;

      for (const page of category.pages) {
        const htmlPath = path.join(htmlBaseDir, category.nameEn, `${page.titleEn}.html`);

        try {
          const html = await fs.readFile(htmlPath, 'utf-8');
          const markdown = convertHTMLToMarkdown(html);
          markdownContent += `## ${page.title}\n\n` + markdown + '\n\n';
          logger.info(`  Converted: ${page.titleEn}.html`);
        } catch (error) {
          logger.warn(`  Failed to read: ${htmlPath}`);
        }
      }
    }

    // Frontmatter 생성 (menu-structure 정보 활용)
    const tags = [
      ...menuStructure.categories.map(c => c.name), // 카테고리명을 태그로
      menuStructure.cancerName,
    ];

    const frontmatter: Frontmatter = {
      disease_id: cancerId,
      disease_name: menuStructure.cancerName,
      disease_name_en: CANCER_NAME_EN[cancerId] || menuStructure.cancerName,
      category: 'cancer',
      source: menuStructure.source,
      source_url: `https://www.cancer.go.kr/lay1/program/S1T211C217/cancer/view.do?cancer_seq=${menuStructure.cancerSeq}`,
      collected_date: new Date().toISOString().split('T')[0],
      verified: false,
      verified_by: null,
      verified_date: null,
      tags,
    };

    // 최종 Markdown 파일 생성
    const finalMarkdown = frontmatterToYAML(frontmatter) + '\n\n' + markdownContent;

    // 저장
    const outputPath = path.join(outputDir, `${cancerId}.md`);
    await fs.writeFile(outputPath, finalMarkdown, 'utf-8');

    logger.info(`Saved Markdown: ${outputPath}`);
  } catch (error) {
    logger.error(`Failed to convert ${cancerName} (${cancerId}):`, error);
    throw error;
  }
}


/**
 * 모든 7대암 데이터 변환
 */
async function convertAll(): Promise<void> {
  logger.info(`Starting conversion for ${CANCER_TARGETS.length} cancer types...`);

  for (const target of CANCER_TARGETS) {
    await convertSingleCancer(target.id, target.name, target.url);
  }

  logger.info('All conversions completed successfully!');
}

/**
 * 메인 실행
 */
async function main() {
  try {
    await convertAll();
    process.exit(0);
  } catch (error) {
    logger.error('Conversion failed:', error);
    process.exit(1);
  }
}

// 실행
if (require.main === module) {
  main();
}

export { convertSingleCancer, convertAll };
