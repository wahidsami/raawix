import { config } from '../config.js';
import { StructuredLogger } from '../utils/logger.js';
import type { DiagnosticStatus } from './provider-telemetry.js';

export interface ScanBudgetState {
  scanId: string;
  requestsAttempted: number;
  circuitOpen: boolean;
  circuitReason?: DiagnosticStatus;
  retryBudgetSpentMs: number;
}

/**
 * Tracks Gemini API request budget and circuit-breaker state across Layer 2 and Layer 3.
 * Enforces per-scan request ceilings, retry budgets, and halts outbound calls upon quota exhaustion.
 */
export class GeminiBudgetTracker {
  private states: Map<string, ScanBudgetState> = new Map();
  private logger = new StructuredLogger();

  private getKey(scanId?: string): string {
    return scanId || 'default';
  }

  getState(scanId?: string): ScanBudgetState {
    const key = this.getKey(scanId);
    let state = this.states.get(key);
    if (!state) {
      state = {
        scanId: key,
        requestsAttempted: 0,
        circuitOpen: false,
        retryBudgetSpentMs: 0,
      };
      this.states.set(key, state);
    }
    return state;
  }

  canMakeRequest(scanId?: string): { allowed: boolean; reason?: DiagnosticStatus } {
    const state = this.getState(scanId);
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

  recordAttempt(scanId?: string): void {
    const state = this.getState(scanId);
    state.requestsAttempted++;
    if (state.requestsAttempted >= config.gemini.maxRequestsPerScan) {
      state.circuitOpen = true;
      state.circuitReason = 'request_budget_exhausted';
    }
  }

  tripCircuit(scanId: string | undefined, reason: DiagnosticStatus): void {
    const state = this.getState(scanId);
    state.circuitOpen = true;
    state.circuitReason = reason;
    this.logger.warn('Gemini circuit breaker tripped', {
      scanId: state.scanId,
      reason,
      requestsAttempted: state.requestsAttempted,
    });
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
    return this.getState(scanId).circuitOpen;
  }

  getCircuitReason(scanId?: string): DiagnosticStatus | undefined {
    return this.getState(scanId).circuitReason;
  }

  reset(scanId?: string): void {
    if (scanId) {
      this.states.delete(this.getKey(scanId));
    } else {
      this.states.clear();
    }
  }
}

export const geminiBudgetTracker = new GeminiBudgetTracker();
