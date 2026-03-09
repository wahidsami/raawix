import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard,
  ScanSearch,
  AlertTriangle,
  Map,
  BarChart3,
  Settings,
  Building2,
  Globe,
  Users,
} from 'lucide-react';

interface SidebarItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  adminOnly?: boolean;
}

export default function Sidebar() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const items: SidebarItem[] = [
    { path: '/', icon: LayoutDashboard, labelKey: 'nav.overview' },
    { path: '/entities', icon: Building2, labelKey: 'nav.entities' },
    { path: '/scans', icon: ScanSearch, labelKey: 'nav.scans' },
    { path: '/findings', icon: AlertTriangle, labelKey: 'nav.findings' },
    { path: '/assistive-maps', icon: Map, labelKey: 'nav.assistiveMaps' },
    { path: '/widget-analytics', icon: BarChart3, labelKey: 'nav.widgetAnalytics' },
    { path: '/sites', icon: Globe, labelKey: 'nav.sites' },
    { path: '/users', icon: Users, labelKey: 'nav.users', adminOnly: true },
    { path: '/settings', icon: Settings, labelKey: 'nav.settings' },
  ].filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside
      className={`w-64 bg-card border-r border-border h-screen flex flex-col ${isRTL ? 'border-l border-r-0' : ''
        }`}
    >
      {/* Logo area - Same height as header */}
      <div className="app-header-h flex items-center justify-center border-b border-border">
        <img
          src="/dashboardlogo.png"
          alt="Raawi X Logo"
          className="h-10 w-auto"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors ${isActive
                  ? 'bg-green-600 text-white'
                  : 'text-muted-foreground hover:bg-green-50 hover:text-foreground'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{t(item.labelKey)}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

