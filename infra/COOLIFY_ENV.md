# Coolify Environment Contract

Set these in Coolify for production scanner deployment:

- `NODE_ENV=production`
- `PORT=3001`
- `DATABASE_URL=postgresql://...`
- `JWT_SECRET=<strong-random-secret>`
- `JWT_EXPIRES_IN=7d`
- `API_KEY=<strong-random-api-key>`
- `REPORT_UI_ORIGIN=https://<your-report-ui-domain>`
- `ALLOW_LOCALHOST=false`
- `ALLOWED_PORTS=80,443`
- `OUTPUT_DIR=./output`
- `AUDIT_LOG_DIR=./logs`

Optional:

- `OPENAI_ENABLED`, `OPENAI_API_KEY`, `OPENAI_MODEL`
- `GEMINI_ENABLED`, `GEMINI_API_KEY`
- `AGENT_ENABLED`, `AGENT_PROBES_ENABLED`
- `RAAWI_AGENT_ENABLED` (`true` to expose Raawi agent mode in the UI, `false` to keep rollout limited to classic mode)
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (for user welcome and password-reset emails)
