# Raawi X — Keyboard/Focus Rules Audit

Audit of WCAG 2.1.1 (Keyboard), 2.1.2 (No Keyboard Trap), and 2.4.7 (Focus Visible): algorithms, inputs, outputs, false positives/negatives, shared utilities, and how an InteractionAgent could complement them.

**Source file:** `packages/rules/src/wcag-rules.ts`  
**Shared utilities:** `packages/rules/src/utils/focus.ts`

---

## Step 1 & 2 — Rules located and code extracted

All three rules live in `packages/rules/src/wcag-rules.ts`. They use:
- `getFocusableElements`, `hasFocusIndicator` from `./utils/focus.js`
- `getSelector` (local helper in wcag-rules.ts)
- `JSDOM` and `page.html` / `page.url` from `PageArtifact`

None use `a11y.json` or any other artifact; input is **HTML only** (and `page.url` for JSDOM base URL where used).

---

## Rule: wcag-2.1.1 (Keyboard Reachable)

**File:** `packages/rules/src/wcag-rules.ts`  
**Export:** `wcag211Rule` (lines 534–641)

### Code snippet

```ts
export const wcag211Rule: Rule = {
  id: 'wcag-2.1.1',
  wcagId: '2.1.1',
  level: 'A',
  title: 'Keyboard Reachable (Heuristic)',
  description: 'All interactive elements should be keyboard accessible via Tab navigation',
  evaluate: (page: PageArtifact): RuleResult => {
    if (!page.html) {
      return { ruleId: 'wcag-2.1.1', wcagId: '2.1.1', status: 'na', confidence: 'high', evidence: [], howToVerify: '...' };
    }
    const dom = new JSDOM(page.html);
    const document = dom.window.document;
    const focusableElements = getFocusableElements(document);

    if (focusableElements.length === 0) {
      return { ..., status: 'na', message: 'No focusable elements found' };
    }

    const unreachableElements: EvidenceItem[] = [];
    const focusSequence: string[] = [];

    focusableElements.forEach((element) => {
      const tabindex = element.getAttribute('tabindex');
      const isDisabled = element.hasAttribute('disabled');
      const selector = getSelector(element);
      focusSequence.push(selector || element.tagName.toLowerCase());

      if (tabindex === '-1' && !isDisabled) {
        unreachableElements.push({
          type: 'element',
          value: element.outerHTML.substring(0, 300),
          selector,
          description: 'Element has tabindex="-1" making it unreachable via Tab',
        });
      }
    });

    if (focusableElements.length < 3) {
      return { status: 'needs_review', confidence: 'low', evidence: [focus sequence text], ... };
    }
    if (unreachableElements.length > 0) {
      return { status: 'needs_review', confidence: 'medium', evidence: unreachableElements, ... };
    }
    return { status: 'pass', confidence: 'medium', evidence: [focus sequence slice], ... };
  },
};
```

### 3a) Algorithm (step-by-step)

1. If `page.html` is missing, return **na** (high confidence).
2. Parse HTML with JSDOM (no `url`/resources in this rule).
3. Get focusable elements via `getFocusableElements(document)` (see utilities).
4. If none, return **na**.
5. For each focusable element:
   - Build a focus sequence string (selector or tagName).
   - If `tabindex="-1"` and element is not `disabled`, add to `unreachableElements`.
6. If `focusableElements.length < 3`: return **needs_review** (low confidence), evidence = focus sequence text.
7. If `unreachableElements.length > 0`: return **needs_review** (medium confidence), evidence = those elements.
8. Otherwise return **pass** (medium confidence), evidence = first 10 of focus sequence.

### 3b) Inputs

- **page.html** (required) — string.
- **PageArtifact** — only `html` (and absence of html); no `a11y`, screenshot, or other artifacts.
- **JSDOM** — static parse only; no live DOM, no computed styles from stylesheets.
- **Sampling:** None; all elements returned by `getFocusableElements` are processed.

### 3c) Outputs

- **na** — no HTML or no focusable elements (high confidence).
- **needs_review** (low) — fewer than 3 focusable elements; evidence = focus sequence.
- **needs_review** (medium) — at least one focusable with `tabindex="-1"` (and not disabled); evidence = those elements.
- **pass** (medium) — ≥3 focusable and none with tabindex="-1" flagged; evidence = truncated focus sequence.

Never returns **fail**.

### 3d) False positives / false negatives

- **False positives:**  
  - **tabindex="-1"** is valid for programmatic focus (e.g. “skip link target”, focus management in modals). Flagging it as “unreachable” can be wrong when the element is focused via script.  
  - **&lt; 3 focusable:** Simple pages (e.g. one form + submit) get needs_review even when fully keyboard accessible.
