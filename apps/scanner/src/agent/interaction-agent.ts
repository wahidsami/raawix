/**
 * InteractionAgent v1: keyboard-only focus trace and basic detectors.
 * Deterministic, bounded, best-effort. No external APIs.
 */

import type { Page } from 'playwright';
import {
  assessRaawiTaskIntents,
  captureRaawiPageProfile,
  type RaawiPageProfile,
  type RaawiTaskAssessment,
} from './page-understanding.js';

const NAME_CAP = 200;
const CLASSES_CAP = 200;
const LOOP_WINDOW = 15;
const LOOP_REPEAT_THRESHOLD = 3;
const DUPLICATE_NAME_THRESHOLD = 5;
const UNNAMED_MAX_EXAMPLES = 10;
const FOCUS_NOT_VISIBLE_STEP_THRESHOLD = 10;
const BODY_EXCERPT_LEN = 5000;
const PROBE_WAIT_MS = 300;
const MAX_CANDIDATES_PER_TYPE = 3;
const ARIA_LIVE_SAMPLE_SIZE = 10;

export type InteractionAgentOptions = {
  maxSteps: number;
  maxMs: number;
  probesEnabled: boolean;
};

export type InteractionArtifact = {
  url: string;
  pageNumber: number;
  capturedAt: string;
  pageProfile?: RaawiPageProfile;
  taskAssessments?: RaawiTaskAssessment[];
  steps: Array<{
    i: number;
    action: 'tab' | 'shift+tab';
    active: {
      tag?: string;
      role?: string | null;
      name?: string;
      id?: string | null;
      classes?: string | null;
      href?: string | null;
      type?: string | null;
      disabled?: boolean;
      readonly?: boolean;
      aria?: Record<string, string | null>;
      state?: {
        ariaExpanded?: string | null;
        ariaPressed?: string | null;
        ariaChecked?: string | null;
        ariaSelected?: string | null;
        ariaCurrent?: string | null;
        ariaInvalid?: string | null;
        ariaRequired?: string | null;
        disabled?: boolean;
        readonly?: boolean;
        type?: string | null;
        href?: string | null;
      };
      selectorHint?: string;
    };
    focusVisible?: boolean;
  }>;
  issues: Array<{
    kind:
      | 'focus_trap'
      | 'unnamed_control'
      | 'duplicate_control_name'
      | 'focus_not_visible'
      | 'silent_update'
      | 'modal_focus_not_moved'
      | 'focus_not_restored'
      | 'expanded_state_not_updated'
      | 'validation_error_not_focused'
      | 'missing_page_structure'
      | 'unnamed_task_control'
      | 'missing_form_instructions'
      | 'image_alt_task_issue'
      | 'verification_checkpoint_requires_manual_input';
    message: string;
    confidence: number;
    evidence: unknown;
    suggestedWcagIds?: string[];
    howToVerify?: string;
  }>;
  probes?: Array<{
    name: 'modal_probe' | 'menu_probe' | 'form_validation_probe';
    attempted: boolean;
    success: boolean;
    message: string;
    evidence: unknown;
  }>;
};

const INTERACTIVE_ROLES = new Set([
  'button',
  'link',
  'textbox',
  'searchbox',
  'combobox',
  'listbox',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'checkbox',
  'switch',
  'tab',
  'slider',
  'spinbutton',
]);

const INTERACTIVE_TAGS = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']);

function cap(s: string | undefined | null, max: number): string | undefined | null {
  if (s == null) return s;
  if (s.length <= max) return s;
  return s.slice(0, max) + '…';
}

/**
 * Capture currently focused element and focus visibility (run in page context).
 * focusVisible is only at step level; active does not duplicate it.
 */
