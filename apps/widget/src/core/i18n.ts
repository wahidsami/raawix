/**
 * Centralized, reactive bilingual localization for Raawi X Widget
 */

import type { Locale } from './types';

export interface TranslationDictionary {
  // Shell & Navigation
  widgetTitle: string;
  openOptions: string;
  closeOptions: string;
  resetAll: string;
  resetAllConfirm: string;
  
  // Tabs
  assist: string;
  vision: string;
  reading: string;
  tools: string;

  // Presets
  presets: string;
  presetBlind: string;
  presetLowVision: string;
  presetDyslexia: string;
  presetNone: string;

  // Display Controls
  textSize: string;
  increaseTextSize: string;
  decreaseTextSize: string;
  lineSpacing: string;
  increaseLineSpacing: string;
  decreaseLineSpacing: string;
  highContrastMode: string;
  toggleHighContrast: string;
  focusHighlight: string;
  toggleFocusHighlight: string;
  stopAnimations: string;
  toggleStopAnimations: string;
  reduceMotion: string;
  toggleReduceMotion: string;
  bigCursor: string;
  selectBigCursor: string;
  bigDarkCursor: string;
  bigLightCursor: string;
  off: string;

  // Reading Helpers
  readingMode: string;
  toggleReadingMode: string;
  readingGuide: string;
  toggleReadingGuide: string;
  readingMask: string;
  toggleReadingMask: string;
  maskWindowHeight: string;
  small: string;
  medium: string;
  large: string;
  hideImages: string;
  toggleHideImages: string;
  imageCaptions: string;
  toggleImageCaptions: string;

  // Assist Tools
  describeImage: string;
  describeFocusedElement: string;
  whatCanIDoHere: string;

  // Status & Badges
  disclaimer: string;
  statusReady: string;
  statusOffline: string;
  statusStale: string;
  statusRemediated: string;
  poweredBy: string;

  // Phase 5.4: Page Insights & Safe Remediation
  pageInsights: string;
  mapStatusReady: string;
  mapStatusNotScanned: string;
  mapStatusLoading: string;
  mapStatusOffline: string;
  mapStatusMismatch: string;
  enableRemediation: string;
  remediationDesc: string;
  landmarksCount: string;
  pageSummary: string;
  enhancementsAvailable: string;
  remediationActiveBadge: string;
  errorOccurred: string;

  // Phase 5.5: Freshness & Landmark Navigation
  refresh: string;
  refreshStatus: string;
  refreshing: string;
  mapStatusOutdated: string;
  mapStatusInvalid: string;
  mapStatusUnknown: string;
  landmarksNavTitle: string;
  jumpToLandmark: string;
  landmarkNavigated: string;
  landmarkNotFound: string;
  landmarkRoleMain: string;
  landmarkRoleNav: string;
  landmarkRoleHeader: string;
  landmarkRoleFooter: string;
  landmarkRoleAside: string;
  landmarkRoleSearch: string;
  landmarkRoleForm: string;
  formGuidanceTitle: string;
  formStepsCount: string;
  requiredFieldsCount: string;

  // Phase 2A: Standalone Reading Tools & Headings Navigator
  readAloud: string;
  readAloudDesc: string;
  readPage: string;
  readSelection: string;
  play: string;
  pause: string;
  resume: string;
  stop: string;
  speechRate: string;
  speechVoice: string;
  defaultVoice: string;
  speechPlaying: string;
  speechPaused: string;
  speechStopped: string;
  speechUnsupported: string;
  noReadableContent: string;
  readingSourceSelection: string;
  readingSourcePage: string;
  headingsNavTitle: string;
  headingsCount: string;
  noHeadingsFound: string;
  jumpToHeading: string;
  headingNavigated: string;
  refreshHeadings: string;
  toolsDescription: string;
}

