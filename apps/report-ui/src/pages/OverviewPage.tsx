import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
import { Globe, ScanSearch, FileText, AlertTriangle, Eye, Clock, Building2 } from 'lucide-react';

export default function OverviewPage() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState([
    { label: t('overview.totalSites'), value: '0', icon: Globe, color: 'text-blue-600' },
    { label: t('overview.totalScans'), value: '0', icon: ScanSearch, color: 'text-green-600' },
    { label: t('overview.pagesScanned'), value: '0', icon: FileText, color: 'text-purple-600' },
    { label: t('overview.wcagAFailures'), value: '0', icon: AlertTriangle, color: 'text-red-600' },
    { label: t('overview.wcagAAFailures'), value: '0', icon: AlertTriangle, color: 'text-orange-600' },
    { label: t('overview.needsReview'), value: '0', icon: Clock, color: 'text-yellow-600' },
    { label: t('overview.visionFindings'), value: '0', icon: Eye, color: 'text-indigo-600' },
  ]);
  const [scansOverTime, setScansOverTime] = useState<Array<{ date: string; count: number }>>([]);
  const [failuresByLevel, setFailuresByLevel] = useState<Array<{ level: string; failures: number }>>([]);
  const [topFailingRules, setTopFailingRules] = useState<Array<{ rule: string; failures: number }>>([]);
  const [topAffectedSites, setTopAffectedSites] = useState<Array<{ domain: string; issues: number }>>([]);
  const [entities, setEntities] = useState<Array<{ id: string; nameEn: string; nameAr?: string }>>([]);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const [data, entitiesRes] = await Promise.all([
        apiClient.getOverview(),
        apiClient.getEntities().catch(() => ({ entities: [] as Array<{ id: string; nameEn: string; nameAr?: string }> })),
      ]);
      setEntities(entitiesRes.entities);

      // Update KPIs
      setKpis([
        { label: t('overview.totalSites'), value: data.kpis.totalSites.toLocaleString(), icon: Globe, color: 'text-blue-600' },
        { label: t('overview.totalScans'), value: data.kpis.totalScans.toLocaleString(), icon: ScanSearch, color: 'text-green-600' },
        { label: t('overview.pagesScanned'), value: data.kpis.pagesScanned.toLocaleString(), icon: FileText, color: 'text-purple-600' },
        { label: t('overview.wcagAFailures'), value: data.kpis.wcagAFailures.toLocaleString(), icon: AlertTriangle, color: 'text-red-600' },
        { label: t('overview.wcagAAFailures'), value: data.kpis.wcagAAFailures.toLocaleString(), icon: AlertTriangle, color: 'text-orange-600' },
        { label: t('overview.needsReview'), value: data.kpis.needsReview.toLocaleString(), icon: Clock, color: 'text-yellow-600' },
        { label: t('overview.visionFindings'), value: data.kpis.visionFindings.toLocaleString(), icon: Eye, color: 'text-indigo-600' },
      ]);

      // Update charts
      setScansOverTime(data.charts.scansOverTime);
      setFailuresByLevel(data.charts.failuresByLevel);
      setTopFailingRules(data.charts.topFailingRules);
      setTopAffectedSites(data.charts.topAffectedSites);

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch overview data');
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
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          {t('overview.yourEntities')}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">{t('overview.yourEntitiesSubtitle')}</p>
        {entities.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('overview.noEntitiesYet')}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {entities.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border px-3 py-2 bg-muted/30"
              >
                <Link to={`/entities/${e.id}`} className="font-medium text-primary hover:underline">
                  {e.nameEn}
                </Link>
                <span className="text-muted-foreground hidden sm:inline">·</span>
                <Link
                  to={`/entities/${e.id}?tab=properties`}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  {t('overview.addSite')}
                </Link>
                <Link
                  to={`/entities/${e.id}?tab=scans`}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  {t('overview.scans')}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{kpi.label}</p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                </div>
                <Icon className={`w-8 h-8 ${kpi.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scans Over Time */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-1">{t('overview.scansOverTime')}</h2>
          {!scansOverTime.some((d) => d.count > 0) ? (
            <p className="text-sm text-muted-foreground py-12 text-center">{t('overview.chartNoScansInRange')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={scansOverTime} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'currentColor', fontSize: 11 }}
                  tickFormatter={(v) => String(v).slice(5)}
                  minTickGap={32}
                  style={{ direction: isRTL ? 'rtl' : 'ltr' }}
                />
                <YAxis tick={{ fill: 'currentColor' }} allowDecimals={false} width={36} />
                <Tooltip
                  labelFormatter={(label) => String(label)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  name={t('overview.chartScansPerDay')}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Open issues by WCAG level */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-1">{t('overview.failuresByLevel')}</h2>
          <p className="text-xs text-muted-foreground mb-3">{t('overview.failuresByLevelHint')}</p>
          {!failuresByLevel.some((d) => d.failures > 0) ? (
            <p className="text-sm text-muted-foreground py-12 text-center">{t('overview.chartNoIssuesByLevel')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={failuresByLevel} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="level"
                  tick={{ fill: 'currentColor' }}
                  tickFormatter={(v) => (v === 'Other' ? t('overview.levelOther') : String(v))}
                  style={{ direction: isRTL ? 'rtl' : 'ltr' }}
                />
                <YAxis tick={{ fill: 'currentColor' }} allowDecimals={false} width={36} />
                <Tooltip
                  labelFormatter={(v) => (v === 'Other' ? t('overview.levelOther') : String(v))}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                  }}
                />
                <Bar dataKey="failures" name={t('overview.chartIssues')} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top rules */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">{t('overview.topFailingRules')}</h2>
          {topFailingRules.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">{t('overview.chartNoRules')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(280, topFailingRules.length * 36)}>
              <BarChart
                layout="vertical"
                data={topFailingRules}
                margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fill: 'currentColor' }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="rule"
                  width={isRTL ? 100 : 140}
                  tick={{ fill: 'currentColor', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                  }}
                />
                <Bar dataKey="failures" name={t('overview.chartIssues')} fill="hsl(var(--destructive))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Affected Sites */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">{t('overview.topAffectedSites')}</h2>
          <div className="space-y-3">
            {topAffectedSites.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('overview.chartNoSites')}</p>
            ) : (
              topAffectedSites.map((site, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <span className="font-medium break-all pr-2">{site.domain}</span>
                  <span className="text-sm text-muted-foreground shrink-0">
                    {site.issues} {t('overview.chartIssues').toLowerCase()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

