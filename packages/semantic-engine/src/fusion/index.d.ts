import type { SemanticBuilderInput } from '../schema.js';
export interface SemanticFusionSignals {
    hasDom: boolean;
    hasVision: boolean;
    hasAssistiveMap: boolean;
    hasA11y: boolean;
}
export declare function collectFusionSignals(input: SemanticBuilderInput): SemanticFusionSignals;
//# sourceMappingURL=index.d.ts.map