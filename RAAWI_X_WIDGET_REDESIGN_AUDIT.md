# Raawi X Widget Redesign — Google Stitch Project Audit & Implementation Mapping

**Audit Date:** 2026-10-23  
**Verified Git Baseline:** `cda5efa753785b6a6b27f68746007e6a874cb17e`  
**Branch:** `feature/semantic-core`  
**Target Stitch Project:** `projects/3379199596456361018` (*"Raawi X Widget Redesign"*)  
**Design Theme:** *Inclusion Shield UI* (Fidelity Palette: Teal `#0d9488`, Dark Slate `#0f172a`, Light Mint `#f0fdfa`)  
**Scope:** Standalone Accessibility & Reading Widget (`apps/widget/`)  
**Status:** Audit & Architecture Planning Only (Zero application code modified)

---

## 1. Repository & Source Baseline

### 1.1 Working Tree & Repository Health
- **Git Commit:** `cda5efa753785b6a6b27f68746007e6a874cb17e` (`feat(widget): Phase 2C standalone magnified reading strip`).
- **Git Status:** Working tree clean with respect to all application code under `apps/widget/` and core libraries. Only local task-tracking artifact [tasks/todo.md](file:///d:/Waheed/RaawiX/tasks/todo.md) has staged/unstaged progress notes.
- **Disk Availability:** Volume `D:\` maintains **73.24 GB** free capacity.
- **Widget Test Baseline:** 174 automated unit/integration tests passing across:
  - [phase2a-widget-cleanup.test.ts](file:///d:/Waheed/RaawiX/apps/widget/test/phase2a-widget-cleanup.test.ts) (25 tests)
  - [phase2b-reading-tools.test.ts](file:///d:/Waheed/RaawiX/apps/widget/test/phase2b-reading-tools.test.ts) (34 tests)
  - [phase2b1-font-consistency.test.ts](file:///d:/Waheed/RaawiX/apps/widget/test/phase2b1-font-consistency.test.ts) (18 tests)
  - [phase2b2-font-cascade.test.ts](file:///d:/Waheed/RaawiX/apps/widget/test/phase2b2-font-cascade.test.ts) (24 tests)
  - [phase2c-magnifier-strip.test.ts](file:///d:/Waheed/RaawiX/apps/widget/test/phase2c-magnifier-strip.test.ts) (27 tests)
  - [panel.test.ts](file:///d:/Waheed/RaawiX/apps/widget/test/panel.test.ts), [shadow-container.test.ts](file:///d:/Waheed/RaawiX/apps/widget/test/shadow-container.test.ts), [remediator.test.ts](file:///d:/Waheed/RaawiX/apps/widget/test/remediator.test.ts) (46 tests)

### 1.2 Commits Beyond Reported Phase 2C Baseline
- Verification confirmed `HEAD` is exactly `cda5efa753785b6a6b27f68746007e6a874cb17e`. Zero intermediate commits or detached branches exist.

---

## 2. Google Stitch Project Inventory

Authorized inspection of Stitch Project `projects/3379199596456361018` revealed **7 distinct screens** and a formal Design System named **"Inclusion Shield UI"**:

```
Stitch Project: projects/3379199596456361018 ("Raawi X Widget Redesign")
├── Design System: "Inclusion Shield UI" (Theme: LIGHT, Font: INTER / CAIRO, Roundness: 8px)
│
├── Master Presentation Boards (Explorations & Specifications):
│   ├── [Screen 1] a763a5f934534592b2a5b3fdc830ffff: "Raawi X - Accessibility Widget 3 Design Directions Exploration" (2560 × 8544)
│   └── [Screen 2] 3d4c93c5a56d49deadff0375e3c11a96: "Raawi X Accessibility Widget - Standalone All Tabs Spec" (2560 × 3818)
│
├── Unified 4-Tab Panel Specification:
│   └── [Screen 3] ec1a20ffa18941c4b3ef3b7d743cf149: "Screen A — Assist Tab Active" (2560 × 2148)
│
└── Standalone Menu Concept Modules (Tabless Independent Drawers):
    ├── [Screen 4] 401aa4664199449c93cffe1c1a2a5d0d: "Menu 1 — Standalone Assist Menu" (2560 × 2524)
    ├── [Screen 5] afc730597df24accabeb7cb62fe5edf4: "Menu 2 — Standalone Vision Menu" (2560 × 2452)
    ├── [Screen 6] de644655342e4ab69556c43aac8cc8e6: "Menu 3 — Standalone Reading Menu" (2560 × 2236)
    └── [Screen 7] b7528c2814724751973e22b0c6248ce7: "Menu 4 — Standalone Tools Menu" (2560 × 2184)
```

### Detailed Screen Profiles

| Screen ID | Title | Viewport / Canvas | Intended Interaction / Purpose | Structure Type |
| :--- | :--- | :--- | :--- | :--- |
| `a763a5f9...` | **3 Design Directions Exploration** | 2560 × 8544 px (Desktop) | Master multi-viewport presentation matrix comparing: Direction A (Compact Utility / Vision), Direction B (Arabic RTL Workspace / Assist), Direction C (Reading Companion + Docked Strip), and Mobile Drawer Breakpoints (375px LTR & RTL). | Presentation Showcase & Matrix |
| `3d4c93c5...` | **Standalone All Tabs Spec** | 2560 × 3818 px (Desktop) | Isolated component architecture matrix displaying all 4 core tabs side-by-side within 384px tabbed cards, plus standalone Bottom Docked Reading Strip (200% zoom) and 3 launcher FAB variants. | Side-by-side Tabbed Cards + Docked Strip |
| `ec1a20ffa...` | **Screen A — Assist Tab Active** | 2560 × 2148 px (Desktop) | Single 384px (`w-96`) floating assistive panel with full 4-tab bar (`Assist`, `Vision`, `Reading`, `Tools`), with Assist active. Displays AssistiveMap status, DOM remediation toggle, and 4 quick custom profiles. | **Unified 4-Tab Panel** (Production Candidate) |
| `401aa466...` | **Menu 1 — Standalone Assist Menu** | 2560 × 2524 px (Desktop) | 430px modal card focusing strictly on Assist. Explicitly contains NO tab bar. Features AssistiveMap status, remediation switch, and 4 profiles. | Standalone Tabless Menu |
| `afc73059...` | **Menu 2 — Standalone Vision Menu** | 2560 × 2452 px (Desktop) | 430px modal card focusing strictly on Vision. Explicitly contains NO tab bar. Contains steppers with live progress bars, 4 toggles, and 3-way cursor radio group. | Standalone Tabless Menu |
| `de644655...` | **Menu 3 — Standalone Reading Menu** | 2560 × 2236 px (Desktop) | 428px modal card focusing strictly on Reading. Explicitly contains NO tab bar. Contains ruler guide with 4 thickness buttons, focus mask with aperture stepper, hide images, and magnifier strip controls. | Standalone Tabless Menu |
| `b7528c28...` | **Menu 4 — Standalone Tools Menu** | 2560 × 2184 px (Desktop) | 440px modal card focusing strictly on Tools. Explicitly contains NO tab bar. Contains TTS synthesizer controls (play/pause/stop, speed chips, voice dropdown) and Headings Navigator index. | Standalone Tabless Menu |

---

## 3. Actual Widget Feature & Code Inventory

Every feature currently operational in `apps/widget/` was inspected in source code and cross-referenced with real browser evidence:

### 3.1 Assist Domain ([panel.ts:L224-240](file:///d:/Waheed/RaawiX/apps/widget/src/components/panel.ts#L224-L240), [state.ts:L75-103](file:///d:/Waheed/RaawiX/apps/widget/src/core/state.ts#L75-L103), [dom-remediator.ts](file:///d:/Waheed/RaawiX/apps/widget/src/core/dom-remediator.ts))
- **Page Insights & AssistiveMap Status:** Dynamically bound to [MapApiClient](file:///d:/Waheed/RaawiX/apps/widget/src/core/api-client.ts). Displays scanned element count or fallback statuses (`ready`, `not-scanned`, `loading`, `offline`, `mismatch`, `outdated`, `invalid`). Includes an operational `🔄 Refresh` button.
- **Automated DOM Remediation:** Implemented in `DomRemediator`. Strictly **opt-in and disabled by default** (`remediationEnabled: false`). When toggled, injects missing image `alt` attributes and binds missing form labels. Zero unprompted mutations.
- **Accessibility Profiles (4 Modes):**
  - `blind`: Preset configures keyboard navigation and screen-reader readiness without silently enabling DOM remediation.
  - `low-vision`: Sets `textSize: 1.3`, `contrastMode: true`, `bigCursor: 'dark'`.
  - `dyslexia`: Sets `lineSpacing: 1.4`, `readingGuide: true`, `stopAnimations: true`.
  - `none` (Default): Reverts all overrides to standard document baseline.

### 3.2 Vision Domain ([panel.ts:L242-340](file:///d:/Waheed/RaawiX/apps/widget/src/components/panel.ts#L242-L340), [display-manager.ts:L90-320](file:///d:/Waheed/RaawiX/apps/widget/src/core/display-manager.ts#L90-L320))
- **Text Size Stepper:** Range 80% to 200% (step 10%). Updates `--raawi-text-size` and managed attribute `data-raawi-text-size`.
- **Line Spacing Stepper:** Range 80% to 200% (step 10%). Updates `--raawi-line-spacing` and managed attribute `data-raawi-line-spacing`.
- **High Contrast Mode:** Non-destructive CSS inversion filter on document root, preserving images and video tags.
- **Focus Highlight:** Injects high-visibility 3px outline (`#2563eb`) with 2px offset on all `:focus-visible` elements.
- **Readable Font Override:** Enforces bundled `'Cairo'` font for Arabic elements (`[lang="ar"]`, `[dir="rtl"]`) and system clean Latin sans-serif for English elements.
- **Highlight Links & Controls:** Enforces persistent underline on hyperlinks and bounding box outlines on interactive buttons.
- **Stop Animations:** Pauses CSS keyframe animations, transitions, SVG SMIL animations, and HTML5 video autoplay.
- **Large Cursor:** 3-state radio switch (`off`, `dark`, `light`) applying custom SVG cursors to page body and interactive elements.

### 3.3 Reading Domain ([panel.ts:L342-415](file:///d:/Waheed/RaawiX/apps/widget/src/components/panel.ts#L342-L415), [display-manager.ts:L510-720](file:///d:/Waheed/RaawiX/apps/widget/src/core/display-manager.ts#L510-L720), [reading-strip.ts](file:///d:/Waheed/RaawiX/apps/widget/src/components/reading-strip.ts))
- **Reading Guide Ruler:** Horizontal gaze tracker line following mouse coordinates in real-time via `requestAnimationFrame`. Includes thickness selector (`thin`: 2px, `medium`: 4px, `thick`: 8px).
- **Reading Focus Mask:** Top and bottom viewport blackout blinds isolating the current reading line. Includes aperture selector (`small`: 40px, `medium`: 80px, `large`: 140px).
- **Standalone Magnified Reading Strip (Phase 2C):** Docked bottom viewport mirror with 4 magnification scales (150%, 200%, 250%, 300%). Strictly excludes password, file, hidden, and form input values (`[Protected content hidden]`). Enforces keyboard focus priority over ambient pointer hover with a 1200ms quiet guard.
- **Hide Images & Banners:** Sets `opacity: 0` on images, picture elements, and background banners while preserving layout flow.

### 3.4 Tools Domain ([panel.ts:L417-540](file:///d:/Waheed/RaawiX/apps/widget/src/components/panel.ts#L417-L540), [speech-reader.ts](file:///d:/Waheed/RaawiX/apps/widget/src/core/speech-reader.ts), [headings-navigator.ts](file:///d:/Waheed/RaawiX/apps/widget/src/core/headings-navigator.ts))
- **Text-to-Speech (TTS) Read Aloud:** Full native Web Speech Synthesis integration with Play, Pause, Resume, and Stop controls. Supports 4 speed presets (`0.75x`, `1.0x`, `1.25x`, `1.5x`) and voice selector populated with local browser synthesis engines.
- **Page Headings Navigator:** Discovers all semantic `<h1>` through `<h6>` elements on the host DOM, indexing their level and text. Provides active `Jump to ↗` buttons that scroll the viewport and transfer keyboard focus to the target heading.

### 3.5 Shared Infrastructure ([shadow-container.ts](file:///d:/Waheed/RaawiX/apps/widget/src/core/shadow-container.ts), [i18n.ts](file:///d:/Waheed/RaawiX/apps/widget/src/core/i18n.ts), [state.ts](file:///d:/Waheed/RaawiX/apps/widget/src/core/state.ts))
- **Shadow DOM Isolation:** All widget elements, dialogs, backdrops, and reading strips reside inside `<raawi-accessibility-widget>` open Shadow Root. Zero global CSS pollution.
- **Focus Management & Trap:** Full WAI-ARIA Dialog pattern with initial focus handoff, Tab forward wrap, Shift+Tab reverse wrap, and clean focus restoration on close.
- **Bilingual i18n & Cairo Font:** Instant switching between English (LTR) and Arabic (RTL). Arabic uses bundled offline Cairo font data ([cairo-data.ts](file:///d:/Waheed/RaawiX/apps/widget/src/assets/fonts/cairo-data.ts)).
- **Reversible Lifecycle:** Resetting or closing the widget removes all host attributes, CSS properties, listeners, and timers.

---

## 4. Screen-by-Screen Design-to-Code Mapping

| Stitch Screen & Feature Module | Current Code Implementation | Existing Behavior to Preserve | Visual / Interaction Changes Implied by Stitch | Required Implementation Work |
| :--- | :--- | :--- | :--- | :--- |
| **Header Architecture**<br>• Brand emblem<br>• Title & "PRO" / "Cognitive Suite"<br>• Lang toggle (EN/AR)<br>• Reset & Close icons | [panel.ts:L192-214](file:///d:/Waheed/RaawiX/apps/widget/src/components/panel.ts#L192-L214)<br>[widget-styles.ts:L24-44](file:///d:/Waheed/RaawiX/apps/widget/src/styles/widget-styles.ts#L24-L44) | • Dual-language switch (`data-lang="ar"`, `data-lang="en"`)<br>• Revert settings (`#raawi-reset-btn`)<br>• Close dialog (`#raawi-close-btn`) with focus restore | • Shift primary accent from generic green (`#27ae60`) to curated deep emerald teal (`#0d9488`).<br>• Roundness increased to 8px base / 16px container.<br>• More prominent Raawi X "RX" emblem with Level 2 elevation.<br>• Touch targets strictly enforced at 44×44px. | Update CSS custom properties in [widget-styles.ts](file:///d:/Waheed/RaawiX/apps/widget/src/styles/widget-styles.ts) to match *Inclusion Shield UI* tokens. |
| **Tab Navigation Bar**<br>• 4 Tabs: Assist, Vision, Reading, Tools<br>• Active underline indicator | [panel.ts:L216-222](file:///d:/Waheed/RaawiX/apps/widget/src/components/panel.ts#L216-L222)<br>[widget-styles.ts:L310-340](file:///d:/Waheed/RaawiX/apps/widget/src/styles/widget-styles.ts#L310-L340) | • ARIA `tablist` / `tab` / `tabpanel` semantics<br>• Arrow key navigation between tabs<br>• Active state persistence | • Replace grey tab borders with high-contrast teal active indicator pill/underline.<br>• Add distinct icon glyphs alongside tab text (`assistant`, `visibility`, `menu_book`, `construction`). | Refactor tab buttons in `render()` to include SVG icons and active pill styling. |
| **Assist Tab: Page Insights**<br>• AssistiveMap node count<br>• Scan status badge<br>• Rescan button | [panel.ts:L650-710](file:///d:/Waheed/RaawiX/apps/widget/src/components/panel.ts#L650-L710)<br>[api-client.ts](file:///d:/Waheed/RaawiX/apps/widget/src/core/api-client.ts) | • Real-time telemetry status (`ready`, `not-scanned`, `loading`, etc.)<br>• Spin animation on refresh | • Card background styled in `#f8fafc` / `#ffffff` with 1px border `#e2e8f0`.<br>• Node count displayed in bold slate badge.<br>• Rescan button styled with 44px min height and subtle hover lift. | Restyle `#raawi-insights-card` markup and CSS tokens. |
| **Assist Tab: DOM Remediation**<br>• Autonomous switch<br>• Description & repair badge | [panel.ts:L712-745](file:///d:/Waheed/RaawiX/apps/widget/src/components/panel.ts#L712-L745)<br>[dom-remediator.ts](file:///d:/Waheed/RaawiX/apps/widget/src/core/dom-remediator.ts) | • **Strictly opt-in and off by default**<br>• Reversible attribute injection (`data-raawi-remediated`) | • Tactile 48×26px switch track with 20px white thumb and smooth 150ms ease-out curve.<br>• Green active track `#0d9488`. | Update toggle CSS classes in `widget-styles.ts`. |
| **Assist Tab: Profiles**<br>• 2×2 Card Grid: Blind, Low Vision, Dyslexia, Default | [panel.ts:L229-239](file:///d:/Waheed/RaawiX/apps/widget/src/components/panel.ts#L229-L239)<br>[state.ts:L75-103](file:///d:/Waheed/RaawiX/apps/widget/src/core/state.ts#L75-L103) | • 4 distinct preset states<br>• Automatic unsetting of preset when manual controls are adjusted | • Convert simple text buttons into rich profile cards with icon, title, subtitle, and active check badge.<br>• Min height 110px. | Expand `render()` profile card HTML in [panel.ts](file:///d:/Waheed/RaawiX/apps/widget/src/components/panel.ts). |
| **Vision Tab: Steppers**<br>• Text Size (80%-200%)<br>• Line Spacing (80%-200%) | [panel.ts:L245-273](file:///d:/Waheed/RaawiX/apps/widget/src/components/panel.ts#L245-L273)<br>[display-manager.ts:L115-180](file:///d:/Waheed/RaawiX/apps/widget/src/core/display-manager.ts#L115-L180) | • Stepper increment/decrement (10% steps)<br>• Live CSS property updates | • Stitch adds horizontal range progress track below stepper (`style="width: 29.1%"`).<br>• 40px square touch targets for `[-]` and `[+]`. | Add optional progress bar indicator beneath steppers in `panel.ts`. |
| **Vision Tab: Toggles**<br>• High Contrast<br>• Focus Highlight<br>• Readable Font<br>• Highlight Links<br>• Stop Animations | [panel.ts:L275-328](file:///d:/Waheed/RaawiX/apps/widget/src/components/panel.ts#L275-L328)<br>[display-manager.ts:L190-340](file:///d:/Waheed/RaawiX/apps/widget/src/core/display-manager.ts#L190-L340) | • Independent toggle switches<br>• Non-destructive host stylesheet injection<br>• Language-decoupled Cairo font | • Clean white card container with 1px dividers.<br>• Standardized 48×26px tactile toggle switches.<br>• High-contrast green active state. | Update CSS classes and toggle container gapping. |
| **Vision Tab: Cursor Selector**<br>• Off, Large Dark, Large Light | [panel.ts:L330-339](file:///d:/Waheed/RaawiX/apps/widget/src/components/panel.ts#L330-L339)<br>[display-manager.ts:L345-380](file:///d:/Waheed/RaawiX/apps/widget/src/core/display-manager.ts#L345-L380) | • SVG custom cursor injection on host DOM<br>• Reversion on reset | • Styled as a 3-way segmented radio card with cursor icon glyphs (`Default`, `Large Dark`, `Large Light`). | Update button markup in `panel.ts` to include cursor preview glyphs. |
| **Reading Tab: Ruler & Mask**<br>• Ruler with thickness<br>• Mask with aperture | [panel.ts:L345-380](file:///d:/Waheed/RaawiX/apps/widget/src/components/panel.ts#L345-L380)<br>[display-manager.ts:L510-680](file:///d:/Waheed/RaawiX/apps/widget/src/core/display-manager.ts#L510-L680) | • Real-time RAF mouse tracking<br>• Shadow DOM contained overlays<br>• Thickness (`thin`, `medium`, `thick`)<br>• Aperture (`small`, `medium`, `large`) | • Stitch shows thickness buttons (4px, 8px, 12px, 16px) with a live preview line.<br>• Stitch shows aperture stepper (80px) with visual slit preview. | Enhance secondary parameter controls in `panel.ts` to display live visual indicators. |
| **Reading Tab: Magnifier Strip Card**<br>• Toggle switch<br>• Scale chips (150%-300%) | [panel.ts:L383-403](file:///d:/Waheed/RaawiX/apps/widget/src/components/panel.ts#L383-L403)<br>[reading-strip.ts](file:///d:/Waheed/RaawiX/apps/widget/src/components/reading-strip.ts) | • Phase 2C standalone strip mounted in Shadow DOM<br>• Form privacy & sensitive field protection | • Card in Reading tab controls strip activation and default zoom scale.<br>• Stitch All Tabs Spec correctly illustrates strip as a separate bottom viewport dock. | Align card styling with Stitch Design System while keeping strip docked at bottom. |
| **Docked Magnified Reading Strip**<br>• Bottom viewport dock<br>• Active hover text stream<br>• Zoom tiers (150%-300%)<br>• Invert, Mask, Close buttons | [reading-strip.ts:L80-250](file:///d:/Waheed/RaawiX/apps/widget/src/components/reading-strip.ts#L80-L250)<br>[widget-styles.ts:L880-990](file:///d:/Waheed/RaawiX/apps/widget/src/styles/widget-styles.ts#L880-L990) | • Visual-only mirror (`aria-hidden="true"`)<br>• Keyboard priority over pointer hover<br>• Safe fallback & immediate close `✕` | • Sleek dark glassmorphism banner (`bg-slate-900/95 backdrop-blur-md`).<br>• Teal accent border `#0d9488`.<br>• High-legibility 24px magnified font.<br>• Segmented zoom pills. | Refine CSS styling of `.raawi-reading-strip` in `widget-styles.ts`. |
| **Tools Tab: TTS Read Aloud**<br>• Play, Pause, Stop<br>• Speed chips (0.75x-1.5x)<br>• Voice dropdown | [panel.ts:L420-475](file:///d:/Waheed/RaawiX/apps/widget/src/components/panel.ts#L420-L475)<br>[speech-reader.ts](file:///d:/Waheed/RaawiX/apps/widget/src/core/speech-reader.ts) | • Real Web Speech synthesis<br>• Dynamic voice discovery<br>• Speed adjustment<br>• Disabled pause/stop when idle | • Play button bold green primary with icon.<br>• Speed chips segmented in 10px font.<br>• Voice select dropdown with custom arrow and leading audio glyph. | Refine TTS control layout in `panel.ts` and `widget-styles.ts`. |
| **Tools Tab: Headings Navigator**<br>• Heading list (H1-H6)<br>• Jump buttons<br>• Refresh button | [panel.ts:L480-530](file:///d:/Waheed/RaawiX/apps/widget/src/components/panel.ts#L480-L530)<br>[headings-navigator.ts](file:///d:/Waheed/RaawiX/apps/widget/src/core/headings-navigator.ts) | • Real DOM heading extraction<br>• Focus transfer and scroll<br>• Supports Arabic and English headings | • Badge tag pills for H1 (blue `#dbeafe`), H2 (teal `#ccfbf1`), H3 (slate `#e2e8f0`).<br>• Truncated heading label.<br>• Compact `Jump ↗` buttons. | Restyle heading list items in `panel.ts` with color-coded heading badges. |
| **Launcher FAB**<br>• 56px floating trigger button | [launcher.ts](file:///d:/Waheed/RaawiX/apps/widget/src/components/launcher.ts)<br>[widget-styles.ts:L65-103](file:///d:/Waheed/RaawiX/apps/widget/src/styles/widget-styles.ts#L65-L103) | • Toggles panel open/close<br>• Keyboard accessible (`Enter`/`Space`)<br>• Docked right in LTR, left in RTL | • 56×56px circular button with `#0d9488` gradient, crisp white Universal Access icon, and Level 2 shadow.<br>• Supports active session indicator badge (green checkmark). | Update launcher gradient and shadow tokens in `widget-styles.ts`. |

---

## 5. Architectural Evaluation: 4-Tab Panel vs. Standalone Menus

A major finding of this audit is that the Stitch project contains **two conflicting structural paradigms**:
1. **The Unified 4-Tab Panel** (demonstrated in `Screen A`, `Direction A/B/C`, and `All Tabs Spec`): A single cohesive drawer housing all 4 tabs (`Assist`, `Vision`, `Reading`, `Tools`).
2. **Four Standalone Tabless Menus** (demonstrated in `Menu 1`, `Menu 2`, `Menu 3`, `Menu 4`): Four completely separate modal cards, each containing only one domain, with no internal tab switching.

### 5.1 Comparative Trade-off Analysis

| Evaluation Criterion | Unified 4-Tab Panel (Current Architecture & Screen A) | Standalone Menus (Menu 1, 2, 3, 4) |
| :--- | :--- | :--- |
| **Discoverability & Cognitive Load** | **Superior:** The user clicks one launcher and immediately discovers all available accessibility tools across vision, reading, speech, and presets in a single location. | **Poor:** Requires either 4 separate launcher buttons cluttering the website viewport or an external dispatching menu to select which menu to open. |
| **Keyboard Accessibility & Focus Trap** | **Compliant:** A single `dialog` container allows standard WAI-ARIA tab navigation between tab headers and panel controls without dismissing and re-opening modals. | **High Risk:** Moving between Vision adjustments and Reading guides requires dismissing one modal and opening another, losing keyboard focus flow and disrupting assistive tech. |
| **Mobile & Small Screen Ergonomics** | **Excellent:** Fits into a single responsive bottom sheet (as demonstrated in Stitch's `Mobile Breakpoint Comparison Drawer Spec`). | **Complex:** Multiple drawers would conflict on mobile screens and complicate touch navigation. |
| **State Persistence & Multi-Tool Use** | **Seamless:** A user can apply High Contrast (Vision), activate the Reading Strip (Reading), and start TTS (Tools) in one session while observing their combined effect. | **Fragmented:** Users cannot easily coordinate multiple adjustments across separate menu windows. |
| **Code Impact & Stability** | **Minimal Impact:** Preserves 100% of existing tested component architecture (`PanelComponent`, `ShadowContainer`, `StateManager`), requiring only visual CSS token updates and markup polish. | **High Impact:** Would require destroying `PanelComponent`, re-architecting `ShadowContainer` to host 4 modal dialogs, and rewriting all 174 regression tests. |

### 5.2 Architectural Recommendation
> [!IMPORTANT]
> **Recommendation:** Retain the **Unified 4-Tab Panel Architecture** as the primary widget interface (matching Stitch `Screen A`, `Direction A/B/C`, and `All Tabs Spec`), styled with the refined **Inclusion Shield UI** design tokens. 
> 
> The standalone menu screens in Stitch (`Menu 1` through `Menu 4`) represent **presentation board dissections** designed to document individual domain specifications in isolation, rather than a mandate to dismantle the unified widget into four disjointed floating windows.

---

## 6. Shared Design System Implementation Strategy

The new visual design from Stitch will be implemented natively using CSS custom properties inside the widget's Shadow DOM, without introducing third-party runtime CSS frameworks (e.g. Tailwind runtime) into the compiled widget bundle:

### 6.1 Design Tokens (Inclusion Shield UI)
```css
/* Inclusion Shield UI Tokens in Shadow DOM */
.raawi-theme {
  /* Color Palette */
  --raawi-primary: #0d9488;              /* Deep Emerald Teal */
  --raawi-primary-hover: #0f766e;        /* Dark Teal */
  --raawi-primary-container: #008378;    /* Container Accent */
  --raawi-primary-light: #f0fdfa;        /* Soft Mint Tint */
  --raawi-surface: #ffffff;              /* Pure White Card Base */
  --raawi-surface-canvas: #faf8ff;       /* Ambient Panel Base */
  --raawi-surface-subtle: #f8fafc;       /* Low-glare Section Fill */
  --raawi-neutral-dark: #0f172a;         /* Deep Slate Typography */
  --raawi-text-muted: #64748b;           /* Slate Secondary */
  --raawi-border: #e2e8f0;               /* Hairline Structural Stroke */
  --raawi-border-focus: #0d9488;         /* Accessible Focus Ring */

  /* Radii */
  --raawi-radius-base: 8px;              /* Standard Card & Button Radius */
  --raawi-radius-lg: 16px;              /* Container Drawer Radius */
  --raawi-radius-full: 9999px;          /* Pill & FAB Radius */

  /* Shadows (Elevations 1-3) */
  --raawi-shadow-card: 0 1px 3px rgba(15, 23, 42, 0.05);
  --raawi-shadow-floating: 0 10px 25px -5px rgba(13, 148, 136, 0.4), 0 8px 10px -6px rgba(13, 148, 136, 0.2);
  --raawi-shadow-drawer: 0 20px 35px -8px rgba(19, 27, 46, 0.16), 0 8px 16px -4px rgba(19, 27, 46, 0.08);

  /* Typography Stacks */
  --raawi-font-latin: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --raawi-font-arabic: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
}
```

### 6.2 Typography & Arabic Cairo Integration
- **Arabic Language Mode:** When `[dir="rtl"]` or `[lang="ar"]` is active, typography automatically cascades to `'Cairo', var(--raawi-font-arabic)`. Offline font rendering is guaranteed by the pre-bundled base64 WOFF2 data in `cairo-data.ts`.
- **English Language Mode:** Operates on `'Inter', var(--raawi-font-latin)` with tabular numbers (`font-variant-numeric: tabular-nums`) for steppers and speed selectors.
- **Language-Direction Decoupling:** Respects the Phase 2B.2 font cascade rules: document direction (`dir="rtl"`) alone does not override English content fonts.

### 6.3 Touch Target & Ergonomics Enforcement
- Every button, toggle switch, stepper, language pill, and jump link enforces `min-height: 44px` and `min-width: 44px` click boundaries.
- All interactive controls maintain visible keyboard focus indicators: `outline: 2px solid var(--raawi-primary)` with `outline-offset: 2px`.

---

## 7. Phased Implementation Plan

To ensure maximum safety, zero regressions, and minimal code churn, the redesign is organized into **4 sequential, testable phases**:

```
Phase 1: Design Tokens & Base Shell (Colors, Launcher, Header, Footer)
   ↓  (Review Checkpoint & Test Suite)
Phase 2: Tab Navigation & Assist + Vision Panel Polish
   ↓  (Review Checkpoint & Test Suite)
Phase 3: Reading Tab & Tools Tab Component Polish
   ↓  (Review Checkpoint & Test Suite)
Phase 4: Docked Magnified Reading Strip & Mobile Sheet Polish
   ↓  (Final Full-Regression Verification & Real-Browser Evidence)
```

### Phase 1: Design Tokens & Base Shell Polish
- **Scope:** Update CSS custom properties in `widget-styles.ts`, launcher FAB styling in `launcher.ts`, header branding in `panel.ts`, and footer disclaimer.
- **Files Touched:** `apps/widget/src/styles/widget-styles.ts`, `apps/widget/src/components/launcher.ts`, `apps/widget/src/components/panel.ts`.
- **Preserved Behaviors:** Focus trap, open/close state persistence, language toggle (`data-lang`), full settings reset.
- **Regression Tests:** `panel.test.ts`, `shadow-container.test.ts`.
- **Checkpoint:** Verify launcher FAB and base dialog frame match Stitch *Inclusion Shield UI* aesthetic in desktop and mobile viewports.

### Phase 2: Tab Navigation & Assist + Vision Tab Polish
- **Scope:** Refactor tab bar to include icon glyphs and active teal underline indicator. Restyle Page Insights card, DOM remediation switch, 2×2 quick profile cards, text size/line spacing steppers with progress indicator tracks, and 3-way cursor segmented control.
- **Files Touched:** `apps/widget/src/components/panel.ts`, `apps/widget/src/styles/widget-styles.ts`, `apps/widget/src/core/i18n.ts`.
- **Preserved Behaviors:** Opt-in remediation default (`remediationEnabled: false`), preset profiles behavior, stepper range clamping (80%-200%), custom cursor injection.
- **Regression Tests:** `phase2a-widget-cleanup.test.ts`, `remediator.test.ts`.
- **Checkpoint:** Verify all Vision and Assist controls function identically with new visual styling.

### Phase 3: Reading Tab & Tools Tab Polish
- **Scope:** Polish Reading Guide Ruler controls and thickness buttons, Focus Mask aperture controls, Hide Images switch, TTS Read Aloud card (Play/Pause/Stop styling, speed chips, voice dropdown), and Page Headings Navigator items (color-coded H1-H3 badges and `Jump ↗` buttons).
- **Files Touched:** `apps/widget/src/components/panel.ts`, `apps/widget/src/styles/widget-styles.ts`.
- **Preserved Behaviors:** RAF ruler/mask tracking, Web Speech API state machine, headings DOM discovery and focus handoff.
- **Regression Tests:** `phase2b-reading-tools.test.ts`, `headings-navigator.test.ts`.
- **Checkpoint:** Verify live speech synthesis and headings navigation operate with zero latency or DOM errors.

### Phase 4: Docked Magnified Reading Strip & Mobile Sheet Polish
- **Scope:** Polish `.raawi-reading-strip` styling in `widget-styles.ts` to match Stitch Direction C (dark glassmorphism, teal border, 200% badge, active stream box, zoom pills, close button). Update mobile responsive media queries (`< 768px`) to match bottom-sheet drawer spec with grab-handle.
- **Files Touched:** `apps/widget/src/styles/widget-styles.ts`, `apps/widget/src/components/reading-strip.ts`.
- **Preserved Behaviors:** Form privacy protections (`[Protected content hidden]`), keyboard priority over hover (1200ms guard), Cairo Arabic cursive font joining.
- **Regression Tests:** `phase2c-magnifier-strip.test.ts`, `phase2b2-font-cascade.test.ts`.
- **Checkpoint:** Execute real-browser Playwright test capturing screenshots of all redesigned tabs and comparing against Stitch reference boards.

---

## 8. Conflicts, Ambiguities & Missing States

1. **Tabbed Panel vs. Standalone Menus:** As detailed in Section 5, Stitch contains both a single tabbed panel (`Screen A`) and four separate tabless menus (`Menu 1-4`). Coordinator approval is requested to confirm the **Unified 4-Tab Panel** approach.
2. **Reading Mask Height Stepper Units:** Stitch `Menu 3` presents mask height as a numerical pixel stepper (`80px`), whereas the existing widget code uses a discrete 3-tier setting (`small`: 40px, `medium`: 80px, `large`: 140px). *Recommendation:* Keep the 3-tier discrete setting under the hood while visually displaying the pixel height (`80px`) on the active chip to preserve test stability.
3. **Reading Strip Invert & Focus Mask Buttons:** Stitch Direction C illustrates "Invert" and "Focus Mask" shortcut buttons directly on the docked reading strip toolbar. Currently, Invert and Focus Mask are toggled via the main panel. *Recommendation:* In Phase 4, evaluate whether to add direct shortcut buttons to `ReadingStripComponent` or retain controls in the main panel.
4. **Third-Party CDN Fonts vs. Bundled WOFF2:** Stitch HTML templates reference external Google Fonts CDN (`https://fonts.googleapis.com/...`). In the actual widget, **external network font requests are forbidden** by enterprise air-gap requirements. We must preserve our self-contained offline base64 font bundle (`cairo-data.ts`).

---

## 9. Decisions Requiring Coordinator Approval

1. **Approval of Navigation Model:** Confirm retaining the **Unified 4-Tab Panel** (Screen A / Direction A-C / All Tabs Spec) rather than dismantling the widget into four separate floating menus.
2. **Approval of Color Palette Shift:** Confirm transitioning primary accent from current bright green (`#27ae60`) to the Stitch *Inclusion Shield UI* deep emerald teal (`#0d9488`).
3. **Approval of Phased Implementation Sequence:** Confirm the 4-phase rollout plan (Tokens/Shell → Assist/Vision → Reading/Tools → Strip/Mobile).

---

## 10. Inspection Statement

- **What Was Inspected:**
  - Real Stitch Project `projects/3379199596456361018` via authorized `StitchMCP` tools (`list_projects`, `list_screens`, `get_screen`, `download_file`).
  - Raw HTML and CSS of all 7 design screens in the project.
  - Full application source files in `apps/widget/src/` (`panel.ts`, `reading-strip.ts`, `shadow-container.ts`, `types.ts`, `state.ts`, `display-manager.ts`, `i18n.ts`, `widget-styles.ts`, `cairo-data.ts`).
  - All existing Phase 2A, 2B, 2B.1, 2B.2, 2C, and 2C.1 test fixtures and browser screenshot evidence.
- **What Was Not Altered:**
  - Zero application source files were edited.
  - Zero changes were made to the Stitch project or designs.
  - Zero commits, pushes, scans, or external API calls were executed.

---

## 11. Recommended Next Action

**STOP and await Coordinator Review.**  
Upon coordinator approval of this audit and the recommended 4-phase plan, proceed to **Phase 1: Design Tokens & Base Shell Polish**.
