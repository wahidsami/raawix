/**
 * Structured logger with scanId correlation
 */
export class StructuredLogger {
    scanId;
    constructor(scanId) {
        this.scanId = scanId;
    }
    log(level, message, metadata) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            scanId: this.scanId,
            message,
            ...metadata,
        };
        // Use console for structured logging (can be replaced with proper logger)
        if (level === 'error') {
            console.error(JSON.stringify(logEntry));
        }
        else if (level === 'warn') {
            console.warn(JSON.stringify(logEntry));
        }
        else {
            console.log(JSON.stringify(logEntry));
        }
    }
    info(message, metadata) {
        this.log('info', message, metadata);
    }
    warn(message, metadata) {
        this.log('warn', message, metadata);
    }
    error(message, metadata) {
        this.log('error', message, metadata);
    }
    setScanId(scanId) {
        this.scanId = scanId;
    }
}
//# sourceMappingURL=logger.js.map