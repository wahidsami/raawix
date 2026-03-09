/**
 * In-memory cache for OpenAI analyst results.
 * Key: pageFingerprint:hash(stableCompactPayload):model
 * Value: analyst output JSON (enrichedFindings)
 * TTL from config.agentAnalyst.cacheTtlMs
 * Using stable compact input payload (not full interaction.json) reduces cache misses and ordering issues.
 */

import { createHash } from 'node:crypto';

export type CacheEntry = {
  enrichedFindings: Array<{
    kind: string;
    message: string;
    confidence: number;
    evidence: unknown;
    suggestedWcagIds?: string[];
    howToVerify?: string;
    source: 'openai';
  }>;
  cachedAt: number;
};

const store = new Map<string, CacheEntry>();
let ttlMs = 604800000; // 7d default

export function setAgentAnalystCacheTtl(ms: number): void {
  ttlMs = ms;
}

function hashString(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 24);
}

/**
 * Build cache key from page identifier, stable compact input payload, and model name.
 * Use getStableCompactPayload(compactInput) from openai-analyst for the second argument.
 */
export function agentAnalystCacheKey(
  pageFingerprint: string,
  stableCompactPayload: string,
  model: string
): string {
  const h = hashString(stableCompactPayload);
  return `${pageFingerprint}:${h}:${model}`;
}

export function getAgentAnalystCached(key: string): CacheEntry['enrichedFindings'] | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > ttlMs) {
    store.delete(key);
    return null;
  }
  return entry.enrichedFindings;
}

export function setAgentAnalystCached(
  key: string,
  enrichedFindings: CacheEntry['enrichedFindings']
): void {
  store.set(key, { enrichedFindings, cachedAt: Date.now() });
}
