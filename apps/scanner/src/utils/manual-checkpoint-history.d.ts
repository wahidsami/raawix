import type { ManualCheckpoint, ManualCheckpointHistoryEntry } from '@raawi-x/core';
export declare function getManualCheckpointPath(outputDir: string): string;
export declare function getManualCheckpointHistoryPath(outputDir: string): string;
export declare function saveManualCheckpoint(outputDir: string, checkpoint: ManualCheckpoint): Promise<void>;
export declare function clearManualCheckpoint(outputDir: string): Promise<void>;
export declare function loadManualCheckpoint(outputDir: string): Promise<ManualCheckpoint | null>;
export declare function loadManualCheckpointHistory(outputDir: string): Promise<ManualCheckpointHistoryEntry[]>;
export declare function appendManualCheckpointHistory(outputDir: string, entry: ManualCheckpointHistoryEntry): Promise<void>;
export declare function createManualCheckpointHistoryEntry(event: ManualCheckpointHistoryEntry['event'], checkpoint: ManualCheckpoint, options?: {
    message?: string;
    timestamp?: string;
    verificationCodeLength?: number;
}): ManualCheckpointHistoryEntry;
//# sourceMappingURL=manual-checkpoint-history.d.ts.map