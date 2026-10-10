import type { ManualCheckpoint, PageScanResult, ResolvedScanPipeline } from '@raawi-x/core';
import { type StabilizationConfig } from './page-stabilizer.js';
export interface CaptureOptions {
    timeout?: number;
    waitForNetworkIdle?: boolean;
    stabilization?: StabilizationConfig;
    /** Resolved per-scan pipeline; if omitted, full pipeline runs. */
    pipeline?: ResolvedScanPipeline;
    /** When true with pipeline.layer1 false, still write HTML + extract links (BFS crawl). */
    crawlLinkDiscovery?: boolean;
}
export declare class PageCapture {
    private browser;
    private context;
    private scanId?;
    private storageStatePath?;
    private pausedPage;
    private pausedCheckpoint;
    constructor(scanId?: string, storageStatePath?: string);
    initialize(): Promise<void>;
    capturePage(url: string, outputDir: string, pageNumber: number, options?: CaptureOptions): Promise<PageScanResult>;
    close(): Promise<void>;
    getManualCheckpoint(): ManualCheckpoint | null;
    resumeManualCheckpoint(code: string): Promise<{
        success: boolean;
        message: string;
        resolved: boolean;
        currentUrl?: string;
    }>;
}
//# sourceMappingURL=page-capture.d.ts.map