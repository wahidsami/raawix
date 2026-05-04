# Semantic Accessibility Platform Implementation Plan

## Overview

This is a detailed implementation plan for the proposed Raawi X semantic accessibility platform.
It transforms the current layered scan system into a single Semantic Accessibility Model (SAM), gives the widget a semantic runtime, and builds a Raawi agent execution engine.

The plan is organized by phase and includes concrete tasks, file/component guidance, priorities, and risks.

## Is this a good direction?

Yes. The proposed direction is strong and strategically correct for Raawi X:
- it elevates the assistive model above raw DOM noise
- it unifies fragmented artifacts into a single truth contract
- it separates analysis from execution
- it creates a clear product moat around semantic action execution
- it preserves the existing scanner while moving toward an AI-driven assistive layer

Key risks to manage:
- overfitting on the semantic contract before it is stable
- stale/dynamic pages where semantic model may diverge from live DOM
- action execution safety and accessibility compliance
- complexity of fusing vision, DOM, assistive map, and AI hints

## Current implementation status
Last updated: 2026-05-04

- Phase 0: mostly complete. `packages/semantic-engine` was added, shared schema defined, package exports wired, and workspace references resolved.
- Phase 1: complete for current sprint scope. Semantic output is generated and persisted end-to-end; `semanticPath` DB backfill and create-path persistence were completed; initial `fusion/` + `confidence.ts` scaffolding added.
- Phase 2: complete for current sprint scope. Dual widget mode, semantic runtime, virtual cursor, and action execution layer are live. Cursor activation was aligned to use semantic action execution path first.
- Phase 3: in progress. `apps/agent-runtime` is created and integrated. Pluggable execution bindings and scanner-side Playwright bindings are implemented; execution now covers login plus scanner-side search/navigate/fill-form slices with rollout flags, and writes grouped agent artifacts under `raawi-agent/`.

## New Core Contract

### SemanticPageModel

Create a new shared contract in `packages/semantic-engine/schema.ts`.

```ts
export interface SemanticPageModel {
  metadata: {
    url: string;
    title: string;
    language?: string;
    scanId?: string;
    matchedUrl?: string;
  };

  structure: SemanticBlock[];
  actions: SemanticAction[];
  relationships: SemanticRelationship[];

  confidence: number;
  sourceMix: {
    dom: number;
    vision: number;
    ai: number;
  };
}

export type SemanticBlock =
  | TextBlock
  | ImageBlock
  | FormBlock
  | NavigationBlock
  | ButtonBlock
  | LandmarkBlock;

export interface TextBlock {
  type: 'text';
  content: string;
  label?: string;
  confidence: number;
}

export interface ImageBlock {
  type: 'image';
  description: string;
  src?: string;
  confidence: number;
}

export interface FormBlock {
  type: 'form';
  fields: SemanticField[];
  label?: string;
  confidence: number;
}

export interface NavigationBlock {
  type: 'navigation';
  items: NavItem[];
  confidence: number;
}

export interface ButtonBlock {
  type: 'button';
  label: string;
  actionId: string;
  confidence: number;
}

export interface SemanticAction {
  id: string;
  type: 'click' | 'fill' | 'select' | 'navigate' | 'submit' | 'custom';
  label: string;
  selector?: string;
  targetBlockId?: string;
  confidence: number;
}

export interface SemanticRelationship {
  from: string;
  to: string;
  type: 'labelFor' | 'hierarchy' | 'contains' | 'relatedTo' | 'fills' | 'triggers';
  confidence: number;
}
```

### New package layout

Create `packages/semantic-engine/`:
- `builder.ts`
- `schema.ts`
- `normalizers/` — DOM/vision/assistive normalizers
- `fusion/` — merge and reconcile layer outputs
- `confidence.ts` — scoring helpers and weighting
- `index.ts` — package exports

## Phase 0 — Define the New Core (Non-Negotiable)

