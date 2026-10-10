export declare class SecureStorage {
    private baseDir;
    constructor(baseDir: string);
    private ensureBaseDir;
    /**
     * Sanitize scanId to prevent path traversal
     */
    private sanitizeScanId;
    /**
     * Get safe path for scan output
     */
    private getSafePath;
    saveScanResult(scanId: string, data: unknown): Promise<string>;
    saveReport(scanId: string, html: string): Promise<string>;
}
//# sourceMappingURL=storage.d.ts.map