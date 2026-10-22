import { config } from '../config.js';
import { StructuredLogger } from '../utils/logger.js';
import type { DiagnosticStatus } from './provider-telemetry.js';

export interface ScanBudgetState {
  scanId: string;
  requestsAttempted: number;
  pendingRequests: number;
  circuitOpen: boolean;
  circuitReason?: DiagnosticStatus;
  retryBudgetSpentMs: number;
  lastActiveAt: number;
  markedForCleanup?: boolean;
}

export interface DispatchSlot {
  allowed: boolean;
  reason?: DiagnosticStatus;
  release?: () => void;
}

/**
 * Tracks Gemini API request budget, rolling 60-second request limits,
 * and circuit-breaker state across all Gemini provider instances in this scanner process.
 * 
 * Guarantees:
 * - Rolling 60-second window enforced via GEMINI_MAX_REQUESTS_PER_MINUTE (default 15).
 * - Per-scan request ceilings via GEMINI_MAX_REQUESTS_PER_SCAN (default 15).
 * - Outbound HTTP attempts (including retries) count against both budgets.
 * - Concurrency-safe slot scheduler eliminates race conditions.
 * - Confirmed quota exhaustion trips a process-wide circuit breaker.
 * - Per-scan isolation eliminates shared 'default' state; un-keyed requests use unique ephemeral IDs.
 * - Cleanup does not discard states with pending requests in-flight; backed by 15-minute TTL eviction.
 */
export class GeminiBudgetTracker {
  private states: Map<string, ScanBudgetState> = new Map();
  private dispatchTimestamps: number[] = [];
  private logger = new StructuredLogger();
  private ephemeralCounter = 0;
  private schedulerQueue: Promise<void> = Promise.resolve();

  // Process-wide circuit breaker state
  private globalCircuitOpen: boolean = false;
  private globalCircuitReason?: DiagnosticStatus;
  private globalCircuitTrippedAt?: number;
  private globalCircuitTtlMs: number = 60000; // 60s bounded duration

  // Injectable clock & timer for deterministic testing without real-time waiting
  private nowFn: () => number = () => Date.now();
  private sleepFn: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  private now(): number {
    return this.nowFn();
  }

  private async sleep(ms: number): Promise<void> {
    return this.sleepFn(ms);
  }

