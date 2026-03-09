/**
 * Scanner Settings Configuration
 * 
 * FALLBACK: If database settings don't work, these values are used.
 * To change settings, edit the values below and restart the scanner.
 */

export interface ScannerSettingsConfig {
  maxPages: number;
  maxDepth: number;
  maxRuntimeMs: number;
}

/**
 * Default scanner settings
 * 
 * ADJUST THESE VALUES MANUALLY IF NEEDED:
 */
export const DEFAULT_SCANNER_SETTINGS: ScannerSettingsConfig = {
  // Maximum number of pages to scan
  // Increased for large government portals (e.g., www.mim.gov.sa)
  maxPages: 500,

  // Maximum crawl depth (how many levels deep to follow links)
  maxDepth: 10,

  // Maximum scan runtime in MILLISECONDS
  // Examples:
  //   10 minutes = 600000 ms
  //   20 minutes = 1200000 ms
  //   30 minutes = 1800000 ms
  //   40 minutes = 2400000 ms
  //   60 minutes = 3600000 ms
  //   90 minutes = 5400000 ms
  //   180 minutes = 10800000 ms (3 HOURS - PLENTY of time for large government sites!)
  maxRuntimeMs: 10800000, // 180 minutes (3 HOURS - bulletproof for www.mim.gov.sa!)
};

/**
 * Get scanner settings (with database fallback)
 */
export async function getScannerSettings(): Promise<ScannerSettingsConfig> {
  try {
    // Try to load from database
    const { getPrismaClient } = await import('../db/client.js');
    const prisma = await getPrismaClient();
    
    if (prisma && prisma.scannerSettings) {
      const dbSettings = await prisma.scannerSettings.findFirst();
      if (dbSettings) {
        console.log('[SETTINGS] Loaded from database:', dbSettings);
        return {
          maxPages: dbSettings.maxPages,
          maxDepth: dbSettings.maxDepth,
          maxRuntimeMs: dbSettings.maxRuntimeMs,
        };
      }
    }
  } catch (error) {
    console.warn('[SETTINGS] Failed to load from database, using defaults:', error);
  }

  // Fallback to config file
  console.log('[SETTINGS] Using config file defaults:', DEFAULT_SCANNER_SETTINGS);
  return DEFAULT_SCANNER_SETTINGS;
}