### Goals
- Replace existing scattered semantic hints with one canonical `SemanticPageModel`
- Keep the DOM as one input source, not truth
- Keep raw artifacts for debug and audit, but make `semantic.json` the authoritative page model
- Build the new core package before changing downstream consumers

### Tasks
1. [x] Add `packages/semantic-engine/` package to the workspace.
2. [x] Define the `SemanticPageModel` schema and all related block/action/relationship types.
3. [x] Add package exports and type re-exports for `apps/scanner`, `apps/widget`, and `apps/agent-runtime`.
4. [x] Add package build/checkout hooks to root `package.json` if needed.
5. [x] Add a small smoke test or type-check script for `packages/semantic-engine`.

## Phase 1 — Build the Semantic Engine

### Goals
- Build a semantic builder that consumes DOM, a11y snapshot, vision, and assistive map
- Produce `semantic.json` as authoritative model output
- Score confidence and source mix for every block/action

### Task 1: SemanticBuilder

Implement `packages/semantic-engine/builder.ts`.

Pipeline:
```ts
buildSemanticModel({ dom, a11y, vision, assistiveMap }): SemanticPageModel
```

Responsibilities:
- normalize all inputs into internal canonical shapes
- create semantic blocks for text, images, forms, navigation, buttons, landmarks
- assemble actions from assistive intents and DOM affordances
- build relationships between blocks and actions
- compute global and block-level confidence

Status: [x] implemented basic semantic builder skeleton with page structure and action extraction.

### Task 2: Fusion Logic

Implement fusion logic in `packages/semantic-engine/fusion/`.

Status: [~] baseline scaffolding implemented in `packages/semantic-engine/src/fusion/index.ts`; advanced reconciliation rules remain pending.

Priority order:
1. Assistive Map — intent and action source
2. Vision — validation, missing context, and visual confidence
3. DOM — structural baseline and fallback selectors
4. a11y snapshot — support semantic hints and missing attributes

Essential behavior:
- if assistive map says a control is a button/action, preserve that intent
- use vision only to validate or correct DOM-derived semantics
- use DOM only to provide fallback selectors and structure when assistive map/vision are absent
- use a11y snapshot as a weak support signal, not a primary truth source

### Task 3: Confidence Scoring

Implement `packages/semantic-engine/confidence.ts`.

Status: [~] baseline `sourceMix` + confidence mapping implemented in `packages/semantic-engine/src/confidence.ts`; per-block/action weighted scoring remains pending.

For each block and action:
- assign `confidence` from weighted mix of DOM, vision, ai/assistive map
- record `sourceMix` in the final model
- use confidence thresholds for fallback decisions and UI warnings

Suggested weights:
- assistive map / ai: 0.5–0.7 for intent-rich actions
- vision: 0.2–0.4 for validation/missing context
- DOM: 0.1–0.3 for structural fallback

### Task 4: Output storage

Write `semantic.json` into page output directories in the scanner:
- `output/<scanId>/pages/<pageNumber>/semantic.json`

Keep raw artifacts in place for debugging:
- `a11y.json`
- `assistive-map.json`
- `vision-summary.json`
- `page.json`

Status: [x] semantic output file is written during page capture and persisted in `page.json` metadata.

### Task 5: Scanner integration

In scanner capture flow:
- after assistive map generation, call `buildSemanticModel()`
- write `semantic.json`
- persist `semanticPath` on `Page` and in `page.json`
- expose `semanticPath` in API responses if needed

Update code paths:
- `apps/scanner/src/crawler/page-capture.ts`
- `apps/scanner/src/db/scan-repository.ts`
- `apps/scanner/src/runner/report-generator.ts`

Status: [x] scanner integration is complete, including semantic model emission, persistence, and API surface propagation.

## Phase 2 — Replace Widget Brain

### Goals
- stop the widget from trusting live DOM as truth
- use semantic model to drive user experience and action recommendations
- keep a dual mode rollout path

