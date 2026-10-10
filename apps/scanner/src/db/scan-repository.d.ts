import type { ScanRun, PageArtifact } from '@raawi-x/core';
type AuditMode = 'classic' | 'raawi-agent';
/**
 * Repository for scan persistence
 */
export declare class ScanRepository {
    private logger;
    constructor();
    /**
     * Create a new scan record
     */
    createScan(scanId: string, seedUrl: string, maxPages: number, maxDepth: number, hostname: string, entityId?: string, propertyId?: string, auditMode?: AuditMode): Promise<void>;
    /**
     * Update scan status
     */
    updateScanStatus(scanId: string, status: 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'canceled' | 'discovering', completedAt?: Date): Promise<void>;
    /**
     * Get or create scan record (for cases where scan wasn't created upfront)
     */
    getOrCreateScan(scanId: string, seedUrl: string, maxPages: number, maxDepth: number, hostname: string, entityId?: string, propertyId?: string, auditMode?: AuditMode): Promise<string | null>;
    /**
     * Upsert a page record
     */
    upsertPage(scanId: string, page: PageArtifact): Promise<string | null>;
    /**
     * Bulk insert findings and vision findings after report generation
     */
    saveReportResults(scanId: string, scanRun: ScanRun, options?: {
        analysisAgent?: boolean; /** @deprecated prefer analysisAgent */
        runOpenAiAnalyst?: boolean;
    }): Promise<void>;
    /**
     * Get scan by scanId
     */
    getScan(scanId: string): Promise<any>;
    /**
     * Get latest completed scan for a hostname
     */
    getLatestScanForHostname(hostname: string): Promise<any>;
}
export declare const scanRepository: ScanRepository;
export {};
//# sourceMappingURL=scan-repository.d.ts.map