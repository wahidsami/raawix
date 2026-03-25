import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../lib/api';
import { Search, ExternalLink, AlertTriangle, X } from 'lucide-react';
import GlobalEntityScopeBanner from '../components/GlobalEntityScopeBanner';
import { getWCAGRuleTitle, getWCAGRuleDescription } from '../utils/wcag-rules';
import { useClientPagination } from '../hooks/useClientPagination';
import TablePagination from '../components/TablePagination';

interface Finding {
  id: string;
  ruleId: string;
  wcagId?: string;
  level?: string;
  status: string;
  confidence: string;
  message?: string;
  site?: string;
  scanId?: string;
  pageUrl?: string;
  howToVerify?: string;
  evidence?: any[];
}

export default function FindingsPage() {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language === 'ar' ? 'ar' : 'en';
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [filters, setFilters] = useState({
    site: '',
    scan: '',
    wcagId: '',
    status: '',
    confidence: '',
    search: '',
  });

  useEffect(() => {
    fetchFindings();
  }, [filters]);

  const findingsPaginationKey = useMemo(() => JSON.stringify(filters), [filters]);
  const {
    page: findingPage,
    setPage: setFindingPage,
    pageSize: findingPageSize,
    setPageSize: setFindingPageSize,
    totalPages: findingTotalPages,
    total: findingListTotal,
    pageItems: pagedFindings,
  } = useClientPagination(findings, findingsPaginationKey);

  const fetchFindings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getFindings({
        site: filters.site || undefined,
        scanId: filters.scan || undefined,
        wcagId: filters.wcagId || undefined,
        status: filters.status || undefined,
        confidence: filters.confidence || undefined,
        limit: 100,
        offset: 0,
      });

      // Filter by search term if provided
      let filteredFindings = response.findings;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredFindings = filteredFindings.filter(
          (f) =>
            f.message?.toLowerCase().includes(searchLower) ||
            f.wcagId?.toLowerCase().includes(searchLower) ||
            f.ruleId.toLowerCase().includes(searchLower)
        );
      }

      setFindings(filteredFindings);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch findings');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fail':
        return 'bg-destructive text-destructive-foreground';
      case 'pass':
        return 'bg-green-600 text-white';
      case 'needs_review':
        return 'bg-yellow-600 text-white';
      default:
        return 'bg-muted text-muted-foreground';
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

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder={t('common.search')}
                className="w-full pl-10 pr-3 py-2 border border-input rounded-md bg-background"
              />
            </div>
          </div>
          <div>
            <select
              value={filters.site}
              onChange={(e) => setFilters({ ...filters, site: e.target.value })}
              className="px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="">{t('findings.site')}</option>
              <option value="localhost:4173">localhost:4173</option>
            </select>
          </div>
          <div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="">{t('findings.status')}</option>
              <option value="fail">{t('scans.failed')}</option>
              <option value="pass">{t('common.success')}</option>
              <option value="needs_review">{t('overview.needsReview')}</option>
            </select>
          </div>
          <div>
            <select
              value={filters.confidence}
              onChange={(e) => setFilters({ ...filters, confidence: e.target.value })}
              className="px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="">{t('findings.confidence')}</option>
              <option value="high">{t('findings.high')}</option>
              <option value="medium">{t('findings.medium')}</option>
              <option value="low">{t('findings.low')}</option>
            </select>
          </div>
          <div>
            <input
              type="text"
              value={filters.wcagId}
              onChange={(e) => setFilters({ ...filters, wcagId: e.target.value })}
              placeholder="WCAG ID (e.g., 1.1.1)"
              className="px-3 py-2 border border-input rounded-md bg-background"
            />
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${selectedFinding ? 'lg:grid-cols-3' : ''} gap-6`}>
        {/* Findings List */}
        <div className={selectedFinding ? 'lg:col-span-1' : 'w-full'}>
          {findings.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">{t('findings.noFindings')}</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium">{t('findings.wcagId')}</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">{t('findings.status')}</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">{t('findings.confidence')}</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">{t('findings.message')}</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pagedFindings.map((finding) => (
                    <tr
                      key={finding.id}
                      className={`hover:bg-muted/50 cursor-pointer ${selectedFinding?.id === finding.id ? 'bg-muted' : ''}`}
                      onClick={() => setSelectedFinding(finding)}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium">{finding.wcagId || finding.ruleId}</div>
                          {(() => {
                            const ruleTitle = getWCAGRuleTitle(finding.wcagId, currentLanguage);
                            if (ruleTitle) {
                              return (
                                <div className="text-xs text-muted-foreground mt-1">{ruleTitle}</div>
                              );
                            }
                            return null;
                          })()}
                          {finding.level && (
                            <div className="text-xs text-muted-foreground">{t('findings.level')} {finding.level}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(finding.status)}`}>
                          {finding.status === 'fail' ? t('findings.statusFail') :
                            finding.status === 'pass' ? t('findings.statusPass') :
                              finding.status === 'needs_review' ? t('findings.statusNeedsReview') :
                                finding.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm ${getConfidenceColor(finding.confidence)}`}>
                          {t(`findings.${finding.confidence}` as any)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {finding.message || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFinding(finding);
                          }}
                          className="text-primary hover:underline text-sm"
                        >
                          {t('common.view')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <TablePagination
                page={findingPage}
                totalPages={findingTotalPages}
                totalItems={findingListTotal}
                pageSize={findingPageSize}
                onPageChange={setFindingPage}
                onPageSizeChange={setFindingPageSize}
              />
            </div>
          )}
        </div>

        {/* Finding Detail Panel */}
        {selectedFinding && (
          <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{t('findings.title')} {t('common.details')}</h2>
              <button
                onClick={() => setSelectedFinding(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('findings.wcagId')}</label>
                <div className="mt-1">
                  <code className="text-sm bg-muted px-2 py-1 rounded">{selectedFinding.wcagId || selectedFinding.ruleId}</code>
                  {(() => {
                    const ruleTitle = getWCAGRuleTitle(selectedFinding.wcagId, currentLanguage);
                    const ruleDescription = getWCAGRuleDescription(selectedFinding.wcagId, currentLanguage);
                    if (ruleTitle) {
                      return (
                        <>
                          <div className="mt-1 font-medium">{ruleTitle}</div>
                          {ruleDescription && (
                            <div className="text-sm text-muted-foreground mt-1">{ruleDescription}</div>
                          )}
                        </>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('findings.status')}</label>
                <div className="mt-1">
                  <span className={`px-2 py-1 rounded text-sm ${getStatusColor(selectedFinding.status)}`}>
                    {selectedFinding.status === 'fail' ? t('findings.statusFail') :
                      selectedFinding.status === 'pass' ? t('findings.statusPass') :
                        selectedFinding.status === 'needs_review' ? t('findings.statusNeedsReview') :
                          selectedFinding.status}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('findings.confidence')}</label>
                <div className="mt-1">
                  <span className={`text-sm ${getConfidenceColor(selectedFinding.confidence)}`}>
                    {t(`findings.${selectedFinding.confidence}` as any)}
                  </span>
                </div>
              </div>

              {selectedFinding.message && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('findings.message')}</label>
                  <div className="mt-1">{selectedFinding.message}</div>
                </div>
              )}

              {selectedFinding.pageUrl && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('findings.pageUrl')}</label>
                  <div className="mt-1">
                    <a
                      href={selectedFinding.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      {selectedFinding.pageUrl}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {selectedFinding.howToVerify && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('findings.howToVerify')}</label>
                  <div className="mt-1 text-sm">{selectedFinding.howToVerify}</div>
                </div>
              )}

              {selectedFinding.evidence && selectedFinding.evidence.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <h3 className="font-medium mb-2">{t('findings.evidence')}</h3>
                  <div className="space-y-2">
                    {selectedFinding.evidence.map((evidence: any, idx: number) => (
                      <div key={idx} className="bg-muted p-3 rounded text-sm">
                        {evidence.description && (
                          <div className="font-medium mb-1">{evidence.description}</div>
                        )}
                        {evidence.selector && (
                          <div className="text-xs font-mono text-muted-foreground mb-1">
                            {t('findings.selector')}: {evidence.selector}
                          </div>
                        )}
                        {evidence.value && (
                          <div className="text-xs font-mono bg-background p-2 rounded mt-1 overflow-auto max-h-32">
                            {evidence.value.substring(0, 500)}
                            {evidence.value.length > 500 && '...'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

