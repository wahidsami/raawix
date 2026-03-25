import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../lib/api';
import { Map, Globe, ExternalLink } from 'lucide-react';
import GlobalEntityScopeBanner from '../components/GlobalEntityScopeBanner';

interface AssistiveMap {
  id: string;
  siteId: string;
  domain: string;
  canonicalUrl: string;
  generatedAt: string;
  confidenceSummary: {
    high: number;
    medium: number;
    low: number;
  };
  pageVersionId: string;
}

export default function AssistiveMapsPage() {
  const { t } = useTranslation();
  const [maps, setMaps] = useState<AssistiveMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAssistiveMaps();
  }, []);

  const fetchAssistiveMaps = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getAssistiveMaps();
      setMaps(data.maps);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch assistive maps');
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
      <GlobalEntityScopeBanner />

      {maps.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <Map className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">
            {t('assistiveMaps.noMaps') || 'No Assistive Maps Yet'}
          </h2>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            {t('assistiveMaps.noMapsDescription') ||
              'Assistive maps are generated automatically when you scan pages. Run a scan to create assistive maps for your pages.'}
          </p>
          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            <p>• Assistive maps enhance page accessibility information</p>
            <p>• They include label overrides, image descriptions, and action intents</p>
            <p>• Maps are generated during the scanning process</p>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium">{t('sites.domain')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium">{t('assistiveMaps.pageUrl') || 'Page URL'}</th>
                <th className="px-6 py-3 text-left text-sm font-medium">{t('assistiveMaps.generatedAt') || 'Generated'}</th>
                <th className="px-6 py-3 text-left text-sm font-medium">{t('assistiveMaps.confidence') || 'Confidence'}</th>
                <th className="px-6 py-3 text-left text-sm font-medium">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {maps.map((map) => (
                <tr key={map.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{map.domain}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={map.canonicalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm truncate max-w-xs block"
                    >
                      {map.canonicalUrl}
                    </a>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(map.generatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-600"></span>
                        <span className="text-muted-foreground">
                          {map.confidenceSummary.high} {t('findings.high') || 'High'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-yellow-600"></span>
                        <span className="text-muted-foreground">
                          {map.confidenceSummary.medium} {t('findings.medium') || 'Medium'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-600"></span>
                        <span className="text-muted-foreground">
                          {map.confidenceSummary.low} {t('findings.low') || 'Low'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => window.open(map.canonicalUrl, '_blank')}
                      className="text-primary hover:underline text-sm flex items-center gap-1"
                    >
                      {t('common.view')}
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

