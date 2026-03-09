import { describe, it, expect } from 'vitest';
import { validateAgentArtifact } from './interaction-agent.js';

describe('interaction-agent', () => {
  describe('validateAgentArtifact', () => {
    it('returns null for non-object', () => {
      expect(validateAgentArtifact(null)).toBeNull();
      expect(validateAgentArtifact(undefined)).toBeNull();
      expect(validateAgentArtifact('')).toBeNull();
      expect(validateAgentArtifact(42)).toBeNull();
    });

    it('returns null when url or pageNumber missing', () => {
      expect(validateAgentArtifact({ pageNumber: 1, steps: [], issues: [] })).toBeNull();
      expect(validateAgentArtifact({ url: 'https://a.com', steps: [], issues: [] })).toBeNull();
    });

    it('returns null when steps or issues are not arrays', () => {
      expect(
        validateAgentArtifact({ url: 'https://a.com', pageNumber: 1, steps: {}, issues: [] })
      ).toBeNull();
      expect(
        validateAgentArtifact({ url: 'https://a.com', pageNumber: 1, steps: [], issues: null })
      ).toBeNull();
    });

    it('returns artifact when shape is valid', () => {
      const artifact = {
        url: 'https://example.com',
        pageNumber: 1,
        capturedAt: new Date().toISOString(),
        steps: [],
        issues: [],
      };
      expect(validateAgentArtifact(artifact)).toEqual(artifact);
    });

    it('returns artifact with issues array', () => {
      const artifact = {
        url: 'https://example.com',
        pageNumber: 1,
        capturedAt: new Date().toISOString(),
        steps: [{ i: 0, action: 'tab', active: { tag: 'button' }, focusVisible: true }],
        issues: [
          {
            kind: 'focus_trap',
            message: 'Focus trapped',
            confidence: 0.9,
            evidence: { stepIndexes: [0, 1, 2] },
          },
        ],
      };
      expect(validateAgentArtifact(artifact)).toEqual(artifact);
    });
  });
});
