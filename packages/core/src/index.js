// Shared types and utilities
export function generateScanId() {
    return `scan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
export function isValidUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=index.js.map