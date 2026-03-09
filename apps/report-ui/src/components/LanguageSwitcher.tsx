import { useLanguage } from '../hooks/useLanguage';

export default function LanguageSwitcher() {
  const { language, changeLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1 border border-border rounded-md overflow-hidden">
      <button
        onClick={() => changeLanguage('en')}
        className={`px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${language === 'en'
          ? 'bg-green-600 text-white'
          : 'bg-transparent text-muted-foreground hover:bg-muted'
          }`}
        aria-label="Switch to English"
        aria-pressed={language === 'en'}
      >
        EN
      </button>
      <div className="w-px bg-border" />
      <button
        onClick={() => changeLanguage('ar')}
        className={`px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${language === 'ar'
          ? 'bg-green-600 text-white'
          : 'bg-transparent text-muted-foreground hover:bg-muted'
          }`}
        aria-label="Switch to Arabic"
        aria-pressed={language === 'ar'}
      >
        العربية
      </button>
    </div>
  );
}

