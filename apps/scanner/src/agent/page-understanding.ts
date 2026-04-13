import type { Page } from 'playwright';
import type { ReportCategory } from '../utils/report-taxonomy.js';

export type RaawiPageType =
  | 'home'
  | 'login'
  | 'register'
  | 'contact'
  | 'service'
  | 'policy'
  | 'sitemap'
  | 'search'
  | 'content'
  | 'dashboard'
  | 'unknown';

export interface RaawiTaskIntent {
  id: string;
  label: string;
  category: ReportCategory;
  reason: string;
  confidence: number;
}

export type RaawiTaskAssessmentResult =
  | 'working'
  | 'not_working'
  | 'needs_review'
  | 'not_applicable'
  | 'manual_checkpoint';

export interface RaawiTaskAssessment {
  taskId: string;
  label: string;
  category: ReportCategory;
  result: RaawiTaskAssessmentResult;
  confidence: number;
  summary: string;
  evidence: Record<string, unknown>;
  issue?: {
    kind:
      | 'missing_page_structure'
      | 'missing_skip_link'
      | 'authenticated_workspace_navigation_unclear'
      | 'unnamed_task_control'
      | 'missing_form_instructions'
      | 'image_alt_task_issue'
      | 'verification_checkpoint_requires_manual_input';
    message: string;
    confidence: number;
    evidence: Record<string, unknown>;
    suggestedWcagIds?: string[];
    howToVerify?: string;
  };
}

export interface RaawiPageProfile {
  pageType: RaawiPageType;
  title: string;
  lang: string | null;
  direction: string | null;
  mainHeading: string | null;
  headings: string[];
  landmarks: string[];
  counts: {
    headings: number;
    links: number;
    skipLinks: number;
    buttons: number;
    forms: number;
    fields: number;
    fieldsWithoutName: number;
    fieldsWithoutInstructions: number;
    requiredFields: number;
    requiredFieldsWithoutIndicator: number;
    passwordFields: number;
    otpLikeFields: number;
    images: number;
    imagesWithoutAlt: number;
    media: number;
    accountControls: number;
    logoutControls: number;
    buttonsWithoutName: number;
    linksWithoutName: number;
  };
  signals: {
    hasPrimaryNavigation: boolean;
    hasSkipLink: boolean;
    hasSearch: boolean;
    hasLogin: boolean;
    hasRegister: boolean;
    hasOtp: boolean;
    hasPassword: boolean;
    hasForgotPassword: boolean;
    hasResendCode: boolean;
    hasContact: boolean;
    hasAccountArea: boolean;
    hasLogout: boolean;
    hasAuthenticatedWorkspace: boolean;
    hasModalTrigger: boolean;
    hasMenuToggle: boolean;
  };
  sampleControls: Array<{
    kind: 'link' | 'button' | 'field';
    name: string;
    type?: string | null;
  }>;
  forms: Array<{
    index: number;
    purpose: 'login' | 'register' | 'contact' | 'search' | 'generic';
    fieldCount: number;
    requiredCount: number;
    unlabeledCount: number;
    fieldsWithoutInstructions: number;
    passwordCount: number;
    otpLikeCount: number;
    hasSubmit: boolean;
    fieldSamples: Array<{
      type: string | null;
      name: string;
      required: boolean;
      hasInstruction: boolean;
      otpLike: boolean;
    }>;
  }>;
  taskIntents: RaawiTaskIntent[];
}

type RawPageProfile = Omit<RaawiPageProfile, 'pageType' | 'taskIntents'> & {
  url: string;
  textSignals: string;
};

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

