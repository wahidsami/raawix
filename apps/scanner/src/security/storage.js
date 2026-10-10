import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve, normalize } from 'node:path';
import { existsSync } from 'node:fs';
export class SecureStorage {
    baseDir;
    constructor(baseDir) {
        this.baseDir = resolve(normalize(baseDir));
        this.ensureBaseDir();
    }
    ensureBaseDir() {
        if (!existsSync(this.baseDir)) {
            mkdir(this.baseDir, { recursive: true }).catch((err) => {
                console.error('Failed to create base directory:', err);
            });
        }
    }
    /**
     * Sanitize scanId to prevent path traversal
     */
    sanitizeScanId(scanId) {
        // Remove any path separators and dangerous characters
        return scanId.replace(/[\/\\\.\.]/g, '').replace(/[^a-zA-Z0-9_-]/g, '');
    }
    /**
     * Get safe path for scan output
     */
    getSafePath(scanId, filename) {
        const sanitizedScanId = this.sanitizeScanId(scanId);
        const sanitizedFilename = filename.replace(/[\/\\\.\.]/g, '').replace(/[^a-zA-Z0-9_.-]/g, '');
        const fullPath = join(this.baseDir, sanitizedScanId, sanitizedFilename);
        const resolvedPath = resolve(fullPath);
        // Ensure the resolved path is still within baseDir (prevent path traversal)
        if (!resolvedPath.startsWith(this.baseDir)) {
            throw new Error('Path traversal detected');
        }
        return resolvedPath;
    }
    async saveScanResult(scanId, data) {
        const filePath = this.getSafePath(scanId, 'result.json');
        const dirPath = join(this.baseDir, this.sanitizeScanId(scanId));
        await mkdir(dirPath, { recursive: true });
        await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
        return filePath;
    }
    async saveReport(scanId, html) {
        const filePath = this.getSafePath(scanId, 'report.html');
        const dirPath = join(this.baseDir, this.sanitizeScanId(scanId));
        await mkdir(dirPath, { recursive: true });
        await writeFile(filePath, html, 'utf-8');
        return filePath;
    }
}
//# sourceMappingURL=storage.js.map