import type { AuthScanContext } from '@raawi-x/core';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const AUTH_SCAN_CONTEXT_FILE = 'auth-context.json';

export function getAuthScanContextPath(outputDir: string): string {
  return join(outputDir, AUTH_SCAN_CONTEXT_FILE);
}

export async function saveAuthScanContext(outputDir: string, context: AuthScanContext): Promise<void> {
  await writeFile(getAuthScanContextPath(outputDir), JSON.stringify(context, null, 2), 'utf-8');
}

export async function loadAuthScanContext(outputDir: string): Promise<AuthScanContext | null> {
  try {
    const filePath = getAuthScanContextPath(outputDir);
    if (!existsSync(filePath)) {
      return null;
    }
    return JSON.parse(await readFile(filePath, 'utf-8')) as AuthScanContext;
  } catch {
    return null;
  }
}
