import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

type Props = {
  className?: string;
};

export default function ThemeToggle({ className = '' }: Props) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted ${className}`}
      aria-label={
        theme === 'dark'
          ? t('common.themeSwitchToLight')
          : t('common.themeSwitchToDark')
      }
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
    </button>
  );
}
