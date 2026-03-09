import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { StructuredLogger } from '../utils/logger.js';

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

class ImageCache {
  private cache: Map<string, ImageCacheEntry> = new Map();
  private ttl: number; // Time-to-live in milliseconds
  private logger: StructuredLogger;

  constructor() {
    this.ttl = 30 * 24 * 60 * 60 * 1000; // 30 days
    this.logger = new StructuredLogger();
  }

  /**
   * Compute visual hash from image file bytes
   */
  async computeVisualHash(imagePath: string): Promise<string> {
    try {
      const imageBuffer = await readFile(imagePath);
      return createHash('sha256').update(imageBuffer).digest('hex');
    } catch (error) {
      this.logger.warn('Failed to compute visual hash', {
        imagePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Fallback: hash the path
      return createHash('sha256').update(imagePath).digest('hex');
    }
  }

  /**
   * Get cached description for image hash
   */
  get(visualHash: string): ImageCacheEntry | undefined {
    const entry = this.cache.get(visualHash);
    if (entry && Date.now() < entry.timestamp + this.ttl) {
      this.logger.info('Image cache hit', { visualHash });
      return entry;
    }
    if (entry) {
      // Expired, remove it
      this.cache.delete(visualHash);
    }
    this.logger.info('Image cache miss or expired', { visualHash });
    return undefined;
  }

  /**
   * Store description in cache
   */
  set(
    visualHash: string,
    description: string,
    confidence: 'high' | 'medium' | 'low',
    imageArtifactPath?: string
  ): void {
    this.cache.set(visualHash, {
      description,
      confidence,
      timestamp: Date.now(),
      imageArtifactPath,
    });
    this.logger.info('Image description cached', { visualHash });
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;
    this.cache.forEach((entry, key) => {
      if (now >= entry.timestamp + this.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    });
    if (cleanedCount > 0) {
      this.logger.info('Image cache cleanup completed', {
        cleanedCount,
        currentSize: this.cache.size,
      });
    }
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.logger.info('Image cache cleared');
  }
}

export const imageCache = new ImageCache();

