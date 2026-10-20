# RAAWI X — Phase 5: Accessibility Widget Audit and Implementation Blueprint

**Document Reference:** `PHASE_5_WIDGET_AUDIT_AND_IMPLEMENTATION_BLUEPRINT.md`  
**Coordinator Authorization:** APPROVED FOR LOCAL REPOSITORY AUDIT AND PLANNING ONLY  
**Repository:** `wahidsami/raawix`  
**Branch:** `feature/semantic-core`  
**Current Baseline Commit:** `742879c6f86a591056abffca45df522c33dae862`  
**Status:** COMPLETE AUDIT & IMPLEMENTATION BLUEPRINT (STOPPED FOR COORDINATOR REVIEW)

---

## Executive Summary

An exhaustive technical audit of the Raawi X accessibility-assistance widget codebase (`apps/widget`, `apps/agent-runtime`, `packages/semantic-engine`, `packages/core`, `apps/scanner`, and `tests/widget-e2e`) was conducted. 

The audit confirms the project owner's assessment: **the existing widget is an incomplete, fragile, 9,689-line monolithic prototype.** While it demonstrates proof-of-concept capabilities for querying scanner APIs and invoking speech heuristics, it suffers from severe architectural, visual, and accessibility deficiencies:
1. **Host DOM & Style Pollution:** The widget injects raw CSS and HTML directly into the host document without Shadow DOM isolation, using destructive global rules (`html[data-raawi-text-size] body * { font-size: inherit !important; }` and `html[data-raawi-line-spacing] * { line-height: calc(1.5 * var(--raawi-line-spacing)) !important; }`) that annihilate the visual hierarchy of host websites.
2. **Broken Arabic Localization:** Despite declaring bilingual intent, the language toggle contains an empty stub (`updateFeatureTexts()`). When toggling to Arabic, only the four tab labels change; the entire inner control surface remains in English.
3. **Accessibility Anti-Patterns:** The panel specifies `aria-modal="false"` and explicitly refuses to move focus upon opening (`// Don't move focus - let user navigate naturally`), forcing keyboard and screen-reader users to tab blindly through the underlying page. Furthermore, screen-reader users are subjected to unprompted Web Speech synthesis speaking aloud simultaneously over their system screen readers (NVDA, JAWS, VoiceOver).
4. **Passive Map Consumption:** The widget fetches `/api/widget/page-package`, but only uses `assistiveMap` data reactively when specific voice/audio tools are clicked. It never remediates the host DOM (e.g., populating missing `alt` or `aria-label` attributes for external assistive tech).
5. **Runtime Syntax Hazards:** A critical selector bug in `detectAuthFlow()` invokes `document.querySelectorAll('button:contains("login"), ...')`, which is invalid CSS Level 3 and throws a `DOMException: SyntaxError` in standard browsers.
6. **Bloated & Fragile Assets:** The widget attempts to load an uncompressed 2.56 MB icon (`RaawixIcon.png`) or falls back to an unstyled green circle with a capital letter "A", giving it an amateur developer-prototype appearance.

This blueprint establishes the root-cause findings and specifies a comprehensive, phased architecture to transform the widget into an enterprise-grade, Arabic-first, Shadow-DOM-isolated, genuine assistive product.

---

## 1. Audit of the Existing Implementation