function captureFocusScript(): {
  tag: string;
  role: string | null;
  name: string;
  id: string | null;
  classes: string | null;
  href: string | null;
  type: string | null;
  disabled: boolean;
  readonly: boolean;
  aria: Record<string, string | null>;
  state: {
    ariaExpanded: string | null;
    ariaPressed: string | null;
    ariaChecked: string | null;
    ariaSelected: string | null;
    ariaCurrent: string | null;
    ariaInvalid: string | null;
    ariaRequired: string | null;
    disabled: boolean;
    readonly: boolean;
    type: string | null;
    href: string | null;
  };
  selectorHint: string;
  focusVisible: boolean;
} {
  const el = document.activeElement as HTMLElement | null;
  if (!el || el === document.body) {
    return {
      tag: '',
      role: null,
      name: '',
      id: null,
      classes: null,
      href: null,
      type: null,
      disabled: false,
      readonly: false,
      aria: {},
      state: {
        ariaExpanded: null,
        ariaPressed: null,
        ariaChecked: null,
        ariaSelected: null,
        ariaCurrent: null,
        ariaInvalid: null,
        ariaRequired: null,
        disabled: false,
        readonly: false,
        type: null,
        href: null,
      },
      selectorHint: '',
      focusVisible: false,
    };
  }

  const tag = el.tagName?.toLowerCase() ?? '';
  const id = el.id ?? null;
  const className = el.getAttribute('class');
  const classes = className == null ? null : className.trim() || null;
  const role = el.getAttribute('role') ?? null;
  const href = el.getAttribute('href') ?? (el as HTMLAnchorElement).href ?? null;
  const type = el.getAttribute('type') ?? (el as HTMLInputElement).type ?? null;
  const disabled = (el as HTMLButtonElement | HTMLInputElement).disabled ?? false;
  const readonly = (el as HTMLInputElement | HTMLTextAreaElement).readOnly ?? false;

  const aria: Record<string, string | null> = {};
  for (const a of el.getAttributeNames?.() ?? []) {
    if (a.startsWith('aria-')) aria[a] = el.getAttribute(a);
  }
  const state = {
    ariaExpanded: el.getAttribute('aria-expanded'),
    ariaPressed: el.getAttribute('aria-pressed'),
    ariaChecked: el.getAttribute('aria-checked'),
    ariaSelected: el.getAttribute('aria-selected'),
    ariaCurrent: el.getAttribute('aria-current'),
    ariaInvalid: el.getAttribute('aria-invalid'),
    ariaRequired: el.getAttribute('aria-required'),
    disabled,
    readonly,
    type,
    href,
  };

  let name = '';
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.trim()) {
    name = ariaLabel.trim();
  } else {
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy && labelledBy.trim()) {
      const ids = labelledBy.trim().split(/\s+/);
      const parts: string[] = [];
      for (const idRef of ids) {
        const refEl = document.getElementById(idRef);
        if (refEl) parts.push((refEl.textContent ?? '').trim());
      }
      name = parts.filter(Boolean).join(' ').trim();
    }
  }
  if (!name && el.textContent) name = (el.textContent ?? '').trim().replace(/\s+/g, ' ').trim();
  name = name.slice(0, NAME_CAP);

  let selectorHint = '';
  if (id) selectorHint = `#${id}`;
  else if (tag) selectorHint = tag + (classes ? '.' + (classes as string).split(/\s+/).slice(0, 2).join('.') : '');

  const style = window.getComputedStyle(el);
  const outlineWidth = parseFloat(style.outlineWidth) || 0;
  const outlineStyle = (style.outlineStyle ?? '').toLowerCase();
  const boxShadow = (style.boxShadow ?? 'none').toLowerCase();
  const focusVisible =
    outlineWidth > 0 || outlineStyle !== 'none' || (boxShadow !== 'none' && boxShadow !== '');

  return {
    tag,
    role,
    name,
    id,
    classes: classes == null ? null : (classes as string).slice(0, CLASSES_CAP),
    href,
    type,
    disabled,
    readonly,
    aria,
    state,
    selectorHint,
    focusVisible,
  };
}

/** DOM change fingerprint: text hash + structural counts for better change detection. */
export type DomChangeFingerprint = {
  textHash: string;
  textLen: number;
  ariaInvalidCount: number;
  alertCount: number;
  ariaLiveCount: number;
  focusableCount: number;
};

/** Run in page: return fingerprint for DOM change detection. */
async function getDomChangeFingerprint(page: Page): Promise<DomChangeFingerprint> {
  return page.evaluate((excerptLen: number) => {
    const el = document.body;
    const empty = {
      textHash: '',
      textLen: 0,
      ariaInvalidCount: 0,
      alertCount: 0,
      ariaLiveCount: 0,
      focusableCount: 0,
    };
    if (!el) return empty;
    const raw = (el.innerText ?? (el as HTMLElement).textContent ?? '').slice(0, excerptLen);
    let h = 0;
    for (let i = 0; i < raw.length; i++) {
      h = ((h << 5) - h + raw.charCodeAt(i)) | 0;
    }
    const invalid = document.querySelectorAll('input[aria-invalid="true"], select[aria-invalid="true"], textarea[aria-invalid="true"]').length;
    const alerts = document.querySelectorAll('[role="alert"]').length;
    const live = document.querySelectorAll('[aria-live]').length;
    const focusable = document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])').length;
    return {
      textHash: `${h},${raw.length}`,
      textLen: raw.length,
      ariaInvalidCount: invalid,
      alertCount: alerts,
      ariaLiveCount: live,
      focusableCount: focusable,
    };
  }, BODY_EXCERPT_LEN);
}

function domFingerprintChanged(
  a: DomChangeFingerprint,
  b: DomChangeFingerprint
): boolean {
  if (a.textHash === '' && b.textHash === '') return false;
  if (a.textHash !== b.textHash) return true;
  if (a.ariaInvalidCount !== b.ariaInvalidCount) return true;
  if (a.alertCount !== b.alertCount) return true;
  if (a.ariaLiveCount !== b.ariaLiveCount) return true;
  if (a.focusableCount !== b.focusableCount) return true;
  return false;
}

