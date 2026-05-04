import type { SemanticBuilderInput, SemanticConfidence } from './schema.js';

export interface SemanticSourceMix {
  dom: number;
  vision: number;
  ai: number;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export function scoreToConfidence(score: number): SemanticConfidence {
  if (score >= 0.75) return 'high';
  if (score >= 0.45) return 'medium';
  return 'low';
}

export function computeSourceMix(input: SemanticBuilderInput): SemanticSourceMix {
  const hasDom = Boolean(input.html && input.html.trim().length > 0);
  const hasVision = Boolean(input.vision);
  const hasAi = Boolean(input.assistiveMap);
  const hasA11y = Boolean(input.a11y);

  let domWeight = hasDom ? 0.6 : 0;
  let visionWeight = hasVision ? 0.2 : 0;
  let aiWeight = hasAi ? 0.2 : 0;

  if (hasA11y) {
    domWeight += 0.1;
  }

  const total = domWeight + visionWeight + aiWeight;
  if (total <= 0) {
    return { dom: 0, vision: 0, ai: 0 };
  }

  return {
    dom: round2(domWeight / total),
    vision: round2(visionWeight / total),
    ai: round2(aiWeight / total),
  };
}

export function mixToConfidence(sourceMix: SemanticSourceMix): SemanticConfidence {
  const score = sourceMix.dom * 0.4 + sourceMix.vision * 0.2 + sourceMix.ai * 0.4;
  return scoreToConfidence(score);
}

export function mixToScore(sourceMix: SemanticSourceMix): number {
  return clamp01(sourceMix.dom * 0.4 + sourceMix.vision * 0.2 + sourceMix.ai * 0.4);
}

type Signal = {
  hasSelector?: boolean;
  hasLabel?: boolean;
  hasContent?: boolean;
  hasA11yEvidence?: boolean;
  hasAssistiveEvidence?: boolean;
  hasVisionEvidence?: boolean;
  isStructural?: boolean;
};

export function weightedConfidenceForBlock(sourceMix: SemanticSourceMix, signal: Signal): SemanticConfidence {
  const base = mixToScore(sourceMix);
  const bonus =
    (signal.hasLabel ? 0.06 : 0) +
    (signal.hasContent ? 0.06 : 0) +
    (signal.hasSelector ? 0.05 : 0) +
    (signal.hasA11yEvidence ? 0.04 : 0) +
    (signal.hasAssistiveEvidence ? 0.05 : 0) +
    (signal.hasVisionEvidence ? 0.03 : 0) +
    (signal.isStructural ? 0.03 : 0);
  return scoreToConfidence(clamp01(base + bonus - 0.06));
}

export function weightedConfidenceForAction(sourceMix: SemanticSourceMix, signal: Signal): SemanticConfidence {
  const base = mixToScore(sourceMix);
  const bonus =
    (signal.hasLabel ? 0.07 : 0) +
    (signal.hasSelector ? 0.08 : 0) +
    (signal.hasAssistiveEvidence ? 0.08 : 0) +
    (signal.hasA11yEvidence ? 0.03 : 0);
  return scoreToConfidence(clamp01(base + bonus - 0.04));
}

export function weightedConfidenceForRelationship(sourceMix: SemanticSourceMix, signal: Signal): SemanticConfidence {
  const base = mixToScore(sourceMix);
  const bonus =
    (signal.hasAssistiveEvidence ? 0.08 : 0) +
    (signal.hasA11yEvidence ? 0.05 : 0) +
    (signal.isStructural ? 0.04 : 0);
  return scoreToConfidence(clamp01(base + bonus - 0.08));
}
