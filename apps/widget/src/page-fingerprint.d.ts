/**
 * Compute page fingerprint in browser (for stale scan detection)
 */
export interface PageFingerprint {
    title?: string;
    firstHeading?: string;
    mainTextHash?: string;
}
/**
 * Compute page fingerprint from live DOM
 */
export declare function computePageFingerprint(): PageFingerprint;
/**
 * Compare two fingerprints and return similarity score (0-1)
 */
export declare function compareFingerprints(fp1: PageFingerprint, fp2: PageFingerprint): number;
//# sourceMappingURL=page-fingerprint.d.ts.map