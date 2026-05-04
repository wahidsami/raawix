# Raawi X System Analysis (Current State)

Last updated: 2026-05-04

## 1) Executive Summary

Raawi X is working as a multi-layer accessibility platform with:
- scanner backend (crawl, capture, analyze, persist)
- semantic engine (`semantic.json` as canonical page model)
- embeddable widget (assist + semantic mode)
- agent runtime (plan + execute semantic actions)

The system is functional end-to-end in current scope. The widget is operational and can run in production websites, with semantic-mode behavior now wired to `/api/semantic-page`.

## 2) Architecture Overview

### Backend (`apps/scanner`)
- Express API + job queue + crawl pipeline.
- Produces per-scan artifacts under `output/<scanId>/`.
- Persists scan/page metadata in DB (`Scan`, `Page`, findings tables).

### Semantic Engine (`packages/semantic-engine`)
- Builds semantic model from DOM (+ optional a11y/vision/support signals).
- Outputs `semantic.json` per page.
- Provides schema and shared types for scanner/widget/agent-runtime.

### Widget (`apps/widget`)
- Embeddable browser script with:
  - assist mode
  - semantic mode
  - virtual semantic cursor
  - semantic action activation
  - voice + keyboard input mapping

### Agent Runtime (`apps/agent-runtime`)
- Intent parser + planner + executor.
- Scanner-side Playwright bindings for automated semantic execution traces.

## 3) Scan Pipeline (Actual)

1. Crawl page with Playwright.
2. Capture L1 artifacts (HTML, links, optional `a11y.json`).
3. Capture L2 artifacts (screenshot, vision findings).
4. Build semantic model and write `semantic.json`.
5. Optional Raawi execution slice runs (login/search/navigate/fill-form based on config/probes).
6. Write page metadata (`page.json`) and persist paths in DB.
7. Generate report summary and DB findings.

## 4) Key API Surface (Current)

### Semantic-first
- `GET /api/semantic-page?url=...&scanId=...`
  - returns `{ semantic, actions, confidence, sourceMix }`

### Widget compatibility
- `GET /api/widget/page-package`
- `GET /api/widget/issues`
- `POST /api/widget/translate`
- `GET /api/widget/semantic` (legacy fallback path)

### Feedback signals
- `POST /api/widget/feedback` (stores JSONL signal rows)
- `GET /api/widget/feedback` (auth-protected query)

## 5) Persistence and Artifacts

Per-page typical outputs:
- `page.html`
- `screenshot.png`
- `semantic.json`
- `page.json`
- optional `a11y.json` (configurable)
- optional `raawi-agent/plan.json`
- optional `raawi-agent/execution.json`

Important decisions now in code:
- `a11y.json` remains optional support/debug artifact.
- toggle: `WRITE_A11Y_SNAPSHOT` (default enabled).

## 6) Widget Functional Status

## Verdict: Functional and deployable in current scope.

Working capabilities:
- launcher/panel UI renders and persists user settings
- assist mode + semantic mode switching works
- semantic model fetching now prefers `/api/semantic-page`
- legacy fallback to `/api/widget/semantic` is kept
- semantic cursor keyboard navigation works
- semantic cursor voice navigation works
- semantic action activation works with fallback resolution
- issues + translation compatibility works in semantic mode
- high-signal failure markers logged and optionally persisted via feedback API

Operational dependencies:
- `RAWI_API_URL` should point to scanner API for full intelligence
- scan data should exist for URL matching (best with recent scans)
- translation quality depends on OpenAI/Gemini env setup

Current limitations (not blockers):
- advanced fusion rules in semantic engine are still baseline/scaffolded
- confidence scoring is baseline, not yet fully weighted per block/action
- full KPI dashboard/UI wiring is still roadmap work

## 7) Important Runtime Flags

Backend:
- `RAAWI_EXECUTION_AGENT_ENABLED`
- `RAAWI_EXECUTION_NON_LOGIN_ENABLED`
- `RAAWI_AGENT_LOGIN_USERNAME`
- `RAAWI_AGENT_LOGIN_PASSWORD`
- `RAAWI_AGENT_SEARCH_QUERY`
- `RAAWI_AGENT_NAVIGATE_TARGET`
- `RAAWI_AGENT_FORM_NAME|EMAIL|MESSAGE`
- `WRITE_A11Y_SNAPSHOT`
- `WIDGET_FEEDBACK_ENABLED`
- `WIDGET_FEEDBACK_DIR`

Widget globals:
- `window.RAWI_API_URL`
- `window.RAWI_SCAN_ID` (optional)
- `window.VOICE_ENABLED` (optional)
- `window.RAAWI_WIDGET_MODE` (`assist` or `semantic`, optional override)

## 8) What Is Left (Plan-Level)

Main remaining work:
- finalize Phase 0 minor cleanup tasks (semantic-engine smoke/type scripts if still desired)
- deepen semantic fusion/confidence logic (Phase 1 quality completion)
- finish Phase 3 “in progress” depth/tests for broader agent execution reliability
- implement KPI dashboard/UI consumption (metrics are now defined, not fully surfaced)
- continue learning loop tuning from collected feedback signals

## 9) Bottom Line

The platform is already usable and functionally integrated for semantic-mode accessibility assistance.
The next iteration should focus on quality depth (fusion/confidence/agent reliability) and KPI visualization rather than foundational architecture changes.
