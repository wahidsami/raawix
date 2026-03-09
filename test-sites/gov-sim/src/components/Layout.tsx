import { ReactNode, useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { useLanguage } from '../hooks/useLanguage';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  const { language } = useLanguage();

  useEffect(() => {
    // Widget integration
    const apiUrl = import.meta.env.VITE_RAWI_API_URL || 'http://localhost:3001';
    const entityCode = import.meta.env.VITE_RAWI_ENTITY_CODE || 'TEST-GOV';
    
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
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}

export default Layout;

