import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../lib/api';
import { ScanSearch } from 'lucide-react';
import GlobalEntityScopeBanner from '../components/GlobalEntityScopeBanner';
import { useClientPagination } from '../hooks/useClientPagination';
import TablePagination from '../components/TablePagination';

interface Scan {
  scanId: string;
  seedUrl: string;
  status: 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'canceled' | 'discovering';
  startedAt: string;
  completedAt?: string;
  hostname: string;
  summary?: {
    totalPages: number;
    aFailures: number;
    aaFailures: number;
  };
}

export default function ScansPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    domain: '',
    dateFrom: '',
    dateTo: '',
  });
  const [showStartScanModal, setShowStartScanModal] = useState(false);
  const [scanFormData, setScanFormData] = useState({
    entityId: '',
    propertyId: '',
    seedUrl: '',
    maxPages: 25,
    maxDepth: 2,
  });
  const [availableEntities, setAvailableEntities] = useState<Array<{ id: string; nameEn: string }>>([]);
  const [availableProperties, setAvailableProperties] = useState<Array<{ id: string; domain: string; displayNameEn?: string }>>([]);

  useEffect(() => {
    fetchScans();
  }, [filters]);

  const scansPaginationKey = useMemo(() => JSON.stringify(filters), [filters]);
  const {
    page: scanPage,
    setPage: setScanPage,
    pageSize: scanPageSize,
    setPageSize: setScanPageSize,
    totalPages: scanTotalPages,
    total: scanListTotal,
    pageItems: pagedScans,
  } = useClientPagination(scans, scansPaginationKey);

  useEffect(() => {
    if (showStartScanModal) {
      fetchEntitiesForScan();
    }
  }, [showStartScanModal, scanFormData.entityId]);

  const fetchScans = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getScans({
        status: filters.status || undefined,
        hostname: filters.domain || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        limit: 50,
        offset: 0,
      });
      setScans(response.scans.map((s: any) => ({ ...s, status: s.status as Scan['status'] })));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch scans');
    } finally {
      setLoading(false);
    }
  };

  const fetchEntitiesForScan = async () => {
    try {
      const response = await apiClient.getEntities();
      setAvailableEntities(response.entities);

      if (scanFormData.entityId) {
        const propertiesResponse = await apiClient.getProperties({ entityId: scanFormData.entityId });
        setAvailableProperties(propertiesResponse.properties);
      } else {
        setAvailableProperties([]);
      }
    } catch (err) {
      console.error('Failed to fetch entities:', err);
    }
  };

  const getStatusColor = (status: Scan['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/25';
      case 'failed':
        return 'bg-red-500/15 text-red-200 ring-1 ring-red-500/25';
      case 'running':
        return 'bg-sky-500/15 text-sky-200 ring-1 ring-sky-500/25';
      case 'queued':
        return 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/25';
      case 'discovering':
        return 'bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/25';
      case 'paused':
        return 'bg-orange-500/15 text-orange-200 ring-1 ring-orange-500/25';
      case 'canceled':
        return 'bg-muted text-muted-foreground ring-1 ring-border';
      default:
        return 'bg-muted text-muted-foreground ring-1 ring-border';
    }
  };

  const handleStartScan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.startScan({
        entityId: scanFormData.entityId || undefined,
        propertyId: scanFormData.propertyId || undefined,
        seedUrl: scanFormData.seedUrl,
        maxPages: scanFormData.maxPages,
        maxDepth: scanFormData.maxDepth,
        scanPipeline: {
          layer1: true,
          layer2: true,
          layer3: true,
          analysisAgent: true,
          screenshotMode: 'full',
        },
      });
      setShowStartScanModal(false);
      setScanFormData({
        entityId: '',
        propertyId: '',
        seedUrl: '',
        maxPages: 25,
        maxDepth: 2,
      });
      // Refresh scans list
      fetchScans();
      // Optionally navigate to the scan
      // navigate(`/scans/${response.scanId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scan');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <GlobalEntityScopeBanner />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => navigate('/entities')}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 flex items-center gap-2 w-fit"
          >
            <ScanSearch className="w-4 h-4" />
            {t('scans.startFromEntity')}
          </button>
          <p className="text-xs text-muted-foreground max-w-md">
            {t('scans.startFromEntityDescription')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowStartScanModal(true)}
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 sm:self-center"
        >
          {t('scans.advancedStartHere')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('scans.status')}</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="">{t('common.filter')}</option>
              <option value="pending">{t('scans.pending')}</option>
              <option value="running">{t('scans.running')}</option>
              <option value="completed">{t('scans.completed')}</option>
              <option value="failed">{t('scans.failed')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('sites.domain')}</label>
            <input
              type="text"
              value={filters.domain}
              onChange={(e) => setFilters({ ...filters, domain: e.target.value })}
              placeholder="example.com"
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('common.date')} {t('common.from')}</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('common.date')} {t('common.to')}</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
            />
          </div>
        </div>
      </div>

      {/* Scans Table */}
      {scans.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <ScanSearch className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">{t('scans.noScans')}</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium">{t('scans.status')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Scan ID</th>
                <th className="px-6 py-3 text-left text-sm font-medium">URL</th>
                <th className="px-6 py-3 text-left text-sm font-medium">{t('scans.startedAt')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium">{t('scans.completedAt')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium">{t('scans.pages')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pagedScans.map((scan) => (
                <tr key={scan.scanId} className="hover:bg-muted/50">
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(scan.status)}`}>
                      {t(`scans.${scan.status}` as any) || scan.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs bg-muted px-2 py-1 rounded">{scan.scanId}</code>
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={scan.seedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm truncate max-w-xs block"
                    >
                      {scan.seedUrl}
                    </a>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(scan.startedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {scan.completedAt ? new Date(scan.completedAt).toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4">
                    {scan.summary ? (
                      <div className="text-sm">
                        <div>{scan.summary.totalPages} {t('scans.pages')}</div>
                        {scan.summary.aFailures > 0 && (
                          <div className="text-xs text-destructive">
                            {scan.summary.aFailures} A {t('overview.wcagAFailures')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => navigate(`/scans/${scan.scanId}`)}
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
            page={scanPage}
            totalPages={scanTotalPages}
            totalItems={scanListTotal}
            pageSize={scanPageSize}
            onPageChange={setScanPage}
            onPageSizeChange={setScanPageSize}
          />
        </div>
      )}

      {/* Error message (if any, but scans exist) */}
      {error && scans.length > 0 && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          {error}
        </div>
      )}

      {/* Start Scan Modal */}
      {showStartScanModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{t('scan.startScan')}</h2>
            <form onSubmit={handleStartScan} className="space-y-4">
              {availableEntities.length === 0 ? (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-4 mb-4">
                  <p className="text-sm text-amber-100 mb-2">
                    {t('entities.noEntities')}
                  </p>
                  <a
                    href="/entities"
                    className="text-sm text-primary hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowStartScanModal(false);
                      window.location.href = '/entities';
                    }}
                  >
                    {t('entities.addEntity')} →
                  </a>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t('entities.title')} ({t('common.optional')})
                    </label>
                    <select
                      value={scanFormData.entityId}
                      onChange={(e) => {
                        setScanFormData({
                          ...scanFormData,
                          entityId: e.target.value,
                          propertyId: '',
                        });
                      }}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    >
                      <option value="">{t('common.filter')} {t('entities.title')}</option>
                      {availableEntities.map((entity) => (
                        <option key={entity.id} value={entity.id}>
                          {entity.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>
                  {scanFormData.entityId && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {t('entities.properties')} ({t('common.optional')})
                      </label>
                      <select
                        value={scanFormData.propertyId}
                        onChange={(e) => setScanFormData({ ...scanFormData, propertyId: e.target.value })}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      >
                        <option value="">{t('common.filter')} {t('entities.properties')}</option>
                        {availableProperties.map((property) => (
                          <option key={property.id} value={property.id}>
                            {property.displayNameEn || property.domain}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">{t('scan.seedUrl')} *</label>
                <input
                  type="url"
                  value={scanFormData.seedUrl}
                  onChange={(e) => setScanFormData({ ...scanFormData, seedUrl: e.target.value })}
                  required
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('scan.maxPages')}</label>
                  <input
                    type="number"
                    value={scanFormData.maxPages}
                    onChange={(e) => setScanFormData({ ...scanFormData, maxPages: parseInt(e.target.value) || 25 })}
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('scan.maxDepth')}</label>
                  <input
                    type="number"
                    value={scanFormData.maxDepth}
                    onChange={(e) => setScanFormData({ ...scanFormData, maxDepth: parseInt(e.target.value) || 2 })}
                    min="1"
                    max="5"
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowStartScanModal(false)}
                  className="px-4 py-2 border border-input rounded-md hover:bg-muted"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  {t('scan.startScan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
