export type Language = 'ar' | 'en';

export const translations = {
  ar: {
    nav: {
      home: 'الرئيسية',
      about: 'من نحن',
      news: 'الأخبار',
      services: 'الخدمات',
      resources: 'الموارد',
      contact: 'اتصل بنا',
      sitemap: 'خريطة الموقع',
    },
    home: {
      heroTitle: 'مرحباً بكم في Portal Good',
      heroSubtitle: 'منصة اختبار شاملة توضح أفضل الممارسات في إمكانية الوصول إلى الويب.',
      exploreServices: 'استكشف الخدمات',
      learnMore: 'اعرف المزيد',
      features: 'المميزات الرئيسية',
      latestNews: 'آخر الأخبار',
      viewAllNews: 'عرض جميع الأخبار',
    },
    common: {
      skipToContent: 'تخطي إلى المحتوى',
      readMore: 'اقرأ المزيد',
      back: 'العودة',
      next: 'التالي',
      previous: 'السابق',
      submit: 'إرسال',
      cancel: 'إلغاء',
      close: 'إغلاق',
      loading: 'جاري التحميل...',
      language: 'اللغة',
      arabic: 'العربية',
      english: 'English',
    },
    about: {
      title: 'من نحن',
      mission: 'مهمتنا',
      missionText: 'Portal Good هي منصة اختبار شاملة مصممة لإظهار أفضل الممارسات في إمكانية الوصول إلى الويب.',
      values: 'قيمنا',
      compliance: 'الامتثال لإمكانية الوصول',
      testing: 'الاختبار والتحقق',
    },
    contact: {
      title: 'اتصل بنا',
      subtitle: 'لديك أسئلة أو ملاحظات؟ نحب أن نسمع منك.',
      name: 'الاسم الكامل',
      email: 'البريد الإلكتروني',
      subject: 'الموضوع',
      message: 'الرسالة',
      required: 'مطلوب',
      send: 'إرسال الرسالة',
      success: 'شكراً لك!',
      successMessage: 'تم إرسال رسالتك بنجاح. سنعود إليك قريباً.',
    },
  },
  en: {
    nav: {
      home: 'Home',
      about: 'About',
      news: 'News',
      services: 'Services',
      resources: 'Resources',
      contact: 'Contact',
      sitemap: 'Sitemap',
    },
    home: {
      heroTitle: 'Welcome to Portal Good',
      heroSubtitle: 'A comprehensive test portal demonstrating best practices in web accessibility.',
      exploreServices: 'Explore Services',
      learnMore: 'Learn More',
      features: 'Key Features',
      latestNews: 'Latest News',
      viewAllNews: 'View All News',
    },
    common: {
      skipToContent: 'Skip to main content',
      readMore: 'Read more',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      submit: 'Submit',
      cancel: 'Cancel',
      close: 'Close',
      loading: 'Loading...',
      language: 'Language',
      arabic: 'العربية',
      english: 'English',
    },
    about: {
      title: 'About Portal Good',
      mission: 'Our Mission',
      missionText: 'Portal Good is a comprehensive test site designed to demonstrate best practices in web accessibility.',
      values: 'Our Values',
      compliance: 'Accessibility Compliance',
      testing: 'Testing & Validation',
    },
    contact: {
      title: 'Contact Us',
      subtitle: 'Have questions or feedback? We\'d love to hear from you.',
      name: 'Full Name',
      email: 'Email Address',
      subject: 'Subject',
      message: 'Message',
      required: 'required',
      send: 'Send Message',
      success: 'Thank You!',
      successMessage: 'Your message has been sent successfully. We\'ll get back to you soon.',
    },
  },
};

export function getTranslation(lang: Language, key: string): string {
  const keys = key.split('.');
  let value: any = translations[lang];
  
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      // Fallback to English if Arabic translation missing
      if (lang === 'ar') {
        value = translations.en;
        for (const k2 of keys) {
          value = value?.[k2];
        }
      }
      break;
    }
  }
  
  return typeof value === 'string' ? value : key;
}

