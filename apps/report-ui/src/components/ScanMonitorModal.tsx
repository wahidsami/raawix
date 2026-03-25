import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { apiClient } from '../lib/api';

interface ScanEvent {
  type: string;
  scanId: string;
  url?: string;
  pageNumber?: number;
  layer?: 'L1' | 'L2' | 'L3';
  status?: 'pending' | 'running' | 'done' | 'failed';
  timestamp: string;
  [key: string]: any;
}

interface TreeNode {
  url: string;
  title?: string;
  children: TreeNode[];
  status: 'not_scanned' | 'in_progress' | 'scanned' | 'failed';
  layers: {
    L1: 'pending' | 'running' | 'done' | 'failed';
    L2: 'pending' | 'running' | 'done' | 'failed';
    L3: 'pending' | 'running' | 'done' | 'failed';
  };
  pageNumber?: number;
  counts?: {
    findingsCount?: number;
    visionCount?: number;
    assistive?: {
      images?: number;
      labels?: number;
      actions?: number;
    };
  };
  parentUrl?: string; // Track parent for delayed linking
  discoverySource?: 'seed' | 'crawl' | 'sitemap' | 'post_login_seed';
  depth?: number; // Track depth for hierarchy
  selected?: boolean; // For selection phase
}

interface ScanMonitorModalProps {
  scanId: string;
  seedUrl: string;
  scanMode?: 'domain' | 'single';
  maxPages?: number;
  maxDepth?: number;
  entityId?: string;
  propertyId?: string;
  onClose: () => void;
  onComplete?: () => void;
}

