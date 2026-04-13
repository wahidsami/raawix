/**
 * Logo Loader Utility
 * 
 * Loads logos (Raawi X, Powered By, Entity) and converts to base64 data URLs
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Bundled with scanner templates → copied to dist/templates on build (see copy-static-assets.mjs). */
const bundledRaawiLogoPath = join(__dirname, '../templates/assets/raawi-x-logo.svg');

async function fileToImageDataUrl(filePath: string): Promise<string> {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.svg')) {
    const svg = await readFile(filePath, { encoding: 'utf8' });
    return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
  }
  const buf = await readFile(filePath);
  let mimeType = 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mimeType = 'image/jpeg';
  else if (lower.endsWith('.webp')) mimeType = 'image/webp';
  return `data:${mimeType};base64,${buf.toString('base64')}`;
}

async function tryPaths(paths: string[]): Promise<string> {
  for (const logoPath of paths) {
    if (!existsSync(logoPath)) continue;
    try {
      return await fileToImageDataUrl(logoPath);
    } catch (error) {
      console.warn(`Failed to load logo from ${logoPath}:`, error);
    }
  }
  return '';
}

/**
 * Load logo and return as base64 data URL
 */
export async function loadLogoAsDataUrl(): Promise<string> {
  const possiblePaths = [
    bundledRaawiLogoPath,
    join(__dirname, '../../../../dashboardlogo.png'),
    join(__dirname, '../../../../dashboardlogo.svg'),
    join(__dirname, '../../../report-ui/public/dashboardlogo.png'),
    join(__dirname, '../../../report-ui/public/dashboardlogo.svg'),
    join(__dirname, '../../dashboardlogo.png'),
    join(__dirname, '../../dashboardlogo.svg'),
    'dashboardlogo.png',
    'dashboardlogo.svg',
  ];

  const dataUrl = await tryPaths(possiblePaths);
  if (dataUrl) return dataUrl;

  console.warn('Logo not found, using embedded fallback');
  const embedded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 88"><text fill="#059669" font-family="Segoe UI,sans-serif" font-size="40" font-weight="700" x="180" y="58" text-anchor="middle">Raawi X</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(embedded, 'utf8').toString('base64')}`;
}

const bundledPoweredByPath = join(__dirname, '../templates/assets/powered-by-unifinity.svg');

/**
 * Load "Powered By" logo and return as base64 data URL
 */
export async function loadPoweredByLogoAsDataUrl(): Promise<string> {
  const possiblePaths = [
    bundledPoweredByPath,
    join(__dirname, '../../../../images/poweredby.png'),
    join(__dirname, '../../../images/poweredby.png'),
    join(__dirname, '../../images/poweredby.png'),
    'images/poweredby.png',
  ];

  const dataUrl = await tryPaths(possiblePaths);
  if (dataUrl) return dataUrl;

  const embedded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 48"><text fill="#64748b" font-family="Segoe UI,sans-serif" font-size="14" font-weight="600" x="210" y="30" text-anchor="middle">Powered by Unifinity AI</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(embedded, 'utf8').toString('base64')}`;
}

/**
 * Load entity logo from file path and return as base64 data URL
 * @param logoPath - Relative or absolute path to entity logo
 */
export async function loadEntityLogoAsDataUrl(logoPath?: string | null): Promise<string | undefined> {
  if (!logoPath) {
    return undefined;
  }

  try {
    // Try to resolve the path (could be relative or absolute)
    const possiblePaths = [
      logoPath, // As-is
      resolve(logoPath), // Resolve relative paths
      join(__dirname, '../../../../', logoPath), // From project root
      join(__dirname, '../../../uploads', logoPath), // From uploads folder
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        const logoBuffer = await readFile(path);
        const base64 = logoBuffer.toString('base64');
        
        // Detect mime type from extension
        let mimeType = 'image/png';
        if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
          mimeType = 'image/jpeg';
        } else if (path.endsWith('.svg')) {
          mimeType = 'image/svg+xml';
        }
        
        return `data:${mimeType};base64,${base64}`;
      }
    }

    console.warn(`Entity logo not found at ${logoPath}`);
    return undefined;
  } catch (error) {
    console.warn(`Failed to load entity logo from ${logoPath}:`, error);
    return undefined;
  }
}
