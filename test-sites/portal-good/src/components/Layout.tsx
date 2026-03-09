import { ReactNode, useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { useLanguage } from '../hooks/useLanguage';
import { getTranslation } from '../i18n/translations';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  const { language } = useLanguage();

  useEffect(() => {
    // Widget integration
    const apiUrl = import.meta.env.VITE_RAWI_API_URL || 'http://localhost:3001';
    const entityCode = import.meta.env.VITE_RAWI_ENTITY_CODE || 'TEST-GOOD';
    
    (window as any).RAWI_API_URL = apiUrl;
    (window as any).RAWI_ENTITY_CODE = entityCode;
    (window as any).VOICE_ENABLED = true;

    const script = document.createElement('script');
    script.src = '/widget.iife.js';
    script.async = true;
    script.onload = () => {
      console.log('Raawi X widget loaded');
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="app" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <a href="#main-content" className="skip-link">
        {getTranslation(language, 'common.skipToContent')}
      </a>
      <Navbar />
      <main id="main-content">{children}</main>
      <Footer />
    </div>
  );
}

export default Layout;

