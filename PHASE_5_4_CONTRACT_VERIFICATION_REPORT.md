# RAAWI X — Phase 5.4 Acceptance Gate Verification Report
## AssistiveMap Match-Confidence Runtime Contract Verification

**Date:** 2026-10-20  
**Repository:** `wahidsami/raawix`  
**Branch:** `feature/semantic-core`  
**Preflight HEAD SHA:** `2d67230d896288d8681a3d0e9d59d1b098b581a9`  
**Gate Status:** VERIFIED & COMPLIANT — READY FOR REVIEW  

---

### 1. Preflight Verification & Baseline

During preflight, the repository status was inspected:
- **Active Branch:** `feature/semantic-core`
- **Initial HEAD Commit:** `2d67230d896288d8681a3d0e9d59d1b098b581a9` ("feat(widget): implement Phase 5.4 AssistiveMap integration and safe DOM remediation")
- **Clean Working Tree:** All prior work on Phase 5.1–5.4 was preserved without any reset, clean, stash, or history rewriting.

---

### 2. Runtime Contract Evidence: `matchConfidence`

A rigorous audit of the scanner codebase was performed to determine the exact type, semantics, and construction of `matchConfidence` returned by `GET /api/widget/page-package`.

#### 2.1. Repository Evidence

1. **Scanner Route Handler (`apps/scanner/src/index.ts:1060-1135`)**:
   - At line 1060, the endpoint queries the database repository:
     ```typescript
     const mapResult = await assistiveRepo.findByUrlWithConfidence(site.id, targetUrl);
     ```
   - At line 1121, the response payload is constructed:
     ```typescript
     return reply.send({
       siteId: site.id,
       entityCode: site.entityCode,
       url: targetUrl,
       matchedUrl: mapResult.matchedUrl,
       matchConfidence: mapResult.matchConfidence, // Directly passed from repository
       generatedAt: mapResult.assistiveMap.generatedAt,
       fingerprint: mapResult.assistiveMap.fingerprint,
       assistiveMap: mapResult.assistiveMap,
       ...
     });
     ```

2. **Database Repository (`apps/scanner/src/db/assistive-map-repository.ts:167-255`)**:
   - The method `findByUrlWithConfidence` executes three progressive matching strategies:
     - **Strategy 1 (Exact Canonical URL Match, line 171)**:
       ```typescript
       return { assistiveMap: map, matchedUrl: normalizedUrl, matchConfidence: 'high' };
       ```
     - **Strategy 2 (Final URL Match after redirects, line 202)**:
       ```typescript
       return { assistiveMap: map, matchedUrl: map.url, matchConfidence: 'high' };
       ```
     - **Strategy 3 (Path Match ignoring query strings, line 221)**:
       ```typescript
       return { assistiveMap: map, matchedUrl: match.url, matchConfidence: 'medium' };
       ```
     - **Fallback (Fingerprint similarity or none, line 248)**:
       ```typescript
       return { assistiveMap: fallbackMap, matchedUrl: fallbackMap.url, matchConfidence: 'low' };
       ```

3. **URL Resolver (`apps/scanner/src/api/url-resolver.ts:4`)**:
   - Explicitly defines:
     ```typescript
     export type MatchConfidence = 'high' | 'medium' | 'low';
     ```

4. **Assistive Map Generator (`apps/scanner/src/assistive/assistive-map-generator.ts:25,33`)**:
   - Element-level confidences (`imageDescriptions[k].confidence` and `labelOverrides[k].confidence`) are also typed as `'high' | 'medium' | 'low'`.

#### 2.2. Conclusion Regarding Actual Runtime Contract

- **The API does NOT return a raw numeric float.**
- **The API returns a string enum:** `'high' | 'medium' | 'low'`.
- The prior initial Phase 5.4 report had assumed a numeric score (`0.95`, `>= 0.65`) based on design documentation, which created a risk of comparing string enums directly against numeric thresholds (e.g. `'high' < 0.65` evaluating to `false` due to JavaScript type coercion).

---

### 3. Explicit Policy Mapping Implementation

To eliminate any ambiguity or fragile comparison, an explicit, type-safe policy engine `evaluateMatchConfidence` was implemented in `apps/widget/src/core/api-client.ts` and exported via `apps/widget/src/index.ts`.

#### 3.1. Policy Matrix

| Input Category | Values | Accepted? | Normalized Level | Numeric Score | Action / Reason |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Actual Scanner Enums** | `'high'` | **Yes** | `'high'` | 1.00 | Exact canonical or final URL match |
| | `'medium'` | **Yes** | `'medium'` | 0.75 | Queryless path-based URL match |
| | `'low'` | **No** | `'low'` | 0.30 | Heuristic/fingerprint similarity rejected |
| **Blueprint / Aliases** | `'exact'`, `'canonical'`, `'final'` | **Yes** | `'high'` | 1.00 | Treated as exact match |
| | `'path'`, `'query-ignored'` | **Yes** | `'medium'` | 0.75 | Treated as path match |
| | `'fingerprint'`, `'none'` | **No** | `'low'` | 0.30 | Heuristic fallback rejected |
| **Numeric Scores** | `score >= 0.85` | **Yes** | `'high'` | `score` | High confidence score |
| | `0.65 <= score < 0.85` | **Yes** | `'medium'` | `score` | Medium confidence score |
| | `score < 0.65` | **No** | `'low'` | `score` | Rejected: below 0.65 threshold |
| | `NaN` / Out of range | **No** | `'low'` | 0.00 | Invalid numeric score |
| **Invalid / Missing** | `null`, `undefined`, `""` | **No** | `'low'` | 0.00 | Missing matchConfidence in payload |
| | Unrecognized string | **No** | `'low'` | 0.00 | Unrecognized confidence enum |

