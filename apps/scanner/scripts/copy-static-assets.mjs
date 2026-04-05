/**
 * tsc does not copy HTML templates; production runs from dist/ and must find them next to compiled JS.
 */
import { cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scannerRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcTemplates = join(scannerRoot, 'src', 'templates');
const distTemplates = join(scannerRoot, 'dist', 'templates');

if (!existsSync(join(scannerRoot, 'dist'))) {
  console.warn('[copy-static-assets] dist/ missing; run tsc first.');
  process.exit(0);
}

if (!existsSync(srcTemplates)) {
  console.warn('[copy-static-assets] src/templates missing; skip.');
  process.exit(0);
}

cpSync(srcTemplates, distTemplates, { recursive: true });
console.log('[copy-static-assets] Copied templates to dist/templates');
