import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../hooks/useLanguage';
import { apiClient } from '../lib/api';
import { Building2, Globe, ScanSearch, AlertTriangle, BarChart3, Users, Plus, ArrowLeft, FileText, Map, Download, X, ExternalLink, Search, Trash2 } from 'lucide-react';
import { getWCAGRuleTitle, getWCAGRuleDescription, getRuleMeta } from '../utils/wcag-rules';
import ScanMonitorModal from '../components/ScanMonitorModal';

const ENTITY_TAB_IDS = [
  'overview',
  'properties',
  'scans',
  'findings',
  'analytics',
  'reports',
  'assistiveMaps',
  'contacts',
] as const;
type EntityTabId = (typeof ENTITY_TAB_IDS)[number];

function tabFromParam(value: string | null): EntityTabId {
  if (value && (ENTITY_TAB_IDS as readonly string[]).includes(value)) {
    return value as EntityTabId;
  }
  return 'overview';
}

export default function EntityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const { isRTL } = useLanguage();
  const currentLanguage = i18n.language === 'ar' ? 'ar' : 'en';
  const [entity, setEntity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [complianceScores, setComplianceScores] = useState<any>(null);
  const [entityScans, setEntityScans] = useState<any[]>([]);
  const [entityFindings, setEntityFindings] = useState<any[]>([]);
  const [entityAnalytics, setEntityAnalytics] = useState<any>(null);
  const [assistiveMaps, setAssistiveMaps] = useState<any[]>([]);
  const [selectedFinding, setSelectedFinding] = useState<any>(null);
  const [showFindingDetails, setShowFindingDetails] = useState(false);
  const [findingsFilters, setFindingsFilters] = useState({
    status: '',
    level: '',
    search: '',
  });
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [propertyForm, setPropertyForm] = useState({
    domain: '',
    displayNameEn: '',
    displayNameAr: '',
    isPrimary: false,
  });
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    isPrimary: false,
  });
  const [showScanConfig, setShowScanConfig] = useState(false);
  const [scanConfig, setScanConfig] = useState({
    propertyId: '',
    seedUrl: '',
    maxPages: 500,
    maxDepth: 10,
    protocol: 'https' as 'http' | 'https',
    scanMode: 'domain' as 'domain' | 'single',
  });
  const [scannerConfig, setScannerConfig] = useState<{
    allowedPorts: number[];
    allowAllPorts: boolean;
    allowLocalhost: boolean;
    maxPagesHardLimit: number;
    maxDepthHardLimit: number;
  } | null>(null);
  const [scanToDelete, setScanToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showScanMonitor, setShowScanMonitor] = useState(false);
  const [monitorScanId, setMonitorScanId] = useState<string | null>(null);
  const [monitorSeedUrl, setMonitorSeedUrl] = useState<string>('');

  const tabParam = searchParams.get('tab');
  const activeTab = tabFromParam(tabParam);

  useEffect(() => {
    if (tabParam && !(ENTITY_TAB_IDS as readonly string[]).includes(tabParam)) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('tab');
          return next;
        },
        { replace: true }
      );
    }
  }, [id, tabParam, setSearchParams]);

  const goToTab = (tabId: EntityTabId) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tabId === 'overview') {
          next.delete('tab');
        } else {
          next.set('tab', tabId);
        }
        return next;
      },
      { replace: true }
    );
  };

  useEffect(() => {
    if (id) {
      fetchEntity();
    }
    // Fetch scanner config on mount (for port validation)
    const fetchScannerConfig = async () => {
      try {
        const config = await apiClient.getScannerConfig();
        setScannerConfig(config);
      } catch (err) {
        console.warn('Failed to fetch scanner config:', err);
      }
    };
    fetchScannerConfig();
  }, [id]);

  const fetchEntity = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await apiClient.getEntity(id);
      setEntity(response.entity);
      setError(null);

      // Fetch compliance scores
      try {
        const scores = await apiClient.getComplianceScores('entity', id);
        setComplianceScores(scores);
      } catch (err) {
        console.warn('Failed to fetch compliance scores:', err);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch entity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'scans' && id) {
      fetchEntityScans();
    } else if (activeTab === 'findings' && id) {
      fetchEntityFindings();
    } else if (activeTab === 'analytics' && id) {
      fetchEntityAnalytics();
    } else if (activeTab === 'assistiveMaps' && id) {
      fetchAssistiveMaps();
    }
  }, [activeTab, id]);

  // Poll for scan status updates when scans tab is active
  // NOTE: Only poll if scan monitor is NOT open (to avoid rate limiting)
  useEffect(() => {
    if (activeTab !== 'scans' || !id || showScanMonitor) return;

    const pollInterval = setInterval(() => {
      // Check if there are running scans before polling
      const hasRunningScans = entityScans.some((scan: any) =>
        scan.status === 'running' || scan.status === 'queued'
      );
      if (hasRunningScans) {
        fetchEntityScans();
      }
    }, 5000); // Poll every 5 seconds (reduced frequency to avoid rate limiting)

    return () => clearInterval(pollInterval);
  }, [activeTab, id, entityScans, showScanMonitor]);

  const fetchEntityScans = async () => {
    if (!id) return;
    try {
      const response = await apiClient.getScans({ limit: 50 });
      // Filter scans by entityId (if API supports it, otherwise filter client-side)
      const filtered = response.scans.filter((scan: any) => scan.entityId === id);
      setEntityScans(filtered);
    } catch (err) {
      console.error('Failed to fetch entity scans:', err);
    }
  };

  const fetchEntityFindings = async () => {
    if (!id) return;
    try {
      const response = await apiClient.getFindings({ limit: 100, entityId: id } as any);
      setEntityFindings(response.findings);
    } catch (err) {
      console.error('Failed to fetch entity findings:', err);
    }
  };

  const fetchEntityAnalytics = async () => {
    if (!id) return;
    try {
      // TODO: Implement entity-specific analytics endpoint
      const response = await apiClient.getWidgetAnalytics();
      setEntityAnalytics(response);
    } catch (err) {
      console.error('Failed to fetch entity analytics:', err);
    }
  };

  const fetchAssistiveMaps = async () => {
    if (!id) return;
    try {
      const response = await apiClient.getAssistiveMaps();
      // Filter maps by entity properties
      if (entity?.properties) {
        const propertyDomains = entity.properties.map((p: any) => p.domain);
        const filtered = response.maps.filter((map: any) =>
          propertyDomains.includes(map.domain)
        );
        setAssistiveMaps(filtered);
      } else {
        setAssistiveMaps(response.maps);
      }
    } catch (err) {
      console.error('Failed to fetch assistive maps:', err);
    }
  };

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      setError(null);

      // Normalize domain: extract hostname from URL if it's a full URL
      let domain = propertyForm.domain.trim();
      if (!domain) {
        setError('Domain is required');
        return;
      }

      // If it's a full URL, extract hostname (with port if present)
      try {
        const url = new URL(domain.startsWith('http') ? domain : `https://${domain}`);
        domain = url.host; // host includes port if present (e.g., "localhost:4173")
      } catch {
        // If URL parsing fails, use domain as-is (might be just hostname)
        // This is fine for cases like "example.com"
      }

      await apiClient.addEntityProperty(id, {
        ...propertyForm,
        domain,
      });
      setShowAddProperty(false);
      setPropertyForm({
        domain: '',
        displayNameEn: '',
        displayNameAr: '',
        isPrimary: false,
      });
      fetchEntity();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add property');
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await apiClient.addEntityContact(id, contactForm);
      setShowAddContact(false);
      setContactForm({
        name: '',
        email: '',
        phone: '',
        role: '',
        isPrimary: false,
      });
      fetchEntity();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add contact');
    }
  };

  const handleStartScanClick = (propertyId: string, seedUrl: string) => {
    // Open scan configuration modal — keep maxPages/maxDepth/scanMode from existing config (defaults 500/10/domain).
    // Do not force 1/1 here; that capped discovery to a single URL for whole-site crawls.
    const trimmed = seedUrl.trim();
    let protocol: 'http' | 'https' = 'https';
    if (trimmed.startsWith('https://')) protocol = 'https';
    else if (trimmed.startsWith('http://')) protocol = 'http';

    setScanConfig((prev) => ({
      ...prev,
      propertyId,
      seedUrl: trimmed,
      protocol,
    }));
    setShowScanConfig(true);
  };

  const handleDeleteScan = async () => {
    if (!scanToDelete) return;
    try {
      setDeleting(true);
      setError(null);
      await apiClient.deleteScan(scanToDelete);
      setScanToDelete(null);
      fetchEntityScans(); // Refresh scans list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete scan');
    } finally {
      setDeleting(false);
    }
  };

  const handleStartScan = async () => {
    try {
      const { seedUrl, maxPages, maxDepth } = scanConfig;

      // Validate URL before sending
      if (!seedUrl || !seedUrl.trim()) {
        setError('Invalid URL: URL cannot be empty');
        return;
      }

      // Ensure URL has protocol
      let validUrl = seedUrl.trim();
      if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
        // Use selected protocol from toggle
        validUrl = `${scanConfig.protocol}://${validUrl}`;
      } else {
        // If URL already has protocol, update scanConfig to match
        const currentProtocol = validUrl.startsWith('https://') ? 'https' : 'http';
        setScanConfig(prev => ({ ...prev, protocol: currentProtocol }));
      }

      // Basic URL validation
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(validUrl);
      } catch {
        setError(`Invalid URL: ${seedUrl}`);
        return;
      }

      // Port validation (if scanner config is available and ports are restricted)
      if (scannerConfig && !scannerConfig.allowAllPorts && scannerConfig.allowedPorts && scannerConfig.allowedPorts.length > 0) {
        const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : (parsedUrl.protocol === 'https:' ? 443 : 80);
        if (!scannerConfig.allowedPorts.includes(port)) {
          setError(`Port ${port} is not allowed. Only ports ${scannerConfig.allowedPorts.join(', ')} are permitted.`);
          return;
        }
      }
      // If allowAllPorts is true or allowedPorts is empty, skip port validation (allow all ports)

      // Validate maxPages and maxDepth
      if (maxPages < 1 || maxPages > 500) {
        setError('Max Pages must be between 1 and 500');
        return;
      }
      if (maxDepth < 1 || maxDepth > 20) {
        setError('Max Depth must be between 1 and 20');
        return;
      }

      // Generate scanId on frontend (don't create DB record yet - wait for user to click "Start Scanning")
      // Import generateScanId from core package
      const { generateScanId } = await import('@raawi-x/core');
      const scanId = generateScanId();

      // DON'T create scan record in DB yet - only create when user clicks "Start Scanning"
      // This prevents orphaned scan records from appearing in the scans table

      setShowScanConfig(false);

      // Open scan monitor modal (discovery will start automatically)
      setMonitorScanId(scanId);
      setMonitorSeedUrl(validUrl);
      setShowScanMonitor(true);

      goToTab('scans');
      setError(null);
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

  if (error && !entity) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-md">
        {error}
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">{t('entities.noEntities')}</p>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: t('entities.overview'), icon: Building2 },
    { id: 'properties', label: t('entities.propertiesTab'), icon: Globe },
    { id: 'scans', label: t('entities.scansTab'), icon: ScanSearch },
    { id: 'findings', label: t('entities.findingsTab'), icon: AlertTriangle },
    { id: 'analytics', label: t('entities.analyticsTab'), icon: BarChart3 },
    { id: 'assistiveMaps', label: t('entities.assistiveMaps') || 'Assistive Maps', icon: Map },
    { id: 'reports', label: t('entities.reports') || 'Reports', icon: FileText },
    { id: 'contacts', label: t('entities.contactsTab'), icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/entities')}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          {entity.nameAr && (
            <p className="text-muted-foreground">{entity.nameAr}</p>
          )}
          <p className="text-sm text-muted-foreground">Code: {entity.code}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => goToTab(tab.id as EntityTabId)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('entities.totalProperties')}</p>
                  <p className="text-2xl font-bold">{entity._count.properties}</p>
                </div>
                <Globe className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('entities.totalScans')}</p>
                  <p className="text-2xl font-bold">{entity._count.scans}</p>
                </div>
                <ScanSearch className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('entities.contacts')}</p>
                  <p className="text-2xl font-bold">{entity._count.contacts}</p>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('entities.entityCode') || 'Entity Code'}</p>
                  <p className="text-lg font-bold font-mono">{entity.code || 'N/A'}</p>
                </div>
                <Building2 className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Compliance Scores */}
          {complianceScores && complianceScores.scores && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">{t('scans.complianceScores')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">{t('scans.wcagA')}</div>
                  {complianceScores.scores.scoreA !== null ? (
                    <>
                      <div className="text-3xl font-bold">{complianceScores.scores.scoreA.toFixed(1)}%</div>
                      {complianceScores.scores.aCounts && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {complianceScores.scores.aCounts.passed} {t('scans.passed')} / {complianceScores.scores.aCounts.failed} {t('scans.failed')} / {complianceScores.scores.aCounts.needsReview} {t('scans.needsReview')}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-3xl font-bold text-muted-foreground" title={t('scans.noApplicableChecks') || 'No applicable checks found for the selected scope.'}>
                      N/A
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-2">{t('scans.wcagAA')}</div>
                  {complianceScores.scores.scoreAA !== null ? (
                    <>
                      <div className="text-3xl font-bold">{complianceScores.scores.scoreAA.toFixed(1)}%</div>
                      {complianceScores.scores.aaCounts && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {complianceScores.scores.aaCounts.passed} {t('scans.passed')} / {complianceScores.scores.aaCounts.failed} {t('scans.failed')} / {complianceScores.scores.aaCounts.needsReview} {t('scans.needsReview')}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-3xl font-bold text-muted-foreground" title={t('scans.noApplicableChecks') || 'No applicable checks found for the selected scope.'}>
                      N/A
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-2">{t('scans.needsReview')}</div>
                  <div className="text-3xl font-bold">{complianceScores.scores.needsReviewRate.toFixed(1)}%</div>
                  {complianceScores.scores.needsReviewRules > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {complianceScores.scores.needsReviewRules} {t('scans.rulesNeedReview')}
                    </div>
                  )}
                </div>
              </div>
              {complianceScores.scannedPropertyCount && complianceScores.scannedPropertyCount > 0 && (
                <p className="text-xs text-muted-foreground mt-4">
                  {t('scans.basedOnLatestScan') || 'Based on latest scan per property'}
                </p>
              )}
              {complianceScores.disclaimer && (
                <p className="text-xs text-muted-foreground mt-2 italic">{t('scans.disclaimer')}</p>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'properties' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('entities.propertiesTabSubtitle')}</p>
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddProperty(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('entities.addProperty')}
            </button>
          </div>
          {entity.properties.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <Globe className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">{t('properties.noProperties')}</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium">{t('properties.domain')}</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">{t('properties.displayName')}</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">{t('properties.isPrimary')}</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entity.properties.map((property: any) => (
                    <tr key={property.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4 font-medium">{property.domain}</td>
                      <td className="px-6 py-4">
                        {property.displayNameEn || property.displayNameAr || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {property.isPrimary && (
                          <span className="px-2 py-1 rounded text-xs bg-primary text-primary-foreground">
                            {t('properties.isPrimary')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            // Construct URL - handle both with and without protocol
                            let url = property.domain?.trim() || '';
                            if (!url) {
                              setError('Property domain is empty');
                              return;
                            }
                            // If domain doesn't start with http:// or https://, add https://
                            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                              url = `https://${url}`;
                            }
                            handleStartScanClick(property.id, url);
                          }}
                          className="text-primary hover:underline text-sm"
                        >
                          {t('entities.startScanForProperty')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'scans' && (
        <div className="space-y-4">
          {entityScans.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center space-y-4">
              <ScanSearch className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">
                {entity.properties.length === 0
                  ? t('entities.scansEmptyNoProperties')
                  : t('entities.scansEmptyWithProperties')}
              </p>
              {entity.properties.length === 0 && (
                <button
                  type="button"
                  onClick={() => goToTab('properties')}
                  className="text-primary hover:underline text-sm font-medium"
                >
                  {t('entities.scansEmptyGoToProperties')}
                </button>
              )}
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
                    <th className="px-6 py-3 text-left text-sm font-medium">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entityScans.map((scan: any) => (
                    <tr key={scan.scanId} className="hover:bg-muted/50">
                      <td className="px-6 py-4">
                        <span className="text-sm">{scan.status}</span>
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
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() =>
                              navigate(`/scans/${scan.scanId}`, {
                                state: { fromEntityId: id },
                              })
                            }
                            className="text-primary hover:underline text-sm"
                          >
                            {t('common.view')}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setScanToDelete(scan.scanId);
                            }}
                            className="text-destructive hover:underline text-sm flex items-center gap-1"
                          >
                            <Trash2 className="w-4 h-4" />
                            {t('common.delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'findings' && (
        <div className="space-y-4 w-full">
          {/* Filters */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                  <input
                    type="text"
                    value={findingsFilters.search}
                    onChange={(e) => setFindingsFilters({ ...findingsFilters, search: e.target.value })}
                    placeholder={t('findings.searchPlaceholder')}
                    className={`w-full ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'} py-2 border border-input rounded-md bg-background`}
                  />
                </div>
              </div>
              <div>
                <select
                  value={findingsFilters.status}
                  onChange={(e) => setFindingsFilters({ ...findingsFilters, status: e.target.value })}
                  className="px-3 py-2 border border-input rounded-md bg-background min-w-[150px]"
                >
                  <option value="">{t('findings.filterByStatus')}</option>
                  <option value="fail">{t('findings.statusFail')}</option>
                  <option value="pass">{t('findings.statusPass')}</option>
                  <option value="needs_review">{t('findings.statusNeedsReview')}</option>
                  <option value="na">{t('findings.statusNa')}</option>
                </select>
              </div>
              <div>
                <select
                  value={findingsFilters.level}
                  onChange={(e) => setFindingsFilters({ ...findingsFilters, level: e.target.value })}
                  className="px-3 py-2 border border-input rounded-md bg-background min-w-[120px]"
                >
                  <option value="">{t('findings.filterByLevel')}</option>
                  <option value="A">A</option>
                  <option value="AA">AA</option>
                  <option value="AAA">AAA</option>
                  <option value="Heuristic">{t('findings.heuristic')}</option>
                  <option value="Review">{t('findings.review')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Findings Table */}
          {entityFindings.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">{t('findings.noFindingsForEntity')}</p>
            </div>
          ) : (() => {
            // Filter findings
            let filteredFindings = entityFindings;

            if (findingsFilters.status) {
              filteredFindings = filteredFindings.filter((f: any) => f.status === findingsFilters.status);
            }

            if (findingsFilters.level) {
              filteredFindings = filteredFindings.filter((f: any) => {
                const ruleMeta = getRuleMeta(f.wcagId, f.ruleId);
                return ruleMeta.level === findingsFilters.level ||
                  (findingsFilters.level === 'Heuristic' && ruleMeta.category === 'Heuristic') ||
                  (findingsFilters.level === 'Review' && ruleMeta.category === 'Heuristic' && ruleMeta.level === 'Review');
              });
            }

            if (findingsFilters.search) {
              const searchLower = findingsFilters.search.toLowerCase();
              filteredFindings = filteredFindings.filter((f: any) => {
                const ruleMeta = getRuleMeta(f.wcagId, f.ruleId);
                const title = currentLanguage === 'ar' ? ruleMeta.titleAr : ruleMeta.titleEn;
                return (
                  (f.wcagId && f.wcagId.toLowerCase().includes(searchLower)) ||
                  (f.ruleId && f.ruleId.toLowerCase().includes(searchLower)) ||
                  (title && title.toLowerCase().includes(searchLower)) ||
                  (f.message && f.message.toLowerCase().includes(searchLower)) ||
                  (f.pageUrl && f.pageUrl.toLowerCase().includes(searchLower))
                );
              });
            }

            if (filteredFindings.length === 0) {
              return (
                <div className="bg-card border border-border rounded-lg p-8 text-center">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">{t('findings.noResults')}</p>
                </div>
              );
            }

            // Define column order (same logical order for both EN and AR)
            // With dir="rtl" on table, columns will visually reverse in Arabic
            // Logical order: [WCAG ID] | [Title] | [Level] | [Status] | [Description] | [Page URL]
            // Visual order in RTL: [Page URL] | [Description] | [Status] | [Level] | [Title] | [WCAG ID]
            const columns = [
              { key: 'wcagId', label: t('findings.wcagIdLabel'), align: 'center', dir: 'ltr' },
              { key: 'title', label: t('findings.titleLabel'), align: isRTL ? 'right' : 'left', dir: isRTL ? 'rtl' : 'ltr' },
              { key: 'level', label: t('findings.level'), align: 'center', dir: 'ltr' },
              { key: 'status', label: t('findings.status'), align: 'center', dir: isRTL ? 'rtl' : 'ltr' },
              { key: 'description', label: t('findings.description'), align: isRTL ? 'right' : 'left', dir: isRTL ? 'rtl' : 'ltr' },
              { key: 'pageUrl', label: t('findings.pageUrlLabel'), align: 'left', dir: 'ltr' },
            ];

            return (
              <div className="bg-card border border-border rounded-lg overflow-hidden w-full" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="overflow-x-auto">
                  <table className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
                    <thead className="bg-muted">
                      <tr>
                        {columns.map((col) => (
                          <th
                            key={col.key}
                            className={`px-4 py-3 text-sm font-medium ${col.align === 'center' ? 'text-center' :
                                col.align === 'right' ? 'text-right' :
                                  'text-left'
                              }`}
                            dir={col.key === 'wcagId' || col.key === 'pageUrl' ? 'ltr' : col.dir}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredFindings.map((finding: any) => {
                        const ruleMeta = getRuleMeta(finding.wcagId, finding.ruleId);
                        const ruleTitle = currentLanguage === 'ar' ? ruleMeta.titleAr : ruleMeta.titleEn;
                        const displayLevel = finding.level || ruleMeta.level || '-';

                        // Build description: message (line 1) + evidence (line 2, muted)
                        const message = finding.message || '';
                        let evidenceText = '';
                        if (finding.evidence && finding.evidence.length > 0) {
                          const firstEvidence = finding.evidence[0];
                          if (firstEvidence.selector) {
                            evidenceText = `${t('findings.selector')}: ${firstEvidence.selector}`;
                          } else if (firstEvidence.value && firstEvidence.value.length < 100) {
                            evidenceText = firstEvidence.value.substring(0, 100);
                          }
                        }

                        // Render cell content based on column key
                        const renderCell = (colKey: string) => {
                          switch (colKey) {
                            case 'wcagId':
                              return (
                                <span className="inline-flex justify-center w-full">
                                  <code className="text-xs bg-muted px-2 py-1 rounded" dir="ltr">
                                    {finding.wcagId || finding.ruleId}
                                  </code>
                                </span>
                              );
                            case 'title':
                              return (
                                <div dir={isRTL ? 'rtl' : 'ltr'} className={isRTL ? 'text-right' : 'text-left'} style={{ width: '100%' }}>
                                  {ruleTitle || finding.ruleId}
                                </div>
                              );
                            case 'level':
                              return (
                                <span dir="ltr" className="text-center inline-block w-full">
                                  {displayLevel}
                                </span>
                              );
                            case 'status': {
                              // Get localized status text
                              const statusText = finding.status === 'fail' ? t('findings.statusFail') :
                                finding.status === 'pass' ? t('findings.statusPass') :
                                  finding.status === 'needs_review' ? t('findings.statusNeedsReview') :
                                    finding.status === 'na' ? t('findings.statusNa') :
                                      finding.status;
                              return (
                                <div className="flex justify-center w-full">
                                  <span className={`px-2 py-1 rounded text-xs ${finding.status === 'fail' ? 'bg-destructive text-destructive-foreground' :
                                      finding.status === 'pass' ? 'bg-green-600 text-white' :
                                        finding.status === 'needs_review' ? 'bg-yellow-600 text-white' :
                                          'bg-muted text-muted-foreground'
                                    }`} dir={isRTL ? 'rtl' : 'ltr'}>
                                    {statusText}
                                  </span>
                                </div>
                              );
                            }
                            case 'description':
                              return (
                                <div dir={isRTL ? 'rtl' : 'ltr'} className={isRTL ? 'text-right' : 'text-left'} style={{ whiteSpace: 'normal' }}>
                                  {message ? (
                                    <div className="mb-1" dir={isRTL ? 'rtl' : 'ltr'}>{message}</div>
                                  ) : null}
                                  {evidenceText ? (
                                    <div className="text-xs text-muted-foreground">
                                      <span dir="ltr" className="inline-block">{evidenceText}</span>
                                    </div>
                                  ) : null}
                                  {!message && !evidenceText && <span className="text-muted-foreground">-</span>}
                                </div>
                              );
                            case 'pageUrl':
                              return finding.pageUrl ? (
                                <a
                                  href={finding.pageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline inline-flex items-center gap-1 max-w-[240px]"
                                  onClick={(e) => e.stopPropagation()}
                                  dir="ltr"
                                >
                                  <span className="truncate whitespace-nowrap">{finding.pageUrl}</span>
                                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              );
                            default:
                              return null;
                          }
                        };

                        return (
                          <tr
                            key={finding.id}
                            className="hover:bg-muted/50 cursor-pointer"
                            onClick={() => {
                              setSelectedFinding(finding);
                              setShowFindingDetails(true);
                            }}
                          >
                            {columns.map((col) => {
                              // Determine cell direction: LTR for WCAG ID and Page URL, otherwise use column dir
                              const cellDir = col.key === 'wcagId' || col.key === 'pageUrl' ? 'ltr' : col.dir;
                              // Use the same alignment as the header
                              const cellAlign = col.align;

                              return (
                                <td
                                  key={col.key}
                                  className={`px-4 py-3 text-sm ${cellAlign === 'center' ? 'text-center' :
                                      cellAlign === 'right' ? 'text-right' :
                                        'text-left'
                                    } ${col.key === 'pageUrl' ? 'max-w-[240px]' : ''}`}
                                  dir={cellDir}
                                >
                                  {renderCell(col.key)}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Finding Details Drawer/Modal */}
          {showFindingDetails && selectedFinding && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowFindingDetails(false)}>
              <div
                className="bg-card border border-border rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">{t('findings.title')} {t('common.details')}</h2>
                  <button
                    onClick={() => setShowFindingDetails(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t('findings.wcagIdLabel')}</label>
                    <div className="mt-1">
                      <code className="text-sm bg-muted px-2 py-1 rounded" dir="ltr">
                        {selectedFinding.wcagId || selectedFinding.ruleId}
                      </code>
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
                    <label className="text-sm font-medium text-muted-foreground">{t('findings.level')}</label>
                    <div className="mt-1">
                      {(() => {
                        const ruleMeta = getRuleMeta(selectedFinding.wcagId, selectedFinding.ruleId);
                        return selectedFinding.level || ruleMeta.level || '-';
                      })()}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t('findings.status')}</label>
                    <div className="mt-1">
                      <span className={`px-2 py-1 rounded text-sm ${selectedFinding.status === 'fail' ? 'bg-destructive text-destructive-foreground' :
                          selectedFinding.status === 'pass' ? 'bg-green-600 text-white' :
                            selectedFinding.status === 'needs_review' ? 'bg-yellow-600 text-white' :
                              'bg-muted text-muted-foreground'
                        }`}>
                        {selectedFinding.status === 'fail' ? t('findings.statusFail') :
                          selectedFinding.status === 'pass' ? t('findings.statusPass') :
                            selectedFinding.status === 'needs_review' ? t('findings.statusNeedsReview') :
                              selectedFinding.status === 'na' ? t('findings.statusNa') :
                                selectedFinding.status}
                      </span>
                    </div>
                  </div>

                  {selectedFinding.message && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">{t('findings.description')}</label>
                      <div className="mt-1">{selectedFinding.message}</div>
                    </div>
                  )}

                  {selectedFinding.howToVerify && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">{t('findings.howToVerify')}</label>
                      <div className="mt-1 text-sm">{selectedFinding.howToVerify}</div>
                    </div>
                  )}

                  {selectedFinding.pageUrl && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">{t('findings.pageUrlLabel')}</label>
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
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {entityAnalytics ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="text-sm text-muted-foreground mb-1">{t('analytics.uniqueSessions') || 'Unique Sessions'}</div>
                  <div className="text-2xl font-bold">{entityAnalytics.uniqueSessions || 0}</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="text-sm text-muted-foreground mb-1">{t('analytics.widgetOpens') || 'Widget Opens'}</div>
                  <div className="text-2xl font-bold">{entityAnalytics.widgetOpens || 0}</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="text-sm text-muted-foreground mb-1">{t('analytics.voiceUsage') || 'Voice Usage'}</div>
                  <div className="text-2xl font-bold">{entityAnalytics.voiceUsage || 0}%</div>
                </div>
              </div>
              {entityAnalytics.topPages && entityAnalytics.topPages.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-4">{t('analytics.topPages') || 'Top Pages'}</h3>
                  <div className="space-y-2">
                    {entityAnalytics.topPages.slice(0, 10).map((page: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                        <span className="text-sm truncate max-w-md">{page.url}</span>
                        <span className="text-sm text-muted-foreground">{page.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">{t('analytics.noData') || 'No analytics data available'}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'assistiveMaps' && (
        <div className="space-y-4">
          {assistiveMaps.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <Map className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">
                {t('assistiveMaps.noMaps') || 'No Assistive Maps Yet'}
              </h2>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                {t('assistiveMaps.noMapsDescription') ||
                  'Assistive maps are generated automatically when you scan pages. Run a scan for one of your properties to create assistive maps.'}
              </p>
              <div className="mt-6 space-y-2 text-sm text-muted-foreground text-left max-w-lg mx-auto">
                <p className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{t('assistiveMaps.info1') || 'Assistive maps enhance page accessibility information with label overrides, image descriptions, and action intents'}</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{t('assistiveMaps.info2') || 'Maps are generated during the scanning process (Layer 3 of the scan pipeline)'}</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{t('assistiveMaps.info3') || 'Each map is associated with a specific page version and stored in the database'}</span>
                </p>
              </div>
              {entity?.properties && entity.properties.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('assistiveMaps.scanHint') || 'To generate assistive maps, start a scan for one of your properties:'}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {entity.properties.map((property: any) => (
                      <span key={property.id} className="text-xs bg-muted px-3 py-1 rounded">
                        {property.domain}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
                <thead className="bg-muted">
                  <tr>
                    <th className={`px-6 py-3 text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('sites.domain') || 'Domain'}
                    </th>
                    <th className={`px-6 py-3 text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('assistiveMaps.pageUrl') || 'Page URL'}
                    </th>
                    <th className={`px-6 py-3 text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('assistiveMaps.generatedAt') || 'Generated At'}
                    </th>
                    <th className={`px-6 py-3 text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('assistiveMaps.confidence') || 'Confidence'}
                    </th>
                    <th className={`px-6 py-3 text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('common.actions') || 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {assistiveMaps.map((map: any) => (
                    <tr key={map.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4 font-medium">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-muted-foreground" />
                          <span>{map.domain}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <a
                          href={map.canonicalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm truncate max-w-xs block"
                          dir="ltr"
                        >
                          {map.canonicalUrl}
                        </a>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(map.generatedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-600"></span>
                            <span className="text-muted-foreground">
                              {map.confidenceSummary?.high || 0} {t('findings.high') || 'High'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-yellow-600"></span>
                            <span className="text-muted-foreground">
                              {map.confidenceSummary?.medium || 0} {t('findings.medium') || 'Medium'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-600"></span>
                            <span className="text-muted-foreground">
                              {map.confidenceSummary?.low || 0} {t('findings.low') || 'Low'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            // Navigate to assistive maps page or show details
                            navigate(`/assistive-maps?mapId=${map.id}`);
                          }}
                          className="text-primary hover:underline text-sm flex items-center gap-1"
                        >
                          {t('common.view') || 'View'}
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
      )}

      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">{t('entities.reports') || 'Reports'}</h2>
            <p className="text-muted-foreground mb-4">
              {t('entities.reportsDescription') || 'Generate and download PDF reports for scans.'}
            </p>
            {entityScans.length === 0 ? (
              <p className="text-muted-foreground">{t('entities.noScansForReports') || 'No scans available for report generation.'}</p>
            ) : (
              <div className="space-y-2">
                {entityScans.filter((s: any) => s.status === 'completed').slice(0, 10).map((scan: any) => (
                  <div key={scan.scanId} className="flex items-center justify-between p-3 border border-border rounded">
                    <div>
                      <div className="font-medium">{scan.scanId}</div>
                      <div className="text-sm text-muted-foreground">{scan.seedUrl}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          try {
                            const blob = await apiClient.exportPDF(scan.scanId, 'en');
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `raawi-x-report-${scan.scanId}-en.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            window.URL.revokeObjectURL(url);
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Failed to export PDF');
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
                      >
                        <Download className="w-4 h-4" />
                        {t('common.exportPDF') || 'Export PDF (EN)'}
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const blob = await apiClient.exportPDF(scan.scanId, 'ar');
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `raawi-x-report-${scan.scanId}-ar.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            window.URL.revokeObjectURL(url);
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Failed to export PDF');
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-1 text-sm border border-input rounded hover:bg-muted"
                      >
                        <Download className="w-4 h-4" />
                        {t('common.exportPDF') || 'Export PDF (AR)'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddContact(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('entities.addContact')}
            </button>
          </div>
          {entity.contacts.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">{t('entities.contacts')} {t('entities.noEntities')}</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium">{t('entities.contactName')}</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">{t('entities.contactEmail')}</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">{t('entities.contactPhone')}</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">{t('entities.contactRole')}</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">{t('entities.contactIsPrimary')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entity.contacts.map((contact: any) => (
                    <tr key={contact.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4 font-medium">{contact.name}</td>
                      <td className="px-6 py-4">{contact.email}</td>
                      <td className="px-6 py-4">{contact.phone || '-'}</td>
                      <td className="px-6 py-4">{contact.role || '-'}</td>
                      <td className="px-6 py-4">
                        {contact.isPrimary && (
                          <span className="px-2 py-1 rounded text-xs bg-primary text-primary-foreground">
                            {t('entities.contactIsPrimary')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Property Modal */}
      {showAddProperty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{t('entities.addProperty')}</h2>
            <form onSubmit={handleAddProperty} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('entities.propertyDomain')} *</label>
                <input
                  type="text"
                  value={propertyForm.domain}
                  onChange={(e) => setPropertyForm({ ...propertyForm, domain: e.target.value })}
                  required
                  placeholder="example.com"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('entities.propertyDisplayNameEn')}</label>
                <input
                  type="text"
                  value={propertyForm.displayNameEn}
                  onChange={(e) => setPropertyForm({ ...propertyForm, displayNameEn: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('entities.propertyDisplayNameAr')}</label>
                <input
                  type="text"
                  value={propertyForm.displayNameAr}
                  onChange={(e) => setPropertyForm({ ...propertyForm, displayNameAr: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={propertyForm.isPrimary}
                  onChange={(e) => setPropertyForm({ ...propertyForm, isPrimary: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="isPrimary" className="text-sm">
                  {t('entities.propertyIsPrimary')}
                </label>
              </div>
              {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddProperty(false);
                    setError(null);
                  }}
                  className="px-4 py-2 border border-input rounded-md hover:bg-muted"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scan Configuration Modal */}
      {showScanConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
            <h2 className="text-xl font-bold mb-4">{t('scan.startScan') || 'Start Scan'}</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleStartScan(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('scan.seedUrl') || 'Seed URL'}</label>
                <div className="flex gap-2 items-center">
                  <div className="flex items-center gap-1 bg-muted rounded-md p-1">
                    <button
                      type="button"
                      onClick={() => setScanConfig({ ...scanConfig, protocol: 'http' })}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${scanConfig.protocol === 'http'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      HTTP
                    </button>
                    <button
                      type="button"
                      onClick={() => setScanConfig({ ...scanConfig, protocol: 'https' })}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${scanConfig.protocol === 'https'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      HTTPS
                    </button>
                  </div>
                  <input
                    type="text"
                    value={scanConfig.seedUrl}
                    onChange={(e) => {
                      const url = e.target.value.trim();
                      // Auto-detect protocol if user types http:// or https://
                      if (url.startsWith('https://')) {
                        setScanConfig({ ...scanConfig, seedUrl: url.replace('https://', ''), protocol: 'https' });
                      } else if (url.startsWith('http://')) {
                        setScanConfig({ ...scanConfig, seedUrl: url.replace('http://', ''), protocol: 'http' });
                      } else {
                        setScanConfig({ ...scanConfig, seedUrl: url });
                      }
                    }}
                    required
                    placeholder="localhost:4173 or example.com"
                    className="flex-1 px-3 py-2 border border-input rounded-md bg-background"
                    dir="ltr"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {scanConfig.protocol === 'http' ? 'http://' : 'https://'}{scanConfig.seedUrl || 'your-domain.com'}
                </p>
              </div>

              {/* Scan Mode Selector */}
              <div>
                <label className="block text-sm font-medium mb-2">{t('scan.scanMode') || 'Scan Mode'}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScanConfig({ ...scanConfig, scanMode: 'domain' })}
                    className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all ${scanConfig.scanMode === 'domain'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input hover:border-primary/50'
                      }`}
                  >
                    <Globe className="w-6 h-6 mb-2" />
                    <span className="font-medium text-sm">{t('scan.fullDomain') || 'Full Domain'}</span>
                    <span className="text-xs text-muted-foreground mt-1 text-center">
                      {t('scan.fullDomainDesc') || 'Crawl entire website'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScanConfig({ ...scanConfig, scanMode: 'single' })}
                    className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all ${scanConfig.scanMode === 'single'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input hover:border-primary/50'
                      }`}
                  >
                    <FileText className="w-6 h-6 mb-2" />
                    <span className="font-medium text-sm">{t('scan.singlePage') || 'Single Page/Section'}</span>
                    <span className="text-xs text-muted-foreground mt-1 text-center">
                      {t('scan.singlePageDesc') || 'Scan only this URL'}
                    </span>
                  </button>
                </div>
                {scanConfig.scanMode === 'domain' && (
                  <p className="text-xs text-muted-foreground mt-2">
                    🌐 {t('scan.domainModeHint') || 'Scanner will discover and scan all pages on this domain'}
                  </p>
                )}
                {scanConfig.scanMode === 'single' && (
                  <p className="text-xs text-muted-foreground mt-2">
                    📄 {t('scan.singleModeHint') || 'Scanner will only scan the exact URL provided (and its direct children if depth > 1)'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('scan.maxPages') || 'Max Pages'}
                  <span className="text-xs text-muted-foreground ml-2">(1-500)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={scanConfig.maxPages}
                  onChange={(e) => setScanConfig({ ...scanConfig, maxPages: parseInt(e.target.value) || 1 })}
                  required
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('scan.maxPagesDescription') || 'Maximum number of pages to scan (recommended: 500 for government sites)'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('scan.maxDepth') || 'Max Depth'}
                  <span className="text-xs text-muted-foreground ml-2">(1-10)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={scanConfig.maxDepth}
                  onChange={(e) => setScanConfig({ ...scanConfig, maxDepth: parseInt(e.target.value) || 1 })}
                  required
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('scan.maxDepthDescription') || 'How deep to crawl: 1 = pages only, 2 = pages + subpages, etc.'}
                </p>
              </div>
              {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowScanConfig(false);
                    setError(null);
                  }}
                  className="px-4 py-2 border border-input rounded-md hover:bg-muted"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  {t('scan.startScan') || 'Start Scan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Scan Confirmation Modal */}
      {scanToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
            <h2 className="text-xl font-bold mb-4">{t('scans.deleteScan') || 'Delete Scan'}</h2>
            <p className="text-muted-foreground mb-6">
              {t('scans.deleteScanConfirm') || 'Are you sure you want to delete this scan? This will permanently delete:'}
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mb-6 space-y-1">
              <li>{t('scans.deleteScanItems.pages') || 'All pages and their data'}</li>
              <li>{t('scans.deleteScanItems.findings') || 'All findings (WCAG and Vision)'}</li>
              <li>{t('scans.deleteScanItems.assistiveMaps') || 'All assistive maps (Layer 3)'}</li>
              <li>{t('scans.deleteScanItems.files') || 'All scan files and artifacts'}</li>
            </ul>
            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm mb-4">
                {error}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setScanToDelete(null);
                  setError(null);
                }}
                disabled={deleting}
                className="px-4 py-2 border border-input rounded-md hover:bg-muted"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteScan}
                disabled={deleting}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50"
              >
                {deleting ? t('common.deleting') || 'Deleting...' : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{t('entities.addContact')}</h2>
            <form onSubmit={handleAddContact} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('entities.contactName')} *</label>
                <input
                  type="text"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('entities.contactEmail')} *</label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('entities.contactPhone')}</label>
                <input
                  type="tel"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('entities.contactRole')}</label>
                <input
                  type="text"
                  value={contactForm.role}
                  onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="contactIsPrimary"
                  checked={contactForm.isPrimary}
                  onChange={(e) => setContactForm({ ...contactForm, isPrimary: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="contactIsPrimary" className="text-sm">
                  {t('entities.contactIsPrimary')}
                </label>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddContact(false)}
                  className="px-4 py-2 border border-input rounded-md hover:bg-muted"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scan Monitor Modal */}
      {showScanMonitor && monitorScanId && (
        <ScanMonitorModal
          scanId={monitorScanId}
          seedUrl={monitorSeedUrl}
          scanMode={scanConfig.scanMode}
          maxPages={scanConfig.maxPages}
          maxDepth={scanConfig.maxDepth}
          entityId={id}
          propertyId={scanConfig.propertyId}
          onClose={() => {
            setShowScanMonitor(false);
            setMonitorScanId(null);
            setMonitorSeedUrl('');
            fetchEntityScans();
          }}
          onComplete={() => {
            setShowScanMonitor(false);
            setMonitorScanId(null);
            setMonitorSeedUrl('');
            fetchEntityScans();
          }}
        />
      )}
    </div>
  );
}

