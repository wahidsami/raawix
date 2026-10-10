import type { SemanticBuilderInput, SemanticConfidence } from './schema.js';
export interface SemanticSourceMix {
    dom: number;
    vision: number;
    ai: number;
}
export declare function scoreToConfidence(score: number): SemanticConfidence;
export declare function computeSourceMix(input: SemanticBuilderInput): SemanticSourceMix;
export declare function mixToConfidence(sourceMix: SemanticSourceMix): SemanticConfidence;
export declare function mixToScore(sourceMix: SemanticSourceMix): number;
type Signal = {
    hasSelector?: boolean;
    hasLabel?: boolean;
    hasContent?: boolean;
    hasA11yEvidence?: boolean;
    hasAssistiveEvidence?: boolean;
    hasVisionEvidence?: boolean;
    isStructural?: boolean;
};
export declare function weightedConfidenceForBlock(sourceMix: SemanticSourceMix, signal: Signal): SemanticConfidence;
export declare function weightedConfidenceForAction(sourceMix: SemanticSourceMix, signal: Signal): SemanticConfidence;
export declare function weightedConfidenceForRelationship(sourceMix: SemanticSourceMix, signal: Signal): SemanticConfidence;
export {};
//# sourceMappingURL=confidence.d.ts.map