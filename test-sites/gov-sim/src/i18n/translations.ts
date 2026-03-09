export type Language = 'ar' | 'en';

export const translations = {
  ar: {
    nav: {
      home: 'الرئيسية',
      login: 'تسجيل الدخول',
      logout: 'تسجيل الخروج',
      dashboard: 'لوحة التحكم',
      services: 'الخدمات',
    },
    landing: {
      title: 'مرحباً بكم في منصة الخدمات الحكومية',
      subtitle: 'منصة شاملة لتقديم الخدمات الحكومية الإلكترونية',
      login: 'تسجيل الدخول',
      services: 'الخدمات المتاحة',
    },
    login: {
      title: 'تسجيل الدخول',
      subtitle: 'الرجاء إدخال رقم الهوية الوطنية أو الإقامة',
      idPlaceholder: 'رقم الهوية الوطنية / الإقامة',
      continue: 'متابعة',
      help: 'سيتم توجيهك إلى صفحة التحقق عبر النفاذ الوطني',
    },
    verify: {
      title: 'التحقق من الهوية',
      subtitle: 'الرجاء الموافقة على طلب تسجيل الدخول من تطبيق النفاذ الوطني على هاتفك',
      instructions: [
        'افتح تطبيق النفاذ الوطني',
        'وافق على طلب تسجيل الدخول',
        'أدخل رمز التحقق أدناه (للاختبار فقط)',
      ],
      otpLabel: 'رمز التحقق (للاختبار: أي رقم)',
      otpPlaceholder: '000000',
      confirm: 'تأكيد',
      back: 'العودة',
    },
    dashboard: {
      title: 'لوحة التحكم',
      quickServices: 'الخدمات السريعة',
      recentRequests: 'الطلبات الأخيرة',
      noRequests: 'لا توجد طلبات حالياً',
    },
    services: {
      title: 'الخدمات المتاحة',
      apply: 'تقديم طلب',
      renewId: 'تجديد الهوية الوطنية',
      certificates: 'استخراج الشهادات',
      license: 'تجديد رخصة القيادة',
    },
    apply: {
      step1: 'الخطوة 1: المعلومات الشخصية',
      step2: 'الخطوة 2: معلومات الاتصال',
      step3: 'الخطوة 3: المرفقات',
      review: 'مراجعة الطلب',
      success: 'تم إرسال الطلب بنجاح',
      fullName: 'الاسم الكامل',
      nationalId: 'رقم الهوية الوطنية / الإقامة',
      dob: 'تاريخ الميلاد',
      mobile: 'رقم الجوال',
      email: 'البريد الإلكتروني',
      address: 'العنوان (اختياري)',
      idCopy: 'صورة من الهوية الوطنية',
      supportingDoc: 'وثيقة داعمة (اختياري)',
      previous: 'السابق',
      next: 'التالي',
      submit: 'إرسال الطلب',
      required: 'مطلوب',
    },
    common: {
      language: 'اللغة',
      arabic: 'العربية',
      english: 'English',
    },
  },
  en: {
    nav: {
      home: 'Home',
      login: 'Login',
      logout: 'Logout',
      dashboard: 'Dashboard',
      services: 'Services',
    },
    landing: {
      title: 'Welcome to Government Services Portal',
      subtitle: 'Comprehensive platform for electronic government services',
      login: 'Login',
      services: 'Available Services',
    },
    login: {
      title: 'Login',
      subtitle: 'Please enter your National ID or Iqama number',
      idPlaceholder: 'National ID / Iqama Number',
      continue: 'Continue',
      help: 'You will be redirected to verification page via National Access',
    },
    verify: {
      title: 'Identity Verification',
      subtitle: 'Please approve the login request from the National Access app on your phone',
      instructions: [
        'Open the National Access app',
        'Approve the login request',
        'Enter the verification code below (for testing only)',
      ],
      otpLabel: 'Verification Code (for testing: any number)',
      otpPlaceholder: '000000',
      confirm: 'Confirm',
      back: 'Back',
    },
    dashboard: {
      title: 'Dashboard',
      quickServices: 'Quick Services',
      recentRequests: 'Recent Requests',
      noRequests: 'No requests at the moment',
    },
    services: {
      title: 'Available Services',
      apply: 'Apply',
      renewId: 'Renew National ID',
      certificates: 'Extract Certificates',
      license: 'Renew Driving License',
    },
    apply: {
      step1: 'Step 1: Personal Information',
      step2: 'Step 2: Contact Information',
      step3: 'Step 3: Attachments',
      review: 'Review Application',
      success: 'Application Sent Successfully',
      fullName: 'Full Name',
      nationalId: 'National ID / Iqama Number',
      dob: 'Date of Birth',
      mobile: 'Mobile Number',
      email: 'Email Address',
      address: 'Address (Optional)',
      idCopy: 'ID Copy',
      supportingDoc: 'Supporting Document (Optional)',
      previous: 'Previous',
      next: 'Next',
      submit: 'Submit Application',
      required: 'required',
    },
    common: {
      language: 'Language',
      arabic: 'العربية',
      english: 'English',
    },
  },
};

export function getTranslation(lang: Language, key: string): string {
  const keys = key.split('.');
  let value: any = translations[lang];
  
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
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