### Task 1: Widget semantic runtime

Create `apps/widget/src/semantic-runtime.ts`.

Responsibilities:
- load `semantic.json` from the API
- render semantic blocks into the widget UI
- expose semantic navigation and semantic actions
- maintain event mapping from `actionId` → real DOM execution

Status: [x] initial semantic runtime support is fully implemented. Semantic reading queue built, semantic action execution wired, widget mode selection (assist/semantic) working with localStorage persistence, and virtual cursor navigation fully integrated with keyboard shortcuts (Alt+arrows).

### Task 2: Dual mode rollout

Support widget modes:
- `assist` — current behavior, DOM-first enhancements
- `semantic` — semantic runtime driven by `SemanticPageModel`

Status: [x] Widget mode selection fully implemented in settings panel with localStorage persistence. Users can switch between `assist` and `semantic` modes via the widget UI. Mode can be forced via `window.RAAWI_WIDGET_MODE = 'assist'|'semantic'`. Assist mode is default; semantic mode is opt-in.

### Task 3: Virtual Cursor

Implement a semantic cursor abstraction for block-based navigation.

Status: [x] Virtual cursor fully implemented in `apps/widget/src/semantic-cursor.ts` with:
- navigation between semantic blocks (text, forms, actions, landmarks)
- keyboard shortcuts: Alt+Down (next), Alt+Up (prev), Alt+Right (activate), Alt+Left (read)
- Alt+H (go to start), Alt+E (go to end)
- DOM highlight with blue outline and scroll-into-view
- Context retrieval and segment filtering by type
- Cursor integration in widget via `SemanticCursor` class with state management

### Task 4: Action Execution Layer

Implement mapping from semantic actions to actual page DOM behavior.

Status: [x] Action execution fully implemented in `apps/widget/src/action-execution.ts` with:
- safe DOM selector resolution and error handling
- click, navigate, submit, and focus-based execution paths
- type detection (link, button, form) for smart activation
- fallback to focus when direct execution is not available
- success/failure reporting with clear user feedback
- Integration in widget: `activateCurrentAction()` routes semantic actions to `executeSemanticAction()`

## Phase 3 — Raawi Agent (Execution Engine)

### Goals
- move from guidance to action
- make Raawi agent a unique execution moat
- let the agent plan and perform tasks using the semantic page model

### Task 1: Agent runtime package

Create `apps/agent-runtime/`.

Key files:
- `index.ts`
- `agent.ts`
- `planner.ts`
- `executor.ts`
- `intents.ts`
- `types.ts`

Status: [x] package created and deployed in branch, with core files implemented.

### Task 2: Core API

Define an API similar to:
```ts
agent.execute({
  goal: 'log in',
  model: SemanticPageModel,
  context?: { credentials?: { email: string; password: string } }
});
```

Status: [x] implemented via `RaawiAgent.execute()` / `getPlan()`.

### Task 3: Intent parsing

Implement `intents.ts` to map natural goals into action plans:
- `login`
- `checkout`
- `search`
- `navigate to contact`
- `fill form`

Status: [x] implemented in `apps/agent-runtime/src/intents.ts`.

### Task 4: Action planning

Build a planner that resolves:
- which semantic actions to execute
- order of fields and clicks
- conditional branches for pages with multiple login forms or similar controls

Example plan:
```ts
[
  { type: 'fill', fieldId: 'email', value: '...' },
  { type: 'fill', fieldId: 'password', value: '...' },
  { type: 'click', actionId: 'submit-login' }
]
```

Status: [x] implemented baseline planner in `apps/agent-runtime/src/planner.ts`.

### Task 5: Execution engine

Implement a runtime that can execute the plan with page bindings.

Options:
- browser-side DOM binding inside the widget for live interaction
- scanner-side Playwright-style execution for automated scans/tests

