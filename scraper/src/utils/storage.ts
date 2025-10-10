import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from './logger';
import { CancerMenuStructure } from '../types/menu';

/**
 * 디렉토리가 없으면 생성
 */
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
    logger.info(`Created directory: ${dirPath}`);
  }
}

/**
 * HTML 파일을 raw/html/ 디렉토리에 저장 (기존 단일 파일 방식 - deprecated)
 */
export async function saveRawHTML(
  diseaseId: string,
  html: string
): Promise<string> {
  const outputDir = path.join(process.cwd(), '..', 'data', 'raw', 'html');
  await ensureDir(outputDir);

  const filePath = path.join(outputDir, `${diseaseId}.html`);
  await fs.writeFile(filePath, html, 'utf-8');

  logger.info(`Saved HTML: ${filePath}`);
  return filePath;
}

/**
 * 중첩된 디렉토리 구조로 HTML 저장
 * 예: data/raw/html/breast/summary.html
 *     data/raw/html/breast/overview/location.html
 */
export async function saveDetailHTML(
  cancerId: string,
  categoryDir: string | null,
  filename: string,
  html: string
): Promise<string> {
  const baseDir = path.join(process.cwd(), '..', 'data', 'raw', 'html', cancerId);

  // 카테고리 디렉토리가 있으면 중첩 구조
  const outputDir = categoryDir ? path.join(baseDir, categoryDir) : baseDir;
  await ensureDir(outputDir);

  const filePath = path.join(outputDir, `${filename}.html`);
  await fs.writeFile(filePath, html, 'utf-8');

  logger.info(`Saved HTML: ${filePath}`);
  return filePath;
}

/**
 * Markdown 파일을 processed/ 디렉토리에 저장
 */
export async function saveMarkdown(
  diseaseId: string,
  content: string
): Promise<string> {
  const outputDir = path.join(process.cwd(), '..', 'data', 'processed');
  await ensureDir(outputDir);

  const filePath = path.join(outputDir, `${diseaseId}.md`);
  await fs.writeFile(filePath, content, 'utf-8');

  logger.info(`Saved Markdown: ${filePath}`);
  return filePath;
}

/**
 * HTML 파일 읽기
 */
export async function readRawHTML(diseaseId: string): Promise<string> {
  const filePath = path.join(
    process.cwd(),
    '..',
    'data',
    'raw',
    'html',
    `${diseaseId}.html`
  );

  try {
    const html = await fs.readFile(filePath, 'utf-8');
    logger.info(`Read HTML: ${filePath}`);
    return html;
  } catch (error) {
    logger.error(`Failed to read HTML file: ${filePath}`, error);
    throw error;
  }
}

/**
 * 모든 HTML 파일 목록 가져오기
 */
export async function listRawHTMLFiles(): Promise<string[]> {
  const htmlDir = path.join(process.cwd(), '..', 'data', 'raw', 'html');

  try {
    const files = await fs.readdir(htmlDir);
    return files.filter((f) => f.endsWith('.html')).map((f) => f.replace('.html', ''));
  } catch (error) {
    logger.warn(`HTML directory not found: ${htmlDir}`);
    return [];
  }
}

/**
 * 메뉴 구조를 JSON으로 저장
 */
export async function saveMenuStructure(
  cancerId: string,
  menuStructure: CancerMenuStructure
): Promise<string> {
  const baseDir = path.join(process.cwd(), '..', 'data', 'raw', 'html', cancerId);
  await ensureDir(baseDir);

  const filePath = path.join(baseDir, 'menu-structure.json');
  await fs.writeFile(filePath, JSON.stringify(menuStructure, null, 2), 'utf-8');

  logger.info(`Saved menu structure: ${filePath}`);
  return filePath;
}

/**
 * 메뉴 구조 JSON 읽기
 */
export async function readMenuStructure(cancerId: string): Promise<CancerMenuStructure> {
  const filePath = path.join(
    process.cwd(),
    '..',
    'data',
    'raw',
    'html',
    cancerId,
    'menu-structure.json'
  );

  try {
    const json = await fs.readFile(filePath, 'utf-8');
    const menuStructure = JSON.parse(json) as CancerMenuStructure;
    logger.info(`Read menu structure: ${filePath}`);
    return menuStructure;
  } catch (error) {
    logger.error(`Failed to read menu structure: ${filePath}`, error);
    throw error;
  }
}
