import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LanguageSwitcher from '../LanguageSwitcher';
import { useLanguage } from '../../hooks/useLanguage';
import { getRouteTitle } from '../../utils/route-titles';
import { DropdownMenu, DropdownMenuItem, DropdownMenuHeader, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { User, Settings, LogOut } from 'lucide-react';

export default function Header() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { isRTL, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  // Get section title from route
  const sectionTitle = getRouteTitle(location.pathname, language as 'en' | 'ar');

  // Format current date
  const currentDate = new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="app-header-h border-b border-border bg-card flex items-center px-6">
      <div className="flex items-center justify-between w-full">
        {/* Left side: Section title */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">{sectionTitle}</h1>
        </div>

        {/* Right side: Date, Language switcher, User dropdown */}
        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Current date */}
          <div className="text-sm text-muted-foreground">
            {currentDate}
          </div>

          {/* Language switcher */}
          <LanguageSwitcher />

          {/* User avatar dropdown */}
          {user && (
            <DropdownMenu
              trigger={
                <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                  <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-medium">
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                </div>
              }
              align={isRTL ? 'left' : 'right'}
            >
              <DropdownMenuHeader>
                {user.email}
              </DropdownMenuHeader>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{t('auth.account') || 'Account'}</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  <span>{t('auth.settings') || 'Settings'}</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <div className="flex items-center gap-2 text-destructive">
                  <LogOut className="w-4 h-4" />
                  <span>{t('auth.logout')}</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}