export const translations: Record<Locale, TranslationDictionary> = {
  ar: {
    widgetTitle: 'أدوات الوصول وسهولة الاستخدام',
    openOptions: 'فتح خيارات سهولة الاستخدام',
    closeOptions: 'إغلاق لوحة سهولة الاستخدام',
    resetAll: 'إعادة ضبط الإعدادات',
    resetAllConfirm: 'تمت استعادة الإعدادات الافتراضية بنجاح',

    assist: 'المساعدة',
    vision: 'الرؤية',
    reading: 'القراءة',
    tools: 'الأدوات',

    presets: 'الملفات المخصصة السريعة',
    presetBlind: 'إمكانية وصول لفاقدي البصر',
    presetLowVision: 'ضعف البصر وتباين عالٍ',
    presetDyslexia: 'عسر القراءة والتركيز',
    presetNone: 'الوضع الافتراضي (إيقاف)',

    textSize: 'حجم الخط',
    increaseTextSize: 'تكبير حجم الخط',
    decreaseTextSize: 'تصغير حجم الخط',
    lineSpacing: 'تباعد الأسطر',
    increaseLineSpacing: 'زيادة تباعد الأسطر',
    decreaseLineSpacing: 'تقليل تباعد الأسطر',
    highContrastMode: 'وضع التباين العالي',
    toggleHighContrast: 'تبديل وضع التباين العالي',
    focusHighlight: 'إبراز مؤشر التركيز',
    toggleFocusHighlight: 'تبديل إبراز مؤشر التركيز',
    stopAnimations: 'إيقاف الرسوم المتحركة',
    toggleStopAnimations: 'تبديل إيقاف الرسوم المتحركة',
    reduceMotion: 'تقليل الحركة',
    toggleReduceMotion: 'تبديل تقليل الحركة',
    bigCursor: 'مؤشر الفأرة الكبير',
    selectBigCursor: 'اختيار نمط المؤشر الكبير',
    bigDarkCursor: 'مؤشر كبير داكن',
    bigLightCursor: 'مؤشر كبير فاتح',
    off: 'إيقاف',

    readingMode: 'وضع القراءة المركزة',
    toggleReadingMode: 'تبديل وضع القراءة',
    readingGuide: 'مسطرة القراءة الأفقية',
    toggleReadingGuide: 'تبديل مسطرة القراءة',
    readingMask: 'قناع حجب وتظليل القراءة',
    toggleReadingMask: 'تبديل قناع القراءة',
    maskWindowHeight: 'ارتفاع نافذة القراءة',
    small: 'صغير',
    medium: 'متوسط',
    large: 'كبير',
    hideImages: 'إخفاء الصور',
    toggleHideImages: 'تبديل إخفاء الصور',
    imageCaptions: 'عرض التسميات التوضيحية للصور',
    toggleImageCaptions: 'تبديل عرض التسميات التوضيحية',

    describeImage: 'وصف الصورة الحالية',
    describeFocusedElement: 'وصف العنصر المحدّد',
    whatCanIDoHere: 'ماذا يمكنني أن أفعل هنا؟',

    disclaimer: 'راوي إكس يوفر أدوات مساعدة للتصفح والقراءة، ولا يغني عن الامتثال لمعايير WCAG 2.1 AA.',
    statusReady: 'جاهز ونشط',
    statusOffline: 'الوضع المحلي المستقل',
    statusStale: 'تنبيه: تغير محتوى الصفحة منذ آخر مسح',
    statusRemediated: 'تمت معالجة العناصر بدقة عالية',
    poweredBy: 'منصة راوي إكس الرقمية',

    pageInsights: 'معلومات الصفحة وخريطة الوصول',
    mapStatusReady: 'خريطة الوصول مفعلة',
    mapStatusNotScanned: 'الصفحة غير ممسوحة بعد',
    mapStatusLoading: 'جاري تحميل خريطة الوصول...',
    mapStatusOffline: 'الخدمة غير متوفرة حالياً',
    mapStatusMismatch: 'بيانات الخريطة غير مطابقة',
    enableRemediation: 'تفعيل معالجة الوصول التلقائية',
    remediationDesc: 'إضافة نصوص بديلة للصور وتسميات للأزرار المفقودة استناداً إلى خريطة الوصول',
    landmarksCount: 'المعالم الهيكلية المتوفرة',
    pageSummary: 'ملخص الصفحة',
    enhancementsAvailable: 'تحسينات وصول متاحة',
    remediationActiveBadge: 'تم تطبيق التحسينات',
    errorOccurred: 'حدث خطأ في تحميل البيانات',

    refresh: 'تحديث',
    refreshStatus: 'تحديث خريطة الصفحة',
    refreshing: 'جاري التحديث...',
    mapStatusOutdated: 'البيانات قديمة (تغير المحتوى)',
    mapStatusInvalid: 'حزمة البيانات غير صالحة',
    mapStatusUnknown: 'بصمة غير مؤكدة',
    landmarksNavTitle: 'التنقل السريع بين معالم الصفحة',
    jumpToLandmark: 'الانتقال إلى',
    landmarkNavigated: 'تم الانتقال إلى المعلم',
    landmarkNotFound: 'تعذر العثور على المعلم في الصفحة',
    landmarkRoleMain: 'المحتوى الرئيسي',
    landmarkRoleNav: 'شريط التنقل',
    landmarkRoleHeader: 'الترويسة الرئيسية',
    landmarkRoleFooter: 'تذييل الصفحة',
    landmarkRoleAside: 'محتوى جانبي',
    landmarkRoleSearch: 'البحث',
    landmarkRoleForm: 'النموذج',
    formGuidanceTitle: 'إرشادات النماذج',
    formStepsCount: 'خطوات النموذج',
    requiredFieldsCount: 'حقول مطلوبة',

    // Phase 2A: Standalone Reading Tools & Headings Navigator
    readAloud: 'القراءة الصوتية التلقائية',
    readAloudDesc: 'قراءة محتوى الصفحة أو النص المحدد صوتياً عبر المتصفح',
    readPage: 'قراءة الصفحة',
    readSelection: 'قراءة النص المحدد',
    play: 'تشغيل',
    pause: 'إيقاف مؤقت',
    resume: 'استئناف',
    stop: 'إيقاف',
    speechRate: 'سرعة القراءة',
    speechVoice: 'صوت القارئ',
    defaultVoice: 'الصوت الافتراضي',
    speechPlaying: 'جاري القراءة الآن...',
    speechPaused: 'تم الإيقاف المؤقت للقراءة',
    speechStopped: 'تم إيقاف القراءة',
    speechUnsupported: 'ميزة القراءة الصوتية غير مدعومة في هذا المتصفح',
    noReadableContent: 'لم يتم العثور على محتوى نصي للقراءة في هذه الصفحة',
    readingSourceSelection: 'قراءة النص المحدد',
    readingSourcePage: 'قراءة الصفحة',
    headingsNavTitle: 'مستكشف عناوين الصفحة',
    headingsCount: 'عناوين متوفرة',
    noHeadingsFound: 'لم يتم العثور على عناوين في هذه الصفحة',
    jumpToHeading: 'الانتقال إلى العنوان',
    headingNavigated: 'تم الانتقال إلى العنوان',
    refreshHeadings: 'تحديث العناوين',
    toolsDescription: 'أدوات مساعدة مستقلة للقراءة والتصفح والتنقل',
  },
  en: {
    widgetTitle: 'Accessibility & Usability Options',
    openOptions: 'Open accessibility options',
    closeOptions: 'Close accessibility panel',
    resetAll: 'Reset all settings',
    resetAllConfirm: 'Settings restored to default successfully',

    assist: 'Assist',
    vision: 'Vision',
    reading: 'Reading',
    tools: 'Tools',

    presets: 'Quick Accessibility Profiles',
    presetBlind: 'Blind Access Profile',
    presetLowVision: 'Low Vision & Contrast',
    presetDyslexia: 'Dyslexia & Focus',
    presetNone: 'Default (Off)',

    textSize: 'Text Size',
    increaseTextSize: 'Increase text size',
    decreaseTextSize: 'Decrease text size',
    lineSpacing: 'Line Spacing',
    increaseLineSpacing: 'Increase line spacing',
    decreaseLineSpacing: 'Decrease line spacing',
    highContrastMode: 'High Contrast Mode',
    toggleHighContrast: 'Toggle high contrast mode',
    focusHighlight: 'Focus Highlight',
    toggleFocusHighlight: 'Toggle focus highlight ring',
    stopAnimations: 'Stop Animations',
    toggleStopAnimations: 'Toggle stop animations',
    reduceMotion: 'Reduce Motion',
    toggleReduceMotion: 'Toggle reduce motion',
    bigCursor: 'Large Cursor',
    selectBigCursor: 'Select large cursor mode',
    bigDarkCursor: 'Large Dark Cursor',
    bigLightCursor: 'Large Light Cursor',
    off: 'Off',

    readingMode: 'Reading Mode',
    toggleReadingMode: 'Toggle reading mode',
    readingGuide: 'Reading Guide Ruler',
    toggleReadingGuide: 'Toggle reading guide ruler',
    readingMask: 'Reading Focus Mask',
    toggleReadingMask: 'Toggle reading mask',
    maskWindowHeight: 'Mask Window Height',
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
    hideImages: 'Hide Images',
    toggleHideImages: 'Toggle hide images',
    imageCaptions: 'Show Image Captions',
    toggleImageCaptions: 'Toggle show image captions',

    describeImage: 'Describe current image',
    describeFocusedElement: 'Describe focused element',
    whatCanIDoHere: 'What can I do here?',

    disclaimer: 'Raawi X provides assistive navigation aids and does not substitute for native WCAG 2.1 AA compliance.',
    statusReady: 'Active & Ready',
    statusOffline: 'Standalone / Offline Mode',
    statusStale: 'Notice: Page content changed since last scan',
    statusRemediated: 'High-confidence remediations applied',
    poweredBy: 'Raawi X Platform',

    pageInsights: 'Page Insights & Assistive Map',
    mapStatusReady: 'Assistive Map Active',
    mapStatusNotScanned: 'Page not scanned yet',
    mapStatusLoading: 'Loading assistive map...',
    mapStatusOffline: 'Service temporarily unavailable',
    mapStatusMismatch: 'Map data mismatched or stale',
    enableRemediation: 'Enable DOM Auto-Remediation',
    remediationDesc: 'Safely add missing image alt descriptions and button labels based on verified scanner map',
    landmarksCount: 'Available Landmarks',
    pageSummary: 'Page Summary',
    enhancementsAvailable: 'Accessibility Enhancements Available',
    remediationActiveBadge: 'Enhancements Applied',
    errorOccurred: 'An error occurred loading map',

    refresh: 'Refresh',
    refreshStatus: 'Refresh page assistive map',
    refreshing: 'Refreshing...',
    mapStatusOutdated: 'Outdated (Page Content Changed)',
    mapStatusInvalid: 'Invalid Map Package',
    mapStatusUnknown: 'Unknown / Unverified',
    landmarksNavTitle: 'Landmark Quick Navigation',
    jumpToLandmark: 'Jump to',
    landmarkNavigated: 'Navigated to landmark',
    landmarkNotFound: 'Landmark target not found on page',
    landmarkRoleMain: 'Main Content',
    landmarkRoleNav: 'Navigation',
    landmarkRoleHeader: 'Header / Banner',
    landmarkRoleFooter: 'Footer / Content Info',
    landmarkRoleAside: 'Aside / Complementary',
    landmarkRoleSearch: 'Search',
    landmarkRoleForm: 'Form',
    formGuidanceTitle: 'Form Guidance',
    formStepsCount: 'Form Steps',
    requiredFieldsCount: 'Required Fields',

    // Phase 2A: Standalone Reading Tools & Headings Navigator
    readAloud: 'Text-to-Speech Read Aloud',
    readAloudDesc: 'Read page content or selected text using browser speech synthesis',
    readPage: 'Read Page',
    readSelection: 'Read Selected Text',
    play: 'Play',
    pause: 'Pause',
    resume: 'Resume',
    stop: 'Stop',
    speechRate: 'Speed',
    speechVoice: 'Voice',
    defaultVoice: 'Default Voice',
    speechPlaying: 'Reading in progress...',
    speechPaused: 'Reading paused',
    speechStopped: 'Reading stopped',
    speechUnsupported: 'Speech synthesis is not supported in this browser',
    noReadableContent: 'No readable text content found on this page',
    readingSourceSelection: 'Reading Selected Text',
    readingSourcePage: 'Reading Page Content',
    headingsNavTitle: 'Page Headings Navigator',
    headingsCount: 'Headings Found',
    noHeadingsFound: 'No headings found on this page',
    jumpToHeading: 'Jump to heading',
    headingNavigated: 'Navigated to heading',
    refreshHeadings: 'Refresh headings',
    toolsDescription: 'Standalone assistive reading, speech and outline tools',
  },
};

export class I18nManager {
  private currentLocale: Locale;
  private listeners: Array<(locale: Locale) => void> = [];

  constructor(initialLocale: Locale = 'ar') {
    this.currentLocale = initialLocale;
  }

  public getLocale(): Locale {
    return this.currentLocale;
  }

  public setLocale(locale: Locale): void {
    if (this.currentLocale === locale) return;
    this.currentLocale = locale;
    for (const listener of this.listeners) {
      listener(locale);
    }
  }

  public t(): TranslationDictionary {
    return translations[this.currentLocale];
  }

  public get(key: keyof TranslationDictionary): string {
    return translations[this.currentLocale][key] || key;
  }

  public subscribe(listener: (locale: Locale) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}
