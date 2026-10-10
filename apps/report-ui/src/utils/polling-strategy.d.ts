/**
 * Production-ready polling strategies for large-scale portals
 * Handles hundreds of pages without hitting rate limits
 */
export interface PollingConfig {
    baseInterval: number;
    maxInterval: number;
    backoffMultiplier: number;
    resetAfterSuccess: boolean;
}
export declare class SmartPolling {
    private interval;
    private currentAttempt;
    private config;
    private timeoutId;
    private isActive;
    constructor(config?: Partial<PollingConfig>);
    /**
     * Start polling with a callback function
     */
    start(callback: () => Promise<void> | void): void;
    /**
     * Stop polling
     */
    stop(): void;
    /**
     * Pause polling temporarily (e.g., when modal is open)
     */
    pause(): void;
    /**
     * Resume polling after pause
     */
    resume(callback: () => Promise<void> | void): void;
    private poll;
    private onSuccess;
    private onError;
    /**
     * Get current polling interval
     */
    getInterval(): number;
    /**
     * Check if polling is active
     */
    isPolling(): boolean;
}
/**
 * Adaptive polling: adjusts frequency based on scan status
 */
export declare class AdaptivePolling extends SmartPolling {
    private hasActiveScans;
    private hasRunningScans;
    constructor();
    /**
     * Update scan status and adjust polling accordingly
     */
    updateScanStatus(hasRunningScans: boolean, hasActiveScans: boolean): void;
    /**
     * Get recommended polling interval based on status
     */
    getRecommendedInterval(): number;
}
/**
 * Batch polling: groups multiple requests together
 */
export declare class BatchPolling {
    private pendingRequests;
    private batchTimeout;
    private batchDelay;
    private batchHandler;
    /**
     * Add a request to the batch
     */
    addRequest(id: string): void;
    /**
     * Set the batch handler
     */
    setHandler(handler: (ids: string[]) => Promise<void>): void;
    /**
     * Flush pending requests
     */
    private flush;
    /**
     * Clear all pending requests
     */
    clear(): void;
}
//# sourceMappingURL=polling-strategy.d.ts.map