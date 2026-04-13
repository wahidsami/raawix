# Raawi Rollout Checklist

Use this checklist when enabling or expanding Raawi agent mode in a shared environment.

## Feature Flag

- Scanner runtime flag: `RAAWI_AGENT_ENABLED`
- `true`: Raawi agent mode is visible in the scan UI and accepted by the backend
- `false`: the UI falls back to classic audit and the backend rejects Raawi scan requests

## Pre-Deploy

- Confirm `AUTH_CREDENTIAL_ENCRYPTION_KEY` is set before using stored login secrets.
- Confirm OpenAI-related env vars are set if Raawi AI interpretation is expected in the environment.
- Decide rollout scope:
  - internal only
  - limited operator group
  - all operators
- Keep `RAAWI_AGENT_ENABLED=false` until the environment passes the regression checks below.

## Regression Checks

- Start one classic scan and confirm:
  - discovery works
  - selected-page scan starts
  - report opens normally
- Start one Raawi scan with `RAAWI_AGENT_ENABLED=true` and confirm:
  - the modal exposes `Raawi agent`
  - discovery starts
  - scanning completes
  - Raawi trace/journey sections appear in the report
- Disable `RAAWI_AGENT_ENABLED` and confirm:
  - the modal no longer allows Raawi selection
  - classic mode still works
  - direct backend requests with `auditMode=raawi-agent` are rejected clearly

## Authenticated Scan Checks

- Test one property with a saved login profile.
- If env-backed secrets are used, confirm the UI reports them as present.
- Run an authenticated scan and verify:
  - auth coverage is shown in the report
  - manual verification pause/resume still works if triggered

## Reporting Checks

- Open the scan detail page for a Raawi scan and confirm:
  - audit mode is shown correctly
  - journey runs are present
  - continuation/auth metadata is present when applicable
- Export PDF and Excel for:
  - one classic scan
  - one Raawi scan

## Operational Checks

- Review scanner logs for:
  - repeated page failures
  - OTP pause/resume errors
  - encrypted-secret misconfiguration
  - excessive AI/request failures
- Keep classic mode as the fallback if Raawi-specific regressions are found.

## Rollback

If Raawi needs to be disabled quickly:

1. Set `RAAWI_AGENT_ENABLED=false`
2. Redeploy the scanner
3. Verify the UI now offers only classic mode
4. Re-run one classic smoke scan