/** Run in page: find candidate elements (max per type). */
async function findCandidateElements(
  page: Page,
  maxPerType: number
): Promise<{
  modalTriggers: Array<{ selector: string; tag: string }>;
  menuToggles: Array<{ selector: string; tag: string; expanded: string | null }>;
  submitButtons: Array<{ selector: string; tag: string }>;
}> {
  return page.evaluate((max: number) => {
    const out: {
      modalTriggers: Array<{ selector: string; tag: string }>;
      menuToggles: Array<{ selector: string; tag: string; expanded: string | null }>;
      submitButtons: Array<{ selector: string; tag: string }>;
    } = { modalTriggers: [], menuToggles: [], submitButtons: [] };
    const selModal = '[aria-haspopup="dialog"], [data-modal], button[aria-expanded][aria-controls]';
    document.querySelectorAll(selModal).forEach((n) => {
      if (out.modalTriggers.length >= max) return;
      const el = n as HTMLElement;
      if (el.offsetParent === null) return;
      const sel = el.id ? `#${el.id}` : el.tagName + (el.className ? '.' + String(el.className).split(/\s+/).slice(0, 2).join('.') : '');
      out.modalTriggers.push({ selector: sel, tag: el.tagName });
    });
    document.querySelectorAll('[role="dialog"]').forEach((d) => {
      if (out.modalTriggers.length >= max) return;
      const opener = d.id ? document.querySelector(`[aria-controls="${d.id}"]`) : null;
      if (opener) {
        const o = opener as HTMLElement;
        const osel = o.id ? `#${o.id}` : o.tagName;
        if (!out.modalTriggers.some((t) => t.selector === osel)) {
          out.modalTriggers.push({ selector: osel, tag: o.tagName });
        }
      }
    });
    document.querySelectorAll('[aria-expanded]').forEach((e) => {
      if (out.menuToggles.length >= max) return;
      const el = e as HTMLElement;
      if (el.offsetParent === null) return;
      const es = el.id ? `#${el.id}` : el.tagName + (el.className ? '.' + String(el.className).split(/\s+/).slice(0, 2).join('.') : '');
      out.menuToggles.push({ selector: es, tag: el.tagName, expanded: el.getAttribute('aria-expanded') });
    });
    document.querySelectorAll('form button[type="submit"], form input[type="submit"]').forEach((sb) => {
      if (out.submitButtons.length >= max) return;
      const el = sb as HTMLElement;
      if (el.offsetParent === null) return;
      const ssel = el.id ? `#${el.id}` : el.tagName + (el.getAttribute('name') ? `[name="${el.getAttribute('name')}"]` : '');
      out.submitButtons.push({ selector: ssel, tag: el.tagName });
    });
    return out;
  }, maxPerType);
}

/** Run in page: sample aria-live text (up to n elements). */
async function getAriaLiveTexts(page: Page, n: number): Promise<Array<{ role: string | null; text: string }>> {
  return page.evaluate((cap: number) => {
    const nodes = document.querySelectorAll('[aria-live]');
    const out: Array<{ role: string | null; text: string }> = [];
    for (let i = 0; i < nodes.length && i < cap; i++) {
      const el = nodes[i];
      out.push({
        role: el.getAttribute('aria-live'),
        text: (el.textContent ?? '').trim().slice(0, 500),
      });
    }
    return out;
  }, n);
}

/** Run in page: check dialog presence and focus inside. */
async function checkDialogAndFocus(page: Page): Promise<{ dialogPresent: boolean; focusInside: boolean }> {
  return page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"], [aria-modal="true"]');
    if (!dialog) return { dialogPresent: false, focusInside: false };
    const active = document.activeElement;
    return { dialogPresent: true, focusInside: !!(active && dialog.contains(active)) };
  });
}

/** Run in page: get aria-expanded for selector. */
async function getExpandedState(page: Page, selector: string): Promise<string | null> {
  return page.evaluate((sel: string) => {
    const el = document.querySelector(sel);
    return el ? el.getAttribute('aria-expanded') : null;
  }, selector);
}

/** Run in page: check validation state (aria-invalid, role=alert, focus). */
async function checkValidationState(
  page: Page
): Promise<{ hasValidation: boolean; focusOnInvalid: boolean; focusOnAlert: boolean; invalidCount: number }> {
  return page.evaluate(() => {
    const invalid = document.querySelectorAll('input[aria-invalid="true"], select[aria-invalid="true"], textarea[aria-invalid="true"]');
    const alerts = document.querySelectorAll('[role="alert"]');
    const firstInvalid = invalid.length ? invalid[0] : null;
    const firstAlert = alerts.length ? alerts[0] : null;
    const focusOnInvalid = !!(firstInvalid && document.activeElement === firstInvalid);
    const focusOnAlert = !!(firstAlert && document.activeElement === firstAlert);
    const alertText = firstAlert ? (firstAlert.textContent ?? '').trim().length > 0 : false;
    return {
      hasValidation: invalid.length > 0 || (alerts.length > 0 && alertText),
      focusOnInvalid,
      focusOnAlert,
      invalidCount: invalid.length,
    };
  });
}

