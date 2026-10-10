/**
 * Color contrast calculation utilities
 */
export interface RGB {
    r: number;
    g: number;
    b: number;
}
/**
 * Parse hex color to RGB
 */
export declare function hexToRgb(hex: string): RGB | null;
/**
 * Parse rgb/rgba string to RGB
 */
export declare function rgbStringToRgb(rgb: string): RGB | null;
/**
 * Calculate relative luminance
 */
export declare function getLuminance(rgb: RGB): number;
/**
 * Calculate contrast ratio between two colors
 */
export declare function getContrastRatio(color1: RGB, color2: RGB): number;
/**
 * Parse color string to RGB (best effort)
 */
export declare function parseColor(color: string): RGB | null;
//# sourceMappingURL=contrast.d.ts.map