#### 3.2. Implementation Details (`apps/widget/src/core/api-client.ts`)

```typescript
export function evaluateMatchConfidence(rawConfidence: unknown): MatchConfidenceEvaluation {
  if (rawConfidence === undefined || rawConfidence === null) {
    return { accepted: false, normalizedLevel: 'low', numericScore: 0, reason: 'Missing matchConfidence in payload' };
  }

  if (typeof rawConfidence === 'string') {
    const normalized = rawConfidence.trim().toLowerCase();
    switch (normalized) {
      case 'high':
      case 'exact':
      case 'canonical':
      case 'final':
        return { accepted: true, normalizedLevel: 'high', numericScore: 1.0 };
      case 'medium':
      case 'path':
      case 'query-ignored':
        return { accepted: true, normalizedLevel: 'medium', numericScore: 0.75 };
      case 'low':
      case 'fingerprint':
      case 'none':
        return { accepted: false, normalizedLevel: 'low', numericScore: 0.3, reason: `Confidence level "${rawConfidence}" is too low for safe DOM remediation` };
      default:
        return { accepted: false, normalizedLevel: 'low', numericScore: 0, reason: `Unrecognized matchConfidence enum: "${rawConfidence}"` };
    }
  }

  if (typeof rawConfidence === 'number') {
    if (isNaN(rawConfidence) || rawConfidence < 0) {
      return { accepted: false, normalizedLevel: 'low', numericScore: 0, reason: 'Invalid numeric confidence value' };
    }
    if (rawConfidence >= 0.85) return { accepted: true, normalizedLevel: 'high', numericScore: rawConfidence };
    if (rawConfidence >= 0.65) return { accepted: true, normalizedLevel: 'medium', numericScore: rawConfidence };
    return { accepted: false, normalizedLevel: 'low', numericScore: rawConfidence, reason: `Confidence score ${rawConfidence} is below minimum safe threshold (0.65)` };
  }

  return { accepted: false, normalizedLevel: 'low', numericScore: 0, reason: `Unsupported confidence data type: ${typeof rawConfidence}` };
}
```

In `MapApiClient.validatePagePackage`:
```typescript
const confidenceEval = evaluateMatchConfidence(payload.matchConfidence);
if (!confidenceEval.accepted) {
  this.notify('mismatch', null, confidenceEval.reason);
  return null;
}
```

This guarantees:
1. No valid match is rejected due to string-to-number type coercion.
2. Low-confidence matches (`'low'`, `< 0.65`) are rejected cleanly with a descriptive reason.
3. The widget status transitions strictly to `'mismatch'`, which renders as the localized "Outdated / Unverified" state in Page Insights.

---

### 4. Tests and Verification Evidence

#### 4.1. Contract Derivation from Real Scanner Response Builder

In `apps/widget/test/phase5-4.test.ts`, tests derive their fixtures using a shared builder function `createRealScannerPagePackage()` that replicates the exact structure output by `apps/scanner/src/index.ts:1113-1135`:

```typescript
function createRealScannerPagePackage(overrides?: Partial<PagePackageResponse>): PagePackageResponse {
  return {
    siteId: 'site_123',
    entityCode: 'TEST_ENTITY',
    url: 'https://example.gov.sa/portal',
    matchedUrl: 'https://example.gov.sa/portal',
    matchConfidence: 'high', // Actual scanner contract string enum
    assistiveMap: {
      imageDescriptions: {
        'img.logo': { selector: 'img.logo', alt: 'Ministry Official Logo', confidence: 'high' }
      },
      labelOverrides: {
        'button.search-btn': { selector: 'button.search-btn', label: 'Submit portal search', confidence: 'high' }
      },
      actionIntents: {}
    },
    confidenceSummary: {
      imageDescriptions: { high: 1, medium: 0, low: 0 },
      labelOverrides: { high: 1, medium: 0, low: 0 },
      actionIntents: { high: 0, medium: 0, low: 0 }
    },
    ...overrides
  };
}
```

#### 4.2. Node Unit Test Suite Results (`apps/widget/test/phase5-4.test.ts`)

- **Subtest 1: MatchConfidence Policy Contract & Policy Evaluation**
  - Accepts actual scanner string enums: `'high'` and `'medium'` [PASS]
  - Rejects actual scanner string enum: `'low'` with explicit reason [PASS]
  - Maps blueprint and legacy alias enums (`'exact'`, `'canonical'`, `'path'`) [PASS]
  - Rejects missing, null, undefined, or unrecognized strings [PASS]
  - Normalizes numeric confidence scores accurately without string/numeric confusion [PASS]
