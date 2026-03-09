import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';

/**
 * Custom hook for language management with RTL support
 */
export function useLanguage() {
  const { i18n } = useTranslation();

  useEffect(() => {
    // Set document direction based on language
    const direction = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = direction;
    document.documentElement.lang = i18n.language;
    
    // Add/remove RTL class for additional styling if needed
    if (direction === 'rtl') {
      document.documentElement.classList.add('rtl');
      document.documentElement.classList.remove('ltr');
    } else {
      document.documentElement.classList.add('ltr');
      document.documentElement.classList.remove('rtl');
    }
  }, [i18n.language]);

  const changeLanguage = async (lang: 'en' | 'ar') => {
    await i18n.changeLanguage(lang);
    // Store in localStorage (handled by i18next-browser-languagedetector)
    localStorage.setItem('raawix_lang', lang);
  };

  return {
    language: i18n.language as 'en' | 'ar',
    changeLanguage,
    isRTL: i18n.language === 'ar',
  };
}

