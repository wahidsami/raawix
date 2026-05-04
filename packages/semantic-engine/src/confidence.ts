import type { SemanticBuilderInput, SemanticConfidence } from './schema.js';

export interface SemanticSourceMix {
  dom: number;
  vision: number;
  ai: number;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

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
  if (score >= 0.75) return 'high';
  if (score >= 0.45) return 'medium';
  return 'low';
}
