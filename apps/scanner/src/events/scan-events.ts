import { EventEmitter } from 'node:events';

export type ScanEventType =
  | 'crawl_discovered'
  | 'page_started'
  | 'screenshot_ready'
  | 'layer_status'
  | 'page_done'
  | 'scan_done'
  | 'scan_canceled'
  | 'agent_started'
  | 'agent_progress'
  | 'agent_done'
  | 'analyst_started'
  | 'analyst_done'
  | 'error';

export interface CrawlDiscoveredEvent {
  type: 'crawl_discovered';
  scanId: string;
  url: string;
  parentUrl?: string;
  depth: number;
  timestamp: string;
  metadata?: {
    source?: 'seed' | 'crawl' | 'sitemap' | 'post_login_seed';
  };
}

export interface PageStartedEvent {
  type: 'page_started';
  scanId: string;
  url: string;
  pageNumber: number;
  timestamp: string;
}

/** Emitted after full-page screenshot.png is written — lets UIs fetch the artifact without guessing timing. */
export interface ScreenshotReadyEvent {
  type: 'screenshot_ready';
  scanId: string;
  url: string;
  pageNumber: number;
  timestamp: string;
}

export interface LayerStatusEvent {
  type: 'layer_status';
  scanId: string;
  url: string;
  pageNumber: number;
  layer: 'L1' | 'L2' | 'L3';
  status: 'pending' | 'running' | 'done' | 'failed';
  meta?: {
    /** Document title from the page (for live UI); set when capture has read `page.title()`. */
    title?: string;
    findingsCount?: number;
    visionCount?: number;
    /** Layer was not run (operator disabled it in scan options). */
    skipped?: boolean;
    assistiveCounts?: {
      images?: number;
      labels?: number;
      actions?: number;
    };
  };
  timestamp: string;
}

export interface PageDoneEvent {
  type: 'page_done';
  scanId: string;
  url: string;
  pageNumber: number;
  summary: {
    findingsCount: number;
    visionCount: number;
    assistive?: {
      images: number;
      labels: number;
      actions: number;
    };
  };
  timestamp: string;
}

export interface ScanDoneEvent {
  type: 'scan_done';
  scanId: string;
  totals: {
    pages: number;
    fails: number;
    needsReview: number;
    assistivePages: number;
  };
  timestamp: string;
}

export interface ScanCanceledEvent {
  type: 'scan_canceled';
  scanId: string;
  message: string;
  totals?: {
    pages: number;
    fails: number;
    needsReview: number;
    assistivePages: number;
  };
  timestamp: string;
}

export interface AgentStartedEvent {
  type: 'agent_started';
  scanId: string;
  url: string;
  pageNumber: number;
  timestamp: string;
}

export interface AgentProgressEvent {
  type: 'agent_progress';
  scanId: string;
  url: string;
  pageNumber: number;
  stepIndex: number;
  maxSteps: number;
  timestamp: string;
}

export interface AgentDoneEvent {
  type: 'agent_done';
  scanId: string;
  url: string;
  pageNumber: number;
  issuesCount: number;
  timestamp: string;
}

export interface AnalystStartedEvent {
  type: 'analyst_started';
  scanId: string;
  pagesPlanned: number;
  timestamp: string;
}

export interface AnalystDoneEvent {
  type: 'analyst_done';
  scanId: string;
  pagesAnalyzed: number;
  findingsAdded: number;
  timestamp: string;
}

export interface ScanErrorEvent {
  type: 'error';
  scanId: string;
  message: string;
  url?: string;
  timestamp: string;
}

export type ScanEvent =
  | CrawlDiscoveredEvent
  | PageStartedEvent
  | ScreenshotReadyEvent
  | LayerStatusEvent
  | PageDoneEvent
  | ScanDoneEvent
  | ScanCanceledEvent
  | AgentStartedEvent
  | AgentProgressEvent
  | AgentDoneEvent
  | AnalystStartedEvent
  | AnalystDoneEvent
  | ScanErrorEvent;

/**
 * Global event emitter for scan progress
 * Additive wrapper around existing pipeline - does not break existing flow
 */
class ScanEventEmitter extends EventEmitter {
  private activeScans: Map<string, ScanEvent[]> = new Map();

  /**
   * Emit event and store for late subscribers
   */
  emitEvent(scanId: string, event: ScanEvent): void {
    // Store event for late subscribers (SSE clients that connect after event)
    if (!this.activeScans.has(scanId)) {
      this.activeScans.set(scanId, []);
    }
    const events = this.activeScans.get(scanId)!;
    events.push(event);
    
    // Keep only last 100 events per scan
    if (events.length > 100) {
      events.shift();
    }

    // Emit to listeners
    this.emit('scan-event', scanId, event);
    this.emit(`scan-${scanId}`, event);
  }

  /**
   * Get stored events for a scan (for late subscribers)
   */
  getStoredEvents(scanId: string): ScanEvent[] {
    return this.activeScans.get(scanId) || [];
  }

  /**
   * Clear stored events when scan completes
   */
  clearScan(scanId: string): void {
    this.activeScans.delete(scanId);
  }
}

export const scanEventEmitter = new ScanEventEmitter();

