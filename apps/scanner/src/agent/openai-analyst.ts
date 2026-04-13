/**
 * Phase 3: OpenAI Analyst — interprets interaction.json and produces
 * enriched/extra AgentFindings. No browser control. Output is strict JSON schema.
 */

import { z } from 'zod';
import type { InteractionArtifact } from './interaction-agent.js';
import {
  formatTaxonomyChecklistForPrompt,
  normalizeTaxonomyMatch,
} from '../utils/report-taxonomy.js';

const MAX_STEPS_SUMMARY = 60;

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
};

const EnrichedFindingSchema = z.object({
  kind: z.string(),
  message: z.string(),
  confidence: z.number().min(0).max(1),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  evidence: z.unknown(),
  suggestedWcagIds: z.array(z.string()).optional(),
  howToVerify: z.string().optional(),
  source: z.literal('openai'),
});

const AnalystOutputSchema = z.object({
  enrichedFindings: z.array(EnrichedFindingSchema),
});

export type AgentFindingDraft = z.infer<typeof EnrichedFindingSchema>;

/**
 * Build compact input for the analyst (keeps token usage low).
 */
export function buildCompactInput(
  artifact: InteractionArtifact,
  title?: string,
  maxIssuesPerPage: number = 20
): AnalystCompactInput {
  const steps = artifact.steps.slice(0, MAX_STEPS_SUMMARY).map((s) => ({
    i: s.i,
    action: s.action,
    role: s.active?.role ?? null,
    name: (s.active?.name ?? '').slice(0, 80),
    focusVisible: s.focusVisible ?? false,
    expanded: s.active?.state?.ariaExpanded ?? null,
    invalid: s.active?.state?.ariaInvalid ?? null,
    selectorHint: (s.active?.selectorHint ?? '').slice(0, 60),
  }));

  const probesSummary = (artifact.probes ?? []).map((p) => {
    const ev = (p.evidence ?? {}) as Record<string, unknown>;
    return {
      name: p.name,
      success: p.success,
      domChanged: ev.domChanged as boolean | undefined,
      ariaLiveChanged: ev.ariaLiveChanged as boolean | undefined,
      navigationOccurred: ev.navigationOccurred as boolean | undefined,
      navigationRestored: ev.navigationRestored as boolean | undefined,
    };
  });

  const existingIssues = artifact.issues.slice(0, maxIssuesPerPage).map((iss) => ({
    kind: iss.kind,
    message: (iss.message ?? '').slice(0, 300),
    confidence: typeof iss.confidence === 'number' ? iss.confidence : 0.5,
  }));

  return {
    url: artifact.url,
    title,
    pageNumber: artifact.pageNumber,
    stepsSummary: steps,
    probesSummary,
    existingIssues,
  };
}

/**
 * Returns a stable string representation of the compact input used for the OpenAI user message.
 * Use this for cache key hashing (same input => same string, avoids ordering instability).
 */
export function getStableCompactPayload(input: AnalystCompactInput): string {
  return JSON.stringify(input);
}

const ANALYST_SYSTEM_PROMPT = `You are an accessibility analyst. You receive a compact summary of a keyboard-interaction trace and existing findings for a single web page. Your job is to suggest ADDITIONAL or REFINED findings that would help developers fix accessibility issues.

Rules:
- Use ONLY the provided artifact data; do not assume or invent content.
- Reference step indexes (e.g. "step 3") and probe names (e.g. "modal_probe", "menu_probe", "form_validation_probe") when describing evidence.
- Prefer merging related issues into fewer, clearer findings rather than creating many small ones.
- Classify each finding with the closest category and subcategory from the taxonomy provided in the user message.
- Output valid JSON only, matching this exact schema:
  { "enrichedFindings": [ { "kind": string, "message": string, "confidence": number (0-1), "category": string, "subcategory": string, "evidence": object, "suggestedWcagIds": string[] (optional), "howToVerify": string (optional), "source": "openai" } ] }
- You may suggest new kinds such as: ambiguous_control, poor_label_quality, confusing_focus_order, or reuse existing kinds from the artifact.
- If nothing meaningful to add, return { "enrichedFindings": [] }.
- Keep each message concise (under 200 chars when possible).`;

