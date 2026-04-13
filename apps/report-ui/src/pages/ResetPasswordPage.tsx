import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../lib/api';
import ThemeToggle from '../components/ThemeToggle';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const userId = searchParams.get('userId');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token || !userId) {
      setError(t('auth.invalidResetLink'));
    }
  }, [token, userId, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'));
      return;
    }
    if (!token || !userId) return;
    setLoading(true);
    try {
      await apiClient.post<{ message: string }>('/api/auth/reset-password', {
        token,
        userId,
        newPassword: password,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login?reset=success', { replace: true }), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.resetPasswordError'));
    } finally {
      setLoading(false);
    }
  };

  if (!token || !userId) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-background p-4">
        <ThemeToggle className="absolute end-4 top-4" />
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-lg shadow-md p-8">
            <p className="text-destructive text-center mb-4">{error}</p>
            <Link to="/forgot-password" className="block text-center text-primary hover:underline">
              {t('auth.requestNewLink')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background p-4">
      <ThemeToggle className="absolute end-4 top-4" />
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-lg shadow-md p-8">
          <div className="flex flex-col items-center mb-6">
            <img src="/dashboardlogo.svg" alt="Raawi X Logo" className="h-16 w-auto mb-4" />
            <h1 className="text-2xl font-bold text-center mb-2">{t('auth.resetPasswordTitle')}</h1>
            <p className="text-muted-foreground text-center">{t('auth.resetPasswordSubtitle')}</p>
          </div>

          {success ? (
            <p className="text-center text-emerald-600 dark:text-emerald-400">{t('auth.resetPasswordSuccess')}</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1">
                  {t('auth.newPassword')}
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                  {t('auth.confirmPassword')}
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  autoComplete="new-password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? t('common.loading') : t('auth.resetPassword')}
              </button>
              <p className="text-center text-sm text-muted-foreground">
                <Link to="/login" className="text-primary hover:underline">
                  {t('auth.backToLogin')}
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
