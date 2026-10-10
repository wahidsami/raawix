/**
 * In-memory cache for image descriptions by visual hash
 * Prevents duplicate Gemini API calls for identical images
 */
interface ImageCacheEntry {
    description: string;
    confidence: 'high' | 'medium' | 'low';
    timestamp: number;
    imageArtifactPath?: string;
}
declare class ImageCache {
    private cache;
    private ttl;
    private logger;
    constructor();
    /**
     * Compute visual hash from image file bytes
     */
    computeVisualHash(imagePath: string): Promise<string>;
    /**
     * Get cached description for image hash
     */
    get(visualHash: string): ImageCacheEntry | undefined;
    /**
     * Store description in cache
     */
    set(visualHash: string, description: string, confidence: 'high' | 'medium' | 'low', imageArtifactPath?: string): void;
    /**
     * Clear expired entries
     */
    cleanup(): void;
    /**
     * Clear all entries
     */
    clear(): void;
}
export declare const imageCache: ImageCache;
export {};
//# sourceMappingURL=image-cache.d.ts.map