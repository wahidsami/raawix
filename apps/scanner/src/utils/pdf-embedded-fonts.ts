/**
 * Embeds Noto TTFs as data URLs so Playwright/Chromium PDF output has glyphs
 * on hosts without Segoe UI (e.g. Docker) and does not depend on network fonts.
 */
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function assetsFontsDir(): string {
  return join(__dirname, '..', '..', 'assets', 'fonts');
}

function ttfDataSrc(buf: Buffer): string {
  return `url(data:font/ttf;base64,${buf.toString('base64')}) format('truetype')`;
}

export async function buildEmbeddedPdfFontFaces(): Promise<string> {
  const base = assetsFontsDir();
  const [sans400, sans700, naskh400, naskh700] = await Promise.all([
    readFile(join(base, 'NotoSans-Regular.ttf')),
    readFile(join(base, 'NotoSans-Bold.ttf')),
    readFile(join(base, 'NotoNaskhArabic-Regular.ttf')),
    readFile(join(base, 'NotoNaskhArabic-Bold.ttf')),
  ]);

  return `<style id="pdf-embedded-fonts">
@font-face{font-family:'Noto Sans';font-style:normal;font-weight:400;font-display:block;src:${ttfDataSrc(sans400)};}
@font-face{font-family:'Noto Sans';font-style:normal;font-weight:700;font-display:block;src:${ttfDataSrc(sans700)};}
@font-face{font-family:'Noto Naskh Arabic';font-style:normal;font-weight:400;font-display:block;src:${ttfDataSrc(naskh400)};}
@font-face{font-family:'Noto Naskh Arabic';font-style:normal;font-weight:700;font-display:block;src:${ttfDataSrc(naskh700)};}
</style>`;
}
