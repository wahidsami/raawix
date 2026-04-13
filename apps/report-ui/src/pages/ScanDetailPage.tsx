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

type AuditorFinding = {
  issueCode: string;
  serviceName: string;
  issueTitle: string;
  result: 'working' | 'not_working' | 'needs_review' | 'not_applicable';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  subcategory: string;
  pageUrl: string;
  pageNumber: number;
  source: string;
  sourceLabel: string;
  wcagIds: string[];
  evidence: string;
  selector?: string;
  recommendation?: string;
  howToVerify?: string;
};

type AnalysisTracePageProfile = {
  pageType: string;
  mainHeading: string | null;
  taskIntents: Array<{
    id: string;
    label: string;
    category: string;
    reason: string;
    confidence: number;
  }>;
  counts: {
    links: number;
    buttons: number;
    forms: number;
    fields: number;
    fieldsWithoutName: number;
    fieldsWithoutInstructions: number;
    requiredFields: number;
    requiredFieldsWithoutIndicator: number;
    passwordFields: number;
    otpLikeFields: number;
    images: number;
    media: number;
  };
  signals: {
    hasSearch: boolean;
    hasLogin: boolean;
    hasOtp: boolean;
    hasForgotPassword: boolean;
    hasResendCode: boolean;
    hasContact: boolean;
    hasModalTrigger: boolean;
    hasMenuToggle: boolean;
  };
  forms: Array<{
    index: number;
    purpose: 'login' | 'register' | 'contact' | 'search' | 'generic';
    fieldCount: number;
    requiredCount: number;
    unlabeledCount: number;
    fieldsWithoutInstructions: number;
    passwordCount: number;
    otpLikeCount: number;
    hasSubmit: boolean;
    fieldSamples: Array<{
      type: string | null;
      name: string;
      required: boolean;
      hasInstruction: boolean;
      otpLike: boolean;
    }>;
  }>;
};

type AnalysisTaskAssessment = {
  taskId: string;
  label: string;
  category: string;
  result: 'working' | 'not_working' | 'needs_review' | 'not_applicable' | 'manual_checkpoint';
  confidence: number;
  summary: string;
  evidence: Record<string, unknown>;
};

type ManualCheckpointDetail = {
  kind: 'verification_code';
  pageNumber: number;
  pageUrl: string;
  message: string;
  source: 'analysis-agent';
  formPurpose?: 'login' | 'register' | 'contact' | 'search' | 'generic';
  checkpointHeading?: string | null;
  otpLikeFields?: number;
  hasResendCode?: boolean;
  hasForgotPassword?: boolean;
};

type ManualCheckpointHistoryItem = {
  id: string;
  event: 'paused' | 'resumed' | 'resume_failed';
  timestamp: string;
  pageNumber: number;
  pageUrl: string;
  message: string;
  source: 'analysis-agent';
  formPurpose?: 'login' | 'register' | 'contact' | 'search' | 'generic';
  checkpointHeading?: string | null;
  otpLikeFields?: number;
  hasResendCode?: boolean;
  hasForgotPassword?: boolean;
  verificationCodeLength?: number;
};