/** Result from running a probe with navigation guard. */
type ProbeNavGuardResult<T> = {
  result: T | null;
  error?: Error;
  navigationOccurred: boolean;
  navigationRestored: boolean;
};

/**
 * Run a probe fn with navigation guard: if the page navigates, try goBack then goto(probeStartUrl).
 * Sets stopFurtherProbesRef.current = true if URL could not be restored.
 */
async function runProbeWithNavGuard<T>(
  page: Page,
  probeStartUrl: string,
  stopFurtherProbesRef: { current: boolean },
  fn: () => Promise<T>
): Promise<ProbeNavGuardResult<T>> {
  let result: T | null = null;
  let err: Error | undefined;
  try {
    result = await fn();
  } catch (e) {
    err = e instanceof Error ? e : new Error(String(e));
  }

  const urlAfter = page.url();
  const navigationOccurred = urlAfter !== probeStartUrl;
  let navigationRestored = true;
  if (navigationOccurred) {
    try {
      await page.goBack({ waitUntil: 'domcontentloaded', timeout: 8000 });
      if (page.url() !== probeStartUrl) {
        await page.goto(probeStartUrl, { waitUntil: 'domcontentloaded', timeout: 8000 });
      }
      navigationRestored = page.url() === probeStartUrl;
    } catch {
      try {
        await page.goto(probeStartUrl, { waitUntil: 'domcontentloaded', timeout: 8000 });
        navigationRestored = page.url() === probeStartUrl;
      } catch {
        navigationRestored = false;
      }
    }
    if (!navigationRestored) {
      stopFurtherProbesRef.current = true;
    }
  }

  return {
    result,
    error: err,
    navigationOccurred,
    navigationRestored,
  };
}

/** Returns captureFocusScript output plus url and timestamp. */
async function getActiveSnapshot(page: Page, url: string): Promise<
  ReturnType<typeof captureFocusScript> & { url: string; timestamp: number }
> {
  const raw = await page.evaluate(captureFocusScript);
  return { ...raw, url, timestamp: Date.now() };
}

function isInteractive(active: ReturnType<typeof captureFocusScript>): boolean {
  if (!active.tag) return false;
  const r = (active.role ?? '').toLowerCase();
  if (INTERACTIVE_ROLES.has(r)) return true;
  if (INTERACTIVE_TAGS.has(active.tag.toUpperCase())) return true;
  return false;
}

type ActiveSnapshot = {
  tag: string;
  id?: string | null;
  role?: string | null;
  name?: string;
  href?: string | null;
};

function focusSignature(active: ActiveSnapshot): string {
  const parts = [
    active.tag ?? '',
    active.id ?? '',
    active.role ?? '',
    active.name ?? '',
    active.href ?? '',
  ];
  return parts.join('|');
}

