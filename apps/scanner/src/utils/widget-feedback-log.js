import { appendFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
export async function appendWidgetFeedbackEvent(baseOutputDir, feedbackDir, event) {
    const root = resolve(baseOutputDir);
    const dir = resolve(join(root, feedbackDir));
    if (!dir.startsWith(root)) {
        throw new Error('Invalid feedback directory path');
    }
    await mkdir(dir, { recursive: true });
    const path = join(dir, 'widget-feedback.jsonl');
    await appendFile(path, `${JSON.stringify(event)}\n`, 'utf-8');
}
//# sourceMappingURL=widget-feedback-log.js.map