Since the user specifically wants a moat, build both:
- widget agent runtime for assistive actions in the browser
- scanner agent runtime for execution during scan or replay

Status: [~] execution engine implemented with pluggable bindings; browser bindings and scanner Playwright bindings are added. Remaining: broaden goals beyond login slice, add stronger trace/report integration and tests.

## Phase 4 — Multimodal Interaction Layer

### Goals
- support voice, keyboard, screenreader sync, and simplified UI
- make voice intent-based, not only narration
- support switch devices and alternate inputs

### Task 1: Input layer redesign

In widget and agent runtime, normalize inputs from:
- voice commands
- keyboard shortcuts / semantic cursor keys
- screen reader focus hints
- switch/assistive device events

### Task 2: Output layer redesign

Support:
- speech synthesis for semantic blocks, actions, and step-by-step flows
- simplified UI views for task flows
- progress feedback and success/failure notifications

### Task 3: Upgrade voice system

Move voice from narration mode to intent mode.
- accept commands like "Open login form", "Read menu", "Fill email"
- map commands to semantic actions
- use semantics + confidence to disambiguate

## Phase 5 — Backend API Redesign

### Goals
- make the API semantic-first
- expose semantic model data cleanly to widget and agents

### Task 1: Replace `page-package`

Create `/api/semantic-page?url=...`.

Response payload:
```json
{
  "semantic": { /* SemanticPageModel */ },
  "actions": [ /* semantic action list */ ],
  "confidence": 0.92,
  "sourceMix": { "dom": 0.2, "vision": 0.1, "ai": 0.7 }
}
```

### Task 2: Keep existing endpoints

Retain:
- `/api/widget/issues`
- `/api/widget/translate`

Add compatibility:
- `/api/widget/page-package` can proxy or include `semantic` for rollout
- preserve `latest` scan support

### Task 3: API contracts and docs

Update API docs and dashboard integration docs to reflect semantic-first contract.

## Phase 6 — Kill Dead Weight

### Goals
- remove or integrate legacy artifacts that no longer belong
- keep only data shapes that support the semantic model and user-impact delivery

### Task 1: `a11y.json`

Decide:
- integrate `a11y.json` into `semantic.json` and stop storing it as a standalone contract, or
- remove it entirely once semantic model coverage is complete

### Task 2: Redundant reports

Shift from artifact-heavy technical reports to user-impact reports anchored by:
- semantic task completion
- agent trace outcomes
- “can user complete this task?” evidence

### Task 3: Thin raw artifact layer

If raw artifacts remain, treat them as debug-only and not as production input.
- keep them in `output/` for audit
- do not use them as authoritative widget or agent input

## Phase 7 — Continuous Learning Loop

### Goals
- improve the platform from real usage and failure data
- use a feedback loop to make semantic fusion smarter over time

### Task 1: Collect failure signals

Track:
- failed action executions
- user corrections and re-runs
- agent retries and fallback flows
- stale semantic model warnings

### Task 2: Feed the engine

Use collected signals to improve:
- assistive map intent heuristics
- selector reliability
- confidence thresholds
- action planning rules

### Task 3: Model fine-tuning

If AI models are used for vision/intent, feed anonymized failure cases into training or prompt improvement.

## Phase 8 — Distribution Strategy

### Short term
- keep the embeddable widget as distribution lead
- make semantic mode opt-in for early adopters

### Mid term
- build a browser extension for tighter DOM execution control and easier provisioning

### Long term
- evolve into a browser/proxy layer for full semantic interception and cross-site assistive execution

## Phase 9 — KPI Redefinition

### Stop optimizing for
- WCAG error counts
- raw scanner issue totals

### Start optimizing for
- task completion rate
- time to complete task
- user independence score
- semantic trust/confidence
- user-facing success metrics

## Implementation Roadmap

### Phase 0 deliverables
- `packages/semantic-engine/` created
- `SemanticPageModel` schema in place
- type exports for scanner/widget/agent

