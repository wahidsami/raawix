import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../hooks/useLanguage';
import { Globe, Database, Trash2, ScanSearch, AlertCircle } from 'lucide-react';
import { apiClient } from '../lib/api';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();
  const [settings, setSettings] = useState({
    language: language,
    telemetryEnabled: true,
    retentionDays: 7,
    // Scanner configuration
    maxPages: 200,
    maxDepth: 10,
    maxRuntimeMinutes: 10,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Load current settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await apiClient.get<any>('/api/settings');
      setSettings({
        language: language,
        telemetryEnabled: data.telemetryEnabled ?? true,
        retentionDays: data.retentionDays ?? 7,
        maxPages: data.maxPages ?? 200,
        maxDepth: data.maxDepth ?? 10,
        maxRuntimeMinutes: Math.round((data.maxRuntimeMs ?? 600000) / 60000), // Convert ms to minutes
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      await apiClient.put('/api/settings', {
        maxPages: settings.maxPages,
        maxDepth: settings.maxDepth,
        maxRuntimeMs: settings.maxRuntimeMinutes * 60000, // Convert minutes to ms
      });

      setSaveMessage({ type: 'success', text: t('settings.saveSuccess') || 'Settings saved successfully!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveMessage({ type: 'error', text: t('settings.saveError') || 'Failed to save settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('nav.settings')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('settings.subtitle') || 'Configure scanner behavior, language, and integrations'}
        </p>
      </div>

      <div className="space-y-6">
        {/* Scanner Configuration */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <ScanSearch className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-semibold">{t('settings.scannerConfig') || 'Scanner Configuration'}</h2>
          </div>
          <div className="space-y-4">
            <div className="bg-sky-500/10 border border-sky-500/25 rounded-md p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-foreground">
                <p className="font-medium">{t('settings.scannerConfigNote') || 'These limits apply to all new scans'}</p>
                <p className="mt-1 text-muted-foreground">
                  {t('settings.scannerConfigWarning') || 'Changes take effect immediately for new scans. Running scans are not affected.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Max Pages */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.maxPages') || 'Max Pages per Scan'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={settings.maxPages}
                  onChange={(e) => setSettings({ ...settings, maxPages: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('settings.maxPagesDesc') || 'Maximum pages to scan per website (1-500)'}
                </p>
              </div>

              {/* Max Depth */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.maxDepth') || 'Max Crawl Depth'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={settings.maxDepth}
                  onChange={(e) => setSettings({ ...settings, maxDepth: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('settings.maxDepthDesc') || 'How deep to crawl from seed URL (1-20)'}
                </p>
              </div>

              {/* Max Runtime */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.maxRuntime') || 'Max Runtime (minutes)'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={settings.maxRuntimeMinutes}
                  onChange={(e) => setSettings({ ...settings, maxRuntimeMinutes: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('settings.maxRuntimeDesc') || 'Maximum scan duration (1-120 minutes)'}
                </p>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-muted/50 border border-border rounded-md p-3">
              <p className="text-sm font-medium text-foreground mb-2">
                {t('settings.recommendations') || '💡 Recommendations:'}
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>{t('settings.rec1') || 'Small sites (< 20 pages): 50 pages, 5 depth, 10 min'}</li>
                <li>{t('settings.rec2') || 'Medium sites (20-100 pages): 100 pages, 7 depth, 20 min'}</li>
                <li>{t('settings.rec3') || 'Large sites (> 100 pages): 200+ pages, 10 depth, 30+ min'}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Language Settings */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5" />
            <h2 className="text-lg font-semibold">{t('settings.language')}</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('settings.languageDefault')}</label>
              <select
                value={settings.language}
                onChange={(e) => {
                  const newLang = e.target.value as 'en' | 'ar';
                  setSettings({ ...settings, language: newLang });
                  changeLanguage(newLang);
                }}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </div>
          </div>
        </div>

        {/* Telemetry Settings */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-5 h-5" />
            <h2 className="text-lg font-semibold">{t('settings.telemetry')}</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium">{t('settings.telemetryOnOff')}</label>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('settings.telemetryOnOff')} - Privacy-safe usage analytics
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.telemetryEnabled}
                  onChange={(e) => setSettings({ ...settings, telemetryEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-border after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Retention Settings */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Trash2 className="w-5 h-5" />
            <h2 className="text-lg font-semibold">{t('settings.retention')}</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('settings.retentionSettings')}</label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={settings.retentionDays}
                  onChange={(e) => setSettings({ ...settings, retentionDays: parseInt(e.target.value) || 7 })}
                  className="w-24 px-3 py-2 border border-input rounded-md bg-background"
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Scans older than this will be automatically deleted
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between">
          {saveMessage && (
            <div className={`px-4 py-2 rounded-md ${saveMessage.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/25'
                : 'bg-red-500/10 text-red-200 border border-red-500/25'
              }`}>
              {saveMessage.text}
            </div>
          )}
          <div className="ml-auto">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (t('settings.saving') || 'Saving...') : t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