- **False negatives:**  
  - **No actual Tab order check:** Doesn’t simulate Tab; elements that are focusable in DOM but unreachable in real Tab order (e.g. order broken by tabindex &gt; 0, or dynamic removal) are not detected.  
  - **Visibility:** `getFocusableElements` uses only **inline** `style.display`/`style.visibility`; elements hidden by class or stylesheet are still counted as focusable.  
  - **Duplicates:** Same element can appear multiple times (matches several selectors); focus sequence can repeat.  
  - **No check** for positive tabindex creating wrong order.

---

## Rule: wcag-2.1.2 (No Keyboard Trap)

**File:** `packages/rules/src/wcag-rules.ts`  
**Export:** `wcag212Rule` (lines 647–743)

### Code snippet

```ts
export const wcag212Rule: Rule = {
  id: 'wcag-2.1.2',
  wcagId: '2.1.2',
  level: 'A',
  title: 'No Keyboard Trap',
  description: 'Focus should not get trapped in a region without escape route',
  evaluate: (page: PageArtifact): RuleResult => {
    if (!page.html) { return na; }
    const dom = new JSDOM(page.html);
    const document = dom.window.document;
    const focusableElements = getFocusableElements(document);
    if (focusableElements.length === 0) { return na; }

    const potentialTraps: EvidenceItem[] = [];
    const modals = document.querySelectorAll('[role="dialog"], [role="alertdialog"], .modal, .dialog');
    modals.forEach((modal) => {
      const modalFocusable = Array.from(modal.querySelectorAll('a, button, input, select, textarea, [tabindex]'));
      const hasEscape = modal.querySelector('[aria-label*="close" i], [aria-label*="dismiss" i], .close, [data-dismiss]');
      const hasEscapeKey = modal.getAttribute('data-escape-key') !== 'false';
      if (modalFocusable.length > 0 && !hasEscape && !hasEscapeKey) {
        potentialTraps.push({ type: 'element', value: modal.outerHTML..., selector, description: `Modal/dialog with ${modalFocusable.length} focusable element(s) but no clear escape mechanism detected` });
      }
    });

    const regions = document.querySelectorAll('[role="region"], section, article');
    regions.forEach((region) => {
      const regionFocusable = Array.from(region.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'));
      if (regionFocusable.length > 10) {
        const hasExit = region.querySelector('a[href], button[type="button"]');
        if (!hasExit) {
          potentialTraps.push({ ..., description: `Region with ${regionFocusable.length} focusable elements but no clear exit mechanism` });
        }
      }
    });

    if (potentialTraps.length === 0) return { status: 'pass', confidence: 'low', ... };
    return { status: 'needs_review', confidence: 'low', evidence: potentialTraps, ... };
  },
};
```

### 3a) Algorithm (step-by-step)

1. If no `page.html`, return **na**.
2. Parse HTML with JSDOM; get focusable elements (used only to decide “no focusable” → na).
3. **Modals:** Select `[role="dialog"]`, `[role="alertdialog"]`, `.modal`, `.dialog`. For each:
   - Count focusable inside (a, button, input, select, textarea, [tabindex]).
   - Check “escape”: any descendant matching `[aria-label*="close" i]`, `[aria-label*="dismiss" i]`, `.close`, `[data-dismiss]`, or `data-escape-key` not `"false"`.
   - If modal has focusable and no escape → add to `potentialTraps`.
4. **Regions:** Select `[role="region"]`, `section`, `article`. For each:
   - Count focusable inside (same list but `[tabindex]:not([tabindex="-1"])`).
   - If &gt; 10 focusable, check “exit”: any descendant `a[href]` or `button[type="button"]`. If no exit → add to potentialTraps.
5. If `potentialTraps.length === 0` → **pass** (low confidence); else **needs_review** (low confidence), evidence = potentialTraps.

### 3b) Inputs

- **page.html** only; no other artifacts.
- **JSDOM** static parse; no live DOM.
- **No sampling;** all matching modals and regions are checked.

### 3c) Outputs

- **na** — no HTML or no focusable elements on page.
- **pass** (low confidence) — no modal/region flagged as potential trap.
- **needs_review** (low confidence) — at least one modal or region flagged; evidence = those elements.

Never returns **fail**.

### 3d) False positives / false negatives

- **False positives:**  
  - Modals that close on Escape (via JS) but don’t have the looked-for attributes/classes are flagged.  
  - Regions with &gt;10 focusable and no `a[href]` or `button[type="button"]` (e.g. nav with many links but selector typo) can be flagged.  
  - `.modal` / `.dialog` are class-based; non-dialog UI with those classes can be flagged.
- **False negatives:**  
  - No simulation of Tab or Escape; real traps (e.g. focus never leaving a custom component) are not detected.  
  - Escape handling is inferred from markup only (e.g. `data-escape-key`), not from behavior.  
  - Invisible/hidden modals (e.g. hidden by default) are still checked; traps that appear only when modal opens are not tested.  
  - Regions with ≤10 focusable are ignored even if they trap.

