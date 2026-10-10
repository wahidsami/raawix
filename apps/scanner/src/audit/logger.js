import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../config.js';
export class AuditLogger {
    logDir;
    enabled;
    constructor() {
        this.logDir = config.audit.logDir;
        this.enabled = config.audit.enabled;
        this.ensureLogDir();
    }
    async ensureLogDir() {
        if (this.enabled && !existsSync(this.logDir)) {
            try {
                await mkdir(this.logDir, { recursive: true });
            }
            catch (error) {
                console.error('Failed to create audit log directory:', error);
            }
        }
    }
    async writeLog(entry) {
        if (!this.enabled)
            return;
        try {
            const date = new Date().toISOString().split('T')[0];
            const logFile = join(this.logDir, `audit-${date}.jsonl`);
            const line = JSON.stringify(entry) + '\n';
            await writeFile(logFile, line, { flag: 'a' });
        }
        catch (error) {
            console.error('Failed to write audit log:', error);
        }
    }
    logRequest(req, statusCode) {
        this.writeLog({
            timestamp: new Date().toISOString(),
            type: 'request',
            method: req.method,
            path: req.path,
            ip: req.ip,
            statusCode,
        });
    }
    logScanStart(scanId, seedUrl, metadata) {
        this.writeLog({
            timestamp: new Date().toISOString(),
            type: 'scan_start',
            scanId,
            message: `Scan started for ${seedUrl}`,
            metadata: {
                seedUrl,
                ...metadata,
            },
        });
    }
    logScanComplete(scanId, pagesScanned, durationMs) {
        this.writeLog({
            timestamp: new Date().toISOString(),
            type: 'scan_complete',
            scanId,
            message: `Scan completed: ${pagesScanned} pages in ${durationMs}ms`,
            metadata: {
                pagesScanned,
                durationMs,
            },
        });
    }
    logScanFailed(scanId, error, metadata) {
        this.writeLog({
            timestamp: new Date().toISOString(),
            type: 'scan_failed',
            scanId,
            message: `Scan failed: ${error}`,
            metadata: {
                error,
                ...metadata,
            },
        });
    }
    logScanTimeout(scanId, runtimeMs) {
        this.writeLog({
            timestamp: new Date().toISOString(),
            type: 'scan_timeout',
            scanId,
            message: `Scan timed out after ${runtimeMs}ms`,
            metadata: {
                runtimeMs,
            },
        });
    }
    logScanCreated(scanId, seedUrl, metadata) {
        this.writeLog({
            timestamp: new Date().toISOString(),
            type: 'scan_created',
            scanId,
            message: `Scan created for ${seedUrl}`,
            metadata: {
                seedUrl,
                ...metadata,
            },
        });
    }
    logBlockedByPolicy(scanId, url, reason, metadata) {
        this.writeLog({
            timestamp: new Date().toISOString(),
            type: 'blocked_by_policy',
            scanId,
            message: `URL blocked by policy: ${url} - ${reason}`,
            metadata: {
                url,
                reason,
                ...metadata,
            },
        });
    }
}
export const auditLogger = new AuditLogger();
//# sourceMappingURL=logger.js.map