interface ScanDetail {
  scanId: string;
  seedUrl: string;
  auditMode?: 'classic' | 'raawi-agent';
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
    totalAgentFindings?: number;
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
  analysisAgent?: {
    count: number;
    findings: Array<{
      pageNumber: number;
      pageUrl: string;
      kind: string;
      message: string;
      confidence?: number;
      source: string;
      howToVerify: string;
      suggestedWcagIds: string[];
    }>;
    /** Keyboard/interaction trace and/or stored agent findings */
    executed?: boolean;
    pagesWithArtifact?: number;
    trace?: Array<{
      pageNumber: number;
      pageUrl: string;
      executed: boolean;
      status: 'pass' | 'fail' | 'not_run';
      statusLabel?: string;
      stepCount: number;
      probeAttemptCount: number;
      probeSuccessCount: number;
      probeMessages: string[];
      issueCount: number;
      issueKinds: string[];
      issueMessages: string[];
      traceSummary: string;
      taskAssessments?: AnalysisTaskAssessment[];
      pageProfile?: AnalysisTracePageProfile;
    }>;
    summary?: {
      pagesWithTrace: number;
      passPages: number;
      failPages: number;
      notRunPages: number;
      totalSteps: number;
      totalProbeAttempts: number;
      totalProbeSuccesses: number;
      totalIssues: number;
    };
  };
  auditorFindings?: {
    count: number;
    findings: AuditorFinding[];
    categorySummary: Record<string, number>;
  };
  manualCheckpoint?: ManualCheckpointDetail | null;
  manualCheckpointHistory?: ManualCheckpointHistoryItem[];
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
      trace?: {
        pageNumber: number;
        pageUrl: string;
        executed: boolean;
        status: 'pass' | 'fail' | 'not_run';
        statusLabel?: string;
        stepCount: number;
        probeAttemptCount: number;
        probeSuccessCount: number;
        probeMessages: string[];
        issueCount: number;
        issueKinds: string[];
        issueMessages: string[];
        traceSummary: string;
        taskAssessments?: AnalysisTaskAssessment[];
        pageProfile?: AnalysisTracePageProfile;
      };
    };
    auditorFindings?: {
      count: number;
      findings: AuditorFinding[];
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

  const allLayer1Findings = scanDetail.pages.flatMap((page) =>
    page.layer1.findings.map((finding, idx) => ({
      key: `${page.pageNumber}-l1-${idx}-${finding.wcagId || 'unknown'}`,
      pageNumber: page.pageNumber,
      pageUrl: page.url,
      wcagId: finding.wcagId || 'Unknown',
      level: finding.level || 'N/A',
      status: finding.status,
      confidence: finding.confidence,
      message: finding.message || '—',
    }))
  );

  const allLayer2Findings = scanDetail.pages.flatMap((page) =>
    page.layer2.findings.map((finding, idx) => ({
      key: `${page.pageNumber}-l2-${idx}-${finding.kind || 'unknown'}`,
      pageNumber: page.pageNumber,
      pageUrl: page.url,
      kind: finding.kind || 'Unknown',
      confidence: finding.confidence || '—',
      description: finding.description || '',
      detectedText: finding.detectedText || '',
    }))
  );

  const analysisAgentFindings = scanDetail.analysisAgent?.findings ?? [];
  const analysisAgentTrace = scanDetail.analysisAgent?.trace ?? [];
  const analysisAgentSummary = scanDetail.analysisAgent?.summary;
  const auditorFindings = scanDetail.auditorFindings?.findings ?? [];
  const manualCheckpoint = scanDetail.manualCheckpoint;
  const manualCheckpointHistory = scanDetail.manualCheckpointHistory ?? [];
  const isRaawiAgentReport = scanDetail.auditMode === 'raawi-agent';
  const raawiPagesWithTrace = analysisAgentSummary?.pagesWithTrace ?? scanDetail.analysisAgent?.pagesWithArtifact ?? 0;
  const raawiIssueCount = analysisAgentSummary?.totalIssues ?? scanDetail.summary.totalAgentFindings ?? scanDetail.analysisAgent?.count ?? 0;
  const auditModeLabel =
    isRaawiAgentReport
      ? (t('scanMonitor.auditModeRaawiAgentLabel') || 'Raawi agent')
      : (t('scanMonitor.auditModeClassicLabel') || 'Classic audit');
  const reportModeTitle = isRaawiAgentReport
    ? 'Raawi agent report'
    : 'Classic technical audit report';
  const reportModeIntro = isRaawiAgentReport
    ? 'Raawi agent results are the primary report for this scan. DOM, vision, and assistive map results are kept as supporting technical evidence.'
    : 'Classic audit results are based on DOM/WCAG rules, vision checks, and assistive map output.';
  const technicalEvidenceTitle = isRaawiAgentReport
    ? 'Supporting technical evidence'
    : (t('scans.allFindings') || 'All scan findings');
  const technicalEvidenceIntro = isRaawiAgentReport
    ? 'These DOM/WCAG and vision tables support the Raawi agent assessment. They are not the primary Raawi result, but they explain what the technical layers observed.'
    : (t('scans.allFindingsIntro') ||
      'These tables aggregate results across every scanned page so nothing is hidden behind page selection.');
  const getAnalysisAgentStatusLabel = (status: 'pass' | 'fail' | 'not_run') => {
    if (status === 'pass') return 'Pass';
    if (status === 'fail') return 'Not pass';
    return 'Not run';
  };
  const getAnalysisAgentStatusClass = (status: 'pass' | 'fail' | 'not_run') => {
    if (status === 'pass') {
      return 'bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/20';
    }
    if (status === 'fail') {
      return 'bg-red-500/15 text-red-700 ring-1 ring-red-500/20';
    }
    return 'bg-muted text-muted-foreground ring-1 ring-border';
  };
  const getAuditorResultLabel = (result: string) => {
    if (result === 'working') return 'Working';
    if (result === 'not_working') return 'Not working';
    if (result === 'needs_review') return 'Needs review';
    if (result === 'not_applicable') return 'Not applicable';
    if (result === 'manual_checkpoint') return 'Manual checkpoint';
    return result;
  };
  const getAuditorResultClass = (result: string) => {
    if (result === 'working') return 'bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/20';
    if (result === 'not_working') return 'bg-red-500/15 text-red-700 ring-1 ring-red-500/20';
    if (result === 'needs_review') return 'bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/20';
    return 'bg-muted text-muted-foreground ring-1 ring-border';
  };
  const getManualContinuationEventLabel = (event: ManualCheckpointHistoryItem['event']) => {
    if (event === 'paused') return 'Paused for code entry';
    if (event === 'resumed') return 'Resumed';
    return 'Resume failed';
  };
  const getManualContinuationEventClass = (event: ManualCheckpointHistoryItem['event']) => {
    if (event === 'paused') return 'bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/20';
    if (event === 'resumed') return 'bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/20';
    return 'bg-red-500/15 text-red-700 ring-1 ring-red-500/20';
  };
  const getTaskAssessmentClass = (result: string) => {
    if (result === 'working') return 'text-emerald-700';
    if (result === 'not_working') return 'text-red-700';
    if (result === 'manual_checkpoint') return 'text-blue-700';
    return 'text-amber-700';
  };
  const renderAgentCell = (page: ScanDetail['pages'][number]) => (
    <td className="px-6 py-4">
      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2">
          {page.layerAgent?.trace ? (
            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getAnalysisAgentStatusClass(page.layerAgent.trace.status)}`}>
              {page.layerAgent.trace.statusLabel || getAnalysisAgentStatusLabel(page.layerAgent.trace.status)}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">No trace</span>
          )}
        </div>
        <div>{page.layerAgent?.count ?? 0} findings</div>
      </div>
    </td>
  );

  return (
    <div className="space-y-6">
      {(scanDetail.status === 'canceled' || scanDetail.status === 'failed') && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
          {t('scans.partialReportBanner') ||
            'This scan did not run to completion. Figures below reflect only pages and results saved up to the stop or failure.'}
        </div>
      )}
      <div className={`rounded-lg border px-5 py-4 ${
        isRaawiAgentReport
          ? 'border-emerald-500/25 bg-emerald-500/10'
          : 'border-border bg-card'
      }`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('scanMonitor.auditModeTitle') || 'Audit mode'}
            </div>
            <h1 className="mt-1 text-2xl font-bold">{reportModeTitle}</h1>
            <p className="mt-2 max-w-4xl text-sm text-muted-foreground">{reportModeIntro}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 md:min-w-[420px]">
            <div className="rounded border border-border bg-background/80 p-3">
              <div className="text-xs text-muted-foreground">Pages</div>
              <div className="text-lg font-semibold">{scanDetail.summary.totalPages}</div>
            </div>
            <div className="rounded border border-border bg-background/80 p-3">
              <div className="text-xs text-muted-foreground">Raawi trace</div>
              <div className="text-lg font-semibold">{raawiPagesWithTrace}</div>
            </div>
            <div className="rounded border border-border bg-background/80 p-3">
              <div className="text-xs text-muted-foreground">Raawi issues</div>
              <div className="text-lg font-semibold">{raawiIssueCount}</div>
            </div>
            <div className="rounded border border-border bg-background/80 p-3">
              <div className="text-xs text-muted-foreground">DOM findings</div>
              <div className="text-lg font-semibold">{scanDetail.summary.totalFindings}</div>
            </div>
          </div>
        </div>
      </div>

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
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-medium ring-1 ${
                isRaawiAgentReport
                  ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20'
                  : 'bg-muted text-muted-foreground ring-border'
              }`}>
                {auditModeLabel}
              </span>
              <span className="text-muted-foreground">{reportModeTitle}</span>
            </div>
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

      {isRaawiAgentReport ? (
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-2">Raawi assessment overview</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This report focuses on the Raawi agent trace and interaction results. Technical layers are available later as supporting evidence only.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="rounded border border-border bg-background p-4">
              <div className="text-sm text-muted-foreground">Pages scanned</div>
              <div className="text-2xl font-bold mt-1">{scanDetail.summary.totalPages}</div>
            </div>
            <div className="rounded border border-border bg-background p-4">
              <div className="text-sm text-muted-foreground">Pages with Raawi trace</div>
              <div className="text-2xl font-bold mt-1">{raawiPagesWithTrace}</div>
            </div>
            <div className="rounded border border-border bg-background p-4">
              <div className="text-sm text-muted-foreground">Raawi findings</div>
              <div className="text-2xl font-bold mt-1">{raawiIssueCount}</div>
            </div>
            <div className="rounded border border-border bg-background p-4">
              <div className="text-sm text-muted-foreground">Pass</div>
              <div className="text-2xl font-bold mt-1">{analysisAgentSummary?.passPages ?? 0}</div>
            </div>
            <div className="rounded border border-border bg-background p-4">
              <div className="text-sm text-muted-foreground">Not pass</div>
              <div className="text-2xl font-bold mt-1">{analysisAgentSummary?.failPages ?? 0}</div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
            <div className="bg-card border border-border rounded-lg p-4 sm:col-span-2 lg:col-span-1">
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Bot className="w-3.5 h-3.5" />
                {t('scans.analysisAgentFindings') || 'Analysis AI agent'}
              </div>
              <div className="text-2xl font-bold mt-1">{raawiIssueCount}</div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-2">DOM scan vs Raawi agent</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              This comparison separates automated technical findings from interaction trace findings.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="text-sm text-muted-foreground mb-2">Normal DOM / WCAG scan</div>
                <div className="text-3xl font-bold">{scanDetail.summary.totalFindings}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {scanDetail.summary.scores.passedRules} passed · {scanDetail.summary.scores.failedRules} failed · {scanDetail.summary.scores.needsReviewRules} need review
                </div>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="text-sm text-muted-foreground mb-2">Raawi agent</div>
                <div className="text-3xl font-bold">{raawiPagesWithTrace}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  pages with trace · {raawiIssueCount} issue(s)
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {(manualCheckpoint || manualCheckpointHistory.length > 0) && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-xl font-bold">Manual continuation timeline</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This records when Raawi paused at a verification checkpoint and what happened when the scan resumed.
            </p>
          </div>

          {manualCheckpoint && (
            <div className="border-b border-border bg-amber-500/5 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded px-2 py-1 text-xs font-medium bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/20">
                  Awaiting manual verification
                </span>
                <span className="text-sm text-muted-foreground">
                  Page {manualCheckpoint.pageNumber}
                </span>
                <span className="text-sm text-primary break-all">{manualCheckpoint.pageUrl}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{manualCheckpoint.message}</p>
              {(manualCheckpoint.formPurpose || manualCheckpoint.otpLikeFields || manualCheckpoint.checkpointHeading) && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {manualCheckpoint.formPurpose ? `Form: ${manualCheckpoint.formPurpose}` : null}
                  {manualCheckpoint.formPurpose && manualCheckpoint.otpLikeFields ? ' • ' : null}
                  {manualCheckpoint.otpLikeFields ? `${manualCheckpoint.otpLikeFields} OTP-like field(s)` : null}
                  {(manualCheckpoint.formPurpose || manualCheckpoint.otpLikeFields) && manualCheckpoint.checkpointHeading ? ' • ' : null}
                  {manualCheckpoint.checkpointHeading ? manualCheckpoint.checkpointHeading : null}
                </div>
              )}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Time</th>
                  <th className="px-4 py-3 text-left font-medium">Event</th>
                  <th className="px-4 py-3 text-left font-medium">Page</th>
                  <th className="px-4 py-3 text-left font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {manualCheckpointHistory.map((entry) => (
                  <tr key={entry.id} className="hover:bg-muted/40 align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${getManualContinuationEventClass(entry.event)}`}>
                        {getManualContinuationEventLabel(entry.event)}
                      </span>
                    </td>
                    <td className="px-4 py-3 min-w-[220px]">
                      <div className="text-xs text-muted-foreground">Page {entry.pageNumber}</div>
                      <div className="break-all text-xs text-primary">{entry.pageUrl}</div>
                    </td>
                    <td className="px-4 py-3 min-w-[280px] text-xs text-muted-foreground">
                      <div>{entry.message}</div>
                      {(entry.formPurpose || entry.otpLikeFields || entry.checkpointHeading || entry.verificationCodeLength) && (
                        <div className="mt-1">
                          {entry.formPurpose ? `Form: ${entry.formPurpose}` : null}
                          {entry.formPurpose && entry.otpLikeFields ? ' • ' : null}
                          {entry.otpLikeFields ? `${entry.otpLikeFields} OTP-like field(s)` : null}
                          {(entry.formPurpose || entry.otpLikeFields) && entry.checkpointHeading ? ' • ' : null}
                          {entry.checkpointHeading ? entry.checkpointHeading : null}
                          {(entry.formPurpose || entry.otpLikeFields || entry.checkpointHeading) && entry.verificationCodeLength ? ' • ' : null}
                          {entry.verificationCodeLength ? `Code length: ${entry.verificationCodeLength}` : null}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Compliance Scores */}
      {!isRaawiAgentReport && (
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-2">
          {t('scans.complianceScores')}
        </h2>
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
      )}

      {/* All Findings */}
      {!isRaawiAgentReport && (
      <div className="bg-card border border-border rounded-lg p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold">{technicalEvidenceTitle}</h2>
          <p className="text-sm text-muted-foreground mt-2">
            {technicalEvidenceIntro}
          </p>
        </div>

        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            {isRaawiAgentReport ? 'Supporting Layer 1: WCAG Findings' : 'Layer 1: WCAG Findings'} ({allLayer1Findings.length})
          </h3>
          {allLayer1Findings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Page</th>
                    <th className="px-4 py-2 text-left font-medium">WCAG ID</th>
                    <th className="px-4 py-2 text-left font-medium">Level</th>
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                    <th className="px-4 py-2 text-left font-medium">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allLayer1Findings.map((finding) => (
                    <tr key={finding.key} className="hover:bg-muted/40 align-top">
                      <td className="px-4 py-2 whitespace-nowrap">{finding.pageNumber}</td>
                      <td className="px-4 py-2 font-medium">{finding.wcagId}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{finding.level}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {finding.status === 'pass' && <CheckCircle className="w-4 h-4 text-green-600" />}
                          {finding.status === 'fail' && <XCircle className="w-4 h-4 text-destructive" />}
                          {finding.status === 'needs_review' && <AlertCircle className="w-4 h-4 text-yellow-600" />}
                          <span>{finding.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground max-w-[48rem]">
                        <div className="break-words">{finding.message}</div>
                        <a
                          href={finding.pageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline break-all"
                        >
                          {finding.pageUrl}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No WCAG findings recorded for this scan.</p>
          )}
        </div>

        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            {isRaawiAgentReport ? 'Supporting Layer 2: Vision Findings' : 'Layer 2: Vision Findings'} ({allLayer2Findings.length})
          </h3>
          {allLayer2Findings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Page</th>
                    <th className="px-4 py-2 text-left font-medium">Kind</th>
                    <th className="px-4 py-2 text-left font-medium">Confidence</th>
                    <th className="px-4 py-2 text-left font-medium">Detected Text</th>
                    <th className="px-4 py-2 text-left font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allLayer2Findings.map((finding) => (
                    <tr key={finding.key} className="hover:bg-muted/40 align-top">
                      <td className="px-4 py-2 whitespace-nowrap">{finding.pageNumber}</td>
                      <td className="px-4 py-2 font-medium">{finding.kind}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{finding.confidence}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground break-words">
                        {finding.detectedText || '—'}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground break-words">
                        {finding.description || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No vision findings recorded for this scan.</p>
          )}
        </div>
      </div>
      )}

      {auditorFindings.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">
                {isRaawiAgentReport ? 'Raawi auditor findings' : 'Auditor-style findings'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Unified table using the report categories and subcategories. It combines DOM/WCAG, vision, and Raawi findings into the manual-audit format.
              </p>
            </div>
            <div className="rounded border border-border bg-background px-3 py-2 text-sm">
              <div className="text-muted-foreground">Total</div>
              <div className="text-lg font-semibold">{auditorFindings.length}</div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Service Name</th>
                  <th className="px-4 py-3 text-left font-medium">Issue Title</th>
                  <th className="px-4 py-3 text-left font-medium">Result</th>
                  <th className="px-4 py-3 text-left font-medium">Severity</th>
                  <th className="px-4 py-3 text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-left font-medium">Subcategory</th>
                  <th className="px-4 py-3 text-left font-medium">Page URL</th>
                  <th className="px-4 py-3 text-left font-medium">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auditorFindings.map((finding) => (
                  <tr key={finding.issueCode} className="hover:bg-muted/40 align-top">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium">{finding.serviceName}</div>
                      <div className="text-xs text-muted-foreground">{finding.sourceLabel}</div>
                    </td>
                    <td className="px-4 py-3 min-w-[260px]">
                      <div className="font-medium">{finding.issueTitle}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{finding.issueCode}</div>
                      {finding.wcagIds.length > 0 && (
                        <div className="mt-1 text-xs text-muted-foreground">WCAG: {finding.wcagIds.join(', ')}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${getAuditorResultClass(finding.result)}`}>
                        {getAuditorResultLabel(finding.result)}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize whitespace-nowrap">{finding.severity}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{finding.category}</td>
                    <td className="px-4 py-3 min-w-[180px]">{finding.subcategory}</td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <span className="break-all text-xs text-primary">{finding.pageUrl}</span>
                    </td>
                    <td className="px-4 py-3 min-w-[260px] text-xs text-muted-foreground">
                      {finding.evidence || finding.selector || finding.howToVerify || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analysis AI agent — always shown; table only when there are rows */}
      {scanDetail.analysisAgent != null && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">
              {isRaawiAgentReport ? 'Raawi agent results' : (t('scans.analysisAgentSectionTitle') || 'Analysis AI agent findings')}
            </h2>
          </div>
          <p className="px-4 pt-3 text-sm text-muted-foreground">
            {isRaawiAgentReport
              ? 'Per-page interaction trace, keyboard exploration, and Raawi findings for this scan. Technical DOM/WCAG tables are supporting evidence below.'
              : (t('scans.analysisAgentSectionIntro') ||
                'Keyboard simulation and optional AI enrichment. Complements WCAG rule results above.')}
          </p>
          {analysisAgentTrace.length > 0 && (
            <div className="overflow-x-auto p-4 pt-2">
              <div className="mb-3 text-sm font-semibold">
                {isRaawiAgentReport ? 'Raawi per-page trace' : 'Per-page AI trace'}
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">Page</th>
                    <th className="px-3 py-2 text-left font-medium">Understanding</th>
                    <th className="px-3 py-2 text-left font-medium">Task intents</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Steps</th>
                    <th className="px-3 py-2 text-left font-medium">Probes</th>
                    <th className="px-3 py-2 text-left font-medium">Issues</th>
                    <th className="px-3 py-2 text-left font-medium">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {analysisAgentTrace.map((trace) => (
                    <tr key={`${trace.pageNumber}-${trace.pageUrl}`} className="hover:bg-muted/40 align-top">
                      <td className="px-3 py-2 whitespace-nowrap">{trace.pageNumber}</td>
                      <td className="px-3 py-2 max-w-[240px]">
                        <span className="break-all text-xs text-muted-foreground">{trace.pageUrl}</span>
                      </td>
                      <td className="px-3 py-2 min-w-[180px]">
                        {trace.pageProfile ? (
                          <div>
                            <div className="font-medium capitalize">{trace.pageProfile.pageType.replace(/_/g, ' ')}</div>
                            <div className="text-xs text-muted-foreground">
                              {trace.pageProfile.mainHeading || 'No primary heading captured'}
                            </div>
                            <div className="mt-1 text-[11px] text-muted-foreground">
                              {trace.pageProfile.counts.forms} forms • {trace.pageProfile.counts.fields} fields • {trace.pageProfile.counts.images} images
                            </div>
                            {(trace.pageProfile.counts.passwordFields > 0 || trace.pageProfile.counts.otpLikeFields > 0) && (
                              <div className="mt-1 text-[11px] text-muted-foreground">
                                {trace.pageProfile.counts.passwordFields} password • {trace.pageProfile.counts.otpLikeFields} OTP-like
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No profile</span>
                        )}
                      </td>
                      <td className="px-3 py-2 min-w-[240px]">
                        {trace.taskAssessments?.length ? (
                          <div className="space-y-1">
                            {trace.taskAssessments.slice(0, 3).map((task) => (
                              <div key={task.taskId} className="rounded border border-border bg-background px-2 py-1">
                                <div className="text-xs font-medium">{task.label}</div>
                                <div className={`text-[11px] font-medium ${getTaskAssessmentClass(task.result)}`}>
                                  {getAuditorResultLabel(task.result)}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : trace.pageProfile?.taskIntents?.length ? (
                          <div className="space-y-1">
                            {trace.pageProfile.taskIntents.slice(0, 3).map((task) => (
                              <div key={task.id} className="rounded border border-border bg-background px-2 py-1">
                                <div className="text-xs font-medium">{task.label}</div>
                                <div className="text-[11px] text-muted-foreground">{task.category}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No task intent</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getAnalysisAgentStatusClass(trace.status)}`}>
                          {trace.statusLabel || getAnalysisAgentStatusLabel(trace.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{trace.stepCount}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {trace.probeAttemptCount} attempted / {trace.probeSuccessCount} passed
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{trace.issueCount}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        <div>{trace.traceSummary}</div>
                        {trace.probeMessages?.length ? (
                          <div className="mt-1 space-y-1">
                            {trace.probeMessages.slice(0, 2).map((message, index) => (
                              <div key={`${trace.pageNumber}-probe-${index}`} className="text-[11px]">
                                {message}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {analysisAgentFindings.length > 0 ? (
            <div className="overflow-x-auto p-4 pt-0">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">{t('scans.analysisAgentColPage') || 'Page'}</th>
                    <th className="px-3 py-2 text-left font-medium">{t('scans.analysisAgentColKind') || 'Kind'}</th>
                    <th className="px-3 py-2 text-left font-medium">{t('scans.analysisAgentColSource') || 'Source'}</th>
                    <th className="px-3 py-2 text-left font-medium">{t('scans.analysisAgentColConfidence') || 'Confidence'}</th>
                    <th className="px-3 py-2 text-left font-medium">{t('scans.analysisAgentColMessage') || 'Message'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {analysisAgentFindings.map((f, idx) => (
                    <tr key={`${f.pageNumber}-${idx}-${f.kind}`} className="hover:bg-muted/40 align-top">
                      <td className="px-3 py-2 whitespace-nowrap">{f.pageNumber}</td>
                      <td className="px-3 py-2 max-w-[200px]">
                        <span className="break-all text-xs text-muted-foreground">{f.pageUrl}</span>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{f.kind}</td>
                      <td className="px-3 py-2 text-xs">
                        {f.source === 'openai'
                          ? t('scans.analysisAgentSourceOpenai') || 'AI enrichment'
                          : t('scans.analysisAgentSourceAgent') || 'Keyboard simulation'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {typeof f.confidence === 'number' && !Number.isNaN(f.confidence)
                          ? `${Math.round(f.confidence * 100)}%`
                          : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-foreground">{f.message || '—'}</div>
                        {f.howToVerify ? (
                          <div className="text-xs text-muted-foreground mt-1">{f.howToVerify}</div>
                        ) : null}
                        {f.suggestedWcagIds?.length ? (
                          <div className="text-xs text-muted-foreground mt-1">
                            WCAG: {f.suggestedWcagIds.join(', ')}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : scanDetail.analysisAgent?.executed ? (
            <div className="px-4 pb-4 pt-2 text-sm text-muted-foreground space-y-2 border-t border-border/60">
              <p>{t('scans.analysisAgentRanNoFindingsDashboard')}</p>
              {(scanDetail.analysisAgent.pagesWithArtifact ?? 0) > 0 && (
                <p>
                  {t('scans.analysisAgentPagesWithTrace', {
                    count: scanDetail.analysisAgent.pagesWithArtifact ?? 0,
                  })}
                </p>
              )}
            </div>
          ) : (
            <div className="px-4 pb-4 pt-2 text-sm text-muted-foreground border-t border-border/60">
              <p>{t('scans.analysisAgentNotIncludedDashboard')}</p>
            </div>
          )}
        </div>
      )}

      {isRaawiAgentReport && (
        <details className="bg-card border border-border rounded-lg overflow-hidden">
          <summary className="cursor-pointer px-5 py-4 text-lg font-semibold">
            Supporting technical evidence
          </summary>
          <div className="border-t border-border p-5 space-y-6">
            <p className="text-sm text-muted-foreground">
              DOM/WCAG, vision, and assistive-map results are retained here for evidence and remediation context. They are not the primary Raawi agent result.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
              <div className="rounded border border-border bg-background p-3">
                <div className="text-muted-foreground">DOM findings</div>
                <div className="text-xl font-semibold">{scanDetail.summary.totalFindings}</div>
              </div>
              <div className="rounded border border-border bg-background p-3">
                <div className="text-muted-foreground">WCAG A</div>
                <div className="text-xl font-semibold">
                  {scanDetail.summary.scores.scoreA != null ? `${scanDetail.summary.scores.scoreA.toFixed(1)}%` : 'N/A'}
                </div>
              </div>
              <div className="rounded border border-border bg-background p-3">
                <div className="text-muted-foreground">WCAG AA</div>
                <div className="text-xl font-semibold">
                  {scanDetail.summary.scores.scoreAA != null ? `${scanDetail.summary.scores.scoreAA.toFixed(1)}%` : 'N/A'}
                </div>
              </div>
              <div className="rounded border border-border bg-background p-3">
                <div className="text-muted-foreground">Vision findings</div>
                <div className="text-xl font-semibold">{allLayer2Findings.length}</div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                WCAG findings ({allLayer1Findings.length})
              </h3>
              {allLayer1Findings.length > 0 ? (
                <div className="overflow-x-auto max-h-80 rounded border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Page</th>
                        <th className="px-4 py-2 text-left font-medium">WCAG ID</th>
                        <th className="px-4 py-2 text-left font-medium">Status</th>
                        <th className="px-4 py-2 text-left font-medium">Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {allLayer1Findings.map((finding) => (
                        <tr key={finding.key} className="hover:bg-muted/40 align-top">
                          <td className="px-4 py-2 whitespace-nowrap">{finding.pageNumber}</td>
                          <td className="px-4 py-2 font-medium">{finding.wcagId}</td>
                          <td className="px-4 py-2 whitespace-nowrap">{finding.status}</td>
                          <td className="px-4 py-2 text-muted-foreground break-words">{finding.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No WCAG findings recorded for this scan.</p>
              )}
            </div>
          </div>
        </details>
      )}

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
              {isRaawiAgentReport && (
                <th className="px-6 py-3 text-left text-sm font-medium">
                  <Bot className="w-4 h-4 inline mr-2" />
                  Raawi Agent
                </th>
              )}
              <th className="px-6 py-3 text-left text-sm font-medium">
                <Layers className="w-4 h-4 inline mr-2" />
                Layer 1 (WCAG)
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium">
                <Eye className="w-4 h-4 inline mr-2" />
                Layer 2 (Vision)
              </th>
              {!isRaawiAgentReport && (
                <th className="px-6 py-3 text-left text-sm font-medium">
                  <Bot className="w-4 h-4 inline mr-2" />
                  Interaction Trace
                </th>
              )}
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
                {isRaawiAgentReport && renderAgentCell(page)}
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
                {!isRaawiAgentReport && renderAgentCell(page)}
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
            {isRaawiAgentReport && (
              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  Raawi agent page result
                </h3>
                {selectedPageData.layerAgent?.trace ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getAnalysisAgentStatusClass(selectedPageData.layerAgent.trace.status)}`}>
                        {selectedPageData.layerAgent.trace.statusLabel || getAnalysisAgentStatusLabel(selectedPageData.layerAgent.trace.status)}
                      </span>
                      <span className="text-sm text-muted-foreground">{selectedPageData.layerAgent.trace.traceSummary}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                      <div className="rounded border border-border bg-background p-2">
                        <div className="text-xs text-muted-foreground">Steps</div>
                        <div className="font-semibold">{selectedPageData.layerAgent.trace.stepCount}</div>
                      </div>
                      <div className="rounded border border-border bg-background p-2">
                        <div className="text-xs text-muted-foreground">Probes attempted</div>
                        <div className="font-semibold">{selectedPageData.layerAgent.trace.probeAttemptCount}</div>
                      </div>
                      <div className="rounded border border-border bg-background p-2">
                        <div className="text-xs text-muted-foreground">Probes passed</div>
                        <div className="font-semibold">{selectedPageData.layerAgent.trace.probeSuccessCount}</div>
                      </div>
                      <div className="rounded border border-border bg-background p-2">
                        <div className="text-xs text-muted-foreground">Raawi issues</div>
                        <div className="font-semibold">{selectedPageData.layerAgent.trace.issueCount}</div>
                      </div>
                    </div>
                    {(selectedPageData.layerAgent?.findings ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">Raawi did not record interaction findings for this page.</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {(selectedPageData.layerAgent?.findings ?? []).length} Raawi finding(s) recorded below in the interaction findings section.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No Raawi interaction trace was recorded for this page.</p>
                )}
              </div>
            )}
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {isRaawiAgentReport ? 'Supporting Layer 1: WCAG Findings' : 'Layer 1: WCAG Findings'} ({selectedPageData.layer1.count})
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
                {isRaawiAgentReport ? 'Supporting Layer 2: Vision Findings' : 'Layer 2: Vision Findings'} ({selectedPageData.layer2.count})
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
                {isRaawiAgentReport ? 'Raawi interaction findings' : 'Interaction Trace Findings'} ({(selectedPageData.layerAgent?.findings?.length ?? 0)})
              </h3>
              <div className="space-y-3">
                {selectedPageData.layerAgent?.trace ? (
                  <div className="rounded border border-border bg-muted/30 p-3">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getAnalysisAgentStatusClass(selectedPageData.layerAgent.trace.status)}`}>
                        {selectedPageData.layerAgent.trace.statusLabel || getAnalysisAgentStatusLabel(selectedPageData.layerAgent.trace.status)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {selectedPageData.layerAgent.trace.traceSummary}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                      <div className="rounded border border-border bg-background p-2">
                        <div className="text-xs text-muted-foreground">Steps</div>
                        <div className="font-semibold">{selectedPageData.layerAgent.trace.stepCount}</div>
                      </div>
                      <div className="rounded border border-border bg-background p-2">
                        <div className="text-xs text-muted-foreground">Probes attempted</div>
                        <div className="font-semibold">{selectedPageData.layerAgent.trace.probeAttemptCount}</div>
                      </div>
                      <div className="rounded border border-border bg-background p-2">
                        <div className="text-xs text-muted-foreground">Probes passed</div>
                        <div className="font-semibold">{selectedPageData.layerAgent.trace.probeSuccessCount}</div>
                      </div>
                      <div className="rounded border border-border bg-background p-2">
                        <div className="text-xs text-muted-foreground">Issues</div>
                        <div className="font-semibold">{selectedPageData.layerAgent.trace.issueCount}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No agent trace recorded for this page.</p>
                )}

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
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Map className="w-4 h-4" />
                {isRaawiAgentReport ? 'Supporting Layer 3: Assistive Map' : 'Layer 3: Assistive Map'}
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