### Phase 1 deliverables
- `buildSemanticModel()` implemented
- `semantic.json` written in scan output
- scanner integration and storage of `semanticPath`
- confidence and sourceMix tracked

### Phase 2 deliverables
- `apps/widget/src/semantic-runtime.ts`
- semantic mode added to widget
- action mapping and virtual cursor built
- DOM execution only via action layer

### Phase 3 deliverables
- `apps/agent-runtime/` package created
- agent intent parsing and planning implemented
- execution engine built and integrated

### Phase 4 deliverables
- intent-based voice layer
- keyboard + multimodal input support
- semantic output layer and progress UI

### Phase 5 deliverables
- `/api/semantic-page` endpoint available
- widget and agent consume semantic-first API
- docs updated for semantic API contract

### Phase 6 deliverables
- `a11y.json` either consolidated or removed
- redundant report paths pruned
- user-impact reports prioritized

### Phase 7 deliverables
- failure signal collection pipeline
- feedback-driven semantic tuning

### Phase 8 deliverables
- widget rollout remains primary
- browser extension prototypes scoped
- architecture defined for proxy/browser product

### Phase 9 deliverables
- new KPI dashboard/metrics definitions
- measurement of task completion and independence

## Recommended First Sprint

1. Create `packages/semantic-engine/`
2. Define `SemanticPageModel` schema
3. Add scanner-side `semantic.json` generation path
4. Build widget semantic runtime skeleton
5. Add `semantic` mode flag to widget

This keeps the first sprint focused on architecture, schema, and small visible behavior changes.

## Final Notes

This is a good development path for Raawi X.

The key to success is:
- build a strong canonical semantic contract first
- keep existing data sources as inputs, not truth
- let the widget and agent consume semantic data, not raw DOM
- preserve raw artifacts for debug only, not as user-facing source
- phase out legacy layer artifacts once semantic coverage is stable

If you want, I can also turn this into a prioritized kanban-style implementation backlog with stories, acceptance criteria, and estimated effort per phase.

## Implementation Backlog

This single-file tracker uses checkboxes for task status. Mark tasks complete by changing `[ ]` to `[x]`.

## Execution Readiness

This system is ready to start executing. The repo is deployed on a VPS via Coolify, so each sprint should be finished with a committed push and a deployment validation step.

Workflow:
- complete sprint tasks in `SEMANTIC_ENGINE_IMPLEMENTATION_PLAN.md`
- update sprint-level status in the `Progress Summary` table
- commit and push changes after each sprint
- trigger Coolify deployment or verify it auto-deploys from the branch
- validate the deployed app on the VPS and mark the sprint complete

### Deployment Checklist
- [ ] commit changes for sprint tasks
- [ ] push to remote branch
- [ ] confirm Coolify build/deploy starts successfully
- [ ] smoke test the deployed app on VPS
- [ ] update task status in this file

### Branch strategy
- use feature branches per sprint, e.g. `feature/semantic-core`, `feature/widget-semantic-mode`
- merge to main only after successful deployment and validation
- keep `main` deployable at all times

### Notes
- since the app is already hosted, keep changes incremental and test after each sprint
- preserve existing production behavior during rollout by using feature flags

### Progress Summary

| Sprint | Task | Status |
|---|---|---|
| 1 | Semantic Core & Scanner Integration | ✅ Complete |
| 2 | Widget Semantic Runtime & Dual Mode | ✅ Complete |
| 3 | Agent Runtime and Intent Planning | 🟨 In Progress |
| 4 | Multimodal Input and API Redesign | ✅ Complete |
| 5 | Cleanup and Evaluation | ✅ Complete |
| Ongoing | Learning and Metrics | ✅ Complete (current scope) |

### Sprint 1 — Semantic Core & Scanner Integration