function inferPageType(raw: RawPageProfile): RaawiPageType {
  const path = (() => {
    try {
      return new URL(raw.url).pathname.toLowerCase();
    } catch {
      return raw.url.toLowerCase();
    }
  })();
  const text = raw.textSignals.toLowerCase();

  if (raw.signals.hasPassword || raw.signals.hasLogin || includesAny(path, ['login', 'signin', 'sign-in', 'auth'])) {
    return 'login';
  }
  if (raw.signals.hasRegister || includesAny(path, ['register', 'signup', 'sign-up'])) {
    return 'register';
  }
  if (raw.signals.hasContact || includesAny(path, ['contact', 'support', 'help'])) {
    return 'contact';
  }
  if (includesAny(path, ['site-map', 'sitemap'])) {
    return 'sitemap';
  }
  if (raw.signals.hasSearch || includesAny(path, ['search'])) {
    return 'search';
  }
  if (includesAny(path, ['privacy', 'terms', 'policy', 'agreement'])) {
    return 'policy';
  }
  if (includesAny(path, ['service', 'services', 'product', 'request'])) {
    return 'service';
  }
  if (includesAny(path, ['dashboard', 'account', 'profile', 'portal'])) {
    return 'dashboard';
  }
  if (path === '/' || path === '') {
    return 'home';
  }
  if (text.length > 200) {
    return 'content';
  }
  return 'unknown';
}

function buildTaskIntents(raw: RawPageProfile, pageType: RaawiPageType): RaawiTaskIntent[] {
  const tasks: RaawiTaskIntent[] = [];

  if (raw.signals.hasPrimaryNavigation || raw.counts.links > 0) {
    tasks.push({
      id: 'understand-page-structure',
      label: 'Understand page structure and primary navigation',
      category: 'Keyboard & Navigation',
      reason: 'Users need predictable landmarks, headings, links, and focus order before completing page-specific tasks.',
      confidence: raw.signals.hasPrimaryNavigation ? 0.9 : 0.7,
    });
  }

  if (raw.signals.hasMenuToggle) {
    tasks.push({
      id: 'operate-menu',
      label: 'Open and close menus/disclosures with keyboard',
      category: 'Keyboard & Navigation',
      reason: 'The page exposes expandable controls that must update state and remain navigable.',
      confidence: 0.85,
    });
  }

  if (raw.signals.hasModalTrigger) {
    tasks.push({
      id: 'operate-dialog',
      label: 'Open and close dialogs while preserving focus',
      category: 'Keyboard & Navigation',
      reason: 'Dialog-like controls require focus movement into the dialog and focus restoration on close.',
      confidence: 0.8,
    });
  }

  if (raw.counts.forms > 0 || raw.counts.fields > 0 || pageType === 'contact') {
    tasks.push({
      id: 'complete-form',
      label: pageType === 'login' ? 'Complete authentication form' : 'Complete and submit form',
      category: pageType === 'login' ? 'Authentication & Security' : 'Forms & Inputs',
      reason: 'Forms need labels, instructions, keyboard access, and understandable error recovery.',
      confidence: raw.counts.fields > 0 ? 0.9 : 0.65,
    });
  }

  if (raw.signals.hasOtp) {
    tasks.push({
      id: 'handle-verification-code',
      label: 'Handle verification code checkpoint',
      category: 'Authentication & Security',
      reason: 'Verification-code flows must provide accessible instructions, timing, resend, and recovery options.',
      confidence: 0.8,
    });
  }

  if (raw.signals.hasSearch) {
    tasks.push({
      id: 'use-search',
      label: 'Find content using search',
      category: 'Content',
      reason: 'Search controls and results need clear labels, announcements, and navigable result structure.',
      confidence: 0.75,
    });
  }

  if (raw.counts.images > 0) {
    tasks.push({
      id: 'understand-images',
      label: 'Understand image purpose and alternatives',
      category: 'Images',
      reason:
        raw.counts.imagesWithoutAlt > 0
          ? 'Some images appear to lack alt text and need purpose classification.'
          : 'Images are present and should either be meaningful with alternatives or correctly decorative.',
      confidence: raw.counts.imagesWithoutAlt > 0 ? 0.9 : 0.65,
    });
  }

  if (raw.counts.media > 0) {
    tasks.push({
      id: 'operate-media',
      label: 'Operate media and verify alternatives',
      category: 'Multimedia',
      reason: 'Audio/video content needs keyboard controls, captions, transcripts, and no inaccessible autoplay.',
      confidence: 0.8,
    });
  }

  if (pageType === 'dashboard' || raw.signals.hasAuthenticatedWorkspace) {
    tasks.push({
      id: 'navigate-authenticated-workspace',
      label: 'Navigate authenticated workspace and account controls',
      category: 'Authentication & Security',
      reason: 'Signed-in areas should expose clear headings, navigation regions, account context, and predictable exit/profile controls.',
      confidence: pageType === 'dashboard' ? 0.86 : 0.74,
    });
  }

  return tasks.slice(0, 8);
}

