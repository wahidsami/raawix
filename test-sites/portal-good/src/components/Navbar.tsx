import { Link, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { getTranslation } from '../i18n/translations';

function Navbar() {
  const location = useLocation();
  const { language, toggleLanguage } = useLanguage();
  const [servicesOpen, setServicesOpen] = useState(false);
  const servicesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (servicesRef.current && !servicesRef.current.contains(event.target as Node)) {
        setServicesOpen(false);
      }
    };

    if (servicesOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [servicesOpen]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav role="navigation" aria-label="Main navigation">
      <div className="navbar">
        <div className="navbar-container">
          <Link to="/" className="navbar-brand" aria-label="Portal Good Home">
            Portal Good
          </Link>
          
          <ul className="navbar-menu">
            <li>
              <Link to="/" className={isActive('/') ? 'active' : ''}>
                {getTranslation(language, 'nav.home')}
              </Link>
            </li>
            <li>
              <Link to="/about" className={isActive('/about') ? 'active' : ''}>
                {getTranslation(language, 'nav.about')}
              </Link>
            </li>
            <li>
              <Link to="/news" className={isActive('/news') ? 'active' : ''}>
                {getTranslation(language, 'nav.news')}
              </Link>
            </li>
            <li className="dropdown" ref={servicesRef}>
              <button
                type="button"
                className={`dropdown-toggle ${isActive('/services') ? 'active' : ''}`}
                aria-expanded={servicesOpen}
                aria-haspopup="true"
                onClick={() => setServicesOpen(!servicesOpen)}
              >
                {getTranslation(language, 'nav.services')}
                <span aria-hidden="true">{language === 'ar' ? '▲' : '▼'}</span>
              </button>
              {servicesOpen && (
                <ul className="dropdown-menu" role="menu">
                  <li role="none">
                    <Link to="/services" role="menuitem">
                      {language === 'ar' ? 'جميع الخدمات' : 'All Services'}
                    </Link>
                  </li>
                  <li role="none">
                    <Link to="/services/web-accessibility" role="menuitem">
                      {language === 'ar' ? 'إمكانية الوصول إلى الويب' : 'Web Accessibility'}
                    </Link>
                  </li>
                  <li role="none">
                    <Link to="/services/consulting" role="menuitem">
                      {language === 'ar' ? 'الاستشارات' : 'Consulting'}
                    </Link>
                  </li>
                  <li role="none">
                    <Link to="/services/training" role="menuitem">
                      {language === 'ar' ? 'التدريب' : 'Training'}
                    </Link>
                  </li>
                </ul>
              )}
            </li>
            <li>
              <Link to="/resources" className={isActive('/resources') ? 'active' : ''}>
                {getTranslation(language, 'nav.resources')}
              </Link>
            </li>
            <li>
              <Link to="/contact" className={isActive('/contact') ? 'active' : ''}>
                {getTranslation(language, 'nav.contact')}
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={toggleLanguage}
                className="lang-switch"
                aria-label={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
              >
                {language === 'ar' ? 'EN' : 'AR'}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

