import { useState, useEffect } from 'react';
import { Language } from '../i18n/translations';

export function useLanguage() {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('portal-good-lang');
    return (saved as Language) || 'ar'; // Default to Arabic
  });

  useEffect(() => {
    // Update HTML attributes
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    
    // Save to localStorage
    localStorage.setItem('portal-good-lang', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'ar' ? 'en' : 'ar');
  };

  return { language, setLanguage, toggleLanguage };
}

