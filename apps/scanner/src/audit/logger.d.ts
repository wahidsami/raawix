export interface AuditLogEntry {
    timestamp: string;
    type: 'request' | 'scan_created' | 'scan_start' | 'scan_complete' | 'scan_failed' | 'scan_timeout' | 'blocked_by_policy';
    scanId?: string;
    ip?: string;
    method?: string;
    path?: string;
    statusCode?: number;
    message?: string;
    metadata?: Record<string, unknown>;
}
export declare class AuditLogger {
    private logDir;
    private enabled;
    constructor();
    private ensureLogDir;
    private writeLog;
    logRequest(req: {
        method: string;
        path: string;
        ip?: string;
    }, statusCode: number): void;
    logScanStart(scanId: string, seedUrl: string, metadata?: Record<string, unknown>): void;
    logScanComplete(scanId: string, pagesScanned: number, durationMs: number): void;
    logScanFailed(scanId: string, error: string, metadata?: Record<string, unknown>): void;
    logScanTimeout(scanId: string, runtimeMs: number): void;
    logScanCreated(scanId: string, seedUrl: string, metadata?: Record<string, unknown>): void;
    logBlockedByPolicy(scanId: string, url: string, reason: string, metadata?: Record<string, unknown>): void;
}
export declare const auditLogger: AuditLogger;
//# sourceMappingURL=logger.d.ts.map