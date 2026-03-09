import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../hooks/useLanguage';
import { apiClient } from '../lib/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { BarChart3, Users, MousePointer, Mic } from 'lucide-react';

export default function WidgetAnalyticsPage() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    uniqueSessions: 0,
    widgetOpens: 0,
    voiceUsage: 0,
    topPages: [] as Array<{ url: string; count: number }>,
  });
  const [dailyUsage, setDailyUsage] = useState<Array<{ date: string; sessions: number; opens: number }>>([]);
  const [commandUsage, setCommandUsage] = useState<Array<{ command: string; count: number }>>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getWidgetAnalytics();
      setStats({
        uniqueSessions: data.uniqueSessions,
        widgetOpens: data.widgetOpens,
        voiceUsage: data.voiceUsage,
        topPages: data.topPages,
      });
      setDailyUsage(data.dailyUsage);
      setCommandUsage(data.commandUsage);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('widget.uniqueSessions')}</p>
              <p className="text-2xl font-bold">{stats.uniqueSessions}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('widget.widgetOpens')}</p>
              <p className="text-2xl font-bold">{stats.widgetOpens}</p>
            </div>
            <MousePointer className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('widget.voiceUsage')}</p>
              <p className="text-2xl font-bold">{stats.voiceUsage}%</p>
            </div>
            <Mic className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('widget.topPages')}</p>
              <p className="text-2xl font-bold">{stats.topPages.length}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Usage Trend */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">{t('widget.dailyUsageTrend')}</h2>
          {dailyUsage.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <div className="text-center">
                <p>No usage data available yet</p>
                <p className="text-sm mt-2">Widget analytics will appear here once the widget is used</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyUsage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'currentColor' }}
                  style={{ direction: isRTL ? 'rtl' : 'ltr' }}
                />
                <YAxis tick={{ fill: 'currentColor' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="sessions" stroke="#3b82f6" name={t('widget.uniqueSessions')} />
                <Line type="monotone" dataKey="opens" stroke="#10b981" name={t('widget.widgetOpens')} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Command Usage Distribution */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">{t('widget.commandUsage')}</h2>
          {commandUsage.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <div className="text-center">
                <p>No command usage data available yet</p>
                <p className="text-sm mt-2">Command analytics will appear here once users interact with the widget</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={commandUsage} layout={isRTL ? 'vertical' : 'horizontal'}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type={isRTL ? 'number' : 'category'}
                  dataKey={isRTL ? 'count' : 'command'}
                  tick={{ fill: 'currentColor' }}
                />
                <YAxis
                  type={isRTL ? 'category' : 'number'}
                  dataKey={isRTL ? 'command' : 'count'}
                  tick={{ fill: 'currentColor' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Pages */}
        <div className="bg-card border border-border rounded-lg p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">{t('widget.topPages')}</h2>
          <div className="space-y-3">
            {stats.topPages.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                No data available
              </div>
            ) : (
              stats.topPages.map((page, index) => (
                <div key={page.url} className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                    <span className="font-medium">{page.url}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{page.count} {t('widget.widgetOpens')}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

