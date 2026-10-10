/**
 * Scan retention policy: Delete scans older than retention period
 */
export declare class RetentionManager {
    private logger;
    constructor();
    /**
     * Clean up old scans based on retention policy
     * Deletes from both database and file system
     */
    cleanupOldScans(): Promise<{
        deleted: number;
        errors: number;
    }>;
}
export declare const retentionManager: RetentionManager;
//# sourceMappingURL=retention.d.ts.map