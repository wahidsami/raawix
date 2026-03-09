# Raawi X — Accessibility Snapshot (a11y.json) Explanation

Exact code references, JSON shape, consumers, and limitations.

---

## Step 1 — Code block that writes a11y.json and sets result.a11yPath

**File:** `apps/scanner/src/crawler/page-capture.ts`  
**Location:** Lines 283–312 (inside `PageCapture.capturePage`).

This block runs after: link extraction and L1-done SSE; before: Vision analysis.

---

## Step 2 — Code snippet that generates the snapshot

**File:** `apps/scanner/src/crawler/page-capture.ts`

```ts
      // Capture accessibility snapshot
      try {
        // Use evaluate to get accessibility tree
        const a11ySnapshot = await page.evaluate(() => {
          // Best-effort accessibility snapshot
          const elements = document.querySelectorAll('*');
          const a11yData: any[] = [];
          elements.forEach((el) => {
            const computed = window.getComputedStyle(el);
            if (computed.display !== 'none' && computed.visibility !== 'hidden') {
              a11yData.push({
                tag: el.tagName,
                id: el.id || undefined,
                class: el.className || undefined,
                role: el.getAttribute('role') || undefined,
                ariaLabel: el.getAttribute('aria-label') || undefined,
                ariaLabelledBy: el.getAttribute('aria-labelledby') || undefined,
                text: el.textContent?.substring(0, 100) || undefined,
              });
            }
          });
          return a11yData;
        });
        const a11yPath = join(pageDir, 'a11y.json');
        await writeFile(a11yPath, JSON.stringify(a11ySnapshot, null, 2), 'utf-8');
        result.a11yPath = a11yPath;
      } catch (error) {
        // Accessibility snapshot is best-effort, don't fail if it errors
        console.warn(`Failed to capture a11y snapshot for ${url}:`, error);
      }
```

**Summary:** Runs in the browser via `page.evaluate()`. Iterates all elements (`*`), keeps only those with `display !== 'none'` and `visibility !== 'hidden'`, and for each pushes one object with the seven fields below. The return value is written to `{pageDir}/a11y.json` and the path is set on `result.a11yPath`.

---

## Step 3 — Produced JSON schema/shape

The file is a single JSON array. Each item is an object with these keys (all optional in the sense that attributes may be missing, in which case the code uses `|| undefined`):

| Key            | Type    | Source | Notes |
|----------------|---------|--------|--------|
| `tag`          | string  | `el.tagName` | e.g. `"DIV"`, `"BUTTON"` (uppercase from DOM) |
| `id`           | string \| undefined | `el.id` | Empty string becomes `undefined` |
| `class`        | string \| undefined | `el.className` | Full class list string |
| `role`         | string \| undefined | `el.getAttribute('role')` | Author role only |
| `ariaLabel`    | string \| undefined | `el.getAttribute('aria-label')` | |
| `ariaLabelledBy` | string \| undefined | `el.getAttribute('aria-labelledby')` | |
| `text`         | string \| undefined | `el.textContent?.substring(0, 100)` | First 100 chars of text content |

**Structure outline:**

```ts
// a11y.json root = array of element snapshots
type A11ySnapshot = A11yElement[];

interface A11yElement {
  tag: string;           // e.g. "DIV", "A", "INPUT"
  id?: string;
  class?: string;
  role?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  text?: string;         // max 100 chars
}
```

**Filtering:** Only elements with `getComputedStyle(el).display !== 'none'` and `getComputedStyle(el).visibility !== 'hidden'` are included. No selector or tree structure is stored; order is DOM order.

---

## Step 4 — Where a11y.json is read/consumed

### 4.1 Loading the file and attaching to artifact

**File:** `apps/scanner/src/runner/report-generator.ts`  
**Function:** `ReportGenerator.loadPageArtifact` (private)  
**Lines:** 100–108

```ts
      // Load a11y snapshot if available
      if (artifact.a11yPath) {
        try {
          const a11yContent = await readFile(artifact.a11yPath, 'utf-8');
          artifact.a11y = JSON.parse(a11yContent);
        } catch {
          // a11y file not found or unreadable
        }
      }
```

