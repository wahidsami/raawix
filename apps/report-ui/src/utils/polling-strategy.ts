/**
 * Production-ready polling strategies for large-scale portals
 * Handles hundreds of pages without hitting rate limits
 */

export interface PollingConfig {
  baseInterval: number; // Base polling interval in ms
  maxInterval: number; // Maximum interval (exponential backoff cap)
  backoffMultiplier: number; // Multiplier for exponential backoff
  resetAfterSuccess: boolean; // Reset interval after successful request
}

export class SmartPolling {
  private interval: number;
  private currentAttempt: number = 0;
  private config: PollingConfig;
  private timeoutId: NodeJS.Timeout | null = null;
  private isActive: boolean = false;

  constructor(config: Partial<PollingConfig> = {}) {
    this.config = {
      baseInterval: config.baseInterval || 5000, // 5 seconds default
      maxInterval: config.maxInterval || 30000, // 30 seconds max
      backoffMultiplier: config.backoffMultiplier || 1.5,
      resetAfterSuccess: config.resetAfterSuccess !== false,
    };
    this.interval = this.config.baseInterval;
  }

  /**
   * Start polling with a callback function
   */
  start(callback: () => Promise<void> | void) {
    if (this.isActive) return;
    this.isActive = true;
    this.poll(callback);
  }

  /**
   * Stop polling
   */
  stop() {
    this.isActive = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.currentAttempt = 0;
    this.interval = this.config.baseInterval;
  }

  /**
   * Pause polling temporarily (e.g., when modal is open)
   */
  pause() {
    this.stop();
  }

  /**
   * Resume polling after pause
   */
  resume(callback: () => Promise<void> | void) {
    if (!this.isActive) {
      this.start(callback);
    }
  }

  private async poll(callback: () => Promise<void> | void) {
    if (!this.isActive) return;

    try {
      await callback();
      this.onSuccess();
    } catch (error) {
      this.onError();
    }

    if (this.isActive) {
      this.timeoutId = setTimeout(() => this.poll(callback), this.interval);
    }
  }

  private onSuccess() {
    this.currentAttempt = 0;
    if (this.config.resetAfterSuccess) {
      this.interval = this.config.baseInterval;
    }
  }

  private onError() {
    this.currentAttempt++;
    // Exponential backoff on errors
    this.interval = Math.min(
      this.config.baseInterval * Math.pow(this.config.backoffMultiplier, this.currentAttempt),
      this.config.maxInterval
    );
  }

  /**
   * Get current polling interval
   */
  getInterval(): number {
    return this.interval;
  }

  /**
   * Check if polling is active
   */
  isPolling(): boolean {
    return this.isActive;
  }
}

/**
 * Adaptive polling: adjusts frequency based on scan status
 */
export class AdaptivePolling extends SmartPolling {
  private hasActiveScans: boolean = false;
  private hasRunningScans: boolean = false;

  constructor() {
    super({
      baseInterval: 3000, // Start with 3s for active scans
      maxInterval: 60000, // Up to 60s when no activity
      backoffMultiplier: 2,
      resetAfterSuccess: true,
    });
  }

  /**
   * Update scan status and adjust polling accordingly
   */
  updateScanStatus(hasRunningScans: boolean, hasActiveScans: boolean) {
    this.hasRunningScans = hasRunningScans;
    this.hasActiveScans = hasActiveScans;

    // If no scans, poll less frequently
    if (!hasRunningScans && !hasActiveScans) {
      this.stop();
    }
  }

  /**
   * Get recommended polling interval based on status
   */
  getRecommendedInterval(): number {
    if (this.hasRunningScans) {
      return 3000; // 3s for running scans
    } else if (this.hasActiveScans) {
      return 10000; // 10s for queued scans
    } else {
      return 30000; // 30s when no scans
    }
  }
}

/**
 * Batch polling: groups multiple requests together
 */
export class BatchPolling {
  private pendingRequests: Set<string> = new Set();
  private batchTimeout: NodeJS.Timeout | null = null;
  private batchDelay: number = 500; // Wait 500ms to batch requests
  private batchHandler: ((ids: string[]) => Promise<void>) | null = null;

  /**
   * Add a request to the batch
   */
  addRequest(id: string) {
    this.pendingRequests.add(id);

    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.flush();
      }, this.batchDelay);
    }
  }

  /**
   * Set the batch handler
   */
  setHandler(handler: (ids: string[]) => Promise<void>) {
    this.batchHandler = handler;
  }

  /**
   * Flush pending requests
   */
  private async flush() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    if (this.pendingRequests.size > 0 && this.batchHandler) {
      const ids = Array.from(this.pendingRequests);
      this.pendingRequests.clear();
      await this.batchHandler(ids);
    }
  }

  /**
   * Clear all pending requests
   */
  clear() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    this.pendingRequests.clear();
  }
}

