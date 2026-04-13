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
  journeyRuns?: RaawiJourneyRun[];
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
      | 'missing_skip_link'
      | 'authenticated_workspace_navigation_unclear'
      | 'dynamic_updates_not_announced'
      | 'unnamed_task_control'
      | 'missing_form_instructions'
      | 'unclear_error_recovery'
      | 'image_alt_task_issue'
      | 'verification_checkpoint_requires_manual_input'
      | 'media_controls_not_exposed'
      | 'media_autoplay_without_control';
    message: string;
    confidence: number;
    evidence: unknown;
    suggestedWcagIds?: string[];
    howToVerify?: string;
  }>;
  probes?: Array<{
    name: 'modal_probe' | 'menu_probe' | 'form_validation_probe' | 'search_probe' | 'workspace_probe' | 'media_probe';
    attempted: boolean;
    success: boolean;
    message: string;
    evidence: unknown;
  }>;
};

export type RaawiJourneyRun = {
  taskId: string;
  label: string;
  category: RaawiTaskAssessment['category'];
  status: RaawiTaskAssessment['result'];
  confidence: number;
  summary: string;
  usedSignals: string[];
  relatedProbeNames: Array<NonNullable<InteractionArtifact['probes']>[number]['name']>;
  relatedIssueKinds: Array<InteractionArtifact['issues'][number]['kind']>;
  evidence: Record<string, unknown>;
};

type FormSubmitProbeCandidate = {
  selector: string;
  tag: string;
  formSelector: string;
  formPurpose: 'login' | 'register' | 'contact' | 'search' | 'generic';
  fieldCount: number;
  requiredCount: number;
  emptyFieldCount: number;
  emptyRequiredCount: number;
  passwordCount: number;
  otpLikeCount: number;
  hasFileInput: boolean;
  hasSensitiveKeyword: boolean;
  safeToProbe: boolean;
  skipReason?: string;
};

type WorkspaceProbeCandidate = {
  selector: string;
  tag: string;
  role: string | null;
  name: string;
  kind: 'link' | 'button';
  href?: string | null;
  ariaExpanded?: string | null;
  hasPopup: boolean;
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
  submitButtons: FormSubmitProbeCandidate[];
  searchFields: Array<{ selector: string; submitSelector?: string; hasSearchRole: boolean }>;
  workspaceControls: WorkspaceProbeCandidate[];
}> {
  return page.evaluate((max: number) => {
    const out: {
      modalTriggers: Array<{ selector: string; tag: string }>;
      menuToggles: Array<{ selector: string; tag: string; expanded: string | null }>;
      submitButtons: FormSubmitProbeCandidate[];
      searchFields: Array<{ selector: string; submitSelector?: string; hasSearchRole: boolean }>;
      workspaceControls: WorkspaceProbeCandidate[];
    } = { modalTriggers: [], menuToggles: [], submitButtons: [], searchFields: [], workspaceControls: [] };
    const controlName = (el: Element): string => {
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel?.trim()) return ariaLabel.trim();
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy?.trim()) {
        const text = labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
          .filter(Boolean)
          .join(' ')
          .trim();
        if (text) return text;
      }
      return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    };
    const simpleSelector = (el: Element): string => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.id) return `#${htmlEl.id}`;
      const name = el.getAttribute('name');
      if (name) return `${el.tagName}[name="${name}"]`;
      const className = htmlEl.className ? String(htmlEl.className).split(/\s+/).slice(0, 2).join('.') : '';
      return `${el.tagName}${className ? `.${className}` : ''}`;
    };
    const inferFormPurpose = (form: HTMLFormElement): FormSubmitProbeCandidate['formPurpose'] => {
      const formText = `${(form.textContent ?? '').replace(/\s+/g, ' ').trim()} ${form.getAttribute('aria-label') ?? ''}`.toLowerCase();
      if (/login|sign in|signin|دخول|تسجيل الدخول/.test(formText) || form.querySelector('input[type="password"]')) return 'login';
      if (/register|sign up|signup|create account|تسجيل|إنشاء حساب/.test(formText)) return 'register';
      if (/contact|message|support|تواصل|رسالة/.test(formText)) return 'contact';
      if (form.querySelector('input[type="search"]') || /search|بحث/.test(formText)) return 'search';
      return 'generic';
    };
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
      const form = el.closest('form') as HTMLFormElement | null;
      if (!form) return;
      const fields = Array.from(form.querySelectorAll('input, select, textarea')) as Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
      const requiredFields = fields.filter((field) => field.required || field.getAttribute('aria-required') === 'true');
      const emptyFields = fields.filter((field) => {
        if (field instanceof HTMLSelectElement) return !field.value;
        if ((field as HTMLInputElement).type === 'checkbox' || (field as HTMLInputElement).type === 'radio') {
          return !(field as HTMLInputElement).checked;
        }
        return !(field.value ?? '').trim();
      });
      const emptyRequiredFields = requiredFields.filter((field) => {
        if (field instanceof HTMLSelectElement) return !field.value;
        if ((field as HTMLInputElement).type === 'checkbox' || (field as HTMLInputElement).type === 'radio') {
          return !(field as HTMLInputElement).checked;
        }
        return !((field.value ?? '').trim());
      });
      const formPurpose = inferFormPurpose(form);
      const allText = `${(form.textContent ?? '').replace(/\s+/g, ' ').trim()} ${controlName(el)}`.toLowerCase();
      const hasSensitiveKeyword = /delete|remove|purchase|pay|payment|checkout|order|book now|apply now|unsubscribe|cancel plan|حذف|إزالة|شراء|دفع|الدفع|إتمام الطلب|إلغاء/.test(allText);
      const hasFileInput = fields.some((field) => (field as HTMLInputElement).type === 'file');
      const passwordCount = fields.filter((field) => (field as HTMLInputElement).type === 'password').length;
      const otpLikeCount = fields.filter((field) => {
        const input = field as HTMLInputElement | HTMLTextAreaElement;
        const signature = `${controlName(field)} ${field.getAttribute('name') ?? ''} ${field.getAttribute('id') ?? ''} ${field.getAttribute('autocomplete') ?? ''}`.toLowerCase();
        return input.inputMode === 'numeric' || /otp|verification|code|token|رمز|كود/.test(signature);
      }).length;
      const safeBecauseValidationLikely = emptyRequiredFields.length > 0 || (formPurpose !== 'generic' && emptyFields.length > 0);
      const safeToProbe = !hasSensitiveKeyword && !hasFileInput && safeBecauseValidationLikely;
      const skipReason = safeToProbe
        ? undefined
        : hasSensitiveKeyword
          ? 'Form looks transactional or destructive.'
          : hasFileInput
            ? 'Form contains file upload fields.'
            : 'Form does not present an obvious invalid empty-state validation path.';
      out.submitButtons.push({
        selector: simpleSelector(el),
        tag: el.tagName,
        formSelector: simpleSelector(form),
        formPurpose,
        fieldCount: fields.length,
        requiredCount: requiredFields.length,
        emptyFieldCount: emptyFields.length,
        emptyRequiredCount: emptyRequiredFields.length,
        passwordCount,
        otpLikeCount,
        hasFileInput,
        hasSensitiveKeyword,
        safeToProbe,
        ...(skipReason ? { skipReason } : {}),
      });
    });
    const searchSelectors = [
      'input[type="search"]',
      '[role="search"] input',
      'form[role="search"] input',
      'input[name*="search" i]',
      'input[id*="search" i]',
      'input[placeholder*="search" i]',
      'input[aria-label*="search" i]',
    ];
    for (const selector of searchSelectors) {
      if (out.searchFields.length >= max) break;
      document.querySelectorAll(selector).forEach((node) => {
        if (out.searchFields.length >= max) return;
        const el = node as HTMLElement;
        if (el.offsetParent === null) return;
        const fieldSelector = simpleSelector(el);
        if (out.searchFields.some((item) => item.selector === fieldSelector)) return;
        const form = el.closest('form');
        const submit = form?.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement | null;
        out.searchFields.push({
          selector: fieldSelector,
          submitSelector: submit ? simpleSelector(submit) : undefined,
          hasSearchRole: !!el.closest('[role="search"], form[role="search"]'),
        });
      });
    }

    const workspaceKeywords = /account|profile|dashboard|settings|workspace|portal|billing|security|orders|notifications|preferences|الحساب|الملف|لوحة|الإعدادات|الفواتير|الأمان|الطلبات/i;
    const destructiveKeywords = /logout|log out|sign out|signout|delete|remove|cancel plan|unsubscribe|تسجيل الخروج|خروج|حذف|إزالة|إلغاء/i;
    const workspaceSelectors = 'a[href], button, [role="button"], summary';
    document.querySelectorAll(workspaceSelectors).forEach((node) => {
      if (out.workspaceControls.length >= max) return;
      const el = node as HTMLElement;
      if (el.offsetParent === null) return;
      const name = controlName(el);
      const href = el.getAttribute('href');
      const signature = `${name} ${href ?? ''} ${el.getAttribute('aria-label') ?? ''}`.trim();
      if (!workspaceKeywords.test(signature)) return;
      if (destructiveKeywords.test(signature)) return;
      const selector = simpleSelector(el);
      if (out.workspaceControls.some((item) => item.selector === selector)) return;
      const tag = el.tagName.toLowerCase();
      out.workspaceControls.push({
        selector,
        tag: el.tagName,
        role: el.getAttribute('role'),
        name: name.slice(0, 120),
        kind: tag === 'a' && !!href ? 'link' : 'button',
        href,
        ariaExpanded: el.getAttribute('aria-expanded'),
        hasPopup: !!el.getAttribute('aria-haspopup'),
      });
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
): Promise<{
  hasValidation: boolean;
  focusOnInvalid: boolean;
  focusOnAlert: boolean;
  invalidCount: number;
  alertCount: number;
  alertTexts: string[];
  describedErrorCount: number;
  invalidFields: Array<{ name: string; type: string | null; selector: string; describedByText: string }>;
}> {
  return page.evaluate(() => {
    const selectorFor = (el: Element): string => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.id) return `#${htmlEl.id}`;
      const name = el.getAttribute('name');
      if (name) return `${el.tagName}[name="${name}"]`;
      const className = htmlEl.className ? String(htmlEl.className).split(/\s+/).slice(0, 2).join('.') : '';
      return `${el.tagName}${className ? `.${className}` : ''}`;
    };
    const accessibleName = (el: Element): string => {
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel?.trim()) return ariaLabel.trim();
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy?.trim()) {
        const text = labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
          .filter(Boolean)
          .join(' ')
          .trim();
        if (text) return text;
      }
      if ((el as HTMLInputElement).labels?.length) {
        return Array.from((el as HTMLInputElement).labels ?? [])
          .map((label) => label.textContent?.trim() ?? '')
          .filter(Boolean)
          .join(' ')
          .trim();
      }
      return '';
    };
    const describedByText = (el: Element): string => {
      const ids = (el.getAttribute('aria-describedby') ?? '').trim().split(/\s+/).filter(Boolean);
      return ids
        .map((id) => document.getElementById(id)?.textContent?.replace(/\s+/g, ' ').trim() ?? '')
        .filter(Boolean)
        .join(' ')
        .slice(0, 200);
    };
    const invalid = document.querySelectorAll('input[aria-invalid="true"], select[aria-invalid="true"], textarea[aria-invalid="true"]');
    const alerts = document.querySelectorAll('[role="alert"]');
    const firstInvalid = invalid.length ? invalid[0] : null;
    const firstAlert = alerts.length ? alerts[0] : null;
    const focusOnInvalid = !!(firstInvalid && document.activeElement === firstInvalid);
    const focusOnAlert = !!(firstAlert && document.activeElement === firstAlert);
    const alertText = firstAlert ? (firstAlert.textContent ?? '').trim().length > 0 : false;
    const invalidFields = Array.from(invalid)
      .slice(0, 5)
      .map((field) => ({
        name: accessibleName(field),
        type: field.getAttribute('type'),
        selector: selectorFor(field),
        describedByText: describedByText(field),
      }));
    const describedErrorCount = invalidFields.filter((field) => field.describedByText.trim().length > 0).length;
    return {
      hasValidation: invalid.length > 0 || (alerts.length > 0 && alertText),
      focusOnInvalid,
      focusOnAlert,
      invalidCount: invalid.length,
      alertCount: alerts.length,
      alertTexts: Array.from(alerts).slice(0, 3).map((alert) => (alert.textContent ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean),
      describedErrorCount,
      invalidFields,
    };
  });
}

