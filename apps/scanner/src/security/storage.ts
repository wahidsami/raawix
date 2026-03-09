import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve, normalize } from 'node:path';
import { existsSync } from 'node:fs';

export class SecureStorage {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = resolve(normalize(baseDir));
    this.ensureBaseDir();
  }

  private ensureBaseDir(): void {
    if (!existsSync(this.baseDir)) {
      mkdir(this.baseDir, { recursive: true }).catch((err) => {
        console.error('Failed to create base directory:', err);
      });
    }
  }

  /**
   * Sanitize scanId to prevent path traversal
   */
  private sanitizeScanId(scanId: string): string {
    // Remove any path separators and dangerous characters
    return scanId.replace(/[\/\\\.\.]/g, '').replace(/[^a-zA-Z0-9_-]/g, '');
  }

  /**
   * Get safe path for scan output
   */
  private getSafePath(scanId: string, filename: string): string {
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

  async saveScanResult(scanId: string, data: unknown): Promise<string> {
    const filePath = this.getSafePath(scanId, 'result.json');
    const dirPath = join(this.baseDir, this.sanitizeScanId(scanId));

    await mkdir(dirPath, { recursive: true });
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

    return filePath;
  }

  async saveReport(scanId: string, html: string): Promise<string> {
    const filePath = this.getSafePath(scanId, 'report.html');
    const dirPath = join(this.baseDir, this.sanitizeScanId(scanId));

    await mkdir(dirPath, { recursive: true });
    await writeFile(filePath, html, 'utf-8');

    return filePath;
  }
}