---

## Rule: wcag-2.4.7 (Focus Visible)

**File:** `packages/rules/src/wcag-rules.ts`  
**Export:** `wcag247Rule` (lines 434–532)

### Code snippet

```ts
export const wcag247Rule: Rule = {
  id: 'wcag-2.4.7',
  wcagId: '2.4.7',
  level: 'A',
  title: 'Focus Visible',
  description: 'All focusable elements must have visible focus indicators',
  evaluate: async (page: PageArtifact): Promise<RuleResult> => {
    if (!page.html) { return na; }
    const dom = new JSDOM(page.html, { url: page.url, resources: 'usable' });
    const document = dom.window.document;
    const focusableElements = getFocusableElements(document);
    if (focusableElements.length === 0) { return na; }

    const sampleSize = Math.min(30, focusableElements.length);
    const sample = focusableElements.slice(0, sampleSize);
    const violations: EvidenceItem[] = [];
    let elementsWithIndicator = 0;

    for (const element of sample) {
      const indicator = hasFocusIndicator(element, document);
      if (!indicator.hasIndicator) {
        violations.push({ type: 'element', value: element.outerHTML..., selector, description: `No visible focus indicator detected. Checked for: outline, border, box-shadow` });
      } else {
        elementsWithIndicator++;
      }
    }

    const passRate = elementsWithIndicator / sampleSize;
    const threshold = 0.7;
    if (passRate >= threshold) return { status: 'pass', confidence: 'medium', ... };
    if (violations.length === sampleSize) return { status: 'fail', confidence: 'medium', evidence: violations, ... };
    return { status: 'needs_review', confidence: 'medium', evidence: violations, ... };
  },
};
```

### 3a) Algorithm (step-by-step)

1. If no `page.html`, return **na**.
2. Parse with JSDOM (`url: page.url`, `resources: 'usable'`).
3. Get focusable elements via `getFocusableElements(document)`.
4. If none, return **na**.
5. **Sample:** Take first `min(30, focusableElements.length)` elements (no randomisation).
6. For each sampled element, call `hasFocusIndicator(element, document)` (see utilities).
7. Count how many have `hasIndicator === true`; rest go into `violations`.
8. **passRate** = elementsWithIndicator / sampleSize.
9. If passRate ≥ 0.7 → **pass** (medium confidence).
10. If all sampled are violations → **fail** (medium confidence), evidence = violations.
11. Otherwise → **needs_review** (medium confidence), evidence = violations.

### 3b) Inputs

- **page.html** and **page.url** (for JSDOM base URL).
- **No a11y.json or other artifacts.**
- **Sampling:** First 30 focusable elements only (DOM order).

### 3c) Outputs

- **na** — no HTML or no focusable elements.
- **pass** (medium) — ≥70% of sampled elements have a focus indicator.
- **fail** (medium) — 0% of sampled have indicator; evidence = all sampled.
- **needs_review** (medium) — &gt;0% and &lt;70% with indicator; evidence = elements without indicator.

### 3d) False positives / false negatives

- **False positives:**  
  - Elements that get focus styles only when focused (e.g. `:focus` in a stylesheet) are not detected, because `hasFocusIndicator` only checks **inline** `style.outline`, `style.border`, `style.boxShadow`. They can be reported as “no indicator” even when they have one in the browser.
- **False negatives:**  
  - If the first 30 focusable all have inline focus styles, the rule can **pass** while later elements have no indicator.  
  - Focus styles applied via classes (e.g. `.focus-visible`) or stylesheets are invisible to the rule, so real violations can be missed.

---

## Shared utilities (Step 4)

**File:** `packages/rules/src/utils/focus.ts`

### getFocusableElements(document: Document): Element[]

- **Selectors:** `a[href]`, `button:not([disabled])`, `input:not([disabled])`, `select:not([disabled])`, `textarea:not([disabled])`, `[tabindex]:not([tabindex="-1"])`, `[contenteditable="true"]`.
- **Visibility:** Keeps only elements where **inline** `el.style.display !== 'none'` and `el.style.visibility !== 'hidden'`. Does **not** use `getComputedStyle` or stylesheets.
- **Deduplication:** None; an element matching multiple selectors can appear more than once.
- **Return:** Array of DOM elements (DOM order per selector, then concatenated).

### hasFocusIndicator(element: Element, document: Document): { hasIndicator: boolean; methods: string[] }

- **Checks:** Only **inline** style on `element`:
  - `style.outline` not empty and not `'none'`
  - `style.border` not empty and not `'none'`
  - `style.boxShadow` not empty and not `'none'`