async function detectVerificationCheckpoint(page: Page): Promise<{
  detected: boolean;
  otpLikeFields: number;
  hasResendCode: boolean;
  hasForgotPassword: boolean;
  heading: string | null;
}> {
  return page.evaluate(() => {
    const text = (document.body?.innerText ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
    const fields = Array.from(document.querySelectorAll('input, textarea, select'));
    const otpLikeFields = fields.filter((field) => {
      const input = field as HTMLInputElement | HTMLTextAreaElement;
      const signature = `${field.getAttribute('aria-label') ?? ''} ${field.getAttribute('name') ?? ''} ${field.getAttribute('id') ?? ''} ${field.getAttribute('autocomplete') ?? ''}`.toLowerCase();
      return input.inputMode === 'numeric' || /otp|verification|code|token|رمز|كود/.test(signature);
    }).length;
    const hasResendCode = /resend code|send again|إعادة إرسال|إرسال مرة أخرى/.test(text);
    const hasForgotPassword = /forgot password|reset password|نسيت كلمة المرور|استعادة كلمة المرور/.test(text);
    const heading =
      document.querySelector('h1, h2, [role="heading"]')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 120) ?? null;
    return {
      detected: otpLikeFields > 0 || hasResendCode,
      otpLikeFields,
      hasResendCode,
      hasForgotPassword,
      heading,
    };
  });
}

async function checkSearchOutcome(page: Page): Promise<{
  resultCount: number;
  hasResultsRegion: boolean;
  activeTag: string;
  activeRole: string | null;
  liveMessageCount: number;
}> {
  return page.evaluate(() => {
    const resultLike = document.querySelectorAll(
      '[role="list"] [role="listitem"], [role="listitem"], [data-search-results] *, .search-results *, [aria-live]'
    );
    const resultsRegion = document.querySelector(
      '[role="search"], [aria-label*="result" i], [id*="result" i], [class*="result" i]'
    );
    const active = document.activeElement as HTMLElement | null;
    const liveNodes = Array.from(document.querySelectorAll('[aria-live]')).filter(
      (node) => ((node.textContent ?? '').replace(/\s+/g, ' ').trim().length > 0)
    );
    return {
      resultCount: resultLike.length,
      hasResultsRegion: !!resultsRegion,
      activeTag: active?.tagName?.toLowerCase() ?? '',
      activeRole: active?.getAttribute('role') ?? null,
      liveMessageCount: liveNodes.length,
    };
  });
}

