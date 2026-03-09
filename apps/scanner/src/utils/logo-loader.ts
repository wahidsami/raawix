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

/**
 * Load logo and return as base64 data URL
 */
export async function loadLogoAsDataUrl(): Promise<string> {
  // Try multiple possible locations
  const possiblePaths = [
    join(__dirname, '../../../../dashboardlogo.png'), // Project root
    join(__dirname, '../../../report-ui/public/dashboardlogo.png'), // Report UI public
    join(__dirname, '../../dashboardlogo.png'), // Scanner root
    'dashboardlogo.png', // Current directory
  ];

  for (const logoPath of possiblePaths) {
    if (existsSync(logoPath)) {
      try {
        const logoBuffer = await readFile(logoPath);
        const base64 = logoBuffer.toString('base64');
        const mimeType = logoPath.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
        return `data:${mimeType};base64,${base64}`;
      } catch (error) {
        console.warn(`Failed to load logo from ${logoPath}:`, error);
        continue;
      }
    }
  }

  // Fallback: return empty string (template will handle missing logo)
  console.warn('Logo not found, using fallback');
  return '';
}

/**
 * Load "Powered By" logo and return as base64 data URL
 */
export async function loadPoweredByLogoAsDataUrl(): Promise<string> {
  const possiblePaths = [
    join(__dirname, '../../../../images/poweredby.png'), // Project root/images
    join(__dirname, '../../../images/poweredby.png'),
    join(__dirname, '../../images/poweredby.png'),
    'images/poweredby.png',
  ];

  for (const logoPath of possiblePaths) {
    if (existsSync(logoPath)) {
      try {
        const logoBuffer = await readFile(logoPath);
        const base64 = logoBuffer.toString('base64');
        return `data:image/png;base64,${base64}`;
      } catch (error) {
        console.warn(`Failed to load powered by logo from ${logoPath}:`, error);
        continue;
      }
    }
  }

  console.warn('Powered By logo not found');
  return '';
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