- [x] Create `packages/semantic-engine/`
  - [x] add package folder and package manifest if needed
  - [x] define `SemanticPageModel` and block/action/relationship schemas
  - [x] export shared types for scanner, widget, agent
  - Acceptance Criteria:
    - package compiles and type-checks
    - `SemanticPageModel` types are imported successfully from `apps/scanner`
  - Effort: 2 days

- [x] Implement `buildSemanticModel()` skeleton
  - [x] add `packages/semantic-engine/builder.ts`
  - [x] define input shape and output `SemanticPageModel`
  - [x] wire basic normalization of DOM, vision, assistive map, a11y
  - Acceptance Criteria:
    - `buildSemanticModel()` returns valid `SemanticPageModel` for sample page input
    - tests cover basic block creation
  - Effort: 3 days

- [x] Add `semantic.json` write path in scanner
  - [x] integrate builder into capture flow after assistive map generation
  - [x] write `semantic.json` into `output/<scanId>/pages/<pageNumber>/`
  - [x] persist `semanticPath` on `Page` and in `page.json`
  - Acceptance Criteria:
    - completed scan output contains `semantic.json`
    - `Page` records and `page.json` include `semanticPath`
  - Effort: 2 days

### Sprint 2 — Widget Semantic Runtime and Dual Mode

- [x] Create widget semantic runtime skeleton
  - [x] add `apps/widget/src/semantic-runtime.ts`
  - [x] implement semantic model loader from API
  - [x] render simple semantic block list in widget UI
  - Acceptance Criteria:
    - widget can fetch and display semantic blocks from `/api/semantic-page`
    - no DOM-driven semantic mode changes yet
  - Effort: 3 days

- [x] Add dual widget mode support
  - [x] add mode selection to widget settings
  - [x] preserve `assist` as default
  - [x] add `semantic` experimental mode behind flag
  - Acceptance Criteria:
    - widget can switch between `assist` and `semantic`
    - semantic mode activates without breaking existing behavior
  - Effort: 1 day

- [x] Implement action execution layer stub
  - [x] create `apps/widget/src/action-execution.ts`
  - [x] map simple action IDs to DOM selectors
  - [x] execute click/fill for a prototype action
  - Acceptance Criteria:
    - widget can execute a sample semantic action on a live page
  - Effort: 2 days

### Sprint 3 — Agent Runtime and Intent Planning

- [x] Create `apps/agent-runtime/`
  - [x] scaffold package and core API
  - [x] define `agent.execute({goal, model})`
  - Acceptance Criteria:
    - package builds
    - agent can receive a semantic model and return a plan
  - Effort: 2 days

- [x] Implement intent parsing and planning
  - [x] add intent definitions for login, search, checkout
  - [x] build planner mapping goals to plan steps
  - Acceptance Criteria:
    - goal `login` returns a sequence of semantic actions
    - planner is test-covered
  - Effort: 3 days

- [~] Build execution engine adapter
  - [x] implement plan executor using DOM bindings or Playwright-style calls
  - [~] connect executor to widget action layer and scanner runtime
  - Acceptance Criteria:
    - agent can execute a login plan against a test page
  - Effort: 4 days

### Immediate Next (Phase 3)

- [x] Add scan-detail/report surfacing for `raawi-agent/plan.json` and `raawi-agent/execution.json` (scan-detail API now includes `raawiExecution.pages` + summary and page-level `raawiExecution` details)
- [x] Add automated test for login vertical slice (plan + execute + artifact assertions)
- [x] Expand execution coverage beyond login (search, navigate, fill-form)
- [x] Add robust field/action resolution heuristics from assistive map and semantic relationships (alias-based field matching, metadata-aware action scoring, and scanner Playwright locator fallback strengthening)

### Sprint 4 — Multimodal Input and API Redesign