async function inspectAuthenticatedWorkspaceState(page: Page): Promise<{
  heading: string | null;
  landmarkCount: number;
  accountCueCount: number;
  logoutCueCount: number;
  workspaceDestinationCount: number;
  unnamedWorkspaceControlCount: number;
}> {
  return page.evaluate(() => {
    const controlName = (el: Element): string => {
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel?.trim()) return ariaLabel.trim();
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy?.trim()) {
        const text = labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
          .filter(Boolean)
          .join(' ')
          .trim();
        if (text) return text;
      }
      const id = el.getAttribute('id');
      if (id) {
        const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (label?.textContent?.trim()) return label.textContent.trim();
      }
      return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    };

    const workspaceKeywords = /account|profile|dashboard|settings|workspace|portal|billing|security|orders|notifications|preferences|الحساب|الملف|لوحة|الإعدادات|الفواتير|الأمان|الطلبات/i;
    const logoutKeywords = /logout|log out|sign out|signout|تسجيل الخروج|خروج/i;
    const destinationKeywords = /profile|settings|dashboard|billing|security|orders|notifications|preferences|الملف|الإعدادات|لوحة|الفواتير|الأمان|الطلبات/i;
    const controls = Array.from(document.querySelectorAll('a[href], button, [role="button"], summary')).filter((node) => {
      const htmlNode = node as HTMLElement;
      return htmlNode.offsetParent !== null;
    });

    const heading =
      document.querySelector('h1, h2, [role="heading"]')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 120) ?? null;
    const landmarkCount = document.querySelectorAll(
      'main,nav,header,footer,aside,[role="main"],[role="navigation"],[role="banner"],[role="contentinfo"]'
    ).length;
    const accountCueCount = controls.filter((node) => workspaceKeywords.test(`${controlName(node)} ${node.getAttribute('href') ?? ''}`)).length;
    const logoutCueCount = controls.filter((node) => logoutKeywords.test(`${controlName(node)} ${node.getAttribute('href') ?? ''}`)).length;
    const workspaceDestinationCount = controls.filter((node) => destinationKeywords.test(`${controlName(node)} ${node.getAttribute('href') ?? ''}`)).length;
    const unnamedWorkspaceControlCount = controls.filter((node) => {
      const signature = `${controlName(node)} ${node.getAttribute('href') ?? ''}`;
      return workspaceKeywords.test(signature) && !controlName(node);
    }).length;

    return {
      heading,
      landmarkCount,
      accountCueCount,
      logoutCueCount,
      workspaceDestinationCount,
      unnamedWorkspaceControlCount,
    };
  });
}

async function findWorkspaceControls(
  page: Page,
  max: number,
  excludeSelectors: string[] = [],
  excludeNames: string[] = []
): Promise<WorkspaceProbeCandidate[]> {
  return page.evaluate(
    ({ cap, excludedSelectors, excludedNames }) => {
      const controls: WorkspaceProbeCandidate[] = [];
      const workspaceKeywords = /account|profile|dashboard|settings|workspace|portal|billing|security|orders|notifications|preferences|الحساب|الملف|لوحة|الإعدادات|الفواتير|الأمان|الطلبات/i;
      const destructiveKeywords = /logout|log out|sign out|signout|delete|remove|cancel plan|unsubscribe|تسجيل الخروج|خروج|حذف|إزالة|إلغاء/i;
      const normalize = (value: string) => value.trim().toLowerCase();
      const excludedSelectorSet = new Set(excludedSelectors.map(normalize));
      const excludedNameSet = new Set(excludedNames.map(normalize));
      const controlName = (el: Element): string => {
        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel?.trim()) return ariaLabel.trim();
        const labelledBy = el.getAttribute('aria-labelledby');
        if (labelledBy?.trim()) {
          const text = labelledBy
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
            .filter(Boolean)
            .join(' ')
            .trim();
          if (text) return text;
        }
        const id = el.getAttribute('id');
        if (id) {
          const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
          if (label?.textContent?.trim()) return label.textContent.trim();
        }
        return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      };
      const simpleSelector = (el: Element): string => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.id) return `#${htmlEl.id}`;
        const name = el.getAttribute('name');
        if (name) return `${el.tagName}[name="${name}"]`;
        const className = htmlEl.className ? String(htmlEl.className).split(/\s+/).slice(0, 2).join('.') : '';
        return `${el.tagName}${className ? `.${className}` : ''}`;
      };

      document.querySelectorAll('a[href], button, [role="button"], summary').forEach((node) => {
        if (controls.length >= cap) return;
        const el = node as HTMLElement;
        if (el.offsetParent === null) return;
        const name = controlName(el);
        const href = el.getAttribute('href');
        const signature = `${name} ${href ?? ''} ${el.getAttribute('aria-label') ?? ''}`.trim();
        if (!workspaceKeywords.test(signature)) return;
        if (destructiveKeywords.test(signature)) return;
        const selector = simpleSelector(el);
        if (excludedSelectorSet.has(selector.toLowerCase())) return;
        if (name && excludedNameSet.has(name.trim().toLowerCase())) return;
        if (controls.some((item) => item.selector === selector)) return;
        const tag = el.tagName.toLowerCase();
        controls.push({
          selector,
          tag: el.tagName,
          role: el.getAttribute('role'),
          name: name.slice(0, 120),
          kind: tag === 'a' && !!href ? 'link' : 'button',
          href,
          ariaExpanded: el.getAttribute('aria-expanded'),
          hasPopup: !!el.getAttribute('aria-haspopup'),
        });
      });

      return controls;
    },
    {
      cap: max,
      excludedSelectors: excludeSelectors,
      excludedNames: excludeNames,
    }
  );
}

async function inspectMediaState(page: Page): Promise<{
  mediaCount: number;
  mediaWithControls: number;
  autoplayCount: number;
  playingCount: number;
  sample: Array<{
    tag: string;
    controls: boolean;
    autoplay: boolean;
    muted: boolean;
    paused: boolean;
  }>;
}> {
  return page.evaluate(() => {
    const media = Array.from(document.querySelectorAll('audio, video')) as Array<
      HTMLAudioElement | HTMLVideoElement
    >;
    return {
      mediaCount: media.length,
      mediaWithControls: media.filter((element) => element.controls).length,
      autoplayCount: media.filter((element) => element.autoplay).length,
      playingCount: media.filter((element) => !element.paused && !element.ended).length,
      sample: media.slice(0, 3).map((element) => ({
        tag: element.tagName.toLowerCase(),
        controls: element.controls,
        autoplay: element.autoplay,
        muted: element.muted,
        paused: element.paused,
      })),
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

type InteractionIssueKind = InteractionArtifact['issues'][number]['kind'];
type ProbeName = NonNullable<InteractionArtifact['probes']>[number]['name'];

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => !!value && value.trim().length > 0))];
}