function buildUserPrompt(input: AnalystCompactInput): string {
  const stepsStr = input.stepsSummary
    .map(
      (s) =>
        `  ${s.i}: ${s.action} role=${s.role ?? 'n/a'} name="${s.name}" focusVisible=${s.focusVisible} expanded=${s.expanded ?? 'n/a'} invalid=${s.invalid ?? 'n/a'} hint=${s.selectorHint}`
    )
    .join('\n');
  const probesStr = input.probesSummary
    .map(
      (p) =>
        `  ${p.name}: success=${p.success} domChanged=${p.domChanged ?? 'n/a'} ariaLiveChanged=${p.ariaLiveChanged ?? 'n/a'} navOccurred=${p.navigationOccurred ?? 'n/a'} navRestored=${p.navigationRestored ?? 'n/a'}`
    )
    .join('\n');
  const issuesStr = input.existingIssues
    .map((i) => `  ${i.kind}: ${i.message} (confidence=${i.confidence})`)
    .join('\n');

  return `Page: ${input.url}
Title: ${input.title ?? 'n/a'}
Page number: ${input.pageNumber}

Steps (focus trace, max ${MAX_STEPS_SUMMARY}):
${stepsStr}

Probes:
${probesStr}

Existing issues:
${issuesStr}

Allowed report taxonomy:
${formatTaxonomyChecklistForPrompt()}

Suggest additional or refined accessibility findings as JSON (enrichedFindings array). Reference step indexes and probe names in evidence. Output only the JSON object.`;
}

function parseAndValidateOutput(raw: string): AgentFindingDraft[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const result = AnalystOutputSchema.safeParse(parsed);
  if (!result.success) {
    return [];
  }
  const findings = result.data.enrichedFindings;
  const valid: AgentFindingDraft[] = [];
  for (const f of findings) {
    const confidence = Number.isFinite(f.confidence)
      ? Math.max(0, Math.min(1, f.confidence))
      : 0.5;
    if (!f.kind || typeof f.message !== 'string') continue;
    const taxonomy = normalizeTaxonomyMatch({
      category: f.category as any,
      subcategory: f.subcategory,
    });
    valid.push({
      kind: String(f.kind).slice(0, 120),
      message: String(f.message).slice(0, 1000),
      confidence,
      category: taxonomy.category,
      subcategory: taxonomy.subcategory,
      evidence: f.evidence ?? {},
      suggestedWcagIds: Array.isArray(f.suggestedWcagIds) ? f.suggestedWcagIds.slice(0, 10) : undefined,
      howToVerify: typeof f.howToVerify === 'string' ? f.howToVerify.slice(0, 500) : undefined,
      source: 'openai',
    });
  }
  return valid;
}

export type AnalyzeInteractionArtifactOptions = {
  apiKey: string;
  /** Model name (supplied by caller from config.openai.model; default gpt-4.1-mini). */
  model: string;
};

/**
 * Call OpenAI and return enriched findings. On API failure or invalid JSON returns [].
 * Model is always from opts.model (config.openai.model); no hardcoding.
 */
export async function analyzeInteractionArtifact(
  input: AnalystCompactInput,
  opts: AnalyzeInteractionArtifactOptions
): Promise<{ enrichedFindings: AgentFindingDraft[] }> {
  if (!opts.apiKey?.trim()) {
    return { enrichedFindings: [] };
  }

  try {
    const { OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: opts.apiKey });

    const response = await client.chat.completions.create({
      model: opts.model,
      messages: [
        { role: 'system', content: ANALYST_SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(input) },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      return { enrichedFindings: [] };
    }

    const enrichedFindings = parseAndValidateOutput(content);
    return { enrichedFindings };
  } catch (_err) {
    return { enrichedFindings: [] };
  }
}
