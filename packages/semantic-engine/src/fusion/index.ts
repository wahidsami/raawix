import type { SemanticBuilderInput } from '../schema.js';

export interface SemanticFusionSignals {
  hasDom: boolean;
  hasVision: boolean;
  hasAssistiveMap: boolean;
  hasA11y: boolean;
}

export function collectFusionSignals(input: SemanticBuilderInput): SemanticFusionSignals {
  return {
    hasDom: Boolean(input.html && input.html.trim().length > 0),
    hasVision: Boolean(input.vision),
    hasAssistiveMap: Boolean(input.assistiveMap),
    hasA11y: Boolean(input.a11y),
  };
}
