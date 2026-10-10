import type { AuthScanContext } from '@raawi-x/core';
export declare function getAuthScanContextPath(outputDir: string): string;
export declare function saveAuthScanContext(outputDir: string, context: AuthScanContext): Promise<void>;
export declare function loadAuthScanContext(outputDir: string): Promise<AuthScanContext | null>;
//# sourceMappingURL=auth-scan-context.d.ts.map