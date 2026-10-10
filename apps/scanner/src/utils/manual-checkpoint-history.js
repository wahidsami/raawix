import { existsSync } from 'node:fs';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const MANUAL_CHECKPOINT_FILE = 'manual-checkpoint.json';
const MANUAL_CHECKPOINT_HISTORY_FILE = 'manual-checkpoint-history.json';
export function getManualCheckpointPath(outputDir) {
    return join(outputDir, MANUAL_CHECKPOINT_FILE);
}
export function getManualCheckpointHistoryPath(outputDir) {
    return join(outputDir, MANUAL_CHECKPOINT_HISTORY_FILE);
}
export async function saveManualCheckpoint(outputDir, checkpoint) {
    await writeFile(getManualCheckpointPath(outputDir), JSON.stringify(checkpoint, null, 2), 'utf-8');
}
export async function clearManualCheckpoint(outputDir) {
    await rm(getManualCheckpointPath(outputDir), { force: true }).catch(() => { });
}
export async function loadManualCheckpoint(outputDir) {
    try {
        const filePath = getManualCheckpointPath(outputDir);
        if (!existsSync(filePath)) {
            return null;
        }
        return JSON.parse(await readFile(filePath, 'utf-8'));
    }
    catch {
        return null;
    }
}
export async function loadManualCheckpointHistory(outputDir) {
    try {
        const filePath = getManualCheckpointHistoryPath(outputDir);
        if (!existsSync(filePath)) {
            return [];
        }
        const parsed = JSON.parse(await readFile(filePath, 'utf-8'));
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
export async function appendManualCheckpointHistory(outputDir, entry) {
    const entries = await loadManualCheckpointHistory(outputDir);
    entries.push(entry);
    await writeFile(getManualCheckpointHistoryPath(outputDir), JSON.stringify(entries, null, 2), 'utf-8');
}
export function createManualCheckpointHistoryEntry(event, checkpoint, options) {
    return {
        id: `${event}-${checkpoint.pageNumber}-${Date.now()}`,
        event,
        timestamp: options?.timestamp ?? new Date().toISOString(),
        pageNumber: checkpoint.pageNumber,
        pageUrl: checkpoint.pageUrl,
        message: options?.message ?? checkpoint.message,
        source: checkpoint.source,
        formPurpose: checkpoint.formPurpose,
        checkpointHeading: checkpoint.checkpointHeading,
        otpLikeFields: checkpoint.otpLikeFields,
        hasResendCode: checkpoint.hasResendCode,
        hasForgotPassword: checkpoint.hasForgotPassword,
        ...(typeof options?.verificationCodeLength === 'number'
            ? { verificationCodeLength: options.verificationCodeLength }
            : {}),
    };
}
//# sourceMappingURL=manual-checkpoint-history.js.map