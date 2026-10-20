# RAAWI X — Phase 5.6 Remediation Report
## History API Cooperative Wrapping and Teardown Safeguard

**Date:** 2026-10-20  
**Branch:** `feature/semantic-core`  
**Baseline Commit:** `3efbafc3258c79ea40b17bd94910609c620dcfe2` (Phase 5.5)  
**Status:** REMEDIATED & VERIFIED  

---

### 1. Defect Identification & Technical Root Cause

During Phase 5.6 acceptance auditing of SPA lifecycle mechanics, an inspection of `history.pushState` and `history.replaceState` monkey-patching in `apps/widget/src/core/page-tracker.ts` revealed two critical failure modes in host SPA environments:

#### Defect A: Destruction of Host / Third-Party Wrappers Installed Post-Widget
In the prior Phase 5.5 implementation:
```typescript
// On init:
this.originalPushState = history.pushState;
history.pushState = (...args) => {
  this.originalPushState.apply(history, args);
  this.handleUrlTransition();
};

// On destroy:
if (this.originalPushState) {
  history.pushState = this.originalPushState; // BLIND RESTORATION
  this.originalPushState = null;
}
```
If a host application (such as React Router, Next.js client router, Vue Router, or an analytics package like Sentry / Google Analytics) installed its own wrapper on `history.pushState` *after* the widget initialized, tearing down the widget (`destroy()`) would blindly overwrite `history.pushState` with `this.originalPushState`. This destroyed the host's wrapper, silently breaking client-side routing or telemetry on the host page.

#### Defect B: Wrapper Accumulation on Multiple Initialization Cycles
If `PageTracker` was initialized multiple times (e.g. dynamic re-initialization or multiple embeds), each instance wrapped the previously wrapped `history.pushState`, leading to nested wrapper chains, redundant transition dispatches, and corrupted teardown references.

---

### 2. Implemented Remediation: Cooperative History Registry Pattern

To eliminate both defects with senior-developer elegance, `apps/widget/src/core/page-tracker.ts` was refactored to employ a shared cooperative registry pattern:

```typescript
export interface RaawiHistoryRegistry {
  pushListeners: Set<() => void>;
  replaceListeners: Set<() => void>;
  originalPushState: typeof history.pushState | null;
  originalReplaceState: typeof history.replaceState | null;
  wrappedPushState: typeof history.pushState | null;
  wrappedReplaceState: typeof history.replaceState | null;
}

export const HISTORY_REGISTRY_KEY = '__RAAWI_HISTORY_REGISTRY__';
```

#### Core Mechanics:
1. **Single Installation Guarantee:** The monkey-patch is applied only once across all instances and initialization cycles. If `registry.originalPushState` already exists, subsequent instances do not re-wrap `history.pushState`.
2. **Listener Subscription:** Each `PageTracker` instance registers its own transition handler into `registry.pushListeners` and `registry.replaceListeners`. When `pushState` or `replaceState` is invoked, the wrapper executes the native method and dispatches to all registered listeners safely inside `try/catch` blocks.
3. **Safe Teardown & Host-Wrapper Preservation:**
   - On `tracker.destroy()`, the instance removes its listener from the registry sets.
   - When no listeners remain (`registry.pushListeners.size === 0`):
     - It checks: `if (history.pushState === registry.wrappedPushState)`.
     - **Only if `history.pushState` is STILL our wrapper** (meaning no host wrapper was installed on top), it safely restores the native `registry.originalPushState`.
     - **If `history.pushState !== registry.wrappedPushState`** (meaning a host or third-party script wrapped `history.pushState` after us), the widget **refrains from overwriting `history.pushState`**.
     - Leaving the wrapper in place is completely benign because with 0 listeners registered, it transparently forwards all calls and return values directly to `registry.originalPushState`.
4. **Exported Helpers for Testing:** `getHistoryRegistry()` and `resetHistoryRegistryForTests()` were exported for automated verification and test teardown isolation.

---

### 3. Verification & Evidence

#### 3.1. Unit Test Coverage (`apps/widget/test/phase5-6.test.ts`)
Three dedicated unit tests were implemented in Suite 1:
- `wraps pushState and replaceState cooperatively and dispatches to registered listeners`: **PASS** (dispatches transitions, records URL changes, cleans up listener count).
- `preserves host or third-party wrappers installed AFTER the widget upon teardown`: **PASS** (host wrapper on `history.pushState` remains strictly in place and functions after widget `destroy()`).
- `does not accumulate nested wrappers across multiple initialization cycles`: **PASS** (second initialization reuses the active wrapper and only increments listener count; sequential destructions clean up without wrapper leakage).

#### 3.2. Real-Browser Playwright Acceptance (`tests/widget-e2e/acceptance.spec.ts`)
- `Test 4: History API Safeguard: Teardown preserves host-installed pushState interceptors`: **PASS** in real Chromium browser. Host-installed interceptors verified active and invoked after `AccessibilityWidget.destroy()`.

---

### 4. Files Modified for Remediation
1. `apps/widget/src/core/page-tracker.ts`: Implemented `RaawiHistoryRegistry`, `getHistoryRegistry`, `resetHistoryRegistryForTests`, and cooperative wrapping/unwrapping.
2. `apps/widget/src/index.ts`: Re-exported `getHistoryRegistry`, `resetHistoryRegistryForTests`, and `RaawiHistoryRegistry` type.
3. `apps/widget/test/phase5-6.test.ts`: Added unit tests for cooperative wrapping and host-wrapper preservation.
4. `tests/widget-e2e/acceptance.spec.ts`: Added real-browser E2E verification.
5. Rebuilt production bundle `dist/widget.iife.js` (93.38 kB / gzip: 23.01 kB) and synced to test site public directories.
