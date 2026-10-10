import { PageCapture } from './page-capture.js';
import type { PageScanResult, ScanRequest } from '@raawi-x/core';
export interface CrawlResult {
    pages: PageScanResult[];
    totalPages: number;
    successfulPages: number;
    failedPages: number;
}
export declare class BFSCrawler {
    private pageCapture;
    private visited;
    private queue;
    private maxPages;
    private maxDepth;
    private includePatterns?;
    private excludePatterns?;
    private seedHostname;
    private outputDir;
    private concurrency;
    private pages;
    private pageCounter;
    private scanId?;
    private scanMode;
    private seedUrl;
    private request;
    private pipeline;
    constructor(request: ScanRequest, outputDir: string, pageCapture: PageCapture, scanId?: string);
    crawl(): Promise<CrawlResult>;
    /**
     * Discovery-only mode: Quick link extraction without page capture
     * Used in Phase 1 to discover all pages before scanning
     */
    discoverPages(): Promise<string[]>;
    private processPage;
}
//# sourceMappingURL=bfs-crawler.d.ts.map