function buildJourneyRuns(
  pageProfile: RaawiPageProfile | undefined,
  taskAssessments: RaawiTaskAssessment[],
  probes: NonNullable<InteractionArtifact['probes']>,
  issues: InteractionArtifact['issues'],
  stepCount: number
): RaawiJourneyRun[] {
  if (!pageProfile) return [];

  const taskAssessmentById = new Map(taskAssessments.map((assessment) => [assessment.taskId, assessment]));
  const probeByName = new Map<ProbeName, NonNullable<InteractionArtifact['probes']>[number]>(
    probes.map((probe) => [probe.name, probe])
  );
  const issuesByKind = new Map<InteractionIssueKind, InteractionArtifact['issues'][number][]>();
  for (const issue of issues) {
    const existing = issuesByKind.get(issue.kind) ?? [];
    existing.push(issue);
    issuesByKind.set(issue.kind, existing);
  }

  const getIssueKinds = (kinds: InteractionIssueKind[]) =>
    kinds.filter((kind, index) => issuesByKind.has(kind) && kinds.indexOf(kind) === index);
  const getIssueMessages = (kinds: InteractionIssueKind[]) =>
    getIssueKinds(kinds)
      .flatMap((kind) => issuesByKind.get(kind) ?? [])
      .map((issue) => issue.message);

  return pageProfile.taskIntents.map((task) => {
    const assessment = taskAssessmentById.get(task.id);
    const assessmentIssueKinds = assessment?.issue ? [assessment.issue.kind] : [];
    const fallback: RaawiJourneyRun = {
      taskId: task.id,
      label: task.label,
      category: task.category,
      status: assessment?.result ?? 'needs_review',
      confidence: assessment?.confidence ?? task.confidence,
      summary: assessment?.summary ?? 'Journey intent detected; deeper interaction evidence is still limited.',
      usedSignals: uniqueStrings([
        `page type: ${pageProfile.pageType}`,
        stepCount > 0 ? `${stepCount} keyboard steps recorded` : null,
      ]),
      relatedProbeNames: [],
      relatedIssueKinds: assessmentIssueKinds,
      evidence: assessment?.evidence ?? {},
    };

    if (task.id === 'understand-page-structure') {
      return {
        ...fallback,
        usedSignals: uniqueStrings([
          pageProfile.mainHeading ? `main heading: ${pageProfile.mainHeading}` : 'no primary heading captured',
          `${pageProfile.counts.headings} heading(s)`,
          `${pageProfile.landmarks.length} landmark(s)`,
          pageProfile.counts.skipLinks > 0 ? `${pageProfile.counts.skipLinks} skip link(s)` : 'no skip link captured',
        ]),
      };
    }

    if (task.id === 'operate-menu') {
      const probe = probeByName.get('menu_probe');
      const relatedIssueKinds = getIssueKinds(['expanded_state_not_updated', 'silent_update']);
      if (!probe) {
        return {
          ...fallback,
          summary: 'Menu/disclosure controls were detected, but no menu probe ran on this page.',
          usedSignals: uniqueStrings([
            'menu toggle present',
            pageProfile.signals.hasPrimaryNavigation ? 'primary navigation present' : null,
          ]),
        };
      }
      return {
        ...fallback,
        status:
          relatedIssueKinds.length > 0 ? 'not_working' : probe.attempted && probe.success ? 'working' : 'needs_review',
        confidence: relatedIssueKinds.length > 0 ? 0.78 : probe.success ? 0.73 : 0.62,
        summary:
          getIssueMessages(relatedIssueKinds)[0] ??
          probe.message ??
          'Menu/disclosure journey needs more evidence.',
        usedSignals: uniqueStrings([
          'menu toggle present',
          pageProfile.signals.hasPrimaryNavigation ? 'primary navigation present' : null,
        ]),
        relatedProbeNames: ['menu_probe'],
        relatedIssueKinds,
        evidence: {
          ...(assessment?.evidence ?? {}),
          probe: probe.evidence,
        },
      };
    }

    if (task.id === 'operate-dialog') {
      const probe = probeByName.get('modal_probe');
      const relatedIssueKinds = getIssueKinds(['modal_focus_not_moved', 'focus_not_restored']);
      if (!probe) {
        return {
          ...fallback,
          summary: 'Dialog-like controls were detected, but no dialog probe ran on this page.',
          usedSignals: uniqueStrings(['dialog trigger present']),
        };
      }
      return {
        ...fallback,
        status:
          relatedIssueKinds.length > 0 ? 'not_working' : probe.attempted && probe.success ? 'working' : 'needs_review',
        confidence: relatedIssueKinds.length > 0 ? 0.8 : probe.success ? 0.74 : 0.62,
        summary:
          getIssueMessages(relatedIssueKinds)[0] ??
          probe.message ??
          'Dialog journey needs more evidence.',
        usedSignals: uniqueStrings(['dialog trigger present']),
        relatedProbeNames: ['modal_probe'],
        relatedIssueKinds,
        evidence: {
          ...(assessment?.evidence ?? {}),
          probe: probe.evidence,
        },
      };
    }

    if (task.id === 'complete-form') {
      const probe = probeByName.get('form_validation_probe');
      const relatedIssueKinds = getIssueKinds([
        'verification_checkpoint_requires_manual_input',
        'validation_error_not_focused',
        'unclear_error_recovery',
        'unnamed_task_control',
        'missing_form_instructions',
      ]);
      const manualCheckpoint = relatedIssueKinds.includes('verification_checkpoint_requires_manual_input');
      return {
        ...fallback,
        status: manualCheckpoint
          ? 'manual_checkpoint'
          : relatedIssueKinds.some((kind) =>
              ['validation_error_not_focused', 'unclear_error_recovery', 'unnamed_task_control'].includes(kind)
            )
            ? 'not_working'
            : relatedIssueKinds.length > 0
              ? 'needs_review'
              : probe?.attempted && probe.success
                ? 'working'
                : fallback.status,
        confidence: manualCheckpoint ? 0.82 : relatedIssueKinds.length > 0 ? 0.8 : probe?.success ? 0.72 : fallback.confidence,
        summary:
          getIssueMessages(relatedIssueKinds)[0] ??
          probe?.message ??
          fallback.summary,
        usedSignals: uniqueStrings([
          pageProfile.counts.forms > 0 ? `${pageProfile.counts.forms} form(s)` : null,
          pageProfile.counts.fields > 0 ? `${pageProfile.counts.fields} field(s)` : null,
          pageProfile.counts.requiredFields > 0 ? `${pageProfile.counts.requiredFields} required field(s)` : null,
          pageProfile.counts.passwordFields > 0 ? `${pageProfile.counts.passwordFields} password field(s)` : null,
        ]),
        relatedProbeNames: probe ? ['form_validation_probe'] : [],
        relatedIssueKinds,
        evidence: {
          ...(assessment?.evidence ?? {}),
          probe: probe?.evidence,
        },
      };
    }

    if (task.id === 'handle-verification-code') {
      const relatedIssueKinds = getIssueKinds(['verification_checkpoint_requires_manual_input']);
      return {
        ...fallback,
        status: relatedIssueKinds.length > 0 || assessment?.result === 'manual_checkpoint'
          ? 'manual_checkpoint'
          : pageProfile.signals.hasOtp
            ? 'needs_review'
            : 'not_applicable',
        confidence: relatedIssueKinds.length > 0 ? 0.84 : assessment?.confidence ?? 0.68,
        summary:
          getIssueMessages(relatedIssueKinds)[0] ??
          assessment?.summary ??
          'Verification-code checkpoint indicators were detected and need operator continuation.',
        usedSignals: uniqueStrings([
          pageProfile.signals.hasOtp ? 'OTP/code cues present' : null,
          pageProfile.signals.hasResendCode ? 'resend code cue present' : null,
          pageProfile.signals.hasForgotPassword ? 'recovery cue present' : null,
        ]),
        relatedProbeNames: probeByName.get('form_validation_probe') ? ['form_validation_probe'] : [],
        relatedIssueKinds,
        evidence: {
          ...(assessment?.evidence ?? {}),
          probe: probeByName.get('form_validation_probe')?.evidence,
        },
      };
    }

    if (task.id === 'use-search') {
      const probe = probeByName.get('search_probe');
      const relatedIssueKinds = getIssueKinds(['silent_update', 'unnamed_task_control']);
      return {
        ...fallback,
        status:
          relatedIssueKinds.length > 0
            ? 'not_working'
            : probe?.attempted && probe.success
              ? 'working'
              : fallback.status,
        confidence: relatedIssueKinds.length > 0 ? 0.74 : probe?.success ? 0.7 : fallback.confidence,
        summary:
          getIssueMessages(relatedIssueKinds)[0] ??
          probe?.message ??
          assessment?.summary ??
          'Search controls were detected; Raawi has identified the journey, but deeper search-result probing is still pending.',
        usedSignals: uniqueStrings([
          pageProfile.signals.hasSearch ? 'search landmark/control present' : null,
          pageProfile.counts.fields > 0 ? `${pageProfile.counts.fields} field(s) detected` : null,
        ]),
        relatedProbeNames: probe ? ['search_probe'] : [],
        relatedIssueKinds,
        evidence: {
          ...(assessment?.evidence ?? {}),
          probe: probe?.evidence,
        },
      };
    }

    if (task.id === 'understand-images') {
      const relatedIssueKinds = getIssueKinds(['image_alt_task_issue']);
      return {
        ...fallback,
        status: relatedIssueKinds.length > 0 ? 'not_working' : fallback.status,
        confidence: relatedIssueKinds.length > 0 ? 0.88 : fallback.confidence,
        summary: getIssueMessages(relatedIssueKinds)[0] ?? fallback.summary,
        usedSignals: uniqueStrings([
          pageProfile.counts.images > 0 ? `${pageProfile.counts.images} image(s)` : null,
          pageProfile.counts.imagesWithoutAlt > 0 ? `${pageProfile.counts.imagesWithoutAlt} image(s) without alt` : null,
        ]),
        relatedIssueKinds,
      };
    }

    if (task.id === 'operate-media') {
      const probe = probeByName.get('media_probe');
      const relatedIssueKinds = getIssueKinds([
        'media_controls_not_exposed',
        'media_autoplay_without_control',
      ]);
      return {
        ...fallback,
        status:
          relatedIssueKinds.length > 0
            ? 'not_working'
            : probe?.attempted && probe.success
              ? 'working'
              : fallback.status,
        confidence: relatedIssueKinds.length > 0 ? 0.8 : probe?.success ? 0.72 : fallback.confidence,
        summary:
          getIssueMessages(relatedIssueKinds)[0] ??
          probe?.message ??
          'Media content was detected, but dedicated media-control probing is still pending in Raawi.',
        usedSignals: uniqueStrings([
          pageProfile.counts.media > 0 ? `${pageProfile.counts.media} media element(s)` : null,
        ]),
        relatedProbeNames: probe ? ['media_probe'] : [],
        relatedIssueKinds,
        evidence: {
          ...(assessment?.evidence ?? {}),
          probe: probe?.evidence,
        },
      };
    }

    if (task.id === 'navigate-authenticated-workspace') {
      const probe = probeByName.get('workspace_probe');
      const relatedIssueKinds = getIssueKinds([
        'authenticated_workspace_navigation_unclear',
        'unnamed_task_control',
      ]);
      return {
        ...fallback,
        status:
          relatedIssueKinds.length > 0
            ? relatedIssueKinds.includes('unnamed_task_control')
              ? 'not_working'
              : 'needs_review'
            : fallback.status,
        confidence: relatedIssueKinds.length > 0 ? 0.76 : fallback.confidence,
        summary:
          getIssueMessages(relatedIssueKinds)[0] ??
          probe?.message ??
          assessment?.summary ??
          'Authenticated workspace cues were detected; account navigation needs a clearer journey evaluation.',
        usedSignals: uniqueStrings([
          pageProfile.pageType === 'dashboard' ? 'dashboard/account page type' : null,
          pageProfile.signals.hasAccountArea ? 'account/profile cues present' : null,
          pageProfile.signals.hasLogout ? 'logout cue present' : null,
          pageProfile.counts.accountControls > 0 ? `${pageProfile.counts.accountControls} account control(s)` : null,
          pageProfile.counts.logoutControls > 0 ? `${pageProfile.counts.logoutControls} logout control(s)` : null,
        ]),
        relatedProbeNames: probe ? ['workspace_probe'] : [],
        relatedIssueKinds,
        evidence: {
          ...(assessment?.evidence ?? {}),
          probe: probe?.evidence,
        },
      };
    }

    if (task.id === 'follow-dynamic-updates') {
      const relatedIssueKinds = getIssueKinds(['dynamic_updates_not_announced', 'silent_update']);
      return {
        ...fallback,
        status:
          relatedIssueKinds.length > 0
            ? relatedIssueKinds.includes('silent_update')
              ? 'not_working'
              : 'needs_review'
            : fallback.status,
        confidence: relatedIssueKinds.length > 0 ? 0.74 : fallback.confidence,
        summary:
          getIssueMessages(relatedIssueKinds)[0] ??
          assessment?.summary ??
          'Dynamic interactions were detected; assistive announcement behavior needs closer review.',
        usedSignals: uniqueStrings([
          pageProfile.signals.hasDynamicUpdateRisk ? 'dynamic interaction cues present' : null,
          pageProfile.counts.liveRegions > 0 ? `${pageProfile.counts.liveRegions} live region(s)` : 'no live region captured',
          pageProfile.counts.alertRegions > 0 ? `${pageProfile.counts.alertRegions} alert region(s)` : null,
        ]),
        relatedIssueKinds,
      };
    }

    return fallback;
  });
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
  let journeyRuns: RaawiJourneyRun[] = [];
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
          const searchField = candidates.searchFields[0];
          if (searchField) {
            const nav = await runProbeWithNavGuard(
              page,
              probeStartUrl,
              stopFurtherProbesRef,
              async () => {
                const beforeFingerprint = await getDomChangeFingerprint(page);
                const liveBefore = await getAriaLiveTexts(page, ARIA_LIVE_SAMPLE_SIZE);
                await page.locator(searchField.selector).first().focus();
                await page.locator(searchField.selector).first().fill('accessibility');
                if (searchField.submitSelector) {
                  await page.locator(searchField.submitSelector).first().click();
                } else {
                  await page.keyboard.press('Enter');
                }
                await page.waitForTimeout(PROBE_WAIT_MS);
                const afterFingerprint = await getDomChangeFingerprint(page);
                const liveAfter = await getAriaLiveTexts(page, ARIA_LIVE_SAMPLE_SIZE);
                const outcome = await checkSearchOutcome(page);
                const domChanged = domFingerprintChanged(beforeFingerprint, afterFingerprint);
                const ariaLiveChanged =
                  liveBefore.length !== liveAfter.length ||
                  liveBefore.some((b, i) => liveAfter[i]?.text !== b.text);

                if (domChanged && !ariaLiveChanged && !outcome.hasResultsRegion) {
                  issues.push({
                    kind: 'silent_update',
                    message: 'Search interaction changed the page without a clear result region or aria-live announcement.',
                    confidence: 0.64,
                    evidence: {
                      selector: searchField.selector,
                      submitSelector: searchField.submitSelector,
                      resultCount: outcome.resultCount,
                      hasResultsRegion: outcome.hasResultsRegion,
                      liveMessageCount: outcome.liveMessageCount,
                    },
                    suggestedWcagIds: ['4.1.3', '3.2.2'],
                    howToVerify: 'Run a search with keyboard only and confirm that result updates are announced or moved into a clear results region.',
                  });
                }

                return {
                  selector: searchField.selector,
                  submitSelector: searchField.submitSelector,
                  domChanged,
                  ariaLiveChanged,
                  outcome,
                };
              }
            );
            const hasResult = nav.result !== null;
            const searchMessage = nav.error
              ? nav.error.message
              : !hasResult
                ? 'Probe did not complete.'
                : nav.navigationOccurred
                  ? 'Search moved to a results page.'
                  : nav.result!.outcome.hasResultsRegion || nav.result!.outcome.resultCount > 0
                    ? 'Search updated a results region on the page.'
                    : nav.result!.domChanged
                      ? 'Search changed the page but result announcement needs review.'
                      : 'Search control accepted input, but result behavior needs review.';
            probes.push({
              name: 'search_probe',
              attempted: true,
              success: hasResult,
              message: searchMessage,
              evidence: {
                navigationOccurred: nav.navigationOccurred,
                navigationRestored: nav.navigationRestored,
                selector: hasResult ? nav.result!.selector : searchField.selector,
                submitSelector: hasResult ? nav.result!.submitSelector : searchField.submitSelector,
                domChanged: hasResult ? nav.result!.domChanged : undefined,
                ariaLiveChanged: hasResult ? nav.result!.ariaLiveChanged : undefined,
                resultCount: hasResult ? nav.result!.outcome.resultCount : undefined,
                hasResultsRegion: hasResult ? nav.result!.outcome.hasResultsRegion : undefined,
                activeTag: hasResult ? nav.result!.outcome.activeTag : undefined,
                activeRole: hasResult ? nav.result!.outcome.activeRole : undefined,
              },
            });
          } else {
            probes.push({
              name: 'search_probe',
              attempted: false,
              success: false,
              message: 'No search field candidates found.',
              evidence: {},
            });
          }
        }

        if (runProbe() && !stopFurtherProbesRef.current) {
          const workspaceControl = candidates.workspaceControls[0];
          if (workspaceControl) {
            const nav = await runProbeWithNavGuard(
              page,
              probeStartUrl,
              stopFurtherProbesRef,
              async () => {
                const beforeSnapshot = await getActiveSnapshot(page, ctx.url);
                const beforeFingerprint = await getDomChangeFingerprint(page);
                const beforeExpanded = workspaceControl.ariaExpanded ?? null;
                const beforeState = await inspectAuthenticatedWorkspaceState(page);

                await page.locator(workspaceControl.selector).first().focus();
                if (workspaceControl.kind === 'link') {
                  await page.keyboard.press('Enter');
                } else {
                  await page.keyboard.press('Space');
                }
                await page.waitForTimeout(PROBE_WAIT_MS);

                const afterSnapshot = await getActiveSnapshot(page, page.url());
                const afterFingerprint = await getDomChangeFingerprint(page);
                const afterExpanded = await getExpandedState(page, workspaceControl.selector);
                const afterState = await inspectAuthenticatedWorkspaceState(page);
                const navigationHappenedInside = page.url() !== probeStartUrl;
                const domChanged = domFingerprintChanged(beforeFingerprint, afterFingerprint);
                const focusMoved = focusSignature(beforeSnapshot) !== focusSignature(afterSnapshot);
                const accountDestinationsRevealed =
                  afterState.workspaceDestinationCount > beforeState.workspaceDestinationCount;
                const structureImproved =
                  (afterState.heading?.trim().length ?? 0) > 0 &&
                  afterState.landmarkCount >= Math.max(1, beforeState.landmarkCount);
                const firstStepUnlockedJourney =
                  navigationHappenedInside ||
                  accountDestinationsRevealed ||
                  beforeExpanded !== afterExpanded;

                let secondaryStep:
                  | {
                      controlName: string;
                      selector: string;
                      kind: WorkspaceProbeCandidate['kind'];
                      navigationOccurred: boolean;
                      domChanged: boolean;
                      structureImproved: boolean;
                      beforeExpanded: string | null;
                      afterExpanded: string | null;
                      afterState: Awaited<ReturnType<typeof inspectAuthenticatedWorkspaceState>>;
                    }
                  | null = null;

                if (firstStepUnlockedJourney) {
                  const secondaryCandidates = await findWorkspaceControls(
                    page,
                    2,
                    [workspaceControl.selector],
                    [workspaceControl.name]
                  );
                  const secondaryControl = secondaryCandidates[0];
                  if (secondaryControl) {
                    const secondBeforeUrl = page.url();
                    const secondBeforeFingerprint = await getDomChangeFingerprint(page);
                    const secondBeforeExpanded = secondaryControl.ariaExpanded ?? null;
                    await page.locator(secondaryControl.selector).first().focus();
                    if (secondaryControl.kind === 'link') {
                      await page.keyboard.press('Enter');
                    } else {
                      await page.keyboard.press('Space');
                    }
                    await page.waitForTimeout(PROBE_WAIT_MS);
                    const secondAfterFingerprint = await getDomChangeFingerprint(page);
                    const secondAfterExpanded = await getExpandedState(page, secondaryControl.selector);
                    const secondAfterState = await inspectAuthenticatedWorkspaceState(page);
                    const secondNavigationOccurred = page.url() !== secondBeforeUrl;
                    const secondDomChanged = domFingerprintChanged(secondBeforeFingerprint, secondAfterFingerprint);
                    const secondStructureImproved =
                      (secondAfterState.heading?.trim().length ?? 0) > 0 &&
                      secondAfterState.landmarkCount >= Math.max(1, afterState.landmarkCount);

                    secondaryStep = {
                      controlName: secondaryControl.name,
                      selector: secondaryControl.selector,
                      kind: secondaryControl.kind,
                      navigationOccurred: secondNavigationOccurred,
                      domChanged: secondDomChanged,
                      structureImproved: secondStructureImproved,
                      beforeExpanded: secondBeforeExpanded,
                      afterExpanded: secondAfterExpanded,
                      afterState: secondAfterState,
                    };

                    if (
                      !secondNavigationOccurred &&
                      !secondDomChanged &&
                      secondBeforeExpanded === secondAfterExpanded
                    ) {
                      issues.push({
                        kind: 'authenticated_workspace_navigation_unclear',
                        message: 'A second authenticated destination could not be reached clearly from the signed-in workspace journey.',
                        confidence: 0.72,
                        evidence: {
                          selector: secondaryControl.selector,
                          controlName: secondaryControl.name,
                          beforeExpanded: secondBeforeExpanded,
                          afterExpanded: secondAfterExpanded,
                          secondDomChanged,
                        },
                        suggestedWcagIds: ['2.4.3', '2.4.6', '3.2.3'],
                        howToVerify: 'From the signed-in workspace, continue to a second account destination such as settings or billing and confirm the path is clear and reachable with keyboard only.',
                      });
                    }

                    if (
                      secondNavigationOccurred &&
                      !secondStructureImproved &&
                      secondAfterState.accountCueCount === 0 &&
                      secondAfterState.logoutCueCount === 0
                    ) {
                      issues.push({
                        kind: 'authenticated_workspace_navigation_unclear',
                        message: 'A deeper authenticated destination opened, but the follow-up page still lacked clear account context or structure.',
                        confidence: 0.69,
                        evidence: {
                          selector: secondaryControl.selector,
                          controlName: secondaryControl.name,
                          heading: secondAfterState.heading,
                          landmarkCount: secondAfterState.landmarkCount,
                          accountCueCount: secondAfterState.accountCueCount,
                          logoutCueCount: secondAfterState.logoutCueCount,
                        },
                        suggestedWcagIds: ['2.4.6', '1.3.1', '3.2.3'],
                        howToVerify: 'Move across multiple signed-in destinations and confirm each page preserves clear headings, landmarks, and account context.',
                      });
                    }
                  }
                }

                if (
                  !navigationHappenedInside &&
                  !domChanged &&
                  beforeExpanded === afterExpanded &&
                  !accountDestinationsRevealed
                ) {
                  issues.push({
                    kind: 'authenticated_workspace_navigation_unclear',
                    message: 'Account/workspace control activated without revealing clearer profile or settings navigation.',
                    confidence: 0.73,
                    evidence: {
                      selector: workspaceControl.selector,
                      controlName: workspaceControl.name,
                      beforeExpanded,
                      afterExpanded,
                      domChanged,
                      accountDestinationsRevealed,
                    },
                    suggestedWcagIds: ['2.4.3', '2.4.6', '3.2.3'],
                    howToVerify: 'From the signed-in area, open the account/workspace control and confirm that profile, settings, or other account destinations become clearly available.',
                  });
                }

                if (
                  navigationHappenedInside &&
                  !structureImproved &&
                  afterState.accountCueCount === 0 &&
                  afterState.logoutCueCount === 0
                ) {
                  issues.push({
                    kind: 'authenticated_workspace_navigation_unclear',
                    message: 'Authenticated navigation reached a destination, but the resulting page did not expose clear account context or structure.',
                    confidence: 0.7,
                    evidence: {
                      selector: workspaceControl.selector,
                      controlName: workspaceControl.name,
                      heading: afterState.heading,
                      landmarkCount: afterState.landmarkCount,
                      accountCueCount: afterState.accountCueCount,
                      logoutCueCount: afterState.logoutCueCount,
                    },
                    suggestedWcagIds: ['2.4.6', '1.3.1', '3.2.3'],
                    howToVerify: 'Open a profile or settings destination from the signed-in area and confirm the destination announces a clear heading, landmarks, and account context.',
                  });
                }

                return {
                  selector: workspaceControl.selector,
                  controlName: workspaceControl.name,
                  kind: workspaceControl.kind,
                  beforeExpanded,
                  afterExpanded,
                  beforeState,
                  afterState,
                  navigationHappenedInside,
                  domChanged,
                  focusMoved,
                  accountDestinationsRevealed,
                  structureImproved,
                  secondaryStep,
                };
              }
            );

            const hasResult = nav.result !== null;
            let workspaceMessage = 'Probe did not complete.';
            if (nav.error) {
              workspaceMessage = nav.error.message;
            } else if (hasResult) {
              if (nav.result!.secondaryStep?.navigationOccurred) {
                workspaceMessage = 'Authenticated journey reached multiple signed-in destinations.';
              } else if (
                nav.result!.secondaryStep?.domChanged ||
                nav.result!.secondaryStep?.beforeExpanded !== nav.result!.secondaryStep?.afterExpanded
              ) {
                workspaceMessage = 'Authenticated journey revealed a follow-up signed-in destination.';
              } else if (nav.navigationOccurred) {
                workspaceMessage =
                  nav.result!.structureImproved || nav.result!.afterState.accountCueCount > 0
                    ? 'Authenticated navigation reached a clearer account destination.'
                    : 'Authenticated navigation changed page, but destination structure needs review.';
              } else {
                workspaceMessage =
                  nav.result!.accountDestinationsRevealed || nav.result!.beforeExpanded !== nav.result!.afterExpanded
                    ? 'Account/workspace control revealed additional signed-in destinations.'
                    : 'Account/workspace control did not reveal a clearer signed-in path.';
              }
            }
            probes.push({
              name: 'workspace_probe',
              attempted: true,
              success: hasResult,
              message: workspaceMessage,
              evidence: {
                navigationOccurred: nav.navigationOccurred,
                navigationRestored: nav.navigationRestored,
                selector: hasResult ? nav.result!.selector : workspaceControl.selector,
                controlName: hasResult ? nav.result!.controlName : workspaceControl.name,
                kind: hasResult ? nav.result!.kind : workspaceControl.kind,
                beforeExpanded: hasResult ? nav.result!.beforeExpanded : undefined,
                afterExpanded: hasResult ? nav.result!.afterExpanded : undefined,
                domChanged: hasResult ? nav.result!.domChanged : undefined,
                focusMoved: hasResult ? nav.result!.focusMoved : undefined,
                accountDestinationsRevealed: hasResult ? nav.result!.accountDestinationsRevealed : undefined,
                structureImproved: hasResult ? nav.result!.structureImproved : undefined,
                navigationHappenedInside: hasResult ? nav.result!.navigationHappenedInside : undefined,
                beforeState: hasResult ? nav.result!.beforeState : undefined,
                afterState: hasResult ? nav.result!.afterState : undefined,
                secondaryStep: hasResult ? nav.result!.secondaryStep : undefined,
              },
            });
          } else {
            probes.push({
              name: 'workspace_probe',
              attempted: false,
              success: false,
              message: 'No safe authenticated workspace control candidates found.',
              evidence: {},
            });
          }
        }

        if (runProbe() && !stopFurtherProbesRef.current) {
          const submitBtn = candidates.submitButtons.find((candidate) => candidate.safeToProbe) ?? candidates.submitButtons[0];
          if (submitBtn) {
            if (!submitBtn.safeToProbe) {
              probes.push({
                name: 'form_validation_probe',
                attempted: false,
                success: false,
                message: `Skipped form validation probe: ${submitBtn.skipReason ?? 'form was not safe to probe automatically.'}`,
                evidence: {
                  selector: submitBtn.selector,
                  formSelector: submitBtn.formSelector,
                  formPurpose: submitBtn.formPurpose,
                  fieldCount: submitBtn.fieldCount,
                  requiredCount: submitBtn.requiredCount,
                  emptyFieldCount: submitBtn.emptyFieldCount,
                  emptyRequiredCount: submitBtn.emptyRequiredCount,
                  passwordCount: submitBtn.passwordCount,
                  otpLikeCount: submitBtn.otpLikeCount,
                },
              });
            } else {
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
                const verificationCheckpoint = await detectVerificationCheckpoint(page);
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
                    evidence: {
                      invalidCount: validation.invalidCount,
                      focusOnInvalid: validation.focusOnInvalid,
                      focusOnAlert: validation.focusOnAlert,
                      invalidFields: validation.invalidFields,
                      alertTexts: validation.alertTexts,
                      selector: submitBtn.selector,
                      formPurpose: submitBtn.formPurpose,
                    },
                    suggestedWcagIds: ['3.3.1', '3.3.3', '4.1.3'],
                    howToVerify: 'Submit invalid form; focus should move to first error or role="alert" summary.',
                  });
                }
                if (
                  submitBtn.emptyRequiredCount > 0 &&
                  !validation.hasValidation &&
                  !verificationCheckpoint.detected &&
                  !domChanged
                ) {
                  issues.push({
                    kind: 'unclear_error_recovery',
                    message: 'Submitting an incomplete form did not surface clear validation feedback.',
                    confidence: 0.72,
                    evidence: {
                      selector: submitBtn.selector,
                      formPurpose: submitBtn.formPurpose,
                      emptyRequiredCount: submitBtn.emptyRequiredCount,
                      requiredCount: submitBtn.requiredCount,
                    },
                    suggestedWcagIds: ['3.3.1', '3.3.3', '4.1.3'],
                    howToVerify: 'Submit the form with empty required fields and confirm the error is announced and explained.',
                  });
                }
                if (
                  validation.hasValidation &&
                  validation.invalidCount > 0 &&
                  validation.describedErrorCount === 0 &&
                  validation.alertCount === 0
                ) {
                  issues.push({
                    kind: 'unclear_error_recovery',
                    message: 'Invalid fields were detected, but no clear inline or alert-based error explanation was captured.',
                    confidence: 0.68,
                    evidence: {
                      selector: submitBtn.selector,
                      formPurpose: submitBtn.formPurpose,
                      invalidFields: validation.invalidFields,
                      describedErrorCount: validation.describedErrorCount,
                      alertCount: validation.alertCount,
                    },
                    suggestedWcagIds: ['3.3.1', '3.3.3'],
                    howToVerify: 'Check whether each invalid field exposes an inline error message or associated description that a screen reader can announce.',
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
                if (verificationCheckpoint.detected) {
                  issues.push({
                    kind: 'verification_checkpoint_requires_manual_input',
                    message: 'Form submission reached a verification-code checkpoint that will require a manual user-provided code.',
                    confidence: 0.8,
                    evidence: {
                      selector: submitBtn.selector,
                      formPurpose: submitBtn.formPurpose,
                      checkpointHeading: verificationCheckpoint.heading,
                      otpLikeFields: verificationCheckpoint.otpLikeFields,
                      hasResendCode: verificationCheckpoint.hasResendCode,
                      hasForgotPassword: verificationCheckpoint.hasForgotPassword,
                    },
                    suggestedWcagIds: ['3.3.2'],
                    howToVerify: 'Continue the authentication flow and confirm the verification step exposes clear instructions, resend options, and enough time.',
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
                  alertCount: validation.alertCount,
                  alertTexts: validation.alertTexts,
                  invalidFields: validation.invalidFields,
                  describedErrorCount: validation.describedErrorCount,
                  verificationCheckpoint,
                  ariaLiveChanged,
                  domChanged,
                  selector: submitBtn.selector,
                  formSelector: submitBtn.formSelector,
                  formPurpose: submitBtn.formPurpose,
                  fieldCount: submitBtn.fieldCount,
                  requiredCount: submitBtn.requiredCount,
                  emptyRequiredCount: submitBtn.emptyRequiredCount,
                };
              }
            );

            const hasResult = nav.result !== null;
            const formMessage = nav.error
              ? nav.error.message
              : !hasResult
                ? 'Probe did not complete.'
                : nav.result!.verificationCheckpoint.detected
                  ? 'Verification checkpoint reached; manual code-entry flow is required.'
                : !nav.result!.hasValidation
                  ? 'No validation feedback was detected after probing the incomplete form.'
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
                alertCount: hasResult ? nav.result!.alertCount : undefined,
                alertTexts: hasResult ? nav.result!.alertTexts : undefined,
                invalidFields: hasResult ? nav.result!.invalidFields : undefined,
                describedErrorCount: hasResult ? nav.result!.describedErrorCount : undefined,
                verificationCheckpoint: hasResult ? nav.result!.verificationCheckpoint : undefined,
                afterActive: hasResult ? { tag: nav.result!.afterSnapshot.tag, id: nav.result!.afterSnapshot.id } : undefined,
                selector: submitBtn.selector,
                formSelector: submitBtn.formSelector,
                formPurpose: submitBtn.formPurpose,
                fieldCount: submitBtn.fieldCount,
                requiredCount: submitBtn.requiredCount,
                emptyRequiredCount: submitBtn.emptyRequiredCount,
              },
            });
            }
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

        if (runProbe() && !stopFurtherProbesRef.current) {
          const mediaState = await inspectMediaState(page);
          if (mediaState.mediaCount > 0) {
            if (mediaState.mediaWithControls === 0) {
              issues.push({
                kind: 'media_controls_not_exposed',
                message: 'Media was detected without exposed native controls, so pause/play access may be unavailable to keyboard and assistive-tech users.',
                confidence: 0.78,
                evidence: mediaState,
                suggestedWcagIds: ['1.2.1', '2.1.1'],
                howToVerify: 'Navigate to the media with keyboard only and confirm that play, pause, and other essential controls are reachable and announced.',
              });
            }
            if (mediaState.autoplayCount > 0 || mediaState.playingCount > 0) {
              issues.push({
                kind: 'media_autoplay_without_control',
                message: 'Media appears to autoplay or already play on load, which needs a clear pause or stop mechanism.',
                confidence: 0.74,
                evidence: mediaState,
                suggestedWcagIds: ['1.4.2', '2.2.2'],
                howToVerify: 'Load the page and confirm whether media starts automatically; if it does, verify that a keyboard-accessible pause or stop control is available immediately.',
              });
            }
            probes.push({
              name: 'media_probe',
              attempted: true,
              success: true,
              message:
                mediaState.mediaWithControls > 0
                  ? 'Media controls were exposed for at least part of the media content.'
                  : 'Media was detected, but no native controls were exposed.',
              evidence: mediaState,
            });
          } else {
            probes.push({
              name: 'media_probe',
              attempted: false,
              success: false,
              message: 'No native audio/video media elements found.',
              evidence: {},
            });
          }
        }
      } catch (probesErr) {
        console.warn('[InteractionAgent] Probes error:', probesErr);
      }
    }

    journeyRuns = buildJourneyRuns(pageProfile, taskAssessments, probes, issues, steps.length);
  } catch (err) {
    console.warn('[InteractionAgent] Run error:', err);
  }

  const artifact: InteractionArtifact = {
    url: ctx.url,
    pageNumber: ctx.pageNumber,
    capturedAt: new Date().toISOString(),
    ...(pageProfile ? { pageProfile } : {}),
    ...(taskAssessments.length > 0 ? { taskAssessments } : {}),
    ...(journeyRuns.length > 0 ? { journeyRuns } : {}),
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