export async function runInteractionAgent(
  page: Page,
  ctx: { url: string; pageNumber: number },
  opts: InteractionAgentOptions & { onProgress?: (stepIndex: number, maxSteps: number) => void }
): Promise<InteractionArtifact> {
  const start = Date.now();
  const steps: InteractionArtifact['steps'] = [];
  const issues: InteractionArtifact['issues'] = [];
  const probes: NonNullable<InteractionArtifact['probes']> = [];
  let pageProfile: RaawiPageProfile | undefined;
  let taskAssessments: RaawiTaskAssessment[] = [];
  const unnamedExamples: Array<{ stepIndex: number; tag: string; role: string | null; selectorHint: string }> = [];
  const roleNameCount = new Map<string, number>();
  let focusNotVisibleCount = 0;
  let focusNotVisibleInteractive: Array<{ stepIndex: number; tag: string; role: string | null }> = [];

  const captureStep = async (i: number, action: 'tab' | 'shift+tab') => {
    const raw = await page.evaluate(captureFocusScript);
    const active = {
      tag: raw.tag || undefined,
      role: raw.role,
      name: cap(raw.name, NAME_CAP) ?? undefined,
      id: raw.id,
      classes: raw.classes == null ? null : cap(raw.classes, CLASSES_CAP) ?? null,
      href: raw.href,
      type: raw.type,
      disabled: raw.disabled,
      readonly: raw.readonly,
      aria: raw.aria,
      state: raw.state,
      selectorHint: cap(raw.selectorHint, NAME_CAP) ?? undefined,
    };
    steps.push({
      i,
      action,
      active,
      focusVisible: raw.focusVisible,
    });

    const sig = focusSignature(raw);

    if (!raw.focusVisible) {
      focusNotVisibleCount++;
      if (isInteractive(raw)) {
        focusNotVisibleInteractive.push({ stepIndex: i, tag: raw.tag, role: raw.role });
      }
    }

    if (isInteractive(raw)) {
      const name = (raw.name ?? '').trim();
      if (!name) {
        if (unnamedExamples.length < UNNAMED_MAX_EXAMPLES) {
          unnamedExamples.push({
            stepIndex: i,
            tag: raw.tag,
            role: raw.role,
            selectorHint: raw.selectorHint,
          });
        }
      } else {
        const key = `${raw.role ?? ''}|${name}`;
        roleNameCount.set(key, (roleNameCount.get(key) ?? 0) + 1);
      }
    }

    return raw;
  };

  const maybeProgress = (i: number) => {
    if (!opts.onProgress) return;
    // Emit on step 1 and then every 5 steps to reduce SSE spam.
    if (i === 1 || i % 5 === 0) {
      opts.onProgress(i, opts.maxSteps);
    }
  };

  try {
    try {
      pageProfile = await captureRaawiPageProfile(page, ctx.url);
      taskAssessments = assessRaawiTaskIntents(pageProfile);
      for (const assessment of taskAssessments) {
        if (!assessment.issue) continue;
        issues.push(assessment.issue);
      }
    } catch (profileErr) {
      console.warn('[InteractionAgent] Page profile capture failed:', profileErr);
    }

    await page.keyboard.press('Tab');
    await page.waitForTimeout(50);
    await captureStep(0, 'tab');

    for (let i = 1; i < opts.maxSteps; i++) {
      if (Date.now() - start >= opts.maxMs) break;

      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);
      await captureStep(i, 'tab');
      maybeProgress(i);

      const windowStart = Math.max(0, steps.length - LOOP_WINDOW);
      const windowSteps = steps.slice(windowStart);
      const lastStep = steps[steps.length - 1];
      const sig = focusSignature(lastStep.active as ActiveSnapshot);
      const countInWindow = windowSteps.filter(
        (s) => focusSignature(s.active as ActiveSnapshot) === sig
      ).length;
      if (countInWindow >= LOOP_REPEAT_THRESHOLD) {
        issues.push({
          kind: 'focus_trap',
          message: `Keyboard focus appears trapped: same focus target repeated ${countInWindow} times within ${LOOP_WINDOW} steps.`,
          confidence: Math.min(0.95, 0.5 + countInWindow * 0.15),
          evidence: {
            stepIndexes: windowSteps.map((s) => s.i),
            signature: sig,
            repeatCount: countInWindow,
          },
          suggestedWcagIds: ['2.1.2', '2.4.3'],
          howToVerify:
            'Tab through the page; if focus cycles without reaching new content, a focus trap is likely.',
        });
        break;
      }
    }

    const backwardSteps = Math.min(10, Math.max(0, Math.floor(opts.maxSteps / 5)));
    for (let k = 0; k < backwardSteps; k++) {
      if (Date.now() - start >= opts.maxMs) break;
      await page.keyboard.press('Shift+Tab');
      await page.waitForTimeout(50);
      await captureStep(steps.length, 'shift+tab');
    }

    if (unnamedExamples.length > 0) {
      issues.push({
        kind: 'unnamed_control',
        message: `Found ${unnamedExamples.length} interactive control(s) without an accessible name.`,
        confidence: 0.85,
        evidence: { examples: unnamedExamples.slice(0, UNNAMED_MAX_EXAMPLES), total: unnamedExamples.length },
        suggestedWcagIds: ['4.1.2', '2.4.6'],
        howToVerify: 'Use Tab to focus each control; screen readers should announce a name (e.g. aria-label or visible text).',
      });
    }

    const duplicateEntries = [...roleNameCount.entries()].filter(([, n]) => n >= DUPLICATE_NAME_THRESHOLD);
    if (duplicateEntries.length > 0) {
      const top = duplicateEntries
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([key, n]) => ({ roleName: key, count: n }));
      issues.push({
        kind: 'duplicate_control_name',
        message: `${duplicateEntries.length} control name(s) repeated ≥${DUPLICATE_NAME_THRESHOLD} times; may confuse users.`,
        confidence: 0.7,
        evidence: { byRoleName: top, threshold: DUPLICATE_NAME_THRESHOLD },
        suggestedWcagIds: ['2.4.6', '4.1.2'],
        howToVerify: 'Tab through and note repeated labels; ensure context (e.g. "Add to cart – Product A") differentiates them.',
      });
    }

    if (focusNotVisibleCount >= FOCUS_NOT_VISIBLE_STEP_THRESHOLD || focusNotVisibleInteractive.length > 0) {
      issues.push({
        kind: 'focus_not_visible',
        message:
          focusNotVisibleInteractive.length > 0
            ? `Focus indicator not visible on ${focusNotVisibleInteractive.length} interactive element(s).`
            : `Focus indicator not visible for ${focusNotVisibleCount} of ${steps.length} focus steps.`,
        confidence: focusNotVisibleInteractive.length > 0 ? 0.85 : 0.7,
        evidence: {
          stepsWithoutVisibleFocus: focusNotVisibleCount,
          totalSteps: steps.length,
          interactiveWithoutVisible: focusNotVisibleInteractive.slice(0, 10),
        },
        suggestedWcagIds: ['2.4.7'],
        howToVerify: 'Tab through the page and confirm a visible focus ring or highlight on each focused element.',
      });
    }

    // --- Phase 2: Probes (gated by opts.probesEnabled and time remaining) ---
    const runProbe = (): boolean => opts.probesEnabled && Date.now() - start < opts.maxMs;
    const stopFurtherProbesRef = { current: false };

    if (runProbe()) {
      try {
        const candidates = await findCandidateElements(page, MAX_CANDIDATES_PER_TYPE);
        const probeStartUrl = page.url();

        // Modal probe: first modal trigger only
        const modalTrigger = candidates.modalTriggers[0];
        if (modalTrigger) {
          const nav = await runProbeWithNavGuard(
            page,
            probeStartUrl,
            stopFurtherProbesRef,
            async () => {
              const beforeSnapshot = await getActiveSnapshot(page, ctx.url);
              const beforeFingerprint = await getDomChangeFingerprint(page);
              const triggerSig = focusSignature(beforeSnapshot);

              await page.locator(modalTrigger.selector).first().click();
              await page.waitForTimeout(PROBE_WAIT_MS);

              const dialogCheck = await checkDialogAndFocus(page);
              if (dialogCheck.dialogPresent && !dialogCheck.focusInside) {
                issues.push({
                  kind: 'modal_focus_not_moved',
                  message: 'Modal opened but focus did not move inside the dialog.',
                  confidence: 0.8,
                  evidence: { selector: modalTrigger.selector, dialogPresent: true, focusInside: false },
                  suggestedWcagIds: ['2.4.3', '3.2.1'],
                  howToVerify: 'Open the modal with keyboard; focus should move to the dialog.',
                });
              }

              await page.keyboard.press('Escape');
              await page.waitForTimeout(PROBE_WAIT_MS);

              const afterRaw = await page.evaluate(captureFocusScript);
              const afterSig = focusSignature(afterRaw);
              if (afterSig !== triggerSig) {
                issues.push({
                  kind: 'focus_not_restored',
                  message: 'Focus was not restored to the modal trigger after closing.',
                  confidence: 0.7,
                  evidence: { triggerSig, afterSig, selector: modalTrigger.selector },
                  suggestedWcagIds: ['2.4.3', '3.2.1'],
                  howToVerify: 'Close the modal with Escape; focus should return to the trigger.',
                });
              }

              const afterSnapshot = await getActiveSnapshot(page, ctx.url);
              const afterFingerprint = await getDomChangeFingerprint(page);
              const domChanged = domFingerprintChanged(beforeFingerprint, afterFingerprint);
              return {
                beforeSnapshot,
                afterSnapshot,
                triggerSig,
                afterSig,
                dialogCheck,
                beforeFingerprint,
                afterFingerprint,
                domChanged,
                selector: modalTrigger.selector,
              };
            }
          );

          const hasResult = nav.result !== null;
          const modalMessage = nav.error
            ? nav.error.message
            : !hasResult
              ? 'Probe did not complete.'
              : !nav.result!.dialogCheck.dialogPresent
                ? 'No dialog detected.'
                : nav.result!.afterSig === nav.result!.triggerSig
                  ? 'Dialog opened and focus restored.'
                  : 'Focus not restored.';
          probes.push({
            name: 'modal_probe',
            attempted: true,
            success: hasResult,
            message: modalMessage,
            evidence: {
              navigationOccurred: nav.navigationOccurred,
              navigationRestored: nav.navigationRestored,
              beforeFocusSig: hasResult ? nav.result!.triggerSig : undefined,
              afterFocusSig: hasResult ? nav.result!.afterSig : undefined,
              domChanged: hasResult ? nav.result!.domChanged : undefined,
              dialogPresent: hasResult ? nav.result!.dialogCheck.dialogPresent : undefined,
              afterSnapshot: hasResult ? { tag: nav.result!.afterSnapshot.tag, id: nav.result!.afterSnapshot.id } : undefined,
              selector: modalTrigger.selector,
            },
          });
        } else {
          probes.push({
            name: 'modal_probe',
            attempted: false,
            success: false,
            message: 'No modal trigger candidates found.',
            evidence: {},
          });
        }

        if (runProbe() && !stopFurtherProbesRef.current) {
          const menuToggle = candidates.menuToggles[0];
          if (menuToggle) {
            const nav = await runProbeWithNavGuard(
              page,
              probeStartUrl,
              stopFurtherProbesRef,
              async () => {
                const beforeExpanded = menuToggle.expanded;
                const beforeSnapshot = await getActiveSnapshot(page, ctx.url);
                const beforeFingerprint = await getDomChangeFingerprint(page);
                const liveBefore = await getAriaLiveTexts(page, ARIA_LIVE_SAMPLE_SIZE);

                await page.locator(menuToggle.selector).first().focus();
                await page.keyboard.press('Space');
                await page.waitForTimeout(PROBE_WAIT_MS);

                const afterExpanded = await getExpandedState(page, menuToggle.selector);
                const afterFingerprint = await getDomChangeFingerprint(page);
                const liveAfter = await getAriaLiveTexts(page, ARIA_LIVE_SAMPLE_SIZE);
                const afterSnapshot = await getActiveSnapshot(page, ctx.url);
                const beforeFocusSig = focusSignature(beforeSnapshot);
                const afterFocusSig = focusSignature(afterSnapshot);
                const focusMoved = beforeFocusSig !== afterFocusSig;
                const ariaLiveChanged =
                  liveBefore.length !== liveAfter.length ||
                  liveBefore.some((b, i) => liveAfter[i]?.text !== b.text);
                const domChanged = domFingerprintChanged(beforeFingerprint, afterFingerprint);

                if (beforeExpanded === afterExpanded) {
                  issues.push({
                    kind: 'expanded_state_not_updated',
                    message: 'Menu/disclosure toggle did not update aria-expanded after activation.',
                    confidence: 0.7,
                    evidence: { selector: menuToggle.selector, beforeExpanded, afterExpanded },
                    suggestedWcagIds: ['4.1.2', '2.1.1'],
                    howToVerify: 'Activate the control with Space/Enter; aria-expanded should toggle.',
                  });
                }
                if (domChanged && !focusMoved && !ariaLiveChanged) {
                  issues.push({
                    kind: 'silent_update',
                    message: 'DOM updated without focus move or aria-live announcement.',
                    confidence: 0.6,
                    evidence: { selector: menuToggle.selector, focusMoved, ariaLiveChanged, domChanged },
                    suggestedWcagIds: ['4.1.3', '3.2.1'],
                    howToVerify: 'Ensure dynamic content is announced (e.g. aria-live or focus move).',
                  });
                }
                return {
                  beforeSnapshot,
                  afterSnapshot,
                  beforeFocusSig,
                  afterFocusSig,
                  beforeExpanded,
                  afterExpanded,
                  focusMoved,
                  ariaLiveChanged,
                  domChanged,
                  selector: menuToggle.selector,
                };
              }
            );

            const hasResult = nav.result !== null;
            const menuMessage = nav.error
              ? nav.error.message
              : !hasResult
                ? 'Probe did not complete.'
                : nav.result!.beforeExpanded !== nav.result!.afterExpanded
                  ? 'aria-expanded updated.'
                  : 'aria-expanded unchanged.';
            probes.push({
              name: 'menu_probe',
              attempted: true,
              success: hasResult,
              message: menuMessage,
              evidence: {
                navigationOccurred: nav.navigationOccurred,
                navigationRestored: nav.navigationRestored,
                beforeFocusSig: hasResult ? nav.result!.beforeFocusSig : undefined,
                afterFocusSig: hasResult ? nav.result!.afterFocusSig : undefined,
                ariaLiveChanged: hasResult ? nav.result!.ariaLiveChanged : undefined,
                domChanged: hasResult ? nav.result!.domChanged : undefined,
                beforeExpanded: hasResult ? nav.result!.beforeExpanded : undefined,
                afterExpanded: hasResult ? nav.result!.afterExpanded : undefined,
                focusMoved: hasResult ? nav.result!.focusMoved : undefined,
                selector: menuToggle.selector,
              },
            });
          } else {
            probes.push({
              name: 'menu_probe',
              attempted: false,
              success: false,
              message: 'No menu/disclosure toggle candidates found.',
              evidence: {},
            });
          }
        }

        if (runProbe() && !stopFurtherProbesRef.current) {
          const submitBtn = candidates.submitButtons[0];
          if (submitBtn) {
            const nav = await runProbeWithNavGuard(
              page,
              probeStartUrl,
              stopFurtherProbesRef,
              async () => {
                const beforeFingerprint = await getDomChangeFingerprint(page);
                const liveBefore = await getAriaLiveTexts(page, ARIA_LIVE_SAMPLE_SIZE);

                await page.locator(submitBtn.selector).first().focus();
                const beforeSnapshot = await page.evaluate(captureFocusScript);
                const beforeFocusSig = focusSignature(beforeSnapshot);
                await page.keyboard.press('Enter');
                await page.waitForTimeout(PROBE_WAIT_MS);

                const validation = await checkValidationState(page);
                const afterFingerprint = await getDomChangeFingerprint(page);
                const liveAfter = await getAriaLiveTexts(page, ARIA_LIVE_SAMPLE_SIZE);
                const afterSnapshot = await page.evaluate(captureFocusScript);
                const afterFocusSig = focusSignature(afterSnapshot);
                const focusMovedToInvalidOrAlert = validation.focusOnInvalid || validation.focusOnAlert;
                const ariaLiveChanged =
                  liveBefore.length !== liveAfter.length ||
                  liveBefore.some((b, i) => liveAfter[i]?.text !== b.text);
                const domChanged = domFingerprintChanged(beforeFingerprint, afterFingerprint);

                if (validation.hasValidation && !focusMovedToInvalidOrAlert) {
                  issues.push({
                    kind: 'validation_error_not_focused',
                    message: 'Validation errors appeared but focus did not move to the first invalid field or error summary.',
                    confidence: 0.75,
                    evidence: { invalidCount: validation.invalidCount, focusOnInvalid: validation.focusOnInvalid, focusOnAlert: validation.focusOnAlert },
                    suggestedWcagIds: ['3.3.1', '3.3.3', '4.1.3'],
                    howToVerify: 'Submit invalid form; focus should move to first error or role="alert" summary.',
                  });
                }
                if (domChanged && !focusMovedToInvalidOrAlert && !ariaLiveChanged) {
                  issues.push({
                    kind: 'silent_update',
                    message: 'Form DOM updated (e.g. validation) without focus or aria-live update.',
                    confidence: 0.6,
                    evidence: { selector: submitBtn.selector, focusMoved: focusMovedToInvalidOrAlert, domChanged },
                    suggestedWcagIds: ['4.1.3', '3.3.1'],
                    howToVerify: 'Ensure validation messages are announced or focus moves to error.',
                  });
                }
                return {
                  afterSnapshot,
                  beforeFocusSig,
                  afterFocusSig,
                  hasValidation: validation.hasValidation,
                  focusOnInvalid: validation.focusOnInvalid,
                  focusOnAlert: validation.focusOnAlert,
                  invalidCount: validation.invalidCount,
                  ariaLiveChanged,
                  domChanged,
                  selector: submitBtn.selector,
                };
              }
            );

            const hasResult = nav.result !== null;
            const formMessage = nav.error
              ? nav.error.message
              : !hasResult
                ? 'Probe did not complete.'
                : !nav.result!.hasValidation
                  ? 'No validation errors detected.'
                  : nav.result!.focusOnInvalid || nav.result!.focusOnAlert
                    ? 'Validation shown and focus moved to error.'
                    : 'Validation shown but focus did not move.';
            probes.push({
              name: 'form_validation_probe',
              attempted: true,
              success: hasResult,
              message: formMessage,
              evidence: {
                navigationOccurred: nav.navigationOccurred,
                navigationRestored: nav.navigationRestored,
                beforeFocusSig: hasResult ? nav.result!.beforeFocusSig : undefined,
                afterFocusSig: hasResult ? nav.result!.afterFocusSig : undefined,
                ariaLiveChanged: hasResult ? nav.result!.ariaLiveChanged : undefined,
                domChanged: hasResult ? nav.result!.domChanged : undefined,
                hasValidation: hasResult ? nav.result!.hasValidation : undefined,
                focusOnInvalid: hasResult ? nav.result!.focusOnInvalid : undefined,
                focusOnAlert: hasResult ? nav.result!.focusOnAlert : undefined,
                afterActive: hasResult ? { tag: nav.result!.afterSnapshot.tag, id: nav.result!.afterSnapshot.id } : undefined,
                selector: submitBtn.selector,
              },
            });
          } else {
            probes.push({
              name: 'form_validation_probe',
              attempted: false,
              success: false,
              message: 'No submit button candidates found.',
              evidence: {},
            });
          }
        }
      } catch (probesErr) {
        console.warn('[InteractionAgent] Probes error:', probesErr);
      }
    }
  } catch (err) {
    console.warn('[InteractionAgent] Run error:', err);
  }

  const artifact: InteractionArtifact = {
    url: ctx.url,
    pageNumber: ctx.pageNumber,
    capturedAt: new Date().toISOString(),
    ...(pageProfile ? { pageProfile } : {}),
    ...(taskAssessments.length > 0 ? { taskAssessments } : {}),
    steps,
    issues,
    ...(probes.length > 0 ? { probes } : {}),
  };
  return sanitizeArtifact(artifact);
}

function sanitizeArtifact(artifact: InteractionArtifact): InteractionArtifact {
  const steps = artifact.steps.map((s) => ({
    ...s,
    active: {
      ...s.active,
      name: cap(s.active.name, NAME_CAP) ?? s.active.name,
      classes:
        s.active.classes != null ? (cap(s.active.classes, CLASSES_CAP) ?? s.active.classes) : s.active.classes,
      selectorHint: cap(s.active.selectorHint, NAME_CAP) ?? s.active.selectorHint,
    },
  }));
  return { ...artifact, steps };
}

/**
 * Validates parsed JSON as InteractionArtifact shape. Returns the object if valid, null otherwise.
 * Use when reading interaction.json to avoid throwing on malformed data.
 */
export function validateAgentArtifact(obj: unknown): InteractionArtifact | null {
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  if (typeof o.url !== 'string' || typeof o.pageNumber !== 'number') return null;
  if (!Array.isArray(o.steps) || !Array.isArray(o.issues)) return null;
  return obj as InteractionArtifact;
}
