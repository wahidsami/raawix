import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../lib/api';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Map,
  FileText,
  Download,
  Layers,
  X,
  Image as ImageIcon,
  Maximize2,
  Loader2,
  ChevronDown,
  Globe,
  Bot,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '../components/ui/dropdown-menu';
import { useClientPagination } from '../hooks/useClientPagination';
import TablePagination from '../components/TablePagination';

// Component for loading and displaying vision finding images with auth
function VisionFindingImage({
  url,
  alt,
  onViewFullSize,
  loadImageWithAuth
}: {
  url: string;
  alt: string;
  onViewFullSize: () => void;
  loadImageWithAuth: (url: string) => Promise<string>;
}) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadImageWithAuth(url)
      .then((objectUrl) => {
        if (mounted) {
          setImageSrc(objectUrl);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
      // Cleanup: revoke object URL when component unmounts
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [url]);

  if (loading) {
    return (
      <div className="mt-2 flex items-center justify-center p-8 border border-border rounded bg-muted/50">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !imageSrc) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground p-2 border border-border rounded bg-muted/50">
        <ImageIcon className="w-4 h-4" />
        <span>Failed to load screenshot</span>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div className="relative group">
        <img
          src={imageSrc}
          alt={alt}
          className="max-w-full h-auto rounded border border-border cursor-pointer hover:opacity-90 transition-opacity"
          onClick={onViewFullSize}
          style={{ maxHeight: '200px' }}
        />
        <button
          onClick={onViewFullSize}
          className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="View full size"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Screenshot crop of detected element
      </p>
    </div>
  );
}

interface ScanDetail {
  scanId: string;
  seedUrl: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  entity?: {
    id: string;
    code: string;
    nameEn: string;
    nameAr?: string;
  };
  property?: {
    id: string;
    domain: string;
    displayNameEn?: string;
    displayNameAr?: string;
  };
  summary: {
    totalPages: number;
    totalFindings: number;
    totalVisionFindings: number;
    scores: {
      scoreA: number;
      scoreAA: number;
      needsReviewRate: number;
      totalRules: number;
      passedRules: number;
      failedRules: number;
      needsReviewRules: number;
      aCounts?: { passed: number; failed: number; needsReview: number };
      aaCounts?: { passed: number; failed: number; needsReview: number };
    };
  };
  pages: Array<{
    pageNumber: number;
    url: string;
    canonicalUrl?: string;
    finalUrl?: string;
    title?: string;
    screenshotPath?: string;
    layer1: {
      findings: any[];
      count: number;
      passCount: number;
      failCount: number;
      needsReviewCount: number;
    };
    layer2: {
      findings: any[];
      count: number;
      highConfidenceCount: number;
      mediumConfidenceCount: number;
      lowConfidenceCount: number;
    };
    layerAgent?: {
      findings: any[];
      count: number;
    };
    layer3: {
      assistiveMap: any;
      hasAssistiveMap: boolean;
    };
  }>;
  disclaimer: string;
}

export default function ScanDetailPage() {
  const { scanId } = useParams<{ scanId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const fromEntityId = (location.state as { fromEntityId?: string } | null)?.fromEntityId;

  const goBackFromScan = () => {
    if (fromEntityId) {
      navigate(`/entities/${fromEntityId}?tab=scans`);
    } else {
      navigate('/scans');
    }
  };
  const [scanDetail, setScanDetail] = useState<ScanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageCache, setImageCache] = useState<globalThis.Map<string, string>>(new globalThis.Map());

  const {
    page: pagesTablePage,
    setPage: setPagesTablePage,
    pageSize: pagesTablePageSize,
    setPageSize: setPagesTablePageSize,
    totalPages: pagesTableTotalPages,
    total: pagesTableTotal,
    pageItems: pagedScanPages,
  } = useClientPagination(scanDetail?.pages ?? [], scanDetail?.scanId ?? scanId ?? '');

  // Helper function to build screenshot URL
  const getScreenshotUrl = (artifactPath: string): string => {
    if (!scanId || !artifactPath) return '';
    // Remove leading slash if present
    const cleanPath = artifactPath.startsWith('/') ? artifactPath.slice(1) : artifactPath;
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    return `${API_URL}/api/scan/${scanId}/artifact/${cleanPath}`;
  };

  // Helper function to load image with authentication
  const loadImageWithAuth = async (url: string): Promise<string> => {
    // Check cache first
    if (imageCache.has(url)) {
      return imageCache.get(url)!;
    }

    try {
      const token = apiClient.getToken();
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token} ` } : {},
      });

      if (!response.ok) {
        throw new Error('Failed to load image');
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      // Cache the object URL
      setImageCache(prev => new globalThis.Map(prev).set(url, objectUrl));

      return objectUrl;
    } catch (error) {
      console.error('Failed to load image:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (scanId) {
      fetchScanDetail();
    }
  }, [scanId]);

  const fetchScanDetail = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getScanDetail(scanId!);
      setScanDetail(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch scan detail');
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

  if (error || !scanDetail) {
    return (
      <div className="space-y-4">
        <button
          onClick={goBackFromScan}
          className="flex items-center gap-2 text-primary hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back')}
        </button>
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          {error || 'Scan not found'}
        </div>
      </div>
    );
  }

  const selectedPageData = selectedPage !== null
    ? scanDetail.pages.find((p) => p.pageNumber === selectedPage)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={goBackFromScan}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </button>
          <div>
            <p className="text-muted-foreground text-sm mt-1">
              {scanDetail.scanId}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <DropdownMenu
            trigger={
              <div
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 cursor-pointer"
                role="button"
                tabIndex={0}
              >
                <Download className="w-4 h-4" />
                {t('common.actions') || 'Export'}
                <ChevronDown className="w-4 h-4" />
              </div>
            }
            align="right"
          >
            <DropdownMenuItem
              onClick={async () => {
                if (!scanId) return;
                try {
                  const blob = await apiClient.exportPDF(scanId, 'en');
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `raawi - x - report - ${scanId} -en.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to export PDF');
                }
              }}
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>{t('common.exportPDFEnglish') || 'Export PDF (English)'}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                if (!scanId) return;
                try {
                  const blob = await apiClient.exportPDF(scanId, 'ar');
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `raawi - x - report - ${scanId} -ar.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to export PDF');
                }
              }}
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>{t('common.exportPDFArabic') || 'Export PDF (Arabic)'}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                if (!scanId) return;
                try {
                  const blob = await apiClient.exportExcel(scanId, 'en');
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `accessibility - audit - ${scanId.slice(-8)} -${new Date().toISOString().split('T')[0]} -EN.xlsx`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to export Excel');
                }
              }}
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>{t('common.exportExcelEnglish') || 'Export Excel (English)'}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                if (!scanId) return;
                try {
                  const blob = await apiClient.exportExcel(scanId, 'ar');
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `accessibility - audit - ${scanId.slice(-8)} -${new Date().toISOString().split('T')[0]} -AR.xlsx`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to export Excel');
                }
              }}
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>{t('common.exportExcelArabic') || 'Export Excel (Arabic)'}</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">{t('scans.totalPages')}</div>
          <div className="text-2xl font-bold mt-1">{scanDetail.summary.totalPages}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">{t('scans.totalFindings') || 'Total Findings'}</div>
          <div className="text-2xl font-bold mt-1">{scanDetail.summary.totalFindings}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">{t('scans.wcagAScore') || 'WCAG A Score'}</div>
          <div className="text-2xl font-bold mt-1">
            {scanDetail.summary.scores.scoreA != null ? scanDetail.summary.scores.scoreA.toFixed(1) : 'N/A'}%
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">{t('scans.wcagAAScore') || 'WCAG AA Score'}</div>
          <div className="text-2xl font-bold mt-1">
            {scanDetail.summary.scores.scoreAA != null ? scanDetail.summary.scores.scoreAA.toFixed(1) : 'N/A'}%
          </div>
        </div>
      </div>

      {/* Compliance Scores */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">{t('scans.complianceScores')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-muted-foreground mb-2">{t('scans.wcagA')}</div>
            {scanDetail.summary.scores.scoreA !== null && scanDetail.summary.scores.scoreA !== undefined ? (
              <>
                <div className="text-3xl font-bold">{scanDetail.summary.scores.scoreA.toFixed(1)}%</div>
                {scanDetail.summary.scores.aCounts ? (
                  <div className="text-xs text-muted-foreground mt-1">
                    {scanDetail.summary.scores.aCounts.passed} {t('scans.passed')} / {scanDetail.summary.scores.aCounts.failed} {t('scans.failed')} / {scanDetail.summary.scores.aCounts.needsReview} {t('scans.needsReview')}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground mt-1">
                    {scanDetail.summary.scores.passedRules} / {scanDetail.summary.scores.totalRules} {t('scans.rulesPassed') || 'rules passed'}
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
            {scanDetail.summary.scores.scoreAA !== null && scanDetail.summary.scores.scoreAA !== undefined ? (
              <>
                <div className="text-3xl font-bold">{scanDetail.summary.scores.scoreAA.toFixed(1)}%</div>
                {scanDetail.summary.scores.aaCounts ? (
                  <div className="text-xs text-muted-foreground mt-1">
                    {scanDetail.summary.scores.aaCounts.passed} {t('scans.passed')} / {scanDetail.summary.scores.aaCounts.failed} {t('scans.failed')} / {scanDetail.summary.scores.aaCounts.needsReview} {t('scans.needsReview')}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground mt-1">
                    {scanDetail.summary.scores.passedRules} / {scanDetail.summary.scores.totalRules} {t('scans.rulesPassed') || 'rules passed'}
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
            <div className="text-3xl font-bold">
              {scanDetail.summary.scores.needsReviewRate != null ? scanDetail.summary.scores.needsReviewRate.toFixed(1) : 'N/A'}%
            </div>
            {scanDetail.summary.scores.needsReviewRules > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                {scanDetail.summary.scores.needsReviewRules} {t('scans.rulesNeedReview')}
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4 italic">{t('scans.disclaimer')}</p>
      </div>

      {/* Pages Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-xl font-bold">{t('scans.pages')}</h2>
        </div>
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium">#</th>
              <th className="px-6 py-3 text-left text-sm font-medium">URL</th>
              <th className="px-6 py-3 text-left text-sm font-medium">
                <Layers className="w-4 h-4 inline mr-2" />
                Layer 1 (WCAG)
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium">
                <Eye className="w-4 h-4 inline mr-2" />
                Layer 2 (Vision)
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium">
                <Bot className="w-4 h-4 inline mr-2" />
                Layer Agent
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium">
                <Map className="w-4 h-4 inline mr-2" />
                Layer 3 (Assistive Map)
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pagedScanPages.map((page) => (
              <tr key={page.pageNumber} className="hover:bg-muted/50">
                <td className="px-6 py-4">{page.pageNumber}</td>
                <td className="px-6 py-4">
                  <a
                    href={page.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm truncate max-w-xs block"
                  >
                    {page.url}
                  </a>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {page.layer1.failCount > 0 && (
                      <XCircle className="w-4 h-4 text-destructive" />
                    )}
                    {page.layer1.passCount > 0 && page.layer1.failCount === 0 && (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                    <span className="text-sm">
                      {page.layer1.passCount} / {page.layer1.count}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    {page.layer2.count} findings
                    {page.layer2.highConfidenceCount > 0 && (
                      <span className="text-green-600 ml-2">
                        {page.layer2.highConfidenceCount} high
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    {page.layerAgent?.count ?? 0} findings
                  </div>
                </td>
                <td className="px-6 py-4">
                  {page.layer3.hasAssistiveMap ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <span className="text-muted-foreground text-sm">No</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => setSelectedPage(page.pageNumber)}
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
          page={pagesTablePage}
          totalPages={pagesTableTotalPages}
          totalItems={pagesTableTotal}
          pageSize={pagesTablePageSize}
          onPageChange={setPagesTablePage}
          onPageSizeChange={setPagesTablePageSize}
        />
      </div>

      {/* Page Detail Panel */}
      {selectedPageData && (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">
              {t('scans.pageDetail') || 'Page Detail'} - {selectedPageData.pageNumber}
            </h2>
            <button
              onClick={() => setSelectedPage(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Layer 1: WCAG Findings ({selectedPageData.layer1.count})
              </h3>
              <div className="space-y-2">
                {selectedPageData.layer1.findings.map((finding, idx) => (
                  <div key={idx} className="border border-border rounded p-3">
                    <div className="flex items-center gap-2 mb-1">
                      {finding.status === 'pass' && <CheckCircle className="w-4 h-4 text-green-600" />}
                      {finding.status === 'fail' && <XCircle className="w-4 h-4 text-destructive" />}
                      {finding.status === 'needs_review' && <AlertCircle className="w-4 h-4 text-yellow-600" />}
                      <span className="font-medium">{finding.wcagId || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">({finding.level})</span>
                    </div>
                    {finding.message && (
                      <p className="text-sm text-muted-foreground">{finding.message}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Layer 2: Vision Findings ({selectedPageData.layer2.count})
              </h3>
              <div className="space-y-3">
                {selectedPageData.layer2.findings.map((finding, idx) => {
                  // Extract screenshot path from evidence or screenshotPath
                  let screenshotPath: string | null = null;
                  if (finding.screenshotPath) {
                    screenshotPath = finding.screenshotPath;
                  } else if (finding.evidence && Array.isArray(finding.evidence)) {
                    const screenshotEvidence = finding.evidence.find((e: any) => e.type === 'screenshot');
                    if (screenshotEvidence?.value) {
                      screenshotPath = screenshotEvidence.value;
                    }
                  }

                  const screenshotUrl = screenshotPath ? getScreenshotUrl(screenshotPath) : null;

                  return (
                    <div key={idx} className="border border-border rounded p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{finding.kind}</span>
                        <span className={`text-xs px-2 py-1 rounded ${finding.confidence === 'high' ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/20' :
                          finding.confidence === 'medium' ? 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/20' :
                            'bg-muted text-muted-foreground'
                          }`}>
                          {finding.confidence}
                        </span>
                      </div>
                      {finding.description && (
                        <p className="text-sm text-muted-foreground mb-2">{finding.description}</p>
                      )}
                      {finding.detectedText && (
                        <p className="text-xs text-muted-foreground mb-2">
                          <span className="font-medium">Detected text:</span> {finding.detectedText}
                        </p>
                      )}
                      {screenshotUrl && (
                        <VisionFindingImage
                          url={screenshotUrl}
                          alt={`Vision finding: ${finding.kind} `}
                          onViewFullSize={() => setSelectedImage(screenshotUrl)}
                          loadImageWithAuth={loadImageWithAuth}
                        />
                      )}
                      {!screenshotUrl && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <ImageIcon className="w-4 h-4" />
                          <span>No screenshot available</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Bot className="w-4 h-4" />
                Layer Agent: Interaction Findings ({(selectedPageData.layerAgent?.findings?.length ?? 0)})
              </h3>
              <div className="space-y-2">
                {(selectedPageData.layerAgent?.findings ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No agent findings for this page.</p>
                ) : (
                  (selectedPageData.layerAgent?.findings ?? []).map((finding: any, idx: number) => {
                    const conf = finding.confidence;
                    const isNumeric = typeof conf === 'number' && Number.isFinite(conf);
                    const label = isNumeric
                      ? (conf >= 0.8 ? 'high' : conf >= 0.5 ? 'medium' : 'low')
                      : (conf ?? 'medium');
                    const pct = isNumeric ? `${Math.round(conf * 100)}% ` : '';
                    const isOpenAi = finding.source === 'openai' || finding.evidence?.source === 'openai';
                    return (
                      <div key={finding.id ?? idx} className="border border-border rounded p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{finding.kind}</span>
                          <span className={`text-xs px-2 py-1 rounded ${label === 'high' ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/20' :
                            label === 'medium' ? 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/20' :
                              'bg-muted text-muted-foreground'
                            }`}>
                            {pct ? `${label} (${pct})` : label}
                          </span>
                          {isOpenAi && (
                            <span className="text-xs px-2 py-1 rounded bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/25 font-medium" title="Enriched by OpenAI analyst">
                              AI
                            </span>
                          )}
                        </div>
                        {finding.message && (
                          <p className="text-sm text-muted-foreground">{finding.message}</p>
                        )}
                        {finding.howToVerify && (
                          <p className="text-xs text-muted-foreground mt-1">How to verify: {finding.howToVerify}</p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Map className="w-4 h-4" />
                Layer 3: Assistive Map
              </h3>
              {selectedPageData.layer3.hasAssistiveMap ? (
                <div className="border border-border rounded p-3">
                  <pre className="text-xs overflow-auto max-h-64">
                    {JSON.stringify(selectedPageData.layer3.assistiveMap?.map, null, 2)}
                  </pre>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No assistive map generated for this page.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-7xl max-h-[90vh]">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-white/80 p-2"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedImage}
              alt="Vision finding screenshot"
              className="max-w-full max-h-[90vh] rounded-md border border-border shadow-md"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

