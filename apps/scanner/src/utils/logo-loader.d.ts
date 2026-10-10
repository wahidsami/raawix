/**
 * Logo Loader Utility
 *
 * Loads logos (Raawi X, Powered By, Entity) and converts to base64 data URLs
 */
/**
 * Load logo and return as base64 data URL
 */
export declare function loadLogoAsDataUrl(): Promise<string>;
/**
 * Load "Powered By" logo and return as base64 data URL
 */
export declare function loadPoweredByLogoAsDataUrl(): Promise<string>;
/**
 * Load entity logo from file path and return as base64 data URL
 * @param logoPath - Relative or absolute path to entity logo
 */
export declare function loadEntityLogoAsDataUrl(logoPath?: string | null): Promise<string | undefined>;
//# sourceMappingURL=logo-loader.d.ts.map