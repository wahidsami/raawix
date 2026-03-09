import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { getTranslation } from '../i18n/translations';

function LoginPage() {
  const [username, setUsername] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();
  const { language } = useLanguage();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Simulate login - redirect to verify
    navigate('/auth/verify');
  };

  return (
    <div className="page login-page">
      <div className="login-container">
        <h1>{getTranslation(language, 'login.title')}</h1>
        <p>{getTranslation(language, 'login.subtitle')}</p>
        
        <form onSubmit={handleSubmit}>
          {/* INTENTIONAL ISSUE: Input with placeholder only, no label */}
          <div className="form-group">
            <input
              type="text"
              placeholder={getTranslation(language, 'login.idPlaceholder')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              pattern="[0-9]{10}"
              title={language === 'ar' ? 'يجب أن يكون 10 أرقام' : 'Must be 10 digits'}
            />
          </div>

          <button type="submit" className="button button-primary">
            {getTranslation(language, 'login.continue')}
          </button>
        </form>

        <div className="login-help">
          <p>{getTranslation(language, 'login.help')}</p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

