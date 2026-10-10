/**
 * Phase 3: OpenAI Analyst — interprets interaction.json and produces
 * enriched/extra AgentFindings. No browser control. Output is strict JSON schema.
 */
import { z } from 'zod';
import type { InteractionArtifact } from './interaction-agent.js';
export type AnalystCompactInput = {
    url: string;
    title?: string;
    pageNumber: number;
    stepsSummary: Array<{
        i: number;
        action: string;
        role: string | null;
        name: string;
        focusVisible: boolean;
        expanded?: string | null;
        invalid?: string | null;
        selectorHint: string;
    }>;
    probesSummary: Array<{
        name: string;
        success: boolean;
        domChanged?: boolean;
        ariaLiveChanged?: boolean;
        navigationOccurred?: boolean;
        navigationRestored?: boolean;
    }>;
    existingIssues: Array<{
        kind: string;
        message: string;
        confidence: number;
    }>;
    pageProfile?: {
        pageType: string;
        mainHeading: string | null;
        counts: Record<string, number>;
        signals: Record<string, boolean>;
        taskIntents: Array<{
            id: string;
            label: string;
            category: string;
            reason: string;
        }>;
    };
    taskAssessments?: Array<{
        taskId: string;
        label: string;
        category: string;
        result: string;
        summary: string;
    }>;
    journeyRuns?: Array<{
        taskId: string;
        label: string;
        category: string;
        status: string;
        summary: string;
        relatedProbeNames: string[];
        relatedIssueKinds: string[];
    }>;
};
declare const EnrichedFindingSchema: z.ZodObject<{
    kind: z.ZodString;
    message: z.ZodString;
    confidence: z.ZodNumber;
    category: z.ZodOptional<z.ZodString>;
    subcategory: z.ZodOptional<z.ZodString>;
    evidence: z.ZodUnknown;
    suggestedWcagIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    howToVerify: z.ZodOptional<z.ZodString>;
    source: z.ZodLiteral<"openai">;
}, "strip", z.ZodTypeAny, {
    message: string;
    kind: string;
    source: "openai";
    confidence: number;
    evidence?: unknown;
    category?: string | undefined;
    subcategory?: string | undefined;
    suggestedWcagIds?: string[] | undefined;
    howToVerify?: string | undefined;
}, {
    message: string;
    kind: string;
    source: "openai";
    confidence: number;
    evidence?: unknown;
    category?: string | undefined;
    subcategory?: string | undefined;
    suggestedWcagIds?: string[] | undefined;
    howToVerify?: string | undefined;
}>;
export type AgentFindingDraft = z.infer<typeof EnrichedFindingSchema>;
/**
 * Build compact input for the analyst (keeps token usage low).
 */
export declare function buildCompactInput(artifact: InteractionArtifact, title?: string, maxIssuesPerPage?: number): AnalystCompactInput;
/**
 * Returns a stable string representation of the compact input used for the OpenAI user message.
 * Use this for cache key hashing (same input => same string, avoids ordering instability).
 */
export declare function getStableCompactPayload(input: AnalystCompactInput): string;
export type AnalyzeInteractionArtifactOptions = {
    apiKey: string;
    /** Model name (supplied by caller from config.openai.model; default gpt-4.1-mini). */
    model: string;
};
/**
 * Call OpenAI and return enriched findings. On API failure or invalid JSON returns [].
 * Model is always from opts.model (config.openai.model); no hardcoding.
 */
export declare function analyzeInteractionArtifact(input: AnalystCompactInput, opts: AnalyzeInteractionArtifactOptions): Promise<{
    enrichedFindings: AgentFindingDraft[];
}>;
export {};
//# sourceMappingURL=openai-analyst.d.ts.map