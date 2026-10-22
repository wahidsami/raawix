# Project Lessons & Rules

## Gemini Resilience & Vision Layer (Phase 7B.5)
- **Do not leak raw errors or thought parts:** Provider diagnostics must remain sanitized with zero secrets, auth headers, base64 data, or raw model thoughts.
- **Budget and Circuit Breaking:** When external AI APIs throttle with HTTP 429 (Rate Limit / Quota Exceeded), immediately halt further outbound requests for the current scan rather than hammering the endpoint with futile calls.
- **Layer 2 to Layer 3 Reuse:** Avoid duplicate Gemini calls. If Layer 2 already generated an element description with verified identity, provenance, and medium confidence, reuse it in Layer 3 `labelOverrides` instead of calling Gemini again.
- **Operational Boundaries:** Never execute live scans, outbound API calls, or remote deployments unless explicitly authorized with a fresh token/instruction.