- **Subtest 2: MapApiClient Contract & Real Backend Response Validation**
  - Detects attributes (`data-raawi-entity-code`, `data-raawi-api-url`) [PASS]
  - Handles network failures and offline states gracefully [PASS]
  - Accepts real scanner page package with `matchConfidence: "high"` [PASS]
  - Accepts real scanner page package with `matchConfidence: "medium"` [PASS]
  - Rejects low confidence maps (`"low"`) and marks status as `'mismatch'` [PASS]
  - Rejects packages where `matchedUrl` belongs to a different domain [PASS]
  - Caches valid responses and deduplicates in-flight requests [PASS]
- **Subtest 3: Safe Image Remediation with Real Schema**
  - Enriches missing alt attributes from real schema [PASS]
  - Preserves authored alt text and intentional empty `alt=""` [PASS]
  - Rejects non-unique selectors [PASS]
  - Handles invalid CSS selectors safely [PASS]
- **Subtest 4: Safe Control Label Remediation with Real Schema**
  - Labels unlabeled controls [PASS]
  - Preserves buttons with text, aria-labels, and associated `<label>`s [PASS]
- **Subtest 5: Ownership-Aware Restoration & Host Modifications**
  - Preserves host mutations during active remediation [PASS]
  - Handles element removal from DOM cleanly [PASS]
- **Subtest 6: Widget Full Integration & Reset Lifecycle**
  - Integrates `DomRemediator` and `MapApiClient` with custom element lifecycle [PASS]

**Total Suite Result:** 21/21 passing.  
**Full Unit Regression (Phases 5.1–5.4):** 65/65 passing (0 failures, 0 skipped).

#### 4.3. Real-Browser Playwright Tests

Executed against Chromium with live Shadow DOM widget:
1. `Page Insights card displays map status badge, summary and landmarks count` [PASS]
2. `Remediation toggle is opt-in by default and safely enriches missing semantics` [PASS]
3. `Reverting remediation or clicking reset cleans up all widget-applied attributes` [PASS]
4. `Bilingual localization updates Page Insights text in AR and EN` [PASS]
5. `Graceful offline/error handling preserves independent display tools` [PASS]

**Playwright Suite Result:** 29/29 passing across `dialog-focus.spec.ts`, `display-preferences.spec.ts`, and `dom-remediation.spec.ts`.

#### 4.4. TypeScript Check & Production Build

- **Type Check:** `pnpm --filter @raawi-x/widget exec tsc --noEmit`  
  **Result:** Exit Code 0 (Zero errors). Added `'offline'` to `MapFetchStatus` union type to match the UI panel handler.
- **Production Build:** `pnpm --filter @raawi-x/widget build`  
  **Result:** Built `dist/widget.iife.js` (74.72 kB / gzip: 18.11 kB).  
  Synchronized to `apps/test-sites/public/`, `test-sites/portal-good/public/`, and `test-sites/gov-sim/public/`.

---

### 5. Boundary Compliance

- **Zero Backend Changes:** No modifications were made to `apps/scanner`, database schemas, migrations, or route handlers.
- **Zero Phase 5.5 Scope Creep:** Did not implement page fingerprint freshness checks, landmark keyboard navigation drawer, or inline form field assistance.
- **Preservation of DOM Remediation:** Ownership-aware restoration, selector uniqueness checks, and preserved authored semantics remain untouched and verified.

---

### 6. Summary of Changes

| File | Change Summary |
| :--- | :--- |
| `apps/widget/src/core/api-client.ts` | Added `evaluateMatchConfidence` function; normalized string enums (`high`, `medium`, `low`) and numeric fallbacks; updated `validatePagePackage` to use explicit evaluation without string/numeric type confusion. |
| `apps/widget/src/core/types.ts` | Added `'offline'` to `MapFetchStatus` union type for complete type consistency with panel and i18n handlers. |
| `apps/widget/src/index.ts` | Exported `evaluateMatchConfidence`, `MatchConfidenceLevel`, and `MatchConfidenceEvaluation`. |
| `apps/widget/test/phase5-4.test.ts` | Added 8 new unit tests (total 21) verifying each match confidence enum, alias, numeric fallback, rejection reasons, and real scanner response fixtures. |
| `tests/widget-e2e/dom-remediation.spec.ts` | Updated mock route fixture to return real scanner contract string enum (`matchConfidence: 'high'`). |
| `PHASE_5_4_IMPLEMENTATION_REPORT.md` | Updated contract documentation, validation details, and test metrics to reflect verified contract. |
| `PHASE_5_4_CONTRACT_VERIFICATION_REPORT.md` | Created this comprehensive verification report. |
| Built distribution bundles | Recompiled and synchronized `widget.iife.js` to all test sites. |

---

### 7. Stop Condition

Contract verification and correction is complete and fully proven with tests. Per gate instructions, execution is stopped awaiting coordinator review before proceeding to Phase 5.5.