export default function ScanMonitorModal({ scanId, seedUrl, scanMode = 'domain', maxPages, maxDepth, entityId, propertyId, onClose, onComplete }: ScanMonitorModalProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  // Phase management: 'discovery' | 'selection' | 'scanning'
  const [phase, setPhase] = useState<'discovery' | 'selection' | 'scanning'>('discovery');
  const [isScanning, setIsScanning] = useState(false); // Changed default to false
  const [tree, setTree] = useState<Map<string, TreeNode>>(() => new globalThis.Map<string, TreeNode>());

  // Use refs to ensure event handlers always have latest state values (fix stale closures)
  const phaseRef = useRef(phase);
  const isScanningRef = useRef(isScanning);

  // Keep refs in sync with state
  useEffect(() => {
    phaseRef.current = phase;
    isScanningRef.current = isScanning;
    console.log('[STATE-SYNC] Updated refs:', { phase, isScanning });
  }, [phase, isScanning]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState<string | null>(null);
  const [, setCurrentStep] = useState<string>('');
  const [currentActivity, setCurrentActivity] = useState<string>(''); // New: user-friendly activity description
  const [stats, setStats] = useState({
    pagesDiscovered: 0,
    pagesScanned: 0,
    fails: 0,
    needsReview: 0,
  });
  // Collect all scanned pages during scanning (for tree building after completion)
  const [scannedPages, setScannedPages] = useState<Map<string, { url: string; status: 'scanned' | 'failed'; pageNumber?: number; counts?: any; layers: { L1: string; L2: string; L3: string } }>>(() => new globalThis.Map());
  const [scanCompleted, setScanCompleted] = useState(false);
  const [recentEvents, setRecentEvents] = useState<ScanEvent[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'closed'>('connecting');
  const [debugLogs, setDebugLogs] = useState<Array<{ time: string; type: string; message: string }>>([]);
  const [showDebug, setShowDebug] = useState(false);
  /** True after POST /init succeeds — required because GET .../events returns 404 until a Scan row exists. */
  const [scanRecordReady, setScanRecordReady] = useState(false);

  const addDebugLog = (type: string, message: string) => {
    const time = new Date().toLocaleTimeString();
    setDebugLogs((prev) => [{ time, type, message }, ...prev].slice(0, 50)); // Keep last 50 logs
  };

  // Create DB row before discovery + SSE (SSE handler requires scan to exist)
  useEffect(() => {
    setScanRecordReady(false);
    let cancelled = false;

    const runInit = async () => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('raawix_token');
      if (!token) {
        addDebugLog('error', 'No auth token found');
        setConnectionStatus('error');
        return;
      }

      addDebugLog('info', 'Creating scan record for discovery (init)...');
      try {
        const initResponse = await fetch(`${apiUrl}/api/scans/${scanId}/init`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            seedUrl,
            maxPages: maxPages || 50,
            maxDepth: maxDepth || 3,
            entityId,
            propertyId,
          }),
        });
        if (cancelled) return;
        if (!initResponse.ok) {
          const errText = await initResponse.text().catch(() => '');
          addDebugLog('error', `Init failed: ${initResponse.status} ${errText}`);
          setConnectionStatus('error');
          return;
        }
        addDebugLog('success', 'Scan record ready; discovery and SSE can proceed');
        setScanRecordReady(true);
      } catch (e) {
        if (cancelled) return;
        addDebugLog('error', `Init request failed: ${e instanceof Error ? e.message : 'Unknown'}`);
        setConnectionStatus('error');
      }
    };

    runInit();
    return () => {
      cancelled = true;
    };
  }, [scanId, seedUrl, maxPages, maxDepth, entityId, propertyId]);

  // Auto-start discovery when modal opens (after DB row exists)
  useEffect(() => {
    if (phase === 'discovery' && scanRecordReady) {
      const startDiscovery = async () => {
        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
          const token = localStorage.getItem('raawix_token');

          if (!token) {
            addDebugLog('error', 'No auth token found');
            return;
          }

          addDebugLog('info', 'Starting discovery phase...');
          setIsScanning(true);

          const response = await fetch(`${apiUrl}/api/scans/${scanId}/discover`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              seedUrl,
              maxPages: maxPages || 50,
              maxDepth: maxDepth || 3,
              scanMode, // Pass scan mode to backend
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to start discovery: ${response.statusText}`);
          }

          addDebugLog('success', 'Discovery started successfully');
        } catch (error) {
          addDebugLog('error', `Failed to start discovery: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setIsScanning(false);
        }
      };

      startDiscovery();
    }
  }, [phase, scanId, seedUrl, scanRecordReady, maxPages, maxDepth, scanMode]);

  useEffect(() => {
    // Connect to SSE endpoint
    // Note: EventSource doesn't support custom headers, so we pass token via query param
    if (!scanRecordReady) {
      return;
    }

    const token = localStorage.getItem('raawix_token');
    if (!token) {
      addDebugLog('error', 'No auth token found in localStorage');
      setConnectionStatus('error');
      return;
    }

    // Don't reconnect if we're already connected
    if (eventSourceRef.current && eventSourceRef.current.readyState === EventSource.OPEN) {
      addDebugLog('info', 'SSE connection already open, skipping reconnect');
      return;
    }

    addDebugLog('info', `Connecting to SSE endpoint for scan ${scanId}`);
    setConnectionStatus('connecting');

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const eventUrl = `${apiUrl}/api/scans/${scanId}/events?token=${encodeURIComponent(token)}`;
    addDebugLog('info', `SSE URL: ${eventUrl.replace(/token=[^&]+/, 'token=***')}`);

    const eventSource = new EventSource(eventUrl, {
      withCredentials: true,
    });

    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      addDebugLog('success', 'SSE connection opened successfully');
      setConnectionStatus('connected');
    };

    eventSource.onmessage = (event) => {
      try {
        // Skip heartbeat messages
        if (event.data.trim() === ': heartbeat' || event.data.startsWith(':')) {
          return;
        }

        const data = JSON.parse(event.data);
        addDebugLog('event', `Received event: ${data.type}${data.url ? ` (${new URL(data.url).pathname})` : ''}`);
        handleEvent(data);
      } catch (error) {
        addDebugLog('error', `Failed to parse SSE event: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error('Failed to parse SSE event:', error);
      }
    };

    eventSource.onerror = () => {
      const state = eventSource.readyState;
      if (state === EventSource.CONNECTING) {
        addDebugLog('warning', 'SSE connection in progress...');
        setConnectionStatus('connecting');
      } else if (state === EventSource.OPEN) {
        addDebugLog('warning', 'SSE connection error (but still open)');
      } else {
        addDebugLog('error', `SSE connection closed/error. ReadyState: ${state}`);
        setConnectionStatus('error');

        // Don't auto-reconnect - let user manually retry or wait for scan to complete
        // Auto-reconnect was causing the connection to close immediately
      }
    };

    return () => {
      // Only close if we're actually cleaning up (component unmount or scanId change)
      if (eventSourceRef.current === eventSource) {
        addDebugLog('info', 'Closing SSE connection (cleanup)');
        setConnectionStatus('closed');
        eventSource.close();
        eventSourceRef.current = null;
      }
    };
  }, [scanId, scanRecordReady]);

  const handleEvent = (event: ScanEvent) => {
    // Skip heartbeat and connection messages
    if (event.type === 'connected' || event.type === 'heartbeat') {
      return;
    }

    // Add to recent events (keep last 10)
    setRecentEvents((prev) => {
      const newEvents = [event, ...prev].slice(0, 10);
      return newEvents;
    });

    switch (event.type) {
      case 'crawl_discovered':
        handleCrawlDiscovered(event);
        break;
      case 'page_started':
        handlePageStarted(event);
        break;
      case 'layer_status':
        handleLayerStatus(event);
        break;
      case 'page_done':
        handlePageDone(event);
        break;
      case 'scan_done':
        handleScanDone(event);
        break;
      case 'error':
        handleError(event);
        break;
      default:
        addDebugLog('info', `Unknown event type: ${event.type}`);
    }
  };

  const handleCrawlDiscovered = (event: ScanEvent) => {
    const url = event.url!;
    const parentUrl = event.parentUrl;
    const depth = event.depth ?? 0;
    const discoverySource = (event as any).metadata?.source || (event as any).source || 'crawl';

    addDebugLog('info', `Crawl discovered: ${new URL(url).pathname} (depth: ${depth}, parent: ${parentUrl ? new URL(parentUrl).pathname : 'none'})`);

    setTree((prev) => {
      const newTree = new globalThis.Map(prev);

      // Create or update node
      let node: TreeNode;
      if (newTree.has(url)) {
        node = newTree.get(url)!;
        // Update existing node with new info
        if (!node.parentUrl && parentUrl) {
          node.parentUrl = parentUrl;
        }
        if (node.depth === undefined) {
          node.depth = depth;
        }
        if (!node.discoverySource) {
          node.discoverySource = discoverySource;
        }
      } else {
        node = {
          url,
          children: [],
          status: 'not_scanned',
          layers: {
            L1: 'pending',
            L2: 'pending',
            L3: 'pending',
          },
          parentUrl,
          depth,
          discoverySource,
        };
        newTree.set(url, node);
        addDebugLog('success', `Added new page to tree: ${new URL(url).pathname} (depth: ${depth}, source: ${discoverySource})`);
      }

      // Link to parent if parent exists
      if (parentUrl) {
        if (newTree.has(parentUrl)) {
          const parent = newTree.get(parentUrl)!;
          // Check if child is already in parent's children
          if (!parent.children.find((c) => c.url === url)) {
            parent.children.push(node);
            addDebugLog('info', `Linked ${new URL(url).pathname} to parent ${new URL(parentUrl).pathname}`);
          }
        } else {
          // Parent doesn't exist yet - will be linked later when parent is discovered
          addDebugLog('warning', `Parent ${new URL(parentUrl).pathname} not found yet, will link when discovered`);
        }
      }

      // Check for any orphaned children that should be linked to this node
      for (const [childUrl, childNode] of newTree.entries()) {
        if (childNode.parentUrl === url && !node.children.find((c) => c.url === childUrl)) {
          node.children.push(childNode);
          addDebugLog('info', `Linked orphaned child ${new URL(childUrl).pathname} to parent ${new URL(url).pathname}`);
        }
      }

      setStats((prev) => ({
        ...prev,
        pagesDiscovered: newTree.size,
      }));

      return newTree;
    });
  };

  const handlePageStarted = (event: ScanEvent) => {
    const url = event.url!;
    // Use refs to get latest state values (avoids stale closures)
    const currentPhase = phaseRef.current;
    const currentIsScanning = isScanningRef.current;
    console.log('[SCAN] page_started event received', { url: new URL(url).pathname, pageNumber: event.pageNumber, phase: currentPhase, isScanning: currentIsScanning });
    setCurrentPage(url);
    setCurrentStep(`Scanning page ${event.pageNumber}...`);
    setCurrentActivity(t('scanMonitor.activity.loading') || '🌐 Loading page...');
    addDebugLog('info', `Page started scanning: ${new URL(url).pathname} (page #${event.pageNumber})`);

    // During scanning phase, collect pages but don't build tree yet (build after completion)
    // Use isScanning flag as well to catch events even if phase is out of sync
    if (currentPhase === 'scanning' || currentIsScanning) {
      setScannedPages((prev) => {
        const newMap = new globalThis.Map(prev);
        if (!newMap.has(url)) {
          newMap.set(url, {
            url,
            status: 'in_progress' as any, // Will be updated to 'scanned' or 'failed' in handlePageDone
            pageNumber: event.pageNumber,
            layers: { L1: 'pending', L2: 'pending', L3: 'pending' },
          });
        }
        console.log('[SCAN] Updated scannedPages Map (page_started), size:', newMap.size, { phase: currentPhase, isScanning: currentIsScanning });
        return newMap;
      });
    } else {
      console.warn('[SCAN] page_started event ignored - not scanning', { phase: currentPhase, isScanning: currentIsScanning });
    }

    setTree((prev) => {
      const newTree = new globalThis.Map(prev);

      // ALWAYS ensure page exists in tree (even if crawl_discovered wasn't received)
      let node: TreeNode;
      if (!newTree.has(url)) {
        // Create node - try to infer parent from URL structure
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        const parentPath = pathParts.length > 1
          ? `${urlObj.origin}/${pathParts.slice(0, -1).join('/')}`
          : urlObj.origin + '/';

        node = {
          url,
          children: [],
          status: 'in_progress',
          layers: {
            L1: 'pending',
            L2: 'pending',
            L3: 'pending',
          },
          pageNumber: event.pageNumber,
          depth: pathParts.length, // Infer depth from path
          parentUrl: parentPath !== url ? parentPath : undefined,
        };
        newTree.set(url, node);
        addDebugLog('warning', `Created tree node for page_started (crawl_discovered missed): ${new URL(url).pathname}`);

        // Try to link to parent if parent exists
        if (node.parentUrl && newTree.has(node.parentUrl)) {
          const parent = newTree.get(node.parentUrl)!;
          if (!parent.children.find((c) => c.url === url)) {
            parent.children.push(node);
            addDebugLog('info', `Linked ${new URL(url).pathname} to inferred parent ${new URL(node.parentUrl).pathname}`);
          }
        }

        // Update stats
        setStats((prev) => ({
          ...prev,
          pagesDiscovered: newTree.size,
        }));
      } else {
        node = newTree.get(url)!;
        node.status = 'in_progress';
        node.pageNumber = event.pageNumber;
        newTree.set(url, node);
        addDebugLog('info', `Updated tree node status to in_progress: ${new URL(url).pathname}`);
      }

      return newTree;
    });
  };

  const handleLayerStatus = (event: ScanEvent) => {
    const url = event.url!;
    const layer = event.layer!;
    const status = event.status!;

    // Update current activity with user-friendly message
    if (status === 'running') {
      const activityMessages = {
        L1: t('scanMonitor.activity.scanningDOM') || '📄 Scanning page structure (HTML/DOM)...',
        L2: t('scanMonitor.activity.analyzingScreenshot') || '📸 Analyzing screenshot (Vision AI)...',
        L3: t('scanMonitor.activity.buildingAssistiveMap') || '🗺️ Building assistive technology map...',
      };
      setCurrentActivity(activityMessages[layer] || `Processing ${layer}...`);
    }

    addDebugLog('info', `Layer status: ${layer} = ${status} for ${new URL(url).pathname}`);

    setTree((prev) => {
      const newTree = new globalThis.Map(prev);

      // ALWAYS ensure page exists in tree (even if page_started wasn't received)
      if (!newTree.has(url)) {
        addDebugLog('warning', `Layer status event for unknown page: ${new URL(url).pathname}, creating node`);
        // Create node with inferred structure
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        const parentPath = pathParts.length > 1
          ? `${urlObj.origin}/${pathParts.slice(0, -1).join('/')}`
          : urlObj.origin + '/';

        const node: TreeNode = {
          url,
          children: [],
          status: status === 'running' ? 'in_progress' : 'not_scanned',
          layers: {
            L1: layer === 'L1' ? status : 'pending',
            L2: layer === 'L2' ? status : 'pending',
            L3: layer === 'L3' ? status : 'pending',
          },
          pageNumber: event.pageNumber,
          depth: pathParts.length,
          parentUrl: parentPath !== url ? parentPath : undefined,
        };
        newTree.set(url, node);

        // Try to link to parent
        if (node.parentUrl && newTree.has(node.parentUrl)) {
          const parent = newTree.get(node.parentUrl)!;
          if (!parent.children.find((c) => c.url === url)) {
            parent.children.push(node);
          }
        }

        // Update stats
        setStats((prev) => ({
          ...prev,
          pagesDiscovered: newTree.size,
        }));
      }

      if (newTree.has(url)) {
        const node = newTree.get(url)!;
        node.layers[layer] = status;

        // Update current step when layer starts running
        if (status === 'running') {
          const stepMap: Record<string, string> = {
            L1: t('scanMonitor.layer1'),
            L2: t('scanMonitor.layer2'),
            L3: t('scanMonitor.layer3'),
          };
          setCurrentStep(stepMap[layer] || '');
          setCurrentPage(url); // Highlight current page

          // Update page status to in_progress if it was not_scanned
          if (node.status === 'not_scanned') {
            node.status = 'in_progress';
          }
        }

        // If any layer is running, page should be in_progress
        if (status === 'running') {
          node.status = 'in_progress';
        }

        // If layer failed, mark page as failed
        if (status === 'failed') {
          node.status = 'failed';
        }
        // Check if all layers are done - mark page as scanned immediately
        else if (status === 'done') {
          // Check if L1 and L2 are done (L3 can be pending if no assistive map was generated)
          const l1Done = node.layers.L1 === 'done' || node.layers.L1 === 'failed';
          const l2Done = node.layers.L2 === 'done' || node.layers.L2 === 'failed';
          const l3Done = node.layers.L3 === 'done' || node.layers.L3 === 'failed' || node.layers.L3 === 'pending';

          // If all required layers are done, mark page as scanned
          if (l1Done && l2Done && l3Done && node.status !== 'scanned') {
            node.status = 'scanned';
            addDebugLog('success', `Page marked as scanned: ${new URL(url).pathname} (all layers done)`);
            // Update stats
            setStats((prev) => ({
              ...prev,
              pagesScanned: Array.from(newTree.values()).filter((n) => n.status === 'scanned').length,
            }));
          }
        }

        newTree.set(url, node);
      } else {
        // Node doesn't exist - create it
        addDebugLog('warning', `Layer status event for unknown page: ${new URL(url).pathname}, creating node`);
        const node: TreeNode = {
          url,
          children: [],
          status: status === 'running' ? 'in_progress' : 'not_scanned',
          layers: {
            L1: layer === 'L1' ? status : 'pending',
            L2: layer === 'L2' ? status : 'pending',
            L3: layer === 'L3' ? status : 'pending',
          },
          pageNumber: event.pageNumber,
        };
        newTree.set(url, node);
      }
      return newTree;
    });
  };

  const handlePageDone = (event: ScanEvent) => {
    const url = event.url!;
    // Use refs to get latest state values (avoids stale closures)
    const currentPhase = phaseRef.current;
    const currentIsScanning = isScanningRef.current;
    console.log('[SCAN] page_done event received', { url: new URL(url).pathname, pageNumber: event.pageNumber, phase: currentPhase, isScanning: currentIsScanning, findings: event.summary?.findingsCount });
    addDebugLog('success', `Page done: ${new URL(url).pathname} - ${event.summary?.findingsCount || 0} findings, ${event.summary?.visionCount || 0} vision`);

    // Collect scanned page data
    // Use isScanning flag as well to catch events even if phase is out of sync
    if (currentPhase === 'scanning' || currentIsScanning) {
      setScannedPages((prev) => {
        const newMap = new globalThis.Map(prev);
        const layers = {
          L1: 'done' as const,
          L2: 'done' as const,
          L3: (event.summary?.assistive && (event.summary.assistive.images > 0 || event.summary.assistive.labels > 0 || event.summary.assistive.actions > 0)) ? 'done' as const : 'pending' as const,
        };
        newMap.set(url, {
          url,
          status: 'scanned',
          pageNumber: event.pageNumber,
          counts: event.summary,
          layers,
        });
        console.log('[SCAN] Updated scannedPages Map, size:', newMap.size);
        return newMap;
      });
    } else {
      console.warn('[SCAN] page_done event ignored - not scanning', { phase: currentPhase, isScanning: currentIsScanning });
    }

    // Update tree for real-time feedback
    setTree((prev) => {
      const newTree = new globalThis.Map(prev);
      if (newTree.has(url)) {
        const node = newTree.get(url)!;
        // FORCE status to scanned when page_done event is received
        node.status = 'scanned';
        node.counts = event.summary;
        // Ensure all layers are marked as done (unless they failed)
        if (node.layers.L1 !== 'failed') node.layers.L1 = 'done';
        if (node.layers.L2 !== 'failed') node.layers.L2 = 'done';
        // L3 is done if assistive map was generated, otherwise it stays pending (which is OK)
        if (event.summary?.assistive && (event.summary.assistive.images > 0 || event.summary.assistive.labels > 0 || event.summary.assistive.actions > 0)) {
          node.layers.L3 = 'done';
        } else {
          // L3 can be pending if no assistive map was generated - that's OK
          if (node.layers.L3 !== 'failed') {
            node.layers.L3 = 'pending';
          }
        }
        newTree.set(url, node);
        addDebugLog('info', `Updated page status to scanned: ${new URL(url).pathname}`);
      } else {
        // Create node if it doesn't exist
        addDebugLog('warning', `Page_done event for unknown page: ${new URL(url).pathname}, creating node`);
        newTree.set(url, {
          url,
          children: [],
          status: 'scanned',
          layers: {
            L1: 'done',
            L2: 'done',
            L3: event.summary?.assistive ? 'done' : 'pending',
          },
          pageNumber: event.pageNumber,
          counts: event.summary,
        });
      }

      // Update stats immediately
      const scannedCount = Array.from(newTree.values()).filter((n) => n.status === 'scanned').length;
      console.log('[SCAN] Updating pagesScanned stat:', scannedCount);
      setStats((prev) => ({
        ...prev,
        pagesScanned: scannedCount,
      }));

      return newTree;
    });

    // Clear current page and activity if this was the one being scanned
    setCurrentPage((current) => (current === url ? null : current));
    setCurrentActivity('');
  };

  const handleScanDone = (event: ScanEvent) => {
    // Use refs to get latest state values (avoids stale closures)
    const currentPhase = phaseRef.current;
    const currentIsScanning = isScanningRef.current;
    console.log('[SCAN] scan_done event received', {
      phase: currentPhase,
      isScanning: currentIsScanning,
      totals: event.totals,
      scannedPagesSize: scannedPages.size,
      hasDiscoveredUrls: !!(event as any).discoveredUrls
    });
    addDebugLog('info', `Scan completed: ${event.totals?.pages || 0} pages, ${event.totals?.fails || 0} failures`);

    // Check if this is a discovery scan_done (has discoveredUrls array) or actual scan completion
    const isDiscoveryDone = !!(event as any).discoveredUrls;

    // If in discovery phase, transition to selection phase
    if (currentPhase === 'discovery' || isDiscoveryDone) {
      console.log('[SCAN] Transitioning from discovery to selection phase');
      setPhase('selection');
      setIsScanning(false);
      setCurrentStep('');

      // Get all discovered URLs from event (if provided) to ensure we have all pages
      const discoveredUrls = (event as any).discoveredUrls || [];

      console.log('[DISCOVERY] scan_done event received:', {
        totals: event.totals,
        discoveredUrlsCount: discoveredUrls.length,
        discoveredUrls: discoveredUrls,
        hasDiscoveredUrls: !!(event as any).discoveredUrls,
      });

      addDebugLog('info', `Discovery complete event received: ${discoveredUrls.length} URLs in event, ${event.totals?.pages || 0} total pages expected`);

      if (discoveredUrls.length === 0 && event.totals?.pages && event.totals.pages > 0) {
        addDebugLog('error', `WARNING: discoveredUrls array is empty but ${event.totals.pages} pages were expected!`);
        console.error('[DISCOVERY] discoveredUrls array is missing from scan_done event!', event);
      }

      // Mark all discovered pages as selected by default
      setTree((prev) => {
        const newTree = new globalThis.Map(prev);
        const newSelected = new Set<string>();
        let addedCount = 0;
        const missingUrls: string[] = [];

        // Normalize URLs for comparison (remove trailing slashes, ensure consistent format)
        const normalizeUrlForComparison = (url: string): string => {
          try {
            const urlObj = new URL(url);
            // Remove trailing slash except for root
            let pathname = urlObj.pathname;
            if (pathname !== '/' && pathname.endsWith('/')) {
              pathname = pathname.slice(0, -1);
            }
            return `${urlObj.origin}${pathname}${urlObj.search}${urlObj.hash}`;
          } catch {
            return url;
          }
        };

        // Create a normalized map of tree URLs for comparison
        const normalizedTreeUrls = new Map<string, string>();
        for (const [url] of newTree.entries()) {
          const normalized = normalizeUrlForComparison(url);
          normalizedTreeUrls.set(normalized, url);
        }

        // If we have the full list of discovered URLs, ensure all are in the tree
        if (discoveredUrls.length > 0) {
          console.log(`[DISCOVERY] Processing ${discoveredUrls.length} discovered URLs, tree currently has ${newTree.size} pages`);

          for (const url of discoveredUrls) {
            const normalizedUrl = normalizeUrlForComparison(url);

            // Check if URL exists in tree (by exact match or normalized match)
            let treeUrl = url;
            let urlExists = newTree.has(url);

            if (!urlExists) {
              // Try to find by normalized URL
              if (normalizedTreeUrls.has(normalizedUrl)) {
                treeUrl = normalizedTreeUrls.get(normalizedUrl)!;
                urlExists = true;
                console.log(`[DISCOVERY] Found URL by normalization: ${new URL(url).pathname} -> ${new URL(treeUrl).pathname}`);
                addDebugLog('info', `Found URL by normalization: ${new URL(url).pathname} -> ${new URL(treeUrl).pathname}`);
              }
            }

            if (!urlExists) {
              // URL is missing - add it
              const urlObj = new URL(url);
              const pathParts = urlObj.pathname.split('/').filter(p => p);
              const parentPath = pathParts.length > 1
                ? `${urlObj.origin}/${pathParts.slice(0, -1).join('/')}`
                : urlObj.origin + '/';

              const node: TreeNode = {
                url,
                children: [],
                status: 'not_scanned',
                layers: {
                  L1: 'pending',
                  L2: 'pending',
                  L3: 'pending',
                },
                parentUrl: parentPath !== url ? parentPath : undefined,
                depth: pathParts.length,
                discoverySource: 'crawl',
                selected: true,
              };
              newTree.set(url, node);
              normalizedTreeUrls.set(normalizedUrl, url);
              addedCount++;
              missingUrls.push(new URL(url).pathname);
              console.log(`[DISCOVERY] Added missing page: ${new URL(url).pathname}`);
              addDebugLog('warning', `Added missing discovered page to tree: ${new URL(url).pathname}`);
            }

            // Mark as selected
            const node = newTree.get(treeUrl)!;
            node.selected = true;
            newSelected.add(treeUrl);
            newTree.set(treeUrl, node);
          }

          console.log(`[DISCOVERY] After processing: ${newTree.size} pages in tree, added ${addedCount} missing pages`);

          if (addedCount > 0) {
            addDebugLog('success', `Added ${addedCount} missing pages to tree: ${missingUrls.slice(0, 5).join(', ')}${missingUrls.length > 5 ? '...' : ''}`);
          }
        } else {
          // Fallback: mark all existing pages as selected
          addDebugLog('warning', 'No discoveredUrls in event, using existing tree pages only');
          for (const [url, node] of newTree.entries()) {
            node.selected = true;
            newSelected.add(url);
            newTree.set(url, node);
          }
        }

        setSelectedUrls(newSelected);

        // Verify page count matches expected total
        const expectedCount = event.totals?.pages || 0;
        const actualCount = newTree.size;

        // Find which URLs are missing
        if (discoveredUrls.length > 0 && actualCount !== discoveredUrls.length) {
          const treeUrlsSet = new Set(Array.from(newTree.keys()).map(u => normalizeUrlForComparison(u)));
          const missingUrls: string[] = [];

          for (const url of discoveredUrls) {
            const normalized = normalizeUrlForComparison(url);
            if (!treeUrlsSet.has(normalized)) {
              missingUrls.push(url);
            }
          }

          console.error(`[DISCOVERY] Count mismatch: Expected ${discoveredUrls.length}, got ${actualCount} in tree. Missing ${discoveredUrls.length - actualCount} pages.`);
          console.error(`[DISCOVERY] Missing URLs:`, missingUrls.map((u: string) => new URL(u).pathname));
          console.error(`[DISCOVERY] Tree URLs (${actualCount}):`, Array.from(newTree.keys()).map(u => new URL(u).pathname).sort());
          console.error(`[DISCOVERY] Event URLs (${discoveredUrls.length}):`, discoveredUrls.map((u: string) => new URL(u).pathname).sort());

          addDebugLog('error', `Discovery count mismatch: Expected ${discoveredUrls.length} pages, but tree has ${actualCount} pages. Missing ${discoveredUrls.length - actualCount} pages.`);

          // Try to add missing URLs one more time with more aggressive matching
          if (missingUrls.length > 0) {
            console.log(`[DISCOVERY] Attempting to add ${missingUrls.length} missing URLs...`);
            for (const url of missingUrls) {
              const urlObj = new URL(url);
              const pathParts = urlObj.pathname.split('/').filter(p => p);
              const parentPath = pathParts.length > 1
                ? `${urlObj.origin}/${pathParts.slice(0, -1).join('/')}`
                : urlObj.origin + '/';

              const node: TreeNode = {
                url,
                children: [],
                status: 'not_scanned',
                layers: {
                  L1: 'pending',
                  L2: 'pending',
                  L3: 'pending',
                },
                parentUrl: parentPath !== url ? parentPath : undefined,
                depth: pathParts.length,
                discoverySource: 'crawl',
                selected: true,
              };
              newTree.set(url, node);
              newSelected.add(url);
              console.log(`[DISCOVERY] Force-added missing URL: ${new URL(url).pathname}`);
            }

            // Update counts after force-adding
            const finalCount = newTree.size;
            console.log(`[DISCOVERY] After force-adding: ${finalCount} pages in tree`);
            if (finalCount === discoveredUrls.length) {
              addDebugLog('success', `All ${discoveredUrls.length} pages now in tree after force-adding missing URLs.`);
            } else {
              addDebugLog('error', `Still missing ${discoveredUrls.length - finalCount} pages after force-adding.`);
            }
          }
        } else if (expectedCount > 0 && actualCount === expectedCount) {
          addDebugLog('success', `All ${expectedCount} discovered pages are in the tree.`);
        }

        return newTree;
      });

      // Update stats with the expected count from event
      setStats((prev) => ({
        ...prev,
        pagesDiscovered: event.totals?.pages || prev.pagesDiscovered,
      }));

      addDebugLog('success', `Discovery complete. ${event.totals?.pages || tree.size} pages found. Please select pages to scan.`);
      return;
    }

    // If in scanning phase OR if this is actual scan completion (not discovery)
    // Check multiple conditions to ensure we catch scan completion
    if (currentPhase === 'scanning' || (currentIsScanning && !isDiscoveryDone)) {
      console.log('[SCAN] Scan completed during scanning phase, marking as complete', {
        phase: currentPhase,
        isScanning: currentIsScanning,
        isDiscoveryDone,
        totals: event.totals
      });
      setIsScanning(false);
      setCurrentPage(null);
      setCurrentActivity(''); // Clear activity
      setCurrentStep(t('scanMonitor.completed'));
      setScanCompleted(true);
      console.log('[SCAN] State after completion:', { isScanning: false, phase: 'scanning', scanCompleted: true });

      // Update final stats
      setStats((prev) => ({
        ...prev,
        pagesScanned: event.totals?.pages || scannedPages.size,
        fails: event.totals?.fails || prev.fails,
        needsReview: event.totals?.needsReview || prev.needsReview,
      }));
      console.log('[SCAN] Final stats updated:', { pagesScanned: event.totals?.pages || scannedPages.size, fails: event.totals?.fails });

      // Rebuild tree from ALL discovered pages (not just scanned ones)
      setTree((prev) => {
        // Start with ALL pages from discovery phase (prev tree)
        const allPages = new globalThis.Map<string, { url: string; status: 'scanned' | 'failed' | 'not_scanned'; pageNumber?: number; counts?: any; layers: { L1: string; L2: string; L3: string } }>();

        // First, add ALL discovered pages from the tree (preserve discovery phase pages)
        for (const [url, node] of prev.entries()) {
          allPages.set(url, {
            url,
            status: node.status === 'failed' ? 'failed' : (node.status === 'scanned' ? 'scanned' : 'not_scanned'),
            pageNumber: node.pageNumber,
            counts: node.counts,
            layers: {
              L1: node.layers.L1,
              L2: node.layers.L2,
              L3: node.layers.L3,
            },
          });
        }

        // Then, update with scanned pages data (overwrites with actual scan results)
        for (const [url, scannedData] of scannedPages.entries()) {
          allPages.set(url, scannedData);
        }

        // Build complete tree from all pages
        const newTree = buildTreeFromScannedPages(allPages);

        addDebugLog('success', `Tree rebuilt with ${newTree.size} pages after scan completion (discovered: ${prev.size}, scanned: ${scannedPages.size}, total: ${allPages.size})`);

        return newTree;
      });

      // Update stats with the correct scanned count
      setStats((prev) => ({
        ...prev,
        fails: event.totals?.fails || 0,
        needsReview: event.totals?.needsReview || 0,
        pagesScanned: event.totals?.pages || scannedPages.size, // Use total pages from event or scannedPages
      }));
    }
  };

  // Build tree from all discovered/scanned pages after scan completes
  const buildTreeFromScannedPages = (pages: Map<string, { url: string; status: 'scanned' | 'failed' | 'not_scanned'; pageNumber?: number; counts?: any; layers: { L1: string; L2: string; L3: string } }>) => {
    const newTree = new globalThis.Map<string, TreeNode>();
    const urlList = Array.from(pages.keys());

    // Sort URLs by path depth for proper hierarchy
    urlList.sort((a, b) => {
      const pathA = new URL(a).pathname;
      const pathB = new URL(b).pathname;
      const depthA = pathA.split('/').filter(p => p).length;
      const depthB = pathB.split('/').filter(p => p).length;
      if (depthA !== depthB) return depthA - depthB;
      return pathA.localeCompare(pathB);
    });

    // Build tree structure
    for (const url of urlList) {
      const pageData = pages.get(url)!;
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(p => p);

      // Find parent URL
      let parentUrl: string | undefined;
      if (pathParts.length > 1) {
        const parentPath = `/${pathParts.slice(0, -1).join('/')}`;
        parentUrl = urlObj.origin + parentPath;
        // Normalize parent URL (ensure it exists in our list or use root)
        if (!pages.has(parentUrl)) {
          // Check if root exists
          const rootUrl = urlObj.origin + '/';
          if (pages.has(rootUrl)) {
            parentUrl = rootUrl;
          } else {
            parentUrl = undefined; // No parent found
          }
        }
      } else if (pathParts.length === 1) {
        // Direct child of root
        const rootUrl = urlObj.origin + '/';
        if (pages.has(rootUrl)) {
          parentUrl = rootUrl;
        }
      }

      const node: TreeNode = {
        url,
        children: [],
        status: pageData.status === 'failed' ? 'failed' : (pageData.status === 'scanned' ? 'scanned' : 'not_scanned'),
        layers: {
          L1: pageData.layers.L1 as any,
          L2: pageData.layers.L2 as any,
          L3: pageData.layers.L3 as any,
        },
        pageNumber: pageData.pageNumber,
        counts: pageData.counts,
        parentUrl,
      };

      newTree.set(url, node);

      // Link to parent
      if (parentUrl && newTree.has(parentUrl)) {
        const parent = newTree.get(parentUrl)!;
        if (!parent.children.find(c => c.url === url)) {
          parent.children.push(node);
        }
      }
    }

    return newTree;
  };

  const handleError = (event: ScanEvent) => {
    const errorMessage = (event as any).error || event.message || 'Unknown error occurred';
    const isTimeout = (event as any).isTimeout || false;

    console.error('[SCAN] Error event received:', { error: errorMessage, isTimeout, event });

    // Stop scanning state
    setIsScanning(false);
    setScanCompleted(true);
    setCurrentPage(null);
    setCurrentActivity('');

    // Show error in debug log
    const displayMessage = isTimeout
      ? `Scan timed out: ${errorMessage}`
      : `Scan failed: ${errorMessage}`;
    addDebugLog('error', displayMessage);

    // Update current step to show error
    setCurrentStep(isTimeout ? t('scanMonitor.timeout') || 'Timeout' : t('scanMonitor.failed') || 'Failed');

    // Mark page as failed if URL is provided
    if (event.url) {
      const failedUrl = event.url;
      setTree((prev) => {
        const newTree = new globalThis.Map(prev);
        if (newTree.has(failedUrl)) {
          const node = newTree.get(failedUrl)!;
          node.status = 'failed';
          newTree.set(failedUrl, node);
        }
        return newTree;
      });
    }

    // Show error alert to user
    alert(displayMessage);
  };

  const handleStopScan = async () => {
    const confirmMessage = t('scanMonitor.confirmStop') ||
      'Are you sure you want to stop this scan? All discovery and scan progress will be lost. This action cannot be undone.';

    if (!window.confirm(confirmMessage)) {
      return; // User cancelled
    }

    try {
      addDebugLog('info', 'Stopping scan...');
      await apiClient.cancelScan(scanId);
      addDebugLog('success', 'Scan stopped successfully');
      setIsScanning(false);
      setCurrentStep(t('scanMonitor.stopped') || 'Stopped');

      // Close SSE connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // Delete scan record from database (since user aborted)
      try {
        await apiClient.deleteScan(scanId);
        addDebugLog('info', 'Scan record deleted from database');
      } catch (err) {
        console.warn('Failed to delete scan record:', err);
        // Non-critical - continue
      }

      // Refresh scans list
      if (onComplete) {
        onComplete();
      }

      // Close modal
      onClose();
    } catch (error) {
      addDebugLog('error', `Failed to stop scan: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Failed to stop scan:', error);
      alert(t('scanMonitor.stopError') || 'Failed to stop scan. Please try again.');
    }
  };

  const handleSaveFindings = async () => {
    // Scan is already persisted, just refresh and navigate
    if (onComplete) {
      onComplete();
    }
    onClose();
  };

  // Handle modal close with confirmation if scan is active
  const handleClose = () => {
    // If scan is in progress or discovery is active, show confirmation
    if (isScanning || (phase === 'discovery' && tree.size > 0)) {
      const confirmMessage = phase === 'discovery'
        ? (t('scanMonitor.confirmCloseDiscovery') || 'Discovery is in progress. If you close now, all discovery progress will be lost. Do you want to continue?')
        : (t('scanMonitor.confirmCloseScanning') || 'Scan is in progress. If you close now, all scan progress will be lost. Do you want to continue?');

      if (!window.confirm(confirmMessage)) {
        return; // User cancelled - don't close
      }

      // User confirmed - cancel scan and delete record
      if (isScanning) {
        // Cancel the scan (async, don't wait)
        apiClient.cancelScan(scanId).catch(err => {
          console.warn('Failed to cancel scan on close:', err);
        });
      }

      // Delete scan record if it exists (async, don't wait)
      apiClient.deleteScan(scanId).catch(err => {
        console.warn('Failed to delete scan record on close:', err);
        // Non-critical
      });

      // Close SSE connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // Refresh scans list
      if (onComplete) {
        onComplete();
      }
    }

    // Close modal
    onClose();
  };

  const toggleNode = (url: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(url)) {
        newSet.delete(url);
      } else {
        newSet.add(url);
      }
      return newSet;
    });
  };

  const togglePageSelection = (url: string) => {
    setSelectedUrls((prev) => {
      const newSet = new Set(prev);
      const wasSelected = newSet.has(url);
      if (wasSelected) {
        newSet.delete(url);
      } else {
        newSet.add(url);
      }

      // Update tree node to keep in sync
      setTree((prevTree) => {
        const newTree = new globalThis.Map(prevTree);
        if (newTree.has(url)) {
          const node = newTree.get(url)!;
          node.selected = !wasSelected;
          newTree.set(url, node);
        }
        return newTree;
      });

      return newSet;
    });
  };

  const selectAllPages = () => {
    const newSelected = new Set<string>();
    setTree((prev) => {
      const newTree = new globalThis.Map(prev);
      for (const [url, node] of newTree.entries()) {
        node.selected = true;
        newSelected.add(url);
        newTree.set(url, node);
      }
      return newTree;
    });
    setSelectedUrls(newSelected);
  };

  const deselectAllPages = () => {
    setTree((prev) => {
      const newTree = new globalThis.Map(prev);
      for (const [url, node] of newTree.entries()) {
        node.selected = false;
        newTree.set(url, node);
      }
      return newTree;
    });
    setSelectedUrls(new Set());
  };

  const handleStartScanning = async () => {
    if (selectedUrls.size === 0) {
      alert(t('scanMonitor.noPagesSelected') || 'Please select at least one page to scan.');
      return;
    }

    try {
      addDebugLog('info', `Starting scan of ${selectedUrls.size} selected pages`);
      setPhase('scanning');
      setIsScanning(true);
      setCurrentStep(t('scanMonitor.crawling'));

      // Create scan record in DB NOW (only when user clicks "Start Scanning")
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('raawix_token');

      // First, create the scan record
      try {
        const initResponse = await fetch(`${apiUrl}/api/scans/${scanId}/init`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            seedUrl,
            selectedUrls: Array.from(selectedUrls),
            maxPages: selectedUrls.size,
            maxDepth: maxDepth || 3,
            scanMode, // Pass scan mode to backend
            entityId, // Pass entity ID for proper report generation
            propertyId, // Pass property ID for proper report generation
          }),
        });

        if (!initResponse.ok) {
          throw new Error('Failed to create scan record');
        }
        addDebugLog('success', 'Scan record created in database');
      } catch (err) {
        addDebugLog('error', `Failed to create scan record: ${err instanceof Error ? err.message : 'Unknown error'}`);
        // Continue anyway - scan can still work
      }

      // Then, start the scan job
      const requestPayload = {
        scanId, // Pass the scanId so we can update the existing scan record
        seedUrl,
        selectedUrls: Array.from(selectedUrls),
        maxPages: selectedUrls.size,
        maxDepth: 3,
      };

      console.log('[FRONTEND] Calling /api/scans/start with:', requestPayload);
      addDebugLog('info', `Sending ${requestPayload.selectedUrls.length} selectedUrls to backend`);

      const response = await fetch(`${apiUrl}/api/scans/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        throw new Error(`Failed to start scan: ${response.statusText}`);
      }

      const result = await response.json();
      addDebugLog('success', `Scan started: ${result.scanId}`);

      // The SSE connection will handle the rest
    } catch (error) {
      addDebugLog('error', `Failed to start scan: ${error instanceof Error ? error.message : 'Unknown error'}`);
      alert(t('scanMonitor.startScanError') || 'Failed to start scan. Please try again.');
      setPhase('selection'); // Go back to selection phase
      setIsScanning(false);
    }
  };

  // Flatten tree to get all visible nodes in order (for numbering)
  const getAllVisibleNodes = (nodes: TreeNode[]): TreeNode[] => {
    const result: TreeNode[] = [];
    const traverse = (node: TreeNode) => {
      result.push(node);
      // Only include children if parent is expanded
      if (expandedNodes.has(node.url)) {
        node.children.forEach(traverse);
      }
    };
    nodes.forEach(traverse);
    return result;
  };

  // Create a map of page numbers for all visible nodes
  const getPageNumberMap = (): Map<string, number> => {
    const visibleNodes = getAllVisibleNodes(rootNodes);
    const numberMap = new Map<string, number>();
    visibleNodes.forEach((node, index) => {
      numberMap.set(node.url, index + 1);
    });
    return numberMap;
  };

  const renderTreeNode = (node: TreeNode, depth: number = 0, pageNumberMap?: Map<string, number>): JSX.Element => {
    const isExpanded = expandedNodes.has(node.url);
    const hasChildren = node.children.length > 0;
    const routePath = new URL(node.url).pathname || '/';

    return (
      <div key={node.url} className="select-none">
        <div
          className={`flex items-center gap-2 py-1 px-2 hover:bg-gray-100 rounded ${node.url === currentPage ? 'bg-blue-50' : ''
            }`}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={(e) => {
            // Only handle click if clicking on the row itself, not on interactive elements
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('input') || target.closest('button')) {
              return; // Let the checkbox/button handle its own click
            }
            // If in selection phase, clicking the row toggles selection
            if (phase === 'selection') {
              togglePageSelection(node.url);
            }
          }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleNode(node.url)}
              className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <div className="w-4" />}

          {/* Page number counter */}
          {pageNumberMap && pageNumberMap.has(node.url) && (
            <span className="text-xs font-semibold text-gray-500 w-8 text-right flex-shrink-0">
              {pageNumberMap.get(node.url)}.
            </span>
          )}

          {/* Checkbox for selection phase */}
          {phase === 'selection' && (
            <input
              type="checkbox"
              checked={selectedUrls.has(node.url)}
              onChange={(e) => {
                e.stopPropagation(); // Prevent triggering parent click handlers
                // Don't preventDefault - let checkbox update naturally
                togglePageSelection(node.url);
              }}
              onClick={(e) => {
                e.stopPropagation(); // Stop propagation to prevent parent handler
              }}
              onMouseDown={(e) => {
                e.stopPropagation(); // Also stop on mousedown
              }}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer relative z-10 flex-shrink-0"
              style={{ pointerEvents: 'auto', zIndex: 10 }}
            />
          )}

          {/* Status icon (only show when not in selection phase) */}
          {phase !== 'selection' && (
            <>
              {node.status === 'scanned' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              {node.status === 'in_progress' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
              {node.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
              {node.status === 'not_scanned' && <XCircle className="w-4 h-4 text-gray-400" />}
            </>
          )}

          {/* Route path */}
          <span className="text-sm font-mono flex-1 truncate" title={node.url}>
            {routePath}
          </span>
          {/* Discovery source badge */}
          {node.discoverySource && node.discoverySource !== 'crawl' && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 ml-2">
              {node.discoverySource === 'seed' ? 'Seed' :
                node.discoverySource === 'sitemap' ? 'Sitemap' :
                  node.discoverySource === 'post_login_seed' ? 'Post-Login' : 'Unknown'}
            </span>
          )}

          {/* Layer icons */}
          <div className="flex items-center gap-1">
            <div
              className={`w-3 h-3 rounded ${node.layers.L1 === 'done'
                ? 'bg-green-500'
                : node.layers.L1 === 'running'
                  ? 'bg-blue-500 animate-pulse'
                  : node.layers.L1 === 'failed'
                    ? 'bg-red-500'
                    : 'bg-gray-300'
                }`}
              title="L1: DOM"
            />
            <div
              className={`w-3 h-3 rounded ${node.layers.L2 === 'done'
                ? 'bg-green-500'
                : node.layers.L2 === 'running'
                  ? 'bg-blue-500 animate-pulse'
                  : node.layers.L2 === 'failed'
                    ? 'bg-red-500'
                    : 'bg-gray-300'
                }`}
              title="L2: Vision"
            />
            <div
              className={`w-3 h-3 rounded ${node.layers.L3 === 'done'
                ? 'bg-green-500'
                : node.layers.L3 === 'running'
                  ? 'bg-blue-500 animate-pulse'
                  : node.layers.L3 === 'failed'
                    ? 'bg-red-500'
                    : 'bg-gray-300'
                }`}
              title="L3: Assistive Map"
            />
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div>
            {node.children.map((child) => renderTreeNode(child, depth + 1, pageNumberMap))}
          </div>
        )}
      </div>
    );
  };

  // Build root nodes - show ALL nodes (flat list for now to ensure all pages are visible)
  // TODO: Fix parent-child linking to show proper hierarchy
  // For now, show all nodes as root nodes so users can see and select all discovered pages
  const rootNodes = Array.from(tree.values());

  // Log root nodes count for debugging
  if (tree.size > 0) {
    const orphanedCount = rootNodes.filter(n => n.parentUrl && tree.has(n.parentUrl)).length;
    console.log(`[TREE] Total nodes: ${tree.size}, Root nodes: ${rootNodes.length}, Orphaned: ${orphanedCount}`);

    // If there's a mismatch, log all nodes to help debug
    if (tree.size !== rootNodes.length && rootNodes.length < tree.size) {
      const allNodeUrls = Array.from(tree.keys()).map(u => new URL(u).pathname).sort();
      const rootNodeUrls = rootNodes.map(n => new URL(n.url).pathname).sort();
      const missingInRoot = allNodeUrls.filter(url => !rootNodeUrls.includes(url));
      console.warn(`[TREE] Missing from rootNodes (${missingInRoot.length}):`, missingInRoot);

      // Find which nodes are missing and why
      const missingNodes = Array.from(tree.values()).filter(node => !rootNodes.includes(node));
      console.warn(`[TREE] Missing nodes details:`, missingNodes.map(n => ({
        url: new URL(n.url).pathname,
        parentUrl: n.parentUrl ? new URL(n.parentUrl).pathname : 'none',
        hasParentInTree: n.parentUrl && tree.has(n.parentUrl),
        isChildOfAnother: Array.from(tree.values()).some((other) =>
          other.children.some((child) => child.url === n.url)
        ),
      })));
    }
  }

  // Sort root nodes by depth (0 first) and then by URL
  rootNodes.sort((a, b) => {
    const depthA = a.depth ?? 0;
    const depthB = b.depth ?? 0;
    if (depthA !== depthB) {
      return depthA - depthB;
    }
    return a.url.localeCompare(b.url);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        className={`bg-white rounded-lg shadow-xl w-[95vw] max-w-[1200px] h-[90vh] flex flex-col ${isRTL ? 'text-right' : 'text-left'
          }`}
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{ colorScheme: 'light' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {(isScanning || phase === 'discovery') && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
            <h2 className="text-xl font-semibold text-gray-900">
              {phase === 'discovery' && (t('scanMonitor.discovering') || 'Discovering Pages...')}
              {phase === 'selection' && (t('scanMonitor.selectPages') || 'Select Pages to Scan')}
              {phase === 'scanning' && (t('scanMonitor.title') || 'Scanning in progress')}
            </h2>
            <span className="text-sm text-gray-500">
              {new URL(seedUrl).hostname} • {stats.pagesDiscovered} {t('scanMonitor.pagesDiscovered')}
              {phase === 'selection' && (() => {
                const visibleNodes = getAllVisibleNodes(rootNodes);
                const totalVisible = visibleNodes.length;
                return totalVisible !== stats.pagesDiscovered
                  ? ` (${totalVisible} total visible)`
                  : '';
              })()}
              {phase === 'scanning' && ` • ${stats.pagesScanned} ${t('scanMonitor.pagesScanned')}`}
              {phase === 'selection' && ` • ${selectedUrls.size} ${t('scanMonitor.selected') || 'selected'}`}
            </span>
            {/* Connection status indicator */}
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${connectionStatus === 'connected'
                  ? 'bg-green-500'
                  : connectionStatus === 'connecting'
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-red-500'
                  }`}
                title={connectionStatus}
              />
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
              >
                {showDebug ? 'Hide' : 'Show'} Debug
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isScanning && (
              <button
                onClick={handleStopScan}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2"
                aria-label={t('scanMonitor.stopScan') || 'Stop Scan'}
              >
                <XCircle className="w-4 h-4" />
                {t('scanMonitor.stopScan') || 'Stop Scan'}
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded"
              aria-label={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Tree (60%) */}
          <div className="flex-1 border-r border-gray-200 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">{t('scanMonitor.websiteTree')}</h3>
              {phase === 'selection' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAllPages}
                    className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded"
                  >
                    {t('scanMonitor.selectAll') || 'Select All'}
                  </button>
                  <button
                    onClick={deselectAllPages}
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded"
                  >
                    {t('scanMonitor.deselectAll') || 'Deselect All'}
                  </button>
                </div>
              )}
            </div>
            {rootNodes.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                {phase === 'discovery' && (t('scanMonitor.discoveringPages') || 'Discovering pages...')}
                {phase !== 'discovery' && t('scanMonitor.noPagesDiscovered')}
                {connectionStatus === 'error' && (
                  <div className="mt-2 text-red-600 text-sm">
                    Connection error - check debug panel
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {(() => {
                  const pageNumberMap = getPageNumberMap();
                  return rootNodes.map((node) => renderTreeNode(node, 0, pageNumberMap));
                })()}
              </div>
            )}
          </div>

          {/* Right: Status (40%) */}
          <div className="w-[40%] p-4 overflow-y-auto">
            {phase === 'selection' ? (
              <>
                <h3 className="font-semibold mb-4 text-gray-900">
                  {t('scanMonitor.selectPages') || 'Select Pages to Scan'}
                </h3>
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-gray-700 mb-2">
                    {t('scanMonitor.selectionInstructions') ||
                      'Select the pages you want to scan. Click "Start Scanning" when ready.'}
                  </p>
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold">{selectedUrls.size}</span> of{' '}
                    <span className="font-semibold">{stats.pagesDiscovered}</span> pages selected
                  </p>
                </div>
                <button
                  onClick={handleStartScanning}
                  disabled={selectedUrls.size === 0}
                  className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
                >
                  {t('scanMonitor.startScanning') || `Start Scanning (${selectedUrls.size} pages)`}
                </button>
              </>
            ) : (
              <>
                <h3 className="font-semibold mb-4 text-gray-900">{t('scanMonitor.nowScanning')}</h3>

                {/* Debug Panel */}
                {showDebug && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <h4 className="text-sm font-semibold mb-2 text-gray-900">Debug Log</h4>
                    <div className="text-xs space-y-1 max-h-48 overflow-y-auto font-mono">
                      {debugLogs.length === 0 ? (
                        <div className="text-gray-500">No debug logs yet</div>
                      ) : (
                        debugLogs.map((log, idx) => (
                          <div
                            key={idx}
                            className={`p-1 rounded ${log.type === 'error'
                              ? 'bg-red-100 text-red-800'
                              : log.type === 'success'
                                ? 'bg-green-100 text-green-800'
                                : log.type === 'warning'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                          >
                            <span className="text-gray-500">[{log.time}]</span> {log.type.toUpperCase()}: {log.message}
                          </div>
                        ))
                      )}
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      Connection: <span className="font-semibold">{connectionStatus}</span> | Events: {recentEvents.length} | Tree nodes: {tree.size}
                    </div>
                  </div>
                )}

                {/* Current Activity - User-friendly display */}
                {(currentPage || currentActivity) && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="space-y-2">
                      {currentPage && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">{t('scanMonitor.currentPage') || 'Current Page'}:</span>
                          <span className="ml-2 text-blue-700 font-mono text-xs break-all">
                            {new URL(currentPage).pathname}
                          </span>
                        </div>
                      )}
                      {currentActivity && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">{t('scanMonitor.activity') || 'Activity'}:</span>
                          <span className="ml-2 text-blue-600">{currentActivity}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="mb-4 space-y-2">
                  <div className="flex justify-between text-gray-900">
                    <span>{t('scanMonitor.pagesDiscovered')}:</span>
                    <span className="font-semibold">{stats.pagesDiscovered}</span>
                  </div>
                  <div className="flex justify-between text-gray-900">
                    <span>{t('scanMonitor.pagesScanned')}:</span>
                    <span className="font-semibold">{stats.pagesScanned}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>{t('scanMonitor.fails')}:</span>
                    <span className="font-semibold">{stats.fails}</span>
                  </div>
                  <div className="flex justify-between text-yellow-600">
                    <span>{t('scanMonitor.needsReview')}:</span>
                    <span className="font-semibold">{stats.needsReview}</span>
                  </div>
                </div>

                {/* Recent events */}
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2 text-gray-900">{t('scanMonitor.recentEvents')}</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {recentEvents.length === 0 ? (
                      <div className="text-sm text-gray-500">{t('scanMonitor.noEvents')}</div>
                    ) : (
                      recentEvents.map((event, idx) => (
                        <div key={idx} className="text-xs text-gray-600 p-1">
                          <span className="font-mono">{event.type}</span>
                          {event.url && (
                            <span className="ml-2 text-gray-500">
                              {new URL(event.url).pathname}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex justify-end gap-2">
          {(() => {
            // Debug logging for button render
            console.log('[BUTTON-RENDER] Current state:', { phase, isScanning, scanCompleted, selectedUrls: selectedUrls.size });

            if (phase === 'selection') {
              return (
                <>
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    {t('common.close')}
                  </button>
                  <button
                    onClick={handleStartScanning}
                    disabled={selectedUrls.size === 0}
                    className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {t('scanMonitor.startScanning') || `Start Scanning (${selectedUrls.size})`}
                  </button>
                </>
              );
            } else if (phase === 'scanning' && isScanning) {
              return (
                <>
                  <button
                    onClick={handleStopScan}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    {t('scanMonitor.stopScan')}
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    {t('common.close')}
                  </button>
                </>
              );
            } else if (!isScanning && phase === 'scanning' && scanCompleted) {
              console.log('[BUTTON-RENDER] ✅ Showing SAVE FINDINGS button!');
              return (
                <>
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    {t('common.close')}
                  </button>
                  <button
                    onClick={handleSaveFindings}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    {t('scanMonitor.saveFindings') || 'Save Findings'}
                  </button>
                </>
              );
            } else {
              console.log('[BUTTON-RENDER] ❌ Fallback - only showing Close button');
              return (
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  {t('common.close')}
                </button>
              );
            }
          })()}
        </div>
      </div>
    </div >
  );
}

