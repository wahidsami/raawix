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
    buttons: number;
    forms: number;
    fields: number;
    images: number;
    imagesWithoutAlt: number;
    media: number;
  };
  signals: {
    hasPrimaryNavigation: boolean;
    hasSearch: boolean;
    hasLogin: boolean;
    hasRegister: boolean;
    hasOtp: boolean;
    hasPassword: boolean;
    hasContact: boolean;
    hasModalTrigger: boolean;
    hasMenuToggle: boolean;
  };
  sampleControls: Array<{
    kind: 'link' | 'button' | 'field';
    name: string;
    type?: string | null;
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
        buttons: buttons.length,
        forms: forms.length,
        fields: fields.length,
        images: images.length,
        imagesWithoutAlt: images.filter((img) => !img.hasAttribute('alt')).length,
        media,
      },
      signals: {
        hasPrimaryNavigation: document.querySelector('nav, [role="navigation"]') != null,
        hasSearch: document.querySelector('[role="search"], input[type="search"]') != null || hasWord(['search', 'بحث']),
        hasLogin: hasWord(['login', 'log in', 'sign in', 'signin', 'دخول', 'تسجيل الدخول']),
        hasRegister: hasWord(['register', 'sign up', 'signup', 'create account', 'تسجيل', 'إنشاء حساب']),
        hasOtp: hasWord(['otp', 'verification code', 'one time', 'رمز التحقق', 'كود التحقق']),
        hasPassword: fields.some((field) => (field as HTMLInputElement).type === 'password'),
        hasContact: hasWord(['contact', 'support', 'message', 'تواصل', 'اتصل', 'الدعم']),
        hasModalTrigger: document.querySelector('[aria-haspopup="dialog"], [data-modal], [role="dialog"], [aria-modal="true"]') != null,
        hasMenuToggle: document.querySelector('[aria-expanded], [aria-haspopup="menu"]') != null,
      },
      sampleControls,
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
    pageType,
    taskIntents: buildTaskIntents(raw, pageType),
  };
}
