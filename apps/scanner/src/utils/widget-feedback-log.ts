import { appendFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export interface WidgetFeedbackEvent {
  at: string;
  url: string;
  event: string;
  scanId?: string;
  locale?: string;
  severity?: 'info' | 'warn' | 'error';
  payload?: Record<string, unknown>;
  userAgent?: string;
  ip?: string;
}

export async function appendWidgetFeedbackEvent(baseOutputDir: string, feedbackDir: string, event: WidgetFeedbackEvent): Promise<void> {
  const root = resolve(baseOutputDir);
  const dir = resolve(join(root, feedbackDir));
  if (!dir.startsWith(root)) {
    throw new Error('Invalid feedback directory path');
  }

  await mkdir(dir, { recursive: true });
  const path = join(dir, 'widget-feedback.jsonl');
  await appendFile(path, `${JSON.stringify(event)}\n`, 'utf-8');
}