- [x] Redesign widget inputs for semantics
  - [x] add keyboard and voice intent event mapping (semantic-mode voice intents now support action-label targeting: `activate/click/go to <action label>`; action navigation disambiguated to avoid generic `next` collisions; validation markers added via `RaawiE2E.getIntentLog()` + `[RaawiX Widget Intent]` console traces)
  - [x] support semantic cursor navigation (keyboard shortcuts + voice commands for next/previous/read/activate/start/end semantic blocks)
  - Acceptance Criteria:
    - widget can navigate semantic blocks with keyboard
    - voice command can trigger a semantic action
  - Effort: 3 days

- [x] Add `/api/semantic-page` endpoint
  - [x] create API route in scanner backend
  - [x] return `SemanticPageModel` and metadata (`semantic`, `actions`, `confidence`, `sourceMix`)
  - Acceptance Criteria:
    - [x] endpoint returns valid semantic response for URL
    - [x] widget semantic mode uses this endpoint (with legacy fallback to `/api/widget/semantic`)
  - Effort: 2 days

- [x] Keep `/issues` and `/translate`
  - [x] ensure compatibility with existing widget flows
  - [x] document endpoint behavior for semantic mode (`/api/widget/issues` remains active with locale param; `/api/widget/translate` remains optional with graceful fallback to source text on 501/error; semantic-mode compatibility markers logged)
  - Acceptance Criteria:
    - widget still fetches issues and translation successfully
  - Effort: 1 day

### Sprint 5 — Cleanup and Evaluation

- [x] Decide fate of `a11y.json`
  - [x] evaluate semantic model coverage
  - [x] keep `a11y.json` as optional support/debug artifact for now (controlled via `WRITE_A11Y_SNAPSHOT`, default `true`), while semantic model remains the canonical output
  - Acceptance Criteria:
    - `a11y.json` is either consumed by semantic builder or no longer written as legacy contract
  - Effort: 1 day

- [x] Prepare user-impact report design
  - [x] define data model for task completion and agent trace outcomes
  - [x] update report generator docs (`docs/USER_IMPACT_REPORT_MODEL.md`)
  - Acceptance Criteria:
    - documentation exists for new report direction
  - Effort: 2 days

### Ongoing Phase — Learning and Metrics

- [x] Track failed actions and user corrections
  - [x] instrument widget and agent runtime with failure logs (semantic intent/failure markers in widget + existing agent execution artifacts)
  - [x] persist feedback signals (`POST /api/widget/feedback` stores JSONL events under `output/_feedback/widget-feedback.jsonl`)
  - Acceptance Criteria:
    - failures are logged and can be queried
  - Effort: 2 days

- [x] Define KPI dashboard metrics
  - [x] add tasks completed, time to complete, independence score to roadmap
  - [x] align product metrics with semantic platform goals
  - KPI metric definitions (v1):
    - `taskCompletionRate` = completed tasks / executable tasks
    - `independenceScore` = weighted score across `independent|assisted|blocked|unknown` outcomes
    - `avgTaskDurationMs` = mean duration of completed/partial tasks
    - `blockedTaskRate` = blocked tasks / executable tasks
    - `semanticCoverageRate` = pages with semantic model / scanned pages
    - `agentExecutionCoverageRate` = pages with raawi execution trace / scanned pages
    - `feedbackFailureRate` = failure feedback events / total feedback events
  - Acceptance Criteria:
    - [x] KPI docs added to the plan
  - Effort: 1 day

## Recommended Execution Order

1. Semantic Core
2. Scanner Semantic Output
3. Widget Semantic Runtime
4. Dual Mode + Action Execution
5. Agent Runtime
6. Semantic API
7. Multimodal Input
8. Cleanup and KPI tracking

## Notes on Prioritization

- The highest-value work is the schema + scanner integration. Without semantic output, the rest cannot follow reliably.
- Widget semantic mode should be built cautiously behind a feature flag.
- The agent runtime is the product moat, but it should be built after the semantic model is stable.
- The cleanup phase should happen only after the semantic model covers the same data that legacy artifacts used.
