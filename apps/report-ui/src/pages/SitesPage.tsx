import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../lib/api';
import { Globe, AlertTriangle, ExternalLink } from 'lucide-react';
import GlobalEntityScopeBanner from '../components/GlobalEntityScopeBanner';
import { useClientPagination } from '../hooks/useClientPagination';
import TablePagination from '../components/TablePagination';

interface Site {
  id: string;
  domain: string;
  createdAt: string;
  lastScan?: {
    scanId: string;
    completedAt: string;
    totalPages: number;
    aFailures: number;
    aaFailures: number;
  };
  totalScans: number;
  issueSummary: {
    total: number;
    critical: number;
    important: number;
  };
}

export default function SitesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getSites();
      setSites(response.sites);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sites');
    } finally {
      setLoading(false);
    }
  };

  const {
    page: sitePage,
    setPage: setSitePage,
    pageSize: sitePageSize,
    setPageSize: setSitePageSize,
    totalPages: siteTotalPages,
    total: siteListTotal,
    pageItems: pagedSites,
  } = useClientPagination(sites, sites);

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

      {sites.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <Globe className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">{t('sites.noSites')}</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium">{t('sites.domain')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium">{t('sites.lastScan')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium">{t('sites.totalScans')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium">{t('sites.issueSummary')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pagedSites.map((site) => (
                <tr key={site.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{site.domain}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {site.lastScan ? (
                      <div>
                        <div>{new Date(site.lastScan.completedAt).toLocaleDateString()}</div>
                        <div className="text-xs">{site.lastScan.totalPages} pages</div>
                      </div>
                    ) : (
                      <span>{t('common.status')}: {t('scans.pending')}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium">{site.totalScans}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      <span className="text-sm">
                        {site.issueSummary.total} {t('findings.title').toLowerCase()}
                        {site.issueSummary.critical > 0 && (
                          <span className="text-destructive ml-1">
                            ({site.issueSummary.critical} {t('findings.title').toLowerCase()})
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => navigate(`/scans?hostname=${encodeURIComponent(site.domain)}`)}
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
          <TablePagination
            page={sitePage}
            totalPages={siteTotalPages}
            totalItems={siteListTotal}
            pageSize={sitePageSize}
            onPageChange={setSitePage}
            onPageSizeChange={setSitePageSize}
          />
        </div>
      )}
    </div>
  );
}