So the only place that **reads** the a11y.json file and parses it is `report-generator.ts` in `loadPageArtifact`. The result is assigned to `artifact.a11y` (type `unknown` on `PageArtifact`).

### 4.2 Other uses of a11y path or artifact.a11y

- **Path only (no read of content):**
  - `apps/scanner/src/crawler/bfs-crawler.ts` — passes `pageResult.a11yPath` into `scanRepository.upsertPage`.
  - `apps/scanner/src/job-queue.ts` — same when upserting page after sequential capture.
  - `apps/scanner/src/db/scan-repository.ts` — persists `page.a11yPath` to DB `Page` model.
  - `apps/scanner/src/api/widget-service.ts` — includes `a11yPath` in page objects for URL resolution (path only).
  - `apps/scanner/src/api/db-adapter.ts` — maps `page.a11yPath` to API response.
  - `apps/scanner/src/api/response-adapter.ts` — includes `a11yPath` in page in API response.

- **Content (`artifact.a11y`):** No other file reads or uses `artifact.a11y` after it is set in `loadPageArtifact`. The WCAG rules in `packages/rules` use `page.html` and JSDOM only; assistive and form-assist code do not reference `artifact.a11y`.

**Conclusion:** a11y.json is generated and stored, and its path is persisted and exposed via API. The **contents** are only loaded in `ReportGenerator.loadPageArtifact` and stored on `artifact.a11y`; nothing in the codebase (rules, assistive map, form assist, widget) currently uses that parsed data.

---

## Step 5 — Helper type/interface for the snapshot

There is **no** dedicated type or interface for the a11y snapshot in the repo.

- In **page-capture.ts**, the in-browser array is typed as `any[]` (`const a11yData: any[] = [];`).
- In **@raawi-x/core**, `PageArtifact` has `a11y?: unknown` (`packages/core/src/index.ts`, around line 117).

So the shape is only defined implicitly by the `page.evaluate` object literal; there is no shared TypeScript type or JSON schema for the snapshot.

---

## Report-back summary

| Step | What was done |
|------|----------------|
| 1 | Located the block in `apps/scanner/src/crawler/page-capture.ts` (lines 283–312) that writes a11y.json and sets `result.a11yPath`. |
| 2 | Copied the full `page.evaluate` and write/path-assignment snippet from that file. |
| 3 | Described the JSON as an array of objects with `tag`, `id`, `class`, `role`, `ariaLabel`, `ariaLabelledBy`, `text`; documented filtering (visible only) and 100-char truncation for text. |
| 4 | Identified the only consumer of the file content: `ReportGenerator.loadPageArtifact` in `apps/scanner/src/runner/report-generator.ts` (reads file, sets `artifact.a11y`). Listed all other references as path-only (storage/API). Confirmed no use of `artifact.a11y` elsewhere. |
| 5 | Noted there is no helper type: in-page type is `any[]`, and `PageArtifact.a11y` is `unknown`. |

---

## Limitations (from code evidence)

1. **No computed accessible name** — Only raw `aria-label` and `aria-labelledby` are stored. There is no use of the browser’s computed accessible name (e.g. from labels, placeholder, or name from content).
2. **No states** — No `aria-expanded`, `aria-selected`, `aria-checked`, `aria-disabled`, or similar; no `disabled` or other state.
3. **No semantics beyond role** — Implicit ARIA semantics (e.g. `<button>` → button role) are not captured; only explicit `role` attribute.
4. **No structure/selector** — No parent/child relationship, index, or selector; elements are a flat list in DOM order, so tree or “which input is this?” is hard to recover.
5. **Visibility is coarse** — Only `display !== 'none'` and `visibility !== 'hidden'`; no check for `opacity`, `width/height`, off-screen, or aria-hidden.
6. **Text truncation** — `text` is limited to 100 characters per element.
7. **No name/description/role from accessibility tree** — This is a DOM + attribute snapshot, not a serialized accessibility tree (no full name/description/role from the browser’s a11y tree).
8. **Not used downstream** — The parsed snapshot is never read by any rule or assistive logic; only the path is used for storage and API.