- **Stylesheets:** Not parsed; comment in code states “we rely on inline styles”. The `document` parameter and selector construction (id/classes/tagName) are not used to resolve stylesheet rules.
- **Return:** `hasIndicator` true if any of the three inline properties indicate a visible style; `methods` lists which (e.g. `['outline']`).

**Other:**  
- **getSelector(element)** is defined in `wcag-rules.ts` (lines 421–431): returns `#id`, or `tagName.classes`, or `tagName`. Used by all three rules for evidence selectors.

**Dependencies (wcag-rules.ts top):**

```ts
import type { PageArtifact, RuleResult, EvidenceItem } from '@raawi-x/core';
import type { Rule } from './rule-engine.js';
import { JSDOM } from 'jsdom';
import { getFocusableElements, hasFocusIndicator } from './utils/focus.js';
import { parseColor, getContrastRatio, type RGB } from './utils/contrast.js';
```

Keyboard/focus rules use only: **JSDOM**, **getFocusableElements**, **hasFocusIndicator**, and local **getSelector**. They do **not** use `parseColor` or `getContrastRatio` (those are for contrast rule).

---

## Step 5 — How InteractionAgent could complement (no duplication)

- **2.1.1 (Keyboard):** Rules only look at markup (tabindex, count). An **InteractionAgent** can actually **Tab through the page** and record which elements receive focus and in what order, and whether any focusable element is never reached — closing the “no real Tab order check” gap and validating that the DOM focusability matches real behaviour (including after JS).
- **2.1.2 (No Keyboard Trap):** Rules only infer traps from modal/region structure and escape-related attributes. An **InteractionAgent** can **open modals, press Tab in a loop, press Escape**, and detect if focus never leaves a region or if Escape doesn’t close — real trap detection instead of heuristic markup.
- **2.4.7 (Focus Visible):** Rules only check inline styles on a sample of 30. An **InteractionAgent** can **focus each focusable element** and capture a **screenshot or computed style** when focused, so stylesheet `:focus`/`:focus-visible` and visual appearance are checked — fixing false negatives from stylesheet focus styles and sampling.
- **Shared:** Agent can use the **same** notion of “focusable” (or a stricter one, e.g. browser’s default tab order) so results are comparable; it does not need to re-implement the same static checks.

---

## Gaps InteractionAgent will cover (5–10 bullets)

1. **Real Tab order** — Verify every (or a sampled set of) focusable elements is reachable by Tab and in a sane order; detect positive tabindex or dynamic DOM breaking order.
2. **Actual keyboard trap** — In modals/regions: Tab cycle and Escape; confirm focus leaves or dialog closes instead of relying on aria-label/class heuristics.
3. **Focus visibility with real focus** — Focus each element in a live page and assert visible change (screenshot or computed style), so stylesheet `:focus`/`:focus-visible` and non-inline indicators are covered.
4. **Visibility vs. focusability** — Use computed visibility (or live hit-test) so elements hidden by CSS class/sheet are not treated as focusable, reducing false positives in 2.1.1.
5. **tabindex="-1" in context** — Distinguish programmatic-only focus (e.g. skip target) from “never reachable” by checking whether focus can move to/from the element (e.g. after a “skip” link or in a modal).
6. **Dynamic content** — After interactions (open menu, expand section), run Tab/trap/visibility checks so traps or missing focus only in dynamic states are found.
7. **Escape / Enter / Space behaviour** — Confirm Escape closes dialogs and that Enter/Space activate buttons/links as expected, instead of inferring from `data-escape-key` or similar.
8. **Full focusable set** — Optionally check all focusable elements for focus visible (or a larger sample), not only the first 30 in DOM order.
9. **Duplicate focusable** — Single canonical list (e.g. from browser or one pass) so “focus sequence” and counts are not inflated by duplicate selectors.
10. **Positive tabindex** — Detect when tabindex &gt; 0 creates a confusing or wrong Tab order and report it for review.

---

## Report-back summary (what was done per step)

| Step | What was done |
|------|----------------|
| 1 | Opened `packages/rules/src/wcag-rules.ts` and located the three rules. |
| 2 | Extracted full implementations for `wcag211Rule`, `wcag212Rule`, `wcag247Rule` and the relevant `getSelector` helper; included code snippets in this doc. |
| 3 | For each rule: (a) step-by-step algorithm, (b) inputs (HTML/JSDOM only; 2.4.7 uses sampling of 30), (c) pass/fail/needs_review and when, (d) false positives and false negatives from the logic. |
| 4 | Identified shared utilities in `packages/rules/src/utils/focus.ts` (`getFocusableElements`, `hasFocusIndicator`) and local `getSelector` in wcag-rules.ts; listed dependencies. |
| 5 | Recommended how InteractionAgent can complement (real Tab/trap/focus-visible and dynamic behaviour) without duplicating static markup checks; listed 10 concrete gaps the agent can cover. |

All references use exact file paths and function/export names from the codebase.
