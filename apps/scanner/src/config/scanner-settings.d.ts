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
export declare const DEFAULT_SCANNER_SETTINGS: ScannerSettingsConfig;
/**
 * Get scanner settings (with database fallback)
 */
export declare function getScannerSettings(): Promise<ScannerSettingsConfig>;
//# sourceMappingURL=scanner-settings.d.ts.map