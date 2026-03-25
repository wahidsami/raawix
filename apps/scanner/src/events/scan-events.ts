import { EventEmitter } from 'node:events';

export type ScanEventType =
  | 'crawl_discovered'
  | 'page_started'
  | 'layer_status'
  | 'page_done'
  | 'scan_done'
  | 'scan_canceled'
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

export interface LayerStatusEvent {
  type: 'layer_status';
  scanId: string;
  url: string;
  pageNumber: number;
  layer: 'L1' | 'L2' | 'L3';
  status: 'pending' | 'running' | 'done' | 'failed';
  meta?: {
    findingsCount?: number;
    visionCount?: number;
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
  | LayerStatusEvent
  | PageDoneEvent
  | ScanDoneEvent
  | ScanCanceledEvent
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