export async function captureRaawiPageProfile(page: Page, url: string): Promise<RaawiPageProfile> {
  const raw = await page.evaluate((currentUrl: string): RawPageProfile => {
    const text = (document.body?.innerText ?? '').replace(/\s+/g, ' ').trim();
    const title = document.title || '';
    const html = document.documentElement;

    const accessibleName = (el: Element): string => {
      const aria = el.getAttribute('aria-label');
      if (aria?.trim()) return aria.trim();
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy?.trim()) {
        return labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
          .filter(Boolean)
          .join(' ');
      }
      const id = el.getAttribute('id');
      if (id) {
        const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (label?.textContent?.trim()) return label.textContent.trim();
      }
      const placeholder = el.getAttribute('placeholder');
      if (placeholder?.trim()) return placeholder.trim();
      return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    };
    const programmaticName = (el: Element): string => {
      const aria = el.getAttribute('aria-label');
      if (aria?.trim()) return aria.trim();
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy?.trim()) {
        return labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
          .filter(Boolean)
          .join(' ');
      }
      const id = el.getAttribute('id');
      if (id) {
        const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (label?.textContent?.trim()) return label.textContent.trim();
      }
      return '';
    };
    const describedByText = (el: Element): string => {
      const describedBy = el.getAttribute('aria-describedby');
      if (!describedBy?.trim()) return '';
      return describedBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
        .filter(Boolean)
        .join(' ');
    };

    const headings = Array.from(document.querySelectorAll('h1,h2,h3'))
      .map((h) => (h.textContent ?? '').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    const landmarks = Array.from(
      document.querySelectorAll('main,nav,header,footer,aside,form,[role="main"],[role="navigation"],[role="banner"],[role="contentinfo"],[role="search"]')
    )
      .map((el) => el.getAttribute('role') || el.tagName.toLowerCase())
      .filter(Boolean);
    const links = Array.from(document.querySelectorAll('a[href]'));
    const buttons = Array.from(document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]'));
    const fields = Array.from(document.querySelectorAll('input, select, textarea'));
    const images = Array.from(document.querySelectorAll('img'));
    const forms = Array.from(document.querySelectorAll('form'));
    const media = document.querySelectorAll('audio, video, iframe[src*="youtube"], iframe[src*="vimeo"]').length;

    const sampleControls = [
      ...links.slice(0, 5).map((el) => ({ kind: 'link' as const, name: accessibleName(el).slice(0, 80), type: null })),
      ...buttons.slice(0, 5).map((el) => ({ kind: 'button' as const, name: accessibleName(el).slice(0, 80), type: el.getAttribute('type') })),
      ...fields.slice(0, 5).map((el) => ({ kind: 'field' as const, name: accessibleName(el).slice(0, 80), type: el.getAttribute('type') })),
    ].filter((item) => item.name);

    const signalText = `${currentUrl} ${title} ${headings.slice(0, 8).join(' ')} ${sampleControls.map((c) => c.name).join(' ')} ${text.slice(0, 1200)}`.toLowerCase();
    const hasWord = (words: string[]) => words.some((word) => signalText.includes(word));

    return {
      url: currentUrl,
      title,
      lang: html.getAttribute('lang'),
      direction: html.getAttribute('dir') || document.body?.getAttribute('dir'),
      mainHeading: headings[0] ?? null,
      headings: headings.slice(0, 8),
      landmarks: Array.from(new Set(landmarks)).slice(0, 12),
      counts: {
        headings: headings.length,
        links: links.length,
        skipLinks: links.filter((link) => {
          const href = link.getAttribute('href') ?? '';
          const textContent = (link.textContent ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
          return href.startsWith('#') && /skip|content|main|تخطي|المحتوى|الرئيسي/.test(`${href} ${textContent}`);
        }).length,
        buttons: buttons.length,
        forms: forms.length,
        fields: fields.length,
        fieldsWithoutName: fields.filter((field) => !programmaticName(field)).length,
        fieldsWithoutInstructions: fields.filter((field) => !describedByText(field)).length,
        requiredFields: fields.filter((field) => {
          const input = field as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          return !!input.required || field.getAttribute('aria-required') === 'true';
        }).length,
        requiredFieldsWithoutIndicator: fields.filter((field) => {
          const input = field as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          const required = !!input.required || field.getAttribute('aria-required') === 'true';
          if (!required) return false;
          const name = accessibleName(field).toLowerCase();
          return !(name.includes('*') || name.includes('required') || name.includes('مطلوب'));
        }).length,
        passwordFields: fields.filter((field) => (field as HTMLInputElement).type === 'password').length,
        otpLikeFields: fields.filter((field) => {
          const input = field as HTMLInputElement | HTMLTextAreaElement;
          const signature = `${programmaticName(field)} ${field.getAttribute('name') ?? ''} ${field.getAttribute('id') ?? ''} ${field.getAttribute('autocomplete') ?? ''}`.toLowerCase();
          return input.inputMode === 'numeric' || /otp|verification|code|token|رمز|كود/.test(signature);
        }).length,
        images: images.length,
        imagesWithoutAlt: images.filter((img) => !img.hasAttribute('alt')).length,
        media,
        accountControls: [...links, ...buttons].filter((element) => /account|profile|dashboard|settings|workspace|portal|الحساب|الملف|لوحة|الإعدادات/.test(accessibleName(element).toLowerCase())).length,
        logoutControls: [...links, ...buttons].filter((element) => /logout|log out|sign out|signout|تسجيل الخروج|خروج/.test(accessibleName(element).toLowerCase())).length,
        buttonsWithoutName: buttons.filter((button) => !accessibleName(button)).length,
        linksWithoutName: links.filter((link) => !accessibleName(link)).length,
      },
      signals: {
        hasPrimaryNavigation: document.querySelector('nav, [role="navigation"]') != null,
        hasSkipLink:
          links.some((link) => {
            const href = link.getAttribute('href') ?? '';
            const textContent = (link.textContent ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
            return href.startsWith('#') && /skip|content|main|تخطي|المحتوى|الرئيسي/.test(`${href} ${textContent}`);
          }),
        hasSearch: document.querySelector('[role="search"], input[type="search"]') != null || hasWord(['search', 'بحث']),
        hasLogin: hasWord(['login', 'log in', 'sign in', 'signin', 'دخول', 'تسجيل الدخول']),
        hasRegister: hasWord(['register', 'sign up', 'signup', 'create account', 'تسجيل', 'إنشاء حساب']),
        hasOtp: hasWord(['otp', 'verification code', 'one time', 'رمز التحقق', 'كود التحقق']),
        hasPassword: fields.some((field) => (field as HTMLInputElement).type === 'password'),
        hasForgotPassword: hasWord(['forgot password', 'reset password', 'نسيت كلمة المرور', 'استعادة كلمة المرور']),
        hasResendCode: hasWord(['resend code', 'send again', 'إعادة إرسال', 'إرسال مرة أخرى']),
        hasContact: hasWord(['contact', 'support', 'message', 'تواصل', 'اتصل', 'الدعم']),
        hasAccountArea: hasWord(['account', 'profile', 'dashboard', 'settings', 'workspace', 'portal', 'الحساب', 'الملف', 'لوحة التحكم', 'الإعدادات']),
        hasLogout: hasWord(['logout', 'log out', 'sign out', 'signout', 'تسجيل الخروج', 'خروج']),
        hasAuthenticatedWorkspace: hasWord([
          'dashboard',
          'workspace',
          'account',
          'profile',
          'settings',
          'portal',
          'my account',
          'لوحة',
          'الحساب',
          'الملف',
          'الإعدادات',
        ]),
        hasModalTrigger: document.querySelector('[aria-haspopup="dialog"], [data-modal], [role="dialog"], [aria-modal="true"]') != null,
        hasMenuToggle: document.querySelector('[aria-expanded], [aria-haspopup="menu"]') != null,
      },
      sampleControls,
      forms: forms.slice(0, 5).map((form, index) => {
        const formText = `${(form.textContent ?? '').replace(/\s+/g, ' ').trim()} ${form.getAttribute('aria-label') ?? ''}`.toLowerCase();
        const formFields = Array.from(form.querySelectorAll('input, select, textarea'));
        const fieldSamples = formFields.slice(0, 6).map((field) => {
          const input = field as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          const type = field.getAttribute('type');
          const name = accessibleName(field).slice(0, 80);
          const required = !!input.required || field.getAttribute('aria-required') === 'true';
          const hasInstruction = !!describedByText(field);
          const otpLike = input.inputMode === 'numeric' || /otp|verification|code|token|رمز|كود/.test(`${programmaticName(field)} ${field.getAttribute('name') ?? ''}`.toLowerCase());
          return { type, name, required, hasInstruction, otpLike };
        });
        const purpose: 'login' | 'register' | 'contact' | 'search' | 'generic' =
          /login|sign in|signin|دخول|تسجيل الدخول/.test(formText) || form.querySelector('input[type="password"]')
            ? 'login'
            : /register|sign up|signup|create account|تسجيل|إنشاء حساب/.test(formText)
              ? 'register'
              : /contact|message|support|تواصل|رسالة/.test(formText)
                ? 'contact'
                : form.querySelector('input[type="search"]') || /search|بحث/.test(formText)
                  ? 'search'
                  : 'generic';
        return {
          index: index + 1,
          purpose,
          fieldCount: formFields.length,
          requiredCount: fieldSamples.filter((field) => field.required).length,
          unlabeledCount: formFields.filter((field) => !programmaticName(field)).length,
          fieldsWithoutInstructions: fieldSamples.filter((field) => !field.hasInstruction).length,
          passwordCount: fieldSamples.filter((field) => field.type === 'password').length,
          otpLikeCount: fieldSamples.filter((field) => field.otpLike).length,
          hasSubmit: form.querySelector('button[type="submit"], input[type="submit"]') != null,
          fieldSamples,
        };
      }),
      textSignals: signalText,
    };
  }, url);

  const pageType = inferPageType(raw);
  return {
    title: raw.title,
    lang: raw.lang,
    direction: raw.direction,
    mainHeading: raw.mainHeading,
    headings: raw.headings,
    landmarks: raw.landmarks,
    counts: raw.counts,
    signals: raw.signals,
    sampleControls: raw.sampleControls,
    forms: raw.forms,
    pageType,
    taskIntents: buildTaskIntents(raw, pageType),
  };
}

export function assessRaawiTaskIntents(profile: RaawiPageProfile): RaawiTaskAssessment[] {
  return profile.taskIntents.map((task): RaawiTaskAssessment => {
    if (task.id === 'understand-page-structure') {
      const hasBasicStructure =
        !!profile.mainHeading &&
        profile.counts.headings > 0 &&
        (profile.landmarks.includes('main') || profile.landmarks.includes('navigation') || profile.landmarks.length > 0);
      const skipLinkShouldExist = profile.signals.hasPrimaryNavigation && profile.counts.links >= 10;
      if (!profile.mainHeading || profile.counts.headings === 0) {
        return {
          taskId: task.id,
          label: task.label,
          category: task.category,
          result: 'not_working',
          confidence: 0.82,
          summary: 'Page structure is hard to understand because no primary heading was captured.',
          evidence: {
            pageType: profile.pageType,
            mainHeading: profile.mainHeading,
            headingCount: profile.counts.headings,
            landmarks: profile.landmarks,
          },
          issue: {
            kind: 'missing_page_structure',
            message: 'Page structure is unclear: no primary heading was captured for the page.',
            confidence: 0.82,
            evidence: {
              pageType: profile.pageType,
              headingCount: profile.counts.headings,
              landmarks: profile.landmarks,
            },
            suggestedWcagIds: ['1.3.1', '2.4.6'],
            howToVerify: 'Check the page with a screen reader heading list; the page should expose a clear main heading and structure.',
          },
        };
      }
      if (skipLinkShouldExist && !profile.signals.hasSkipLink) {
        return {
          taskId: task.id,
          label: task.label,
          category: task.category,
          result: 'needs_review',
          confidence: 0.77,
          summary: 'The page exposes substantial navigation, but no obvious skip link was captured for bypassing repeated content.',
          evidence: {
            pageType: profile.pageType,
            linkCount: profile.counts.links,
            skipLinks: profile.counts.skipLinks,
            landmarks: profile.landmarks,
            hasPrimaryNavigation: profile.signals.hasPrimaryNavigation,
          },
          issue: {
            kind: 'missing_skip_link',
            message: 'No obvious skip link was captured on a navigation-heavy page, so bypassing repeated content may be difficult.',
            confidence: 0.77,
            evidence: {
              pageType: profile.pageType,
              linkCount: profile.counts.links,
              skipLinks: profile.counts.skipLinks,
              landmarks: profile.landmarks,
            },
            suggestedWcagIds: ['2.4.1', '2.4.3'],
            howToVerify: 'Start from the top of the page with keyboard only and confirm there is a skip link or equivalent mechanism to jump past repeated navigation.',
          },
        };
      }
      return {
        taskId: task.id,
        label: task.label,
        category: task.category,
        result: hasBasicStructure ? 'working' : 'needs_review',
        confidence: hasBasicStructure ? 0.74 : 0.62,
        summary: hasBasicStructure
          ? 'Basic page structure signals were present.'
          : 'Some structure signals are present, but landmarks/headings need review.',
        evidence: {
          mainHeading: profile.mainHeading,
          headingCount: profile.counts.headings,
          landmarks: profile.landmarks,
          skipLinks: profile.counts.skipLinks,
        },
      };
    }

    if (task.id === 'complete-form' || task.id === 'handle-verification-code') {
      if (task.id === 'handle-verification-code') {
        return {
          taskId: task.id,
          label: task.label,
          category: task.category,
          result: 'manual_checkpoint',
          confidence: 0.8,
          summary: profile.signals.hasResendCode
            ? 'A verification-code checkpoint appears to be present and includes resend/recovery cues, but still requires a human-provided code during scanning.'
            : 'A verification-code checkpoint appears to be present and requires a human-provided code during scanning.',
          evidence: {
            signals: profile.signals,
            otpLikeFields: profile.counts.otpLikeFields,
            forms: profile.forms,
          },
          issue: {
            kind: 'verification_checkpoint_requires_manual_input',
            message: 'Verification-code checkpoint detected; scanner needs a manual code-entry pause to continue authenticated flow.',
            confidence: 0.8,
            evidence: {
              signals: profile.signals,
              otpLikeFields: profile.counts.otpLikeFields,
              forms: profile.forms,
            },
            suggestedWcagIds: ['3.3.2'],
            howToVerify: 'Start the login flow and confirm the verification code step has accessible instructions, resend/recovery, and enough time.',
          },
        };
      }

      if (profile.counts.fieldsWithoutName > 0) {
        return {
          taskId: task.id,
          label: task.label,
          category: task.category,
          result: 'not_working',
          confidence: 0.86,
          summary: `${profile.counts.fieldsWithoutName} form field(s) appear to lack an accessible name.`,
          evidence: {
            fields: profile.counts.fields,
            fieldsWithoutName: profile.counts.fieldsWithoutName,
            pageType: profile.pageType,
          },
          issue: {
            kind: 'unnamed_task_control',
            message: `${profile.counts.fieldsWithoutName} form field(s) appear to lack an accessible name during the form task.`,
            confidence: 0.86,
            evidence: {
              fields: profile.counts.fields,
              fieldsWithoutName: profile.counts.fieldsWithoutName,
              pageType: profile.pageType,
            },
            suggestedWcagIds: ['4.1.2', '3.3.2'],
            howToVerify: 'Navigate the form with a screen reader and confirm every field announces a clear label and instruction.',
          },
        };
      }

      if (profile.counts.fieldsWithoutInstructions > 0 || profile.counts.requiredFieldsWithoutIndicator > 0) {
        return {
          taskId: task.id,
          label: task.label,
          category: task.category,
          result: 'needs_review',
          confidence: 0.78,
          summary:
            profile.counts.fieldsWithoutInstructions > 0
              ? `${profile.counts.fieldsWithoutInstructions} field(s) appear to lack extra instructions or described-by help text.`
              : `${profile.counts.requiredFieldsWithoutIndicator} required field(s) may not expose a clear required indicator in the accessible name.`,
          evidence: {
            forms: profile.forms,
            fieldsWithoutInstructions: profile.counts.fieldsWithoutInstructions,
            requiredFields: profile.counts.requiredFields,
            requiredFieldsWithoutIndicator: profile.counts.requiredFieldsWithoutIndicator,
          },
          issue: {
            kind: 'missing_form_instructions',
            message:
              profile.counts.fieldsWithoutInstructions > 0
                ? `${profile.counts.fieldsWithoutInstructions} field(s) appear to lack clear instructions or described-by help text.`
                : `${profile.counts.requiredFieldsWithoutIndicator} required field(s) may not expose a clear required indicator.`,
            confidence: 0.78,
            evidence: {
              forms: profile.forms,
              fieldsWithoutInstructions: profile.counts.fieldsWithoutInstructions,
              requiredFieldsWithoutIndicator: profile.counts.requiredFieldsWithoutIndicator,
            },
            suggestedWcagIds: ['3.3.2', '1.3.1'],
            howToVerify: 'Review each required field with a screen reader and confirm instructions, required state, and helper text are announced before submission.',
          },
        };
      }

      return {
        taskId: task.id,
        label: task.label,
        category: task.category,
        result: profile.counts.fields > 0 ? 'needs_review' : 'not_applicable',
        confidence: profile.counts.fields > 0 ? 0.66 : 0.7,
        summary:
          profile.counts.fields > 0
            ? 'Form controls were detected; deeper fill/submit probes should validate instructions and error recovery.'
            : 'No form fields were detected for this task.',
        evidence: {
          forms: profile.counts.forms,
          fields: profile.counts.fields,
          fieldsWithoutName: profile.counts.fieldsWithoutName,
          fieldsWithoutInstructions: profile.counts.fieldsWithoutInstructions,
          requiredFields: profile.counts.requiredFields,
        },
      };
    }

    if (task.id === 'understand-images') {
      if (profile.counts.imagesWithoutAlt > 0) {
        return {
          taskId: task.id,
          label: task.label,
          category: task.category,
          result: 'not_working',
          confidence: 0.88,
          summary: `${profile.counts.imagesWithoutAlt} image(s) appear to be missing alt attributes.`,
          evidence: {
            images: profile.counts.images,
            imagesWithoutAlt: profile.counts.imagesWithoutAlt,
          },
          issue: {
            kind: 'image_alt_task_issue',
            message: `${profile.counts.imagesWithoutAlt} image(s) appear to be missing alt attributes during image-understanding task.`,
            confidence: 0.88,
            evidence: {
              images: profile.counts.images,
              imagesWithoutAlt: profile.counts.imagesWithoutAlt,
            },
            suggestedWcagIds: ['1.1.1'],
            howToVerify: 'Inspect the images and decide whether each is meaningful or decorative; meaningful images need equivalent text.',
          },
        };
      }
      return {
        taskId: task.id,
        label: task.label,
        category: task.category,
        result: 'needs_review',
        confidence: 0.62,
        summary: 'Images were detected; vision and DOM evidence should confirm whether alternatives are meaningful.',
        evidence: {
          images: profile.counts.images,
          imagesWithoutAlt: profile.counts.imagesWithoutAlt,
        },
      };
    }

    if (task.id === 'navigate-authenticated-workspace') {
      const hasWorkspaceStructure =
        !!profile.mainHeading &&
        (profile.landmarks.includes('main') || profile.landmarks.includes('navigation') || profile.landmarks.length >= 2);
      if (profile.counts.buttonsWithoutName > 0 || profile.counts.linksWithoutName > 0) {
        return {
          taskId: task.id,
          label: task.label,
          category: task.category,
          result: 'not_working',
          confidence: 0.8,
          summary: 'Authenticated workspace cues were detected, but some account/navigation controls appear unnamed.',
          evidence: {
            pageType: profile.pageType,
            accountControls: profile.counts.accountControls,
            logoutControls: profile.counts.logoutControls,
            buttonsWithoutName: profile.counts.buttonsWithoutName,
            linksWithoutName: profile.counts.linksWithoutName,
          },
          issue: {
            kind: 'unnamed_task_control',
            message: 'Authenticated workspace controls appear to lack clear accessible names.',
            confidence: 0.8,
            evidence: {
              pageType: profile.pageType,
              accountControls: profile.counts.accountControls,
              logoutControls: profile.counts.logoutControls,
              buttonsWithoutName: profile.counts.buttonsWithoutName,
              linksWithoutName: profile.counts.linksWithoutName,
            },
            suggestedWcagIds: ['4.1.2', '2.4.4'],
            howToVerify: 'Move through account, profile, and logout controls with a screen reader and confirm that each announces a clear purpose.',
          },
        };
      }

      if (!hasWorkspaceStructure || (!profile.signals.hasLogout && profile.counts.logoutControls === 0)) {
        return {
          taskId: task.id,
          label: task.label,
          category: task.category,
          result: 'needs_review',
          confidence: 0.72,
          summary: 'This looks like an authenticated area, but the page does not expose a strong workspace structure or clear logout/account cues.',
          evidence: {
            pageType: profile.pageType,
            mainHeading: profile.mainHeading,
            landmarks: profile.landmarks,
            hasAccountArea: profile.signals.hasAccountArea,
            hasLogout: profile.signals.hasLogout,
            accountControls: profile.counts.accountControls,
            logoutControls: profile.counts.logoutControls,
          },
          issue: {
            kind: 'authenticated_workspace_navigation_unclear',
            message: 'Authenticated workspace navigation cues are weak, so account context or exit controls may be hard to discover.',
            confidence: 0.72,
            evidence: {
              pageType: profile.pageType,
              mainHeading: profile.mainHeading,
              landmarks: profile.landmarks,
              hasAccountArea: profile.signals.hasAccountArea,
              hasLogout: profile.signals.hasLogout,
              accountControls: profile.counts.accountControls,
              logoutControls: profile.counts.logoutControls,
            },
            suggestedWcagIds: ['2.4.6', '2.4.3', '3.3.2'],
            howToVerify: 'From the signed-in landing page, verify that account context, navigation landmarks, and logout/profile controls are easy to find with keyboard and assistive technology.',
          },
        };
      }

      return {
        taskId: task.id,
        label: task.label,
        category: task.category,
        result: 'working',
        confidence: 0.68,
        summary: 'Authenticated workspace cues were present, including account-oriented navigation and page structure.',
        evidence: {
          pageType: profile.pageType,
          mainHeading: profile.mainHeading,
          landmarks: profile.landmarks,
          hasAccountArea: profile.signals.hasAccountArea,
          hasLogout: profile.signals.hasLogout,
          accountControls: profile.counts.accountControls,
          logoutControls: profile.counts.logoutControls,
        },
      };
    }

    if (profile.counts.buttonsWithoutName > 0 || profile.counts.linksWithoutName > 0) {
      return {
        taskId: task.id,
        label: task.label,
        category: task.category,
        result: 'not_working',
        confidence: 0.78,
        summary: 'Some controls related to this task appear to be unnamed.',
        evidence: {
          buttonsWithoutName: profile.counts.buttonsWithoutName,
          linksWithoutName: profile.counts.linksWithoutName,
        },
        issue: {
          kind: 'unnamed_task_control',
          message: 'Some task controls appear to lack accessible names.',
          confidence: 0.78,
          evidence: {
            buttonsWithoutName: profile.counts.buttonsWithoutName,
            linksWithoutName: profile.counts.linksWithoutName,
          },
          suggestedWcagIds: ['4.1.2', '2.4.4'],
          howToVerify: 'Navigate to the task controls with a screen reader and confirm each control announces a clear purpose.',
        },
      };
    }

    return {
      taskId: task.id,
      label: task.label,
      category: task.category,
      result: 'needs_review',
      confidence: 0.58,
      summary: 'Task intent detected; deeper interaction probes are needed for a final judgement.',
      evidence: {
        pageType: profile.pageType,
        signals: profile.signals,
      },
    };
  });
}
