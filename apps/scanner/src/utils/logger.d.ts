/**
 * Structured logger with scanId correlation
 */
export declare class StructuredLogger {
    private scanId?;
    constructor(scanId?: string);
    private log;
    info(message: string, metadata?: Record<string, unknown>): void;
    warn(message: string, metadata?: Record<string, unknown>): void;
    error(message: string, metadata?: Record<string, unknown>): void;
    setScanId(scanId: string): void;
}
//# sourceMappingURL=logger.d.ts.map