import type { Page } from 'playwright';
export interface StabilizationConfig {
    waitUntil?: 'domcontentloaded' | 'load' | 'networkidle';
    networkIdleMs?: number;
    stableDomMs?: number;
    maxWaitMs?: number;
    useReadyMarker?: boolean;
}
export interface StabilizationResult {
    readyMarkerHit: boolean;
    networkIdleAchieved: boolean;
    domStableAchieved: boolean;
    timeoutReached: boolean;
    waitDuration: number;
}
/**
 * Wait for page to be ready for SPA frameworks (React/Angular/Vue)
 * Implements robust waiting strategy without breaking existing pipeline
 */
export declare class PageStabilizer {
    /**
     * Wait for page stabilization before capturing DOM
     */
    static waitForStable(page: Page, config?: StabilizationConfig): Promise<StabilizationResult>;
    /**
     * Wait for DOM to be stable (no changes in size/length)
     */
    private static waitForDomStability;
}
//# sourceMappingURL=page-stabilizer.d.ts.map