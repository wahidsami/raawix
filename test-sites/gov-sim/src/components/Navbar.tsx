import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { getTranslation } from '../i18n/translations';

function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav role="navigation" aria-label="Main navigation">
      <div className="navbar">
        <div className="navbar-container">
          <Link to="/" className="navbar-brand">
            Gov Sim
          </Link>
          
          <ul className="navbar-menu">
            {!isAuthenticated ? (
              <>
                <li><Link to="/">{getTranslation(language, 'nav.home')}</Link></li>
                <li><Link to="/login">{getTranslation(language, 'nav.login')}</Link></li>
              </>
            ) : (
              <>
                <li><Link to="/dashboard">{getTranslation(language, 'nav.dashboard')}</Link></li>
                <li><Link to="/services">{getTranslation(language, 'nav.services')}</Link></li>
                <li>
                  <button type="button" onClick={handleLogout} className="nav-button">
                    {getTranslation(language, 'nav.logout')}
                  </button>
                </li>
              </>
            )}
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

