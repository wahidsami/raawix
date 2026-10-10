/**
 * Color contrast calculation utilities
 */
/**
 * Parse hex color to RGB
 */
export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : null;
}
/**
 * Parse rgb/rgba string to RGB
 */
export function rgbStringToRgb(rgb) {
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
        return {
            r: parseInt(match[1], 10),
            g: parseInt(match[2], 10),
            b: parseInt(match[3], 10),
        };
    }
    return null;
}
/**
 * Calculate relative luminance
 */
export function getLuminance(rgb) {
    const [r, g, b] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((val) => {
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1, color2) {
    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    return (lighter + 0.05) / (darker + 0.05);
}
/**
 * Parse color string to RGB (best effort)
 */
export function parseColor(color) {
    if (!color || color === 'transparent' || color === 'inherit') {
        return null;
    }
    // Try hex
    if (color.startsWith('#')) {
        return hexToRgb(color);
    }
    // Try rgb/rgba
    if (color.startsWith('rgb')) {
        return rgbStringToRgb(color);
    }
    // Try named colors (basic set)
    const namedColors = {
        black: { r: 0, g: 0, b: 0 },
        white: { r: 255, g: 255, b: 255 },
        red: { r: 255, g: 0, b: 0 },
        green: { r: 0, g: 128, b: 0 },
        blue: { r: 0, g: 0, b: 255 },
        yellow: { r: 255, g: 255, b: 0 },
        cyan: { r: 0, g: 255, b: 255 },
        magenta: { r: 255, g: 0, b: 255 },
        gray: { r: 128, g: 128, b: 128 },
        grey: { r: 128, g: 128, b: 128 },
    };
    const lowerColor = color.toLowerCase().trim();
    return namedColors[lowerColor] || null;
}
//# sourceMappingURL=contrast.js.map