  /**
   * Override time/sleep functions for deterministic unit testing.
   */
  setCustomTimer(nowFn?: () => number, sleepFn?: (ms: number) => Promise<void>): void {
    this.nowFn = nowFn || (() => Date.now());
    this.sleepFn = sleepFn || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  /**
   * Generates a safe key for scan state.
   * If scanId is omitted, generates a unique ephemeral ID to prevent cross-scan leakage.
   */
  private resolveScanId(scanId?: string): string {
    if (scanId && scanId.trim().length > 0) {
      return scanId.trim();
    }
    this.ephemeralCounter++;
    return `_ephemeral_${this.ephemeralCounter}_${this.now()}`;
  }

  getState(scanId?: string): ScanBudgetState {
    const id = this.resolveScanId(scanId);
    let state = this.states.get(id);
    if (!state) {
      state = {
        scanId: id,
        requestsAttempted: 0,
        pendingRequests: 0,
        circuitOpen: false,
        retryBudgetSpentMs: 0,
        lastActiveAt: this.now(),
      };
      this.states.set(id, state);
    }
    return state;
  }

  /**
   * Fast synchronous check to determine if a request can proceed before preparing payloads.
   */
  canMakeRequest(scanId?: string): { allowed: boolean; reason?: DiagnosticStatus } {
    if (this.isGlobalCircuitOpen()) {
      return { allowed: false, reason: this.globalCircuitReason || 'quota_exhausted' };
    }

    if (!scanId) {
      // Ephemeral requests are allowed unless global circuit is open
      return { allowed: true };
    }

    const state = this.states.get(scanId);
    if (!state) {
      return { allowed: true };
    }

    if (state.circuitOpen) {
      return { allowed: false, reason: state.circuitReason || 'rate_limit_exceeded' };
    }

    if (state.requestsAttempted >= config.gemini.maxRequestsPerScan) {
      state.circuitOpen = true;
      state.circuitReason = 'request_budget_exhausted';
      return { allowed: false, reason: 'request_budget_exhausted' };
    }

    return { allowed: true };
  }

  /**
   * Prunes rolling 60-second dispatch timestamps.
   */
  private pruneTimestamps(): void {
    const cutoff = this.now() - 60000;
    while (this.dispatchTimestamps.length > 0 && this.dispatchTimestamps[0] <= cutoff) {
      this.dispatchTimestamps.shift();
    }
  }

  /**
   * Concurrency-safe slot acquisition for an actual outbound HTTP dispatch.
   * Serialized via promise chain to prevent race conditions across parallel calls.
   */
  async acquireDispatchSlot(scanId?: string): Promise<DispatchSlot> {
    return new Promise<DispatchSlot>((resolve, reject) => {
      this.schedulerQueue = this.schedulerQueue.then(async () => {
        try {
          this.evictStaleStates();

          // 1. Process-wide circuit check
          if (this.isGlobalCircuitOpen()) {
            resolve({ allowed: false, reason: this.globalCircuitReason || 'quota_exhausted' });
            return;
          }

          // 2. Scan-level check
          const state = this.getState(scanId);
          if (state.circuitOpen) {
            resolve({ allowed: false, reason: state.circuitReason || 'rate_limit_exceeded' });
            return;
          }

          if (state.requestsAttempted >= config.gemini.maxRequestsPerScan) {
            state.circuitOpen = true;
            state.circuitReason = 'request_budget_exhausted';
            resolve({ allowed: false, reason: 'request_budget_exhausted' });
            return;
          }

          // 3. Process-wide rolling 60-second limit check & pacing
          this.pruneTimestamps();
          const maxRpm = config.gemini.maxRequestsPerMinute;

          while (this.dispatchTimestamps.length >= maxRpm) {
            const oldest = this.dispatchTimestamps[0];
            const waitMs = Math.max(1, oldest + 60000 - this.now());
            if (waitMs > 0) {
              await this.sleep(waitMs);
            }
            this.pruneTimestamps();
          }

          // 4. Record physical dispatch reservation
          const ts = this.now();
          this.dispatchTimestamps.push(ts);
          state.requestsAttempted++;
          state.pendingRequests++;
          state.lastActiveAt = ts;

          let released = false;
          const release = () => {
            if (released) return;
            released = true;
            state.pendingRequests = Math.max(0, state.pendingRequests - 1);
            if (state.markedForCleanup && state.pendingRequests === 0) {
              this.states.delete(state.scanId);
            }
          };

          resolve({ allowed: true, release });
        } catch (err) {
          reject(err);
        }
      }).catch((err) => {
        reject(err);
      });
    });
  }

  /**
   * Trips circuit breaker for a specific scan.
   * If reason is quota_exhausted, trips the process-wide circuit breaker.
   */
  tripCircuit(scanId: string | undefined, reason: DiagnosticStatus): void {
    if (scanId) {
      const state = this.getState(scanId);
      state.circuitOpen = true;
      state.circuitReason = reason;
      this.logger.warn('Gemini per-scan circuit breaker tripped', {
        scanId: state.scanId,
        reason,
        requestsAttempted: state.requestsAttempted,
      });
    }

    if (reason === 'quota_exhausted') {
      this.tripGlobalCircuit('quota_exhausted');
    }
  }

  /**
   * Trips the process-wide circuit breaker to stop futile outbound calls from any scan.
   */
  tripGlobalCircuit(reason: DiagnosticStatus = 'quota_exhausted'): void {
    this.globalCircuitOpen = true;
    this.globalCircuitReason = reason;
    this.globalCircuitTrippedAt = this.now();
    this.logger.warn('Gemini process-wide circuit breaker tripped', {
      reason,
      trippedAt: this.globalCircuitTrippedAt,
      ttlMs: this.globalCircuitTtlMs,
    });
  }

  isGlobalCircuitOpen(): boolean {
    if (!this.globalCircuitOpen) {
      return false;
    }
    if (this.now() - (this.globalCircuitTrippedAt || 0) < this.globalCircuitTtlMs) {
      return true;
    }
    // TTL expired; close circuit to allow fresh recovery
    this.globalCircuitOpen = false;
    this.globalCircuitReason = undefined;
    this.globalCircuitTrippedAt = undefined;
    return false;
  }

  getGlobalCircuitReason(): DiagnosticStatus | undefined {
    return this.globalCircuitReason;
  }

  recordRetryDelay(scanId: string | undefined, delayMs: number): boolean {
    const state = this.getState(scanId);
    if (state.retryBudgetSpentMs + delayMs > config.gemini.maxRetryBudgetMs) {
      this.tripCircuit(scanId, 'rate_limit_exceeded');
      return false;
    }
    state.retryBudgetSpentMs += delayMs;
    return true;
  }

  isCircuitOpen(scanId?: string): boolean {
    if (this.isGlobalCircuitOpen()) {
      return true;
    }
    if (!scanId) {
      return false;
    }
    const state = this.states.get(scanId);
    return state ? state.circuitOpen : false;
  }

  getCircuitReason(scanId?: string): DiagnosticStatus | undefined {
    if (this.isGlobalCircuitOpen()) {
      return this.globalCircuitReason;
    }
    if (!scanId) {
      return undefined;
    }
    const state = this.states.get(scanId);
    return state ? state.circuitReason : undefined;
  }

  /**
   * Clean up scan state upon job completion.
   * If requests are still in-flight, marks for cleanup on release.
   */
  cleanup(scanId?: string): boolean {
    if (!scanId) return false;
    const state = this.states.get(scanId);
    if (!state) return true;

    if (state.pendingRequests > 0) {
      state.markedForCleanup = true;
      this.logger.info('Scan state marked for deferred cleanup after in-flight requests finish', { scanId });
      return false;
    }

    this.states.delete(scanId);
    this.logger.info('Scan state cleaned up', { scanId });
    return true;
  }

  /**
   * Bounded TTL eviction for stale scan states (default 15 minutes).
   */
  evictStaleStates(ttlMs = 15 * 60 * 1000): void {
    const now = this.now();
    for (const [id, state] of this.states.entries()) {
      if (state.pendingRequests === 0 && now - state.lastActiveAt > ttlMs) {
        this.states.delete(id);
      }
    }
  }

  /**
   * Full reset for test suites and process restarts.
   */
  reset(scanId?: string): void {
    if (scanId) {
      this.states.delete(scanId);
    } else {
      this.states.clear();
      this.dispatchTimestamps = [];
      this.globalCircuitOpen = false;
      this.globalCircuitReason = undefined;
      this.globalCircuitTrippedAt = undefined;
      this.ephemeralCounter = 0;
      this.schedulerQueue = Promise.resolve();
      this.nowFn = () => Date.now();
      this.sleepFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    }
  }

  getDispatchedCountInLastMinute(): number {
    this.pruneTimestamps();
    return this.dispatchTimestamps.length;
  }
}

export const geminiBudgetTracker = new GeminiBudgetTracker();
