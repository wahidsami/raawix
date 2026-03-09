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
import { Globe, ScanSearch, FileText, AlertTriangle, Eye, Clock } from 'lucide-react';

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

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getOverview();

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
          <h2 className="text-lg font-semibold mb-4">{t('overview.scansOverTime')}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={scansOverTime}>
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
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Failures by Level */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">{t('overview.failuresByLevel')}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={failuresByLevel}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="level"
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
              <Bar dataKey="failures" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Failing Rules */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">{t('overview.topFailingRules')}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topFailingRules} layout={isRTL ? 'vertical' : 'horizontal'}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type={isRTL ? 'number' : 'category'}
                dataKey="rule"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis
                type={isRTL ? 'category' : 'number'}
                dataKey={isRTL ? 'rule' : 'failures'}
                tick={{ fill: 'currentColor' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                }}
              />
              <Bar dataKey="failures" fill="hsl(var(--destructive))" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Affected Sites */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">{t('overview.topAffectedSites')}</h2>
          <div className="space-y-3">
            {topAffectedSites.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                No data available
              </div>
            ) : (
              topAffectedSites.map((site, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <span className="font-medium">{site.domain}</span>
                  <span className="text-sm text-muted-foreground">{site.issues} {t('findings.title').toLowerCase()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

