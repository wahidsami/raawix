import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import ThemeToggle from '../ThemeToggle';

interface LoginFormProps {
  onSuccess?: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get('reset') === 'success') {
      setResetSuccess(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(email, password);
      // Navigate to dashboard after successful login
      navigate('/', { replace: true });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background p-4">
      <ThemeToggle className="absolute end-4 top-4" />
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-lg shadow-md p-8">
          <div className="flex flex-col items-center mb-6">
            <img 
              src="/dashboardlogo.svg" 
              alt="Raawi X Logo" 
              className="h-16 w-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-center mb-2">{t('dashboard.title')}</h1>
            <p className="text-muted-foreground text-center">{t('dashboard.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {resetSuccess && (
              <div className="bg-emerald-500/10 text-emerald-200 border border-emerald-500/20 p-3 rounded-md text-sm">
                {t('auth.resetSuccessMessage')}
              </div>
            )}
            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                autoComplete="email"
                placeholder="admin@local"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                {t('auth.password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                autoComplete="current-password"
                placeholder="admin123"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? t('common.loading') : t('auth.signIn')}
            </button>
            <p className="text-center mt-3 text-sm text-muted-foreground">
              <Link to="/forgot-password" className="text-primary hover:underline">
                {t('auth.forgotPassword')}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

