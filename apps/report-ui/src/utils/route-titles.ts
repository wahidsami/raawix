/**
 * Route to title mapping for header display
 */
export const routeTitles: Record<string, { en: string; ar: string }> = {
  '/': { en: 'Overview', ar: 'نظرة عامة' },
  '/entities': { en: 'Entities', ar: 'الكيانات' },
  '/entities/:id': { en: 'Entity Details', ar: 'تفاصيل الكيان' },
  '/scans': { en: 'Scans', ar: 'المسوحات' },
  '/scans/:id': { en: 'Scan Details', ar: 'تفاصيل المسح' },
  '/findings': { en: 'Findings', ar: 'النتائج' },
  '/assistive-maps': { en: 'Assistive Maps', ar: 'خرائط المساعدة' },
  '/widget-analytics': { en: 'Widget Analytics', ar: 'تحليلات الويدجت' },
  '/settings': { en: 'Settings', ar: 'الإعدادات' },
};

/**
 * Get title for current route
 */
export function getRouteTitle(pathname: string, locale: 'en' | 'ar' = 'en'): string {
  // Try exact match first
  if (routeTitles[pathname]) {
    return routeTitles[pathname][locale];
  }

  // Try pattern matching for dynamic routes
  for (const [pattern, titles] of Object.entries(routeTitles)) {
    if (pattern.includes(':')) {
      const patternRegex = new RegExp('^' + pattern.replace(/:[^/]+/g, '[^/]+') + '$');
      if (patternRegex.test(pathname)) {
        return titles[locale];
      }
    }
  }

  // Fallback
  return locale === 'ar' ? 'لوحة التحكم' : 'Dashboard';
}

