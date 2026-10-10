import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const AUTH_SCAN_CONTEXT_FILE = 'auth-context.json';
export function getAuthScanContextPath(outputDir) {
    return join(outputDir, AUTH_SCAN_CONTEXT_FILE);
}
export async function saveAuthScanContext(outputDir, context) {
    await writeFile(getAuthScanContextPath(outputDir), JSON.stringify(context, null, 2), 'utf-8');
}
export async function loadAuthScanContext(outputDir) {
    try {
        const filePath = getAuthScanContextPath(outputDir);
        if (!existsSync(filePath)) {
            return null;
        }
        return JSON.parse(await readFile(filePath, 'utf-8'));
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=auth-scan-context.js.map