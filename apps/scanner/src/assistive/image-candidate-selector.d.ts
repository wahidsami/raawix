/**
 * Candidate selection rules for image description generation
 * Only generate descriptions when images meet quality criteria
 */
export declare class ImageCandidateSelector {
    /**
     * Low-quality alt text patterns that should be replaced
     */
    private static readonly LOW_QUALITY_ALT_PATTERNS;
    /**
     * Decorative filename patterns
     */
    private static readonly DECORATIVE_FILENAME_PATTERNS;
    /**
     * Check if image is a valid candidate for description generation
     */
    static isCandidate(img: Element): {
        isCandidate: boolean;
        reason?: string;
    };
    /**
     * Check if image filename suggests decorative use
     */
    static isDecorativeFilename(src: string): boolean;
    /**
     * Get nearby context for image (heading or caption)
     */
    static getNearbyContext(img: Element): string | null;
}
//# sourceMappingURL=image-candidate-selector.d.ts.map