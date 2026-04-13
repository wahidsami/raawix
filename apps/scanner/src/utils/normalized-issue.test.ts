import { describe, expect, it } from 'vitest';
import { normalizeAgentFinding } from './normalized-issue.js';

describe('normalized issue evidence formatting', () => {
  it('deduplicates repeated evidence messages and keeps a compact summary', () => {
    const finding = normalizeAgentFinding(
      {
        kind: 'missing_focus_indicator',
        message: 'No visible focus indicator detected.',
        confidence: 0.91,
        evidence: Array.from({ length: 6 }, () => ({
          description: 'No visible focus indicator detected. Checked for: outline, border, box-shadow',
        })),
      },
      'https://example.com/page',
      1,
      1,
    );

    expect(finding.evidence).toBe(
      'No visible focus indicator detected. Checked for: outline, border, box-shadow (repeated 6x)',
    );
  });
});
