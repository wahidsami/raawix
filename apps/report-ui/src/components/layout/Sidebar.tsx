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

interface NavSection {
  labelKey: string;
  items: SidebarItem[];
}

export default function Sidebar() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const filterItems = (items: SidebarItem[]) =>
    items.filter((item) => !item.adminOnly || isAdmin);

  const sections: NavSection[] = [
    {
      labelKey: 'nav.sectionPortfolio',
      items: filterItems([
        { path: '/', icon: LayoutDashboard, labelKey: 'nav.overview' },
        { path: '/widget-analytics', icon: BarChart3, labelKey: 'nav.widgetAnalytics' },
      ]),
    },
    {
      labelKey: 'nav.sectionWork',
      items: filterItems([{ path: '/entities', icon: Building2, labelKey: 'nav.entities' }]),
    },
    {
      labelKey: 'nav.sectionAllData',
      items: filterItems([
        { path: '/scans', icon: ScanSearch, labelKey: 'nav.scans' },
        { path: '/findings', icon: AlertTriangle, labelKey: 'nav.findings' },
        { path: '/sites', icon: Globe, labelKey: 'nav.sites' },
        { path: '/assistive-maps', icon: Map, labelKey: 'nav.assistiveMaps' },
      ]),
    },
    {
      labelKey: 'nav.sectionSystem',
      items: filterItems([
        { path: '/settings', icon: Settings, labelKey: 'nav.settings' },
        { path: '/users', icon: Users, labelKey: 'nav.users', adminOnly: true },
      ]),
    },
  ];

  return (
    <aside
      className={`w-64 bg-card border-r border-border h-screen flex flex-col ${isRTL ? 'border-l border-r-0' : ''
        }`}
    >
      <div className="app-header-h flex items-center justify-center border-b border-border">
        <img
          src="/dashboardlogo.png"
          alt="Raawi X Logo"
          className="h-10 w-auto"
        />
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {sections.map((section) => {
          if (section.items.length === 0) return null;
          return (
            <div key={section.labelKey}>
              <p className="px-4 mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t(section.labelKey)}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors ${isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`
                      }
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span>{t(item.labelKey)}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
