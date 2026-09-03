import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../lib/api';
import { Globe, AlertTriangle, ExternalLink, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredAndSortedSites = useMemo(() => {
    let result = [...sites];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => s.domain.toLowerCase().includes(q));
    }

    if (sortField) {
      result.sort((a, b) => {
        let aVal: any = a[sortField as keyof Site];
        let bVal: any = b[sortField as keyof Site];

        if (sortField === 'lastScan') {
          aVal = a.lastScan ? new Date(a.lastScan.completedAt).getTime() : 0;
          bVal = b.lastScan ? new Date(b.lastScan.completedAt).getTime() : 0;
        } else if (sortField === 'issues') {
          aVal = a.issueSummary.total;
          bVal = b.issueSummary.total;
        } else if (sortField === 'domain') {
          aVal = a.domain.toLowerCase();
          bVal = b.domain.toLowerCase();
        } else if (sortField === 'totalScans') {
          aVal = a.totalScans;
          bVal = b.totalScans;
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [sites, searchQuery, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-50" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 inline" /> : <ArrowDown className="w-3 h-3 ml-1 inline" />;
  };

  const {
    page: sitePage,
    setPage: setSitePage,
    pageSize: sitePageSize,
    setPageSize: setSitePageSize,
    totalPages: siteTotalPages,
    total: siteListTotal,
    pageItems: pagedSites,
  } = useClientPagination(filteredAndSortedSites, `${searchQuery}-${sortField}-${sortDirection}`);

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

      {sites.length === 0 && (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <Globe className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">{t('sites.noSites')}</p>
        </div>
      )}
      {sites.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('common.search') || 'Search domains...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-input rounded-md bg-background"
              aria-label={t('sites.search') || 'Search domains'}
            />
          </div>
        </div>
      )}

      {sites.length > 0 && filteredAndSortedSites.length === 0 && (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">
            {t('common.noResults') || `No results found for "${searchQuery}"`}
          </h2>
          <p className="text-muted-foreground">
            {t('common.tryAdjustingFilters') || 'Try adjusting your search.'}
          </p>
        </div>
      )}

      {sites.length > 0 && filteredAndSortedSites.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium">
                  <button onClick={() => handleSort('domain')} className="flex items-center gap-1 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded">
                    {t('sites.domain')} <SortIcon field="domain" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium">
                  <button onClick={() => handleSort('lastScan')} className="flex items-center gap-1 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded">
                    {t('sites.lastScan')} <SortIcon field="lastScan" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium">
                  <button onClick={() => handleSort('totalScans')} className="flex items-center gap-1 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded">
                    {t('sites.totalScans')} <SortIcon field="totalScans" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium">
                  <button onClick={() => handleSort('issues')} className="flex items-center gap-1 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded">
                    {t('sites.issueSummary')} <SortIcon field="issues" />
                  </button>
                </th>
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

