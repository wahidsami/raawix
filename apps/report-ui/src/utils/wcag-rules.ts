/**
 * WCAG Rules mapping - maps WCAG IDs to their titles and descriptions
 */
export interface WCAGRule {
  wcagId: string;
  title: { en: string; ar: string };
  description: { en: string; ar: string };
  level: 'A' | 'AA' | 'AAA';
}

export const wcagRulesMap: Record<string, WCAGRule> = {
  '1.1.1': {
    wcagId: '1.1.1',
    title: { en: 'Non-text Content - Alt Text', ar: 'المحتوى غير النصي - نص بديل' },
    description: { en: 'All images must have alt text. Decorative images are exempt.', ar: 'يجب أن تحتوي جميع الصور على نص بديل. الصور الزخرفية معفاة.' },
    level: 'A',
  },
  '2.4.2': {
    wcagId: '2.4.2',
    title: { en: 'Page Titled', ar: 'عنوان الصفحة' },
    description: { en: 'HTML document must have a title element with non-empty text', ar: 'يجب أن يحتوي مستند HTML على عنصر title بنص غير فارغ' },
    level: 'A',
  },
  '3.1.1': {
    wcagId: '3.1.1',
    title: { en: 'Language of Page', ar: 'لغة الصفحة' },
    description: { en: 'HTML document must have a lang attribute on the html element', ar: 'يجب أن يحتوي مستند HTML على سمة lang في عنصر html' },
    level: 'A',
  },
  '4.1.2': {
    wcagId: '4.1.2',
    title: { en: 'Name, Role, Value - Accessible Name for Form Controls', ar: 'الاسم، الدور، القيمة - اسم قابل للوصول لعناصر التحكم في النماذج' },
    description: { en: 'All form controls must have accessible names via label, aria-label, or aria-labelledby', ar: 'يجب أن تحتوي جميع عناصر التحكم في النماذج على أسماء قابلة للوصول عبر label أو aria-label أو aria-labelledby' },
    level: 'A',
  },
  '2.4.4': {
    wcagId: '2.4.4',
    title: { en: 'Link Purpose (Basic)', ar: 'الغرض من الرابط (أساسي)' },
    description: { en: 'Links must have discernible purpose. Generic text like "click here" may need review.', ar: 'يجب أن يكون للروابط غرض واضح. النصوص العامة مثل "انقر هنا" قد تحتاج مراجعة.' },
    level: 'A',
  },
  '2.4.7': {
    wcagId: '2.4.7',
    title: { en: 'Focus Visible', ar: 'التركيز مرئي' },
    description: { en: 'All focusable elements must have visible focus indicators', ar: 'يجب أن تحتوي جميع العناصر القابلة للتركيز على مؤشرات تركيز مرئية' },
    level: 'A',
  },
  '2.1.1': {
    wcagId: '2.1.1',
    title: { en: 'Keyboard Reachable (Heuristic)', ar: 'يمكن الوصول إليه بواسطة لوحة المفاتيح (استدلالي)' },
    description: { en: 'All interactive elements should be keyboard accessible via Tab navigation', ar: 'يجب أن تكون جميع العناصر التفاعلية قابلة للوصول بواسطة لوحة المفاتيح عبر التنقل بـ Tab' },
    level: 'A',
  },
  '2.1.2': {
    wcagId: '2.1.2',
    title: { en: 'No Keyboard Trap', ar: 'لا يوجد فخ للوحة المفاتيح' },
    description: { en: 'Focus should not get trapped in a region without escape route', ar: 'يجب ألا يعلق التركيز في منطقة دون طريق للهروب' },
    level: 'A',
  },
  '1.4.3': {
    wcagId: '1.4.3',
    title: { en: 'Contrast Minimum', ar: 'التباين الأدنى' },
    description: { en: 'Text must have contrast ratio of at least 4.5:1 for normal text', ar: 'يجب أن يكون للنسخ نسبة تباين لا تقل عن 4.5:1 للنص العادي' },
    level: 'AA',
  },
  '1.4.10': {
    wcagId: '1.4.10',
    title: { en: 'Reflow', ar: 'إعادة التدفق' },
    description: { en: 'Content should reflow without horizontal scrolling at 320px viewport width', ar: 'يجب أن يعيد المحتوى التدفق دون التمرير الأفقي بعرض نافذة عرض 320 بكسل' },
    level: 'AA',
  },
};

/**
 * Get WCAG rule information by ID
 */
export function getWCAGRule(wcagId: string | null | undefined): WCAGRule | null {
  if (!wcagId) return null;
  return wcagRulesMap[wcagId] || null;
}

/**
 * Get WCAG rule title in specified language
 */
export function getWCAGRuleTitle(wcagId: string | null | undefined, language: 'en' | 'ar' = 'en'): string | null {
  const rule = getWCAGRule(wcagId);
  return rule ? rule.title[language] : null;
}

/**
 * Get WCAG rule description in specified language
 */
export function getWCAGRuleDescription(wcagId: string | null | undefined, language: 'en' | 'ar' = 'en'): string | null {
  const rule = getWCAGRule(wcagId);
  return rule ? rule.description[language] : null;
}

/**
 * Format WCAG ID with rule name
 */
export function formatWCAGId(wcagId: string | null | undefined, ruleId?: string, language: 'en' | 'ar' = 'en'): string {
  if (!wcagId && !ruleId) return 'Unknown';
  
  const rule = wcagId ? getWCAGRule(wcagId) : null;
  if (rule) {
    return `${wcagId} - ${rule.title[language]}`;
  }
  
  return wcagId || ruleId || 'Unknown';
}

/**
 * Get rule metadata (title, level, category) for a WCAG ID or rule ID
 * Returns metadata in both languages for i18n support
 */
export function getRuleMeta(wcagId: string | null | undefined, ruleId?: string): {
  titleEn: string;
  titleAr: string;
  level: string;
  category: string;
} {
  const rule = wcagId ? getWCAGRule(wcagId) : null;
  
  if (rule) {
    return {
      titleEn: rule.title.en,
      titleAr: rule.title.ar,
      level: rule.level,
      category: 'WCAG',
    };
  }
  
  // Fallback for heuristic/review rules or unknown rules
  const fallbackTitle = ruleId || wcagId || 'Unknown Rule';
  const isHeuristic = ruleId?.includes('heuristic') || ruleId?.includes('Heuristic');
  const isReview = ruleId?.includes('review') || ruleId?.includes('Review');
  
  return {
    titleEn: fallbackTitle,
    titleAr: fallbackTitle,
    level: isHeuristic ? 'Heuristic' : isReview ? 'Review' : '-',
    category: isHeuristic || isReview ? 'Heuristic' : 'Unknown',
  };
}