### 1.1 Source of Truth, Build Pipeline, and Packaging
* **Source Location:** `apps/widget`
* **Entry Point:** [`apps/widget/src/widget.ts`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts)
* **Build Configuration:** [`apps/widget/vite.config.ts`](file:///d:/Waheed/RaawiX/apps/widget/vite.config.ts)
  - Uses Vite 5.0 in library mode.
  - Generates a single IIFE bundle: `dist/widget.iife.js` (~200 KB minified).
  - IIFE global export: `window.RaawiXAccessibility` (`export default AccessibilityWidget`).
* **Source Complexity:**
  - `apps/widget/src/widget.ts` spans **9,689 lines of code (341 KB)** in a single monolithic class `AccessibilityWidget`.
  - It mixes DOM UI creation, raw CSS string concatenation, Web Speech recognition, Web Speech synthesis, Saudi SSO (Nafath/Najiz) heuristics, DOM reading masks, canvas screen magnifiers, audio playback, and semantic action dispatch.
  - Adjacent modules exist ([`semantic-runtime.ts`](file:///d:/Waheed/RaawiX/apps/widget/src/semantic-runtime.ts), [`action-execution.ts`](file:///d:/Waheed/RaawiX/apps/widget/src/action-execution.ts), [`page-fingerprint.ts`](file:///d:/Waheed/RaawiX/apps/widget/src/page-fingerprint.ts), [`semantic-cursor.ts`](file:///d:/Waheed/RaawiX/apps/widget/src/semantic-cursor.ts)), but `widget.ts` contains large duplicate inline definitions of these same concepts.

### 1.2 Embedding and Host Page Lifecycle
* **Host Injection Pattern:** Identified in [`apps/widget/example.html`](file:///d:/Waheed/RaawiX/apps/widget/example.html), [`test-sites/portal-good/src/components/Layout.tsx`](file:///d:/Waheed/RaawiX/test-sites/portal-good/src/components/Layout.tsx#L14-L36), and [`test-sites/gov-sim/src/components/Layout.tsx`](file:///d:/Waheed/RaawiX/test-sites/gov-sim/src/components/Layout.tsx#L14-L35):
  ```javascript
  window.RAWI_API_URL = 'https://api.example.com';
  window.RAWI_ENTITY_CODE = 'MOH-001';
  window.VOICE_ENABLED = true;
  const script = document.createElement('script');
  script.src = '/widget.iife.js';
  script.async = true;
  document.body.appendChild(script);
  ```
* **Auto-Initialization:** [`apps/widget/src/widget.ts:L9665-9686`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L9665-L9686) auto-instantiates on script execution:
  ```typescript
  if (typeof window !== 'undefined') {
    if (!(window as any).raawiAccessibilityWidget) {
      (window as any).raawiAccessibilityWidget = new AccessibilityWidget();
    }
  }
  ```
* **Lifecycle / Teardown Defect:** There is no `destroy()` or unmount lifecycle method. When single-page applications (React, Vue) navigate or unmount the embedding component, the widget’s global event listeners (`scroll`, `keydown`, `mousemove`, `SpeechRecognition`, `MutationObserver`) and injected DOM elements remain permanently bound, causing memory leaks and detached DOM collisions.

### 1.3 Host Isolation and CSS Pollution Audit
* **No Shadow DOM:** A ripgrep search for `attachShadow` in `apps/widget` returned **0 results**.
* **Global Injection:** In [`apps/widget/src/widget.ts:L1185`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L1185) and [`L1230`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L1230), the widget appends `<style id="raawi-accessibility-styles">` directly to `document.head` and the launcher button/panel directly to `document.body`.
* **Destructive Style Rules:** The injected CSS contains hyper-aggressive universal selectors targeting host elements:
  - [`apps/widget/src/widget.ts:L1018-1021`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L1018-L1021):
    ```css
    html[data-raawi-text-size] body,
    html[data-raawi-text-size] body * {
      font-size: inherit !important;
    }
    ```
    *Impact:* When the text size slider is moved, **every element on the host page** (`h1`, `h2`, `h3`, `p`, `small`, buttons, nav items) is forced to the same base font size via `inherit !important`, destroying all semantic typographic scale and visual hierarchy.
  - [`apps/widget/src/widget.ts:L1023-1025`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L1023-L1025):
    ```css
    html[data-raawi-line-spacing] * {
      line-height: calc(1.5 * var(--raawi-line-spacing)) !important;
    }
    ```
    *Impact:* Forces line heights on icons, compact buttons, badges, and tables, causing massive layout overflows.
  - [`apps/widget/src/widget.ts:L1033-1040`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L1033-L1040):
    ```css
    html[data-raawi-contrast-mode="true"] body {
      background: var(--raawi-contrast-bg) !important;
      color: var(--raawi-contrast-text) !important;
    }
    html[data-raawi-contrast-mode="true"] a {
      color: var(--raawi-contrast-link) !important;
    }
    ```
    *Impact:* Naively changes `body` to black and text to white without handling nested white containers, resulting in invisible white-on-white text in modern card-based layouts.

### 1.4 Syntax and Runtime Crashes
* **Invalid CSS Selector:** In [`apps/widget/src/widget.ts:L8217`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L8217):
  ```typescript
  const hasLoginButtons = document.querySelectorAll(
    'button:contains("login"), button:contains("sign in"), button:contains("تسجيل"), button:contains("دخول")'
  ).length > 0;
  ```
  *Impact:* `:contains()` is not valid CSS in the DOM API. In standard Chromium/WebKit browsers, calling this throws an uncaught `DOMException: Failed to execute 'querySelectorAll' on 'Document': 'button:contains("login")...' is not a valid selector.`, breaking authentication detection.

### 1.5 Keyboard, Focus, and Screen-Reader Usability Audit
* **Non-Modal Panel with No Focus Handoff:**
  - [`apps/widget/src/widget.ts:L1271`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L1271): `this.panel.setAttribute('aria-modal', 'false'); // Don't trap focus`
  - [`apps/widget/src/widget.ts:L2028-2034`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L2028-L2034):
    ```typescript
    private openPanel(): void {
      if (!this.panel || !this.button) return;
      this.isOpen = true;
      this.panel.classList.add('open');
      this.button.setAttribute('aria-expanded', 'true');
      // Don't move focus - let user navigate naturally
    }
    ```
  *Impact:* When a keyboard user presses Enter on the launcher, focus remains stuck on the launcher. If they press Tab, focus enters the host page elements situated behind the floating panel instead of moving into the panel controls. This violates WCAG 2.1 SC 2.4.3 (Focus Order).
* **Escape Key Behavior:** [`apps/widget/src/widget.ts:L1865-1871`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L1865-L1871) closes the panel on `Escape` and restores focus to `this.button`. However, because focus was never transferred into the panel upon opening, pressing Escape from the host document will not trigger this listener unless the user happened to tab all the way to the end of the DOM.
* **Audio Cacophony for Screen-Reader Users:** Rather than relying primarily on standard ARIA live regions (`role="status"`, `aria-live="polite"`), the widget frequently triggers `window.speechSynthesis.speak()`. For users operating NVDA, JAWS, or VoiceOver, this produces two simultaneous voices speaking at once.

### 1.6 Localization and RTL Audit
* **Default Locale:** Set to `en` and `ltr` ([`apps/widget/src/widget.ts:L250-255`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L250-L255)), rather than detecting host page direction or defaulting to Arabic for Saudi public sector environments.
* **Broken Language Toggle:**
  - The UI provides an `EN` / `العربية` switcher.
  - When the user selects `العربية`, [`setContext('ar')`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L2338) is called, which calls `updatePanelTexts()`.
  - In [`apps/widget/src/widget.ts:L2487-2498`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L2487-L2498), `updatePanelTexts()` only updates the text of the four top-level tabs (`المساعدة`, `الرؤية`, `القراءة`, `الأدوات`).
  - In [`apps/widget/src/widget.ts:L2481-2485`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L2481-L2485):
    ```typescript
    private updateFeatureTexts(): void {
      // This will be called when context changes
      // Individual features update their texts via getTranslations()
      // which uses this.context.locale
    }
    ```
  *Impact:* `updateFeatureTexts()` is an empty stub. Every title, button, label, slider label, and description inside the panel remains hardcoded in English. The inner interface never updates to Arabic.

### 1.7 Assistive-Map Generation and Consumption Audit
* **Backend Source of Truth:**
  - Assistive Maps are generated by [`apps/scanner/src/assistive/assistive-map-generator.ts`](file:///d:/Waheed/RaawiX/apps/scanner/src/assistive/assistive-map-generator.ts) during scan Phase 3 (`generateAssistiveMap`).
  - Stored in Prisma database table `AssistiveMap` linked to `PageVersion`.
  - Exposed via scanner API: `GET /api/widget/page-package?url=...&entityCode=...` ([`apps/scanner/src/index.ts:L943-1140`](file:///d:/Waheed/RaawiX/apps/scanner/src/index.ts#L943-L1140)).
* **AssistiveMap Schema:**
  ```typescript
  export interface AssistiveMap {
    labelOverrides: Record<string, LabelOverride>; // { selector, label, confidence, source }
    imageDescriptions: Record<string, ImageDescription>; // { selector, alt, confidence, source }
    actionIntents: Record<string, ActionIntent>; // { selector, intent, description, confidence }
    forms?: FormAssistPlan[]; // Form steps, field labels, validations
  }
  ```
* **Actual Consumption in Widget:**
  - The widget fetches `/api/widget/page-package` in [`fetchPagePackageAsync()`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L4026-4091) and stores it in `this.cachedPagePackage`.
  - In [`getLabelOverride()`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L7012-L7046) and [`getImageDescription()`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L7051-L7061), it looks up selectors in `cachedPagePackage.assistiveMap`.
  - **Critical Gap:** The widget **never modifies the host DOM** based on this data. It only reads the data out loud via TTS when a user clicks "Describe Image" or "Describe Focused Element". An external screen reader navigating the host page never benefits from the AssistiveMap data unless the user activates the widget's custom speech tools.
  - **Schema Desynchronization:** In `tests/widget-e2e/integration.spec.ts:L78-83`, tests mock `imageDescriptions` with a localized object `{ description: { en: '...', ar: '...' } }`. But in `apps/scanner/src/assistive/assistive-map-generator.ts:L32` and `apps/widget/src/widget.ts:L7057`, `imageDescriptions` is typed with a flat string `alt: string`. This causes schema divergence between test mocks and actual backend generation.

### 1.8 Agent Runtime and Semantic Engine Integration
* **`apps/agent-runtime`:** Contains planner, intent parser, and executor (`agent.ts`, `planner.ts`, `executor.ts`). It is designed for goal-based task automation (e.g., executing multi-step form workflows).
* **`packages/semantic-engine`:** Defines semantic block models (`SemanticPageModel`, `SemanticBlock`, `SemanticAction`).
* **Connection to Widget:** The widget contains a toggle between `assist` mode and `semantic` mode ([`apps/widget/src/widget.ts:L1563-1572`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L1563-L1572)). When set to `semantic`, it attempts to fetch from `/api/semantic-page` or `/api/widget/semantic`, and initializes [`SemanticCursor`](file:///d:/Waheed/RaawiX/apps/widget/src/semantic-cursor.ts).
* **Reality:** The semantic mode is largely an experimental prototype. The backend endpoint `/api/semantic-page` is not mounted on the production test scanner, and fallback to `/api/widget/semantic` returns basic DOM blocks rather than dynamic agent execution. The agent runtime is not bundled into the widget IIFE.

---

## 2. Accurate Feature Inventory

The following table documents the audited implementation status of every widget capability across the codebase:

| Capability | Category | Audited Status | Evidence & Defect Details |
| :--- | :--- | :--- | :--- |
| **Widget Launcher Button** | UI / Launcher | **Implemented but incomplete** | Injected directly into `document.body` ([`widget.ts:1189`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L1189)). Floating button with 2.5MB PNG icon or green fallback "A". Visual appearance looks like an early prototype. |
| **Panel Container & Header** | UI / Shell | **Implemented but incomplete** | Injected into `document.body` ([`widget.ts:1264`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L1264)). Non-modal (`aria-modal="false"`), no focus trap, green border `#4CAF50`. Lacks modern glassmorphism or tokenized styling. |
| **Language Toggle (EN / AR)** | I18n | **Placeholder / Mock behavior** | Toggle switches `context.locale`, but `updateFeatureTexts()` ([`widget.ts:2481`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L2481)) is an empty stub. Inner content remains in English. |
| **Keyboard Access & Focus Handoff** | Accessibility | **Implemented but incomplete** | Enter/Space toggles launcher, Escape closes panel and focuses launcher. But opening panel explicitly skips focus handoff ([`widget.ts:2034`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L2034)). Tab flows behind open panel. |
| **Shadow DOM Isolation** | Architecture | **Missing** | Zero Shadow DOM usage. Injects `<style>` into `document.head`. Causes severe CSS conflicts with host pages. |
| **Text Size Adjustment** | Visual Assist | **Implemented but broken** | Universal selector `html[data-raawi-text-size] body * { font-size: inherit !important; }` ([`widget.ts:1019`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L1019)) flattens all heading and component hierarchy. |
| **Line Spacing Adjustment** | Visual Assist | **Implemented but broken** | Universal selector `html[data-raawi-line-spacing] * { line-height: calc(1.5 * var) !important; }` ([`widget.ts:1023`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L1023)) causes layout breaks across compact elements. |
| **High Contrast Mode** | Visual Assist | **Implemented but broken** | Naive global inversion (`body { background: black !important; color: white !important; }`) breaks card/panel visibility. |
| **Stop Animations / Reduce Motion** | Visual Assist | **Implemented and tested** | Injects `@media (prefers-reduced-motion)` style rules and pauses web animations/videos ([`widget.ts:2750`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L2750)). Verified in smoke tests. |
| **Big Cursor (Dark / Light)** | Visual Assist | **Implemented and tested** | Injects custom SVG data-URI cursors for standard, pointer, and text ([`widget.ts:3335`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L3335)). Functions as expected. |
| **Reading Mask** | Visual Assist | **Implemented and tested** | Renders top and bottom dark overlays that follow mouse vertical position ([`widget.ts:3214`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L3214)). Small/medium/large window heights. |
| **Reading Guide (Ruler)** | Visual Assist | **Implemented and tested** | Renders a thin horizontal guide line tracking mouse cursor ([`widget.ts:3180`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L3180)). Functions cleanly. |
| **Screen Magnifier (Lens)** | Visual Assist | **Placeholder / Mock behavior** | Uses HTML canvas and `ctx.drawImage()` from live viewport ([`widget.ts:3380`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L3380)). In modern browsers, `drawImage` cannot screenshot cross-origin host elements; lens renders black or blank canvas. |
| **Hide Images / Image Captions** | Reading Assist | **Implemented and tested** | Replaces `<img>` with placeholder blocks or appends visible caption bars ([`widget.ts:3480`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L3480)). Functions locally. |
| **AssistiveMap Fetching** | Integration | **Implemented and tested** | Successfully queries `GET /api/widget/page-package` with URL and entity code ([`widget.ts:4032`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L4032)). Tested in `integration.spec.ts`. |
| **Describe Image Tool** | Cognitive Assist | **Implemented but incomplete** | Looks up `imageDescriptions` in AssistiveMap or falls back to DOM `alt` ([`widget.ts:7051`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L7051)). Speaks via Web Speech TTS. Does not update host DOM `alt`. |
| **Describe Focused Element** | Cognitive Assist | **Implemented but incomplete** | Looks up `labelOverrides` in AssistiveMap or falls back to DOM accessible name ([`widget.ts:7012`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L7012)). Speaks via TTS. Does not update host DOM `aria-label`. |
| **What Can I Do Here?** | Navigation | **Implemented but incomplete** | Parses `guidance.keyActions` and `assistiveMap.actionIntents` to speak a summary of page actions ([`widget.ts:6349`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L6349)). Speaks via TTS. |
| **Active DOM Remediation** | Assistive Core | **Missing** | The widget does not apply safe `aria-label` or `alt` overrides directly to the host DOM. Screen-reader users navigating independently receive zero benefit. |
| **Full Page TTS Narration** | Speech / Voice | **Implemented but incomplete** | Parses headings and paragraphs into TTS chunks ([`widget.ts:4180`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L4180)). Unreliable across browsers; clashes with external screen readers. |
| **Voice Commands & Wake Words** | Speech / Voice | **Implemented but incomplete** | Web Speech recognition with "hi raawi" / "هلا راوي" wake detection ([`widget.ts:5205`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L5205)). Fails without microphone permissions, fails on Firefox/Safari without webkit prefix, high error rate in noisy environments. |
| **Form Assistant (Guided Fill)** | Agent / Flow | **Implemented but incomplete** | State machine for field-by-field guidance ([`widget.ts:8519`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L8519)). Highly coupled to voice prompts. Lacks accessible visual stepper. |
| **Gov/SSO Detection (Nafath/Najiz)** | Heuristics | **Implemented but broken** | Throws `DOMException: SyntaxError` due to `:contains()` selector in `detectAuthFlow()` ([`widget.ts:8217`](file:///d:/Waheed/RaawiX/apps/widget/src/widget.ts#L8217)). |
| **Stale Scan / Freshness Check** | Diagnostics | **Implemented and tested** | Computes DOM title/heading hash and compares with scan fingerprint ([`page-fingerprint.ts:14`](file:///d:/Waheed/RaawiX/apps/widget/src/page-fingerprint.ts#L14)). Displays warning if page has drifted. |
| **Virtual Semantic Cursor** | Semantic Nav | **Implemented but incomplete** | Virtual reading cursor traversing `SemanticBlock` nodes ([`semantic-cursor.ts:18`](file:///d:/Waheed/RaawiX/apps/widget/src/semantic-cursor.ts#L18)). Disconnected from standard user tab flow. |
| **Agent Runtime Execution** | Agent / Flow | **Placeholder / Mock behavior** | `apps/agent-runtime` operates independently as a node library. Widget contains mock wrappers in `action-execution.ts`. Not connected for real-world automated form submission. |
| **Compliance Disclaimer** | Legal / Ethics | **Missing** | Current UI lacks clear disclaimers that widget assistance does not substitute for native WCAG 2.1 AA web compliance. |

---

## 3. Definition of the Intended Usable Product

### 3.1 Product Vision and Positioning
The Raawi X Accessibility Widget must be a **respectful, high-polish assistive layer**—not an intrusive overlay that breaks the host site or overpromises automated compliance.

* **Core Premise:** The widget is an assistive companion that empowers users with visual, cognitive, motor, or temporary impairments.
* **Non-Compliance Principle (Transparent Boundaries):**
  > [!IMPORTANT]
  > The widget must explicitly display an accessibility disclaimer:
  > *"Raawi X provides assistive reading and navigation aids based on AI and automated scanning. It does not replace native WCAG 2.1 AA compliance or constitute legal certification of host website accessibility."*
  > The widget must never market itself as an automated compliance "quick fix" or claim to make an inaccessible site WCAG-compliant.

### 3.2 Minimum Viable Functionality (MVF) vs. Later Enhancements

#### Phase 5 Minimum Viable Functionality (Immediate Implementation Scope)
1. **Shadow DOM Encapsulation:** Complete isolation of widget styles and elements. Zero leakage into host DOM.
2. **Accessible Launcher & Panel:**
   - Floating launcher button with customizable position (bottom-right / bottom-left), high-resolution SVG icon, and standard keyboard support (`Enter`, `Space`).
   - WAI-ARIA APG compliant Dialog panel:
     - Clear title and landmark semantics (`role="dialog"`, `aria-labelledby`, `aria-modal="true"`).
     - Focus trap while open; focus automatically moves to the first interactive element (or close button) upon open.
     - `Escape` key immediately closes the dialog and restores focus cleanly to the launcher.
     - Outside click closes dialog.
3. **Arabic-First RTL & English LTR Strategy:**
   - Detects host document language/direction (`document.documentElement.lang` / `dir`). Default to Arabic RTL for Saudi domains (`.sa`, `.gov.sa`).
   - Clean EN/AR toggle that **re-renders all internal strings** across all tabs, buttons, sliders, and tooltips.
   - Distinct, premium typography: Google Font `Cairo` for Arabic, `Inter` for English.
4. **Safe, Predictable Display Preferences (Non-Destructive):**
   - **Text Sizing:** Uses CSS zoom or relative scaling scoped specifically to content containers, **never** `* { font-size: inherit !important; }`. Preserves heading hierarchy.
   - **Line Spacing:** Applies moderate, proportional line-height adjustments without breaking button/icon padding.
   - **Contrast Themes:** Curated, high-contrast modes (Dark High Contrast, Soft Sepia, Inverted) that apply non-destructive CSS custom properties rather than flattening all backgrounds.
   - **Reading Helpers:** Reading Guide (horizontal ruler), Reading Mask (adjustable spotlight window), and Stop Animations / Reduce Motion (`prefers-reduced-motion` override).
   - **Big Cursor:** Custom high-visibility SVG cursors.
5. **Genuine Consumption of AssistiveMap Data:**
   - Single, efficient background fetch to `GET /api/widget/page-package` on initialization.
   - **Safe DOM Remediation:** For elements flagged by scanner with high-confidence labels/descriptions:
     - Injects `alt` text onto unlabeled images with confidence `high`.
     - Injects `aria-label` onto unlabeled icon buttons and controls with confidence `high`.
     - Marks remediated attributes with `data-raawi-remediated="true"` so external screen readers immediately speak accurate labels during standard navigation.
     - Stores original attributes for clean reversion when widget is disabled or reset.
   - **Page Insights & Landmark Navigation:**
     - Tab displaying page summary, landmarks (Header, Main, Navigation, Footer), and form overview parsed from `guidance`.
     - Jump-to-landmark and jump-to-form action buttons that smoothly scroll and focus the target element.
6. **Graceful Degradation:**
   - If scanner API returns 404, offline, or invalid map: widget operates seamlessly in standalone heuristic mode (display adjustments, reading ruler, client-side DOM outline). Displays a subtle badge: *"Offline / Standalone Mode"*.
   - If page fingerprint detects stale scan: notifies user with a non-intrusive warning: *"Page content has changed since the last scan."*
7. **Screen-Reader & Audio Respect:**
   - By default, all feedback is routed through ARIA Live Regions (`aria-live="polite"`).
   - Voice reading (TTS) is strictly **opt-in** and user-triggered via an explicit "Read Page" or "Read Summary" button.
   - Widget **never** speaks automatically upon load or wake phrases.

#### Later Enhancements (Post-Phase 5 Roadmap)
- Hands-free wake phrase continuous listening ("هلا راوي").
- Autonomous multi-step form filling via Agent Runtime.
- Real-time client-side vision inference via in-browser WebAssembly.
- Cloud-synced user accessibility profiles across multiple subscribed websites.

---

## 4. Design and Technical Implementation Plan

### 4.1 Component Architecture and Shadow DOM Hierarchy

To eliminate the 9,689-line monolith, the widget will be decomposed into modular TypeScript classes encapsulated within a closed/open Shadow Root:

```
[Host Web Page]
  │
  └── <raawi-accessibility-widget> (Custom Element)
        │
        └── #shadow-root (open)
              ├── <style> (Design Tokens, Reset, Component Styles)
              ├── <div class="raawi-widget-root" dir="rtl|ltr">
              │     │
              │     ├── [LauncherButton] (Floating toggle, badge, SVG icon)
              │     │
              │     ├── [PanelDialog] (role="dialog", aria-modal="true")
              │     │     ├── [HeaderBar]
              │     │     │     ├── Logo & Title
              │     │     │     ├── [LanguageSwitcher] (AR / EN)
              │     │     │     ├── [ResetButton]
              │     │     │     └── [CloseButton]
              │     │     │
              │     │     ├── [TabBar] (Tabs: Display, Reading, Navigation, Page Insights)
              │     │     │
              │     │     ├── [TabPanels]
              │     │     │     ├── [DisplayTab] (Text size, Line height, Contrast, Cursor)
              │     │     │     ├── [ReadingTab] (Ruler, Mask, Stop animations, Hide images)
              │     │     │     ├── [NavigationTab] (Landmarks, Form fields, Key actions)
              │     │     │     └── [InsightsTab] (Page summary, AssistiveMap status, Issues)
              │     │     │
              │     │     └── [FooterBar]
              │     │           ├── Compliance Disclaimer Link
              │     │           └── Freshness / Scan Status Badge
              │     │
              │     └── [LiveAnnouncer] (role="status", aria-live="polite")
              │
              └── [ReadingOverlayLayer] (Mask & Ruler portal elements appended to host body when active)
```

#### Module Breakdown (`apps/widget/src/`)
1. **`index.ts`**: Entry point, custom element registration (`raawi-accessibility-widget`), initialization logic.
2. **`core/shadow-container.ts`**: Manages the Shadow Root, host stylesheet injection, and external overlay portals.
3. **`core/i18n.ts`**: Centralized reactive localization store with complete Arabic (`ar`) and English (`en`) dictionaries.
4. **`core/state.ts`**: Widget preferences state manager with `localStorage` persistence and event dispatching.
5. **`api/map-client.ts`**: Handles fetching `GET /api/widget/page-package`, fingerprint verification, and caching.
6. **`remediation/dom-remediator.ts`**: Non-destructive host DOM remediation engine (applies/reverts `alt`, `aria-label`).
7. **`components/launcher.ts`**: Accessible launcher button with SVG icons and active state badge.
8. **`components/panel.ts`**: Accessible modal dialog implementing WAI-ARIA Dialog (Modal) pattern and focus trapping.
9. **`components/tabs/`**: Individual tab implementations (`display-tab.ts`, `reading-tab.ts`, `navigation-tab.ts`, `insights-tab.ts`).
10. **`components/live-announcer.ts`**: ARIA live region manager for screen-reader announcements.
11. **`tools/reading-mask.ts` & `tools/reading-ruler.ts`**: Clean reading guides with passive event listeners and requestAnimationFrame.

### 4.2 Modern Visual Design System

The visual design will be elevated from a developer prototype to an enterprise-grade accessibility assistant:

#### Design Tokens
* **Color Palette (Modern Emerald & Deep Slate):**
  - Primary Brand: `hsl(158, 64%, 42%)` (#27ae60 / Emerald) — aligned with Saudi Vision 2030 digital aesthetic.
  - Primary Hover: `hsl(158, 64%, 35%)`
  - Focus Ring: `hsl(210, 100%, 50%)` (High-visibility 3px blue outline with 2px white offset).
  - Surface Background: `rgba(255, 255, 255, 0.95)` with `backdrop-filter: blur(16px)` (Glassmorphic dark/light).
  - Dark Surface: `hsl(220, 20%, 14%)` (#1e242c).
  - Border: `hsl(220, 15%, 88%)` (1px subtle border, not thick green outline).
  - Shadow: `0 20px 40px -15px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)`.
* **Typography:**
  - Arabic: `'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.
  - English: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.
* **Dimensions & Responsive Behavior:**
  - Launcher: 56px circular button with crisp inline SVG icon (replacing the 2.5MB PNG).
  - Panel Width: 380px (fixed on desktop), `calc(100vw - 32px)` on mobile viewports (< 420px).
  - Panel Max Height: `calc(100vh - 100px)`. Smooth scrollable tab bodies.

### 4.3 Arabic-First RTL and English LTR Strategy

1. **Host-Aware Direction Detection:**
   ```typescript
   function resolveInitialLocale(): 'ar' | 'en' {
     const docLang = document.documentElement.lang?.toLowerCase() || '';
     const docDir = document.documentElement.dir?.toLowerCase() || '';
     const hostname = window.location.hostname.toLowerCase();
     
     if (docDir === 'rtl' || docLang.startsWith('ar') || hostname.endsWith('.sa')) {
       return 'ar';
     }
     return 'en';
   }
   ```
2. **Complete String Dictionary:**
   Every UI string must be key-indexed in `i18n.ts`:
   - Tab labels: `ar: { display: 'العرض', reading: 'القراءة', navigation: 'التنقل', insights: 'معلومات الصفحة' }`
   - Actions: `ar: { textSize: 'حجم الخط', contrast: 'تباين الألوان', ruler: 'مسطرة القراءة', reset: 'إعادة ضبط', close: 'إغلاق' }`
   - Remediations: `ar: { imageDescribed: 'تم وصف الصورة آلياً', labelAdded: 'تمت إضافة تسمية توضيحية' }`
   - Disclaimers: Full legal disclaimer provided in both Arabic and English.
3. **Bidirectional Layout Rules:**
   - Use CSS Logical Properties inside the Shadow DOM (`margin-inline-start`, `padding-inline-end`, `inset-inline-end`).
   - RTL launcher anchors to bottom-right (`right: 24px; left: auto;`). LTR launcher anchors to bottom-left (`left: 24px; right: auto;`) or user-configured corner.

### 4.4 Data Contracts for Assistive-Map Consumption

The widget client will align strictly with the backend generator schema:

```typescript
export interface AssistivePackageResponse {
  url: string;
  matchedUrl: string;
  matchConfidence: 'exact' | 'path' | 'canonical' | 'low';
  scanTimestamp?: string;
  fingerprint?: {
    title?: string;
    firstHeading?: string;
    mainTextHash?: string;
  };
  assistiveMap: {
    labelOverrides: Record<string, {
      selector: string;
      label: string;
      confidence: 'high' | 'medium' | 'low';
      source: 'vision' | 'gemini' | 'dom';
      safetyNote?: string;
    }>;
    imageDescriptions: Record<string, {
      selector: string;
      alt: string;
      confidence: 'high' | 'medium' | 'low';
      source: 'gemini' | 'dom' | 'vision';
      safetyNote?: string;
    }>;
    actionIntents: Record<string, {
      selector: string;
      intent: string;
      description: string;
      confidence: 'high' | 'medium' | 'low';
    }>;
    forms?: Array<{
      formId: string;
      selector: string;
      purpose: string;
      fields: Array<{
        selector: string;
        label: string;
        type: string;
        required: boolean;
      }>;
    }>;
  };
  guidance?: {
    summary: string;
    landmarks: Array<{ type: string; label: string; selector: string }>;
    keyActions: Array<{ label: string; description: string; selector: string }>;
  };
  issuesSummary?: {
    criticalCount: number;
    seriousCount: number;
    moderateCount: number;
  };
}
```

#### Safe DOM Remediation Algorithm
```typescript
class DomRemediator {
  private appliedRemediations: Array<() => void> = [];

  public applyAssistiveMap(map: AssistiveMap): void {
    // 1. Remediate Image Alt Descriptions
    for (const [selector, imgDesc] of Object.entries(map.imageDescriptions)) {
      if (imgDesc.confidence !== 'high') continue; // Only apply high-confidence overrides
      const el = document.querySelector(selector) as HTMLImageElement | null;
      if (el && (!el.hasAttribute('alt') || el.getAttribute('alt')?.trim() === '')) {
        const prevAlt = el.getAttribute('alt');
        el.setAttribute('alt', imgDesc.alt);
        el.setAttribute('data-raawi-remediated-alt', 'true');
        this.appliedRemediations.push(() => {
          if (prevAlt === null) el.removeAttribute('alt');
          else el.setAttribute('alt', prevAlt);
          el.removeAttribute('data-raawi-remediated-alt');
        });
      }
    }

    // 2. Remediate Control Label Overrides
    for (const [selector, labelOverride] of Object.entries(map.labelOverrides)) {
      if (labelOverride.confidence !== 'high') continue;
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el && !el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby')) {
        el.setAttribute('aria-label', labelOverride.label);
        el.setAttribute('data-raawi-remediated-label', 'true');
        this.appliedRemediations.push(() => {
          el.removeAttribute('aria-label');
          el.removeAttribute('data-raawi-remediated-label');
        });
      }
    }
  }

  public revertAll(): void {
    while (this.appliedRemediations.length > 0) {
      const revert = this.appliedRemediations.pop();
      revert?.();
    }
  }
}
```

### 4.5 Security, Privacy, and Host Compatibility Considerations
* **No Inline Scripts / No `eval`:** Strict Content Security Policy (CSP) compatibility. All event handling uses DOM `addEventListener`.
* **Zero Form Tampering:** The widget will **never** automatically submit forms or intercept sensitive password/credential fields without explicit, unambiguous user confirmation.
* **Non-Destructive Teardown:** The custom element must implement `disconnectedCallback()` to remove all window listeners, resize observers, and DOM mutations when the widget unmounts.
* **Asset Self-Containment:** Replace external raster PNG icons with clean, scalable, inline SVG assets (< 2 KB), eliminating network waterfall and 2.5 MB bloat.

---

## 5. Test Strategy

| Test Level | Scope | Framework | Key Scenarios |
| :--- | :--- | :--- | :--- |
| **Unit Tests** | State, I18n, & DOM Remediator | Vitest / JSDOM | - I18n dictionary completeness (every key exists in AR & EN)<br>- `DomRemediator` correctly applies `alt`/`aria-label` to missing elements<br>- `DomRemediator` reverts cleanly without mutating existing valid labels<br>- Safe display style calculations |
| **Component Integration Tests** | Shadow DOM & Focus Trap | Vitest / Testing Library | - Panel mounts in Shadow DOM without leaking styles<br>- Focus transfers to panel close button on open<br>- Focus trap prevents tabbing out of panel while modal is open<br>- Escape key closes panel and returns focus to launcher |
| **E2E Browser Tests** | Host Integration & Fallback Chains | Playwright | - Test on `portal-good` (Arabic RTL) and `gov-sim` (English LTR)<br>- Verify API fetch with mocked AssistiveMap (`page-package`)<br>- Verify fallback behavior when API is offline (graceful standalone mode)<br>- Verify screen-reader semantics via Playwright accessibility tree audits (`axe-core`)<br>- Verify no visual layout breakage on host page |

---

## 6. Phased Implementation Checklist

The implementation must proceed in disciplined, verifiable milestones:

- [ ] **Phase 5.1: Architectural Foundation & Shadow DOM Encapsulation**
  - [ ] Create clean component structure in `apps/widget/src/`.
  - [ ] Implement `ShadowContainer` custom element hosting the Shadow Root.
  - [ ] Implement centralized `i18n.ts` with complete Arabic and English string catalogs.
  - [ ] Replace 2.5MB PNG with inline scalable SVG icon.
  - [ ] *Acceptance Criteria:* Widget mounts completely inside Shadow DOM. Zero global styles injected into `document.head`. No layout shifts on host page.

- [ ] **Phase 5.2: Accessible Dialog & Focus Management (WAI-ARIA APG)**
  - [ ] Rebuild Launcher Button with visible focus indicators and `aria-expanded`.
  - [ ] Rebuild Panel as an accessible `role="dialog"` modal with proper labeling.
  - [ ] Implement robust focus trap and initial focus handoff upon opening.
  - [ ] Implement `Escape` key close and return focus to launcher.
  - [ ] Integrate ARIA live region announcer (`LiveAnnouncer`).
  - [ ] *Acceptance Criteria:* 100% keyboard navigable. Screen reader announces dialog title. Tab does not escape to host page while open.

- [ ] **Phase 5.3: Non-Destructive Display & Reading Preferences**
  - [ ] Implement non-destructive text scaling (scoped zoom/rem calculation without `* { font-size: inherit !important }`).
  - [ ] Implement safe line-spacing adjustment.
  - [ ] Implement high-contrast themes using CSS variables.
  - [ ] Re-implement Reading Ruler and Reading Mask with hardware-accelerated transforms.
  - [ ] Implement Stop Animations / Reduce Motion preference.
  - [ ] *Acceptance Criteria:* Heading hierarchy remains intact when text size is altered. Host layout does not break.

- [ ] **Phase 5.4: AssistiveMap Data Consumption & Safe Remediation**
  - [ ] Wire up `GET /api/widget/page-package` fetch client with entity code and canonical URL resolution.
  - [ ] Implement `DomRemediator` to inject `alt` and `aria-label` attributes for high-confidence overrides.
  - [ ] Implement Page Insights tab displaying summary, landmarks, and form step overview.
  - [ ] Implement Landmark Navigator allowing quick keyboard jumps to headers, nav, main, and forms.
  - [ ] Add explicit WCAG compliance disclaimer to panel footer.
  - [ ] *Acceptance Criteria:* Host images without `alt` receive verified AssistiveMap descriptions in the DOM. Landmarks can be focused via widget. Disclaimer is prominent.

- [ ] **Phase 5.5: Offline Graceful Degradation & Freshness Detection**
  - [ ] Implement DOM fingerprint verification to warn against stale scan data.
  - [ ] Implement graceful standalone fallback when API is unreachable.
  - [ ] Add teardown lifecycle (`disconnectedCallback`) for clean SPA unmounting.
  - [ ] *Acceptance Criteria:* Widget functions as a standalone display assistant even when API returns 500/404. Disconnecting widget leaves host DOM 100% clean.

- [ ] **Phase 5.6: Verification & E2E Acceptance**
  - [ ] Add unit tests for `DomRemediator` and `i18n`.
  - [ ] Update Playwright E2E test suite in `tests/widget-e2e/`.
  - [ ] Validate across Arabic portal (`portal-good`) and English simulator (`gov-sim`).
  - [ ] *Acceptance Criteria:* All Playwright tests pass without console errors or accessibility violations.

---

## 7. Conclusion & Next Step Authorization

The audit conclusively demonstrates that the current widget prototype requires an architectural rewrite to become a viable, production-ready product. The blueprint above provides an exact, non-destructive roadmap to achieve this using standard web components, Shadow DOM, and the established AssistiveMap API.

**Coordinator Review Point:**  
This document completes the Phase 5 Audit and Implementation Blueprint requirements. All work has been strictly read-only and analytical. 

**Next Action:** Awaiting coordinator review and authorization of the blueprint to proceed with Phase 5 implementation.
