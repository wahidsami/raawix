import type { ManualCheckpoint, ScanRequest, ScanRun } from '@raawi-x/core';
/**
 * Strict scan state machine: queued -> running -> paused|completed|failed|canceled
 */
export type ScanStatus = 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'canceled';
interface Job {
    id: string;
    request: ScanRequest;
    status: ScanStatus;
    scanRun?: ScanRun;
    manualCheckpoint?: ManualCheckpoint;
    remainingSelectedUrls?: string[];
    startedAt?: string;
    completedAt?: string;
    canceledAt?: string;
    ttl?: number;
}
export declare class JobQueue {
    private queue;
    private running;
    private canceled;
    private activePageCaptures;
    private storage;
    private reportGenerator;
    private logger;
    constructor();
    private withTimeout;
    private saveFailedPageArtifact;
    private runSequentialPages;
    addJob(request: ScanRequest): Promise<string>;
    getJob(scanId: string): Job | undefined;
    /**
     * Add job for existing scan (from discovery phase)
     * This is called when user clicks "Start Scanning" after discovery
     */
    addJobForExistingScan(scanId: string, request: ScanRequest): Promise<void>;
    /**
     * Cancel a scan job
     */
    cancelJob(scanId: string): Promise<boolean>;
    resumePausedScan(scanId: string, verificationCode: string): Promise<{
        ok: boolean;
        message: string;
    }>;
    private persistPartialReportForCanceledScan;
    private persistPartialReportForPausedScan;
    /**
     * Close browser if needed, then write report.json + findings/summary to DB (partial/canceled).
     */
    private flushPartialResultsAfterCancel;
    private flushPartialResultsAfterPause;
    /**
     * Strict state machine transition
     */
    private transitionState;
    private processQueue;
    /**
     * Clean up stale jobs (exceeded TTL)
     */
    private cleanupStaleJobs;
    /**
     * Pure orchestrator: coordinates crawling, rule evaluation, and report generation
     * Idempotent: if report.json exists, short-circuit to completed
     */
    private executeJob;
}
export {};
//# sourceMappingURL=job-queue.d.ts.map