/**
 * PageTracker for Raawi X Widget (Phase 5.5)
 * 
 * Monitors SPA navigation (pushState, replaceState, popstate, hashchange)
 * and meaningful DOM mutations to trigger freshness re-evaluation and safe invalidation.
 */

import type { MapApiClient } from './api-client';
import type { DomRemediator } from './dom-remediator';
import { computeLivePageFingerprint, evaluateFreshness } from './freshness-engine';

export interface PageTrackerOptions {
  apiClient: MapApiClient;
  domRemediator: DomRemediator;
  debounceMs?: number;
  onUrlChange?: (newUrl: string) => void;
  onStaleDetected?: (reason?: string) => void;
}

export interface RaawiHistoryRegistry {
  pushListeners: Set<() => void>;
  replaceListeners: Set<() => void>;
  originalPushState: typeof history.pushState | null;
  originalReplaceState: typeof history.replaceState | null;
  wrappedPushState: typeof history.pushState | null;
  wrappedReplaceState: typeof history.replaceState | null;
}

export const HISTORY_REGISTRY_KEY = '__RAAWI_HISTORY_REGISTRY__';

export function getHistoryRegistry(): RaawiHistoryRegistry {
  const target = typeof window !== 'undefined' ? (window as any) : (globalThis as any);
  if (!target[HISTORY_REGISTRY_KEY]) {
    target[HISTORY_REGISTRY_KEY] = {
      pushListeners: new Set<() => void>(),
      replaceListeners: new Set<() => void>(),
      originalPushState: null,
      originalReplaceState: null,
      wrappedPushState: null,
      wrappedReplaceState: null,
    };
  }
  return target[HISTORY_REGISTRY_KEY];
}

export function resetHistoryRegistryForTests(): void {
  const target = typeof window !== 'undefined' ? (window as any) : (globalThis as any);
  if (target && target[HISTORY_REGISTRY_KEY]) {
    const reg = target[HISTORY_REGISTRY_KEY] as RaawiHistoryRegistry;
    if (typeof history !== 'undefined') {
      if (reg.originalPushState && history.pushState === reg.wrappedPushState) {
        history.pushState = reg.originalPushState;
      }
      if (reg.originalReplaceState && history.replaceState === reg.wrappedReplaceState) {
        history.replaceState = reg.originalReplaceState;
      }
    }
    delete target[HISTORY_REGISTRY_KEY];
  }
}

export class PageTracker {
  private apiClient: MapApiClient;
  private domRemediator: DomRemediator;
  private debounceMs: number;
  private onUrlChangeCallback?: (newUrl: string) => void;
  private onStaleDetectedCallback?: (reason?: string) => void;

  private currentUrl: string = '';
  private mutationObserver: MutationObserver | null = null;
  private debounceTimer: any = null;
  private isDestroyed: boolean = false;

  private urlTransitionListener: (() => void) | null = null;
  private boundPopstateListener: ((e: PopStateEvent) => void) | null = null;
  private boundHashchangeListener: ((e: HashChangeEvent) => void) | null = null;

  constructor(options: PageTrackerOptions) {
    this.apiClient = options.apiClient;
    this.domRemediator = options.domRemediator;
    this.debounceMs = options.debounceMs ?? 300;
    this.onUrlChangeCallback = options.onUrlChange;
    this.onStaleDetectedCallback = options.onStaleDetected;

    if (typeof window !== 'undefined') {
      this.currentUrl = window.location.href;
      this.initSpaListeners();
      this.initMutationObserver();
    }
  }

  private initSpaListeners(): void {
    if (typeof window === 'undefined' || typeof history === 'undefined') return;

    const registry = getHistoryRegistry();

    // 1. Cooperative monkey-patch pushState (install once across instances)
    if (!registry.originalPushState) {
      registry.originalPushState = history.pushState;
      const wrappedPush = function (this: History, ...args: Parameters<typeof history.pushState>) {
        const result = registry.originalPushState!.apply(this, args);
        registry.pushListeners.forEach((listener) => {
          try {
            listener();
          } catch (e) {
            console.error('[RaawiX PageTracker] Error in pushState listener:', e);
          }
        });
        return result;
      };
      registry.wrappedPushState = wrappedPush;
      history.pushState = wrappedPush;
    }

    // 2. Cooperative monkey-patch replaceState (install once across instances)
    if (!registry.originalReplaceState) {
      registry.originalReplaceState = history.replaceState;
      const wrappedReplace = function (this: History, ...args: Parameters<typeof history.replaceState>) {
        const result = registry.originalReplaceState!.apply(this, args);
        registry.replaceListeners.forEach((listener) => {
          try {
            listener();
          } catch (e) {
            console.error('[RaawiX PageTracker] Error in replaceState listener:', e);
          }
        });
        return result;
      };
      registry.wrappedReplaceState = wrappedReplace;
      history.replaceState = wrappedReplace;
    }

    // 3. Register this instance's callback into shared registry
    this.urlTransitionListener = () => {
      this.handleUrlTransition();
    };
    registry.pushListeners.add(this.urlTransitionListener);
    registry.replaceListeners.add(this.urlTransitionListener);

    // 4. Listen to popstate
    this.boundPopstateListener = () => {
      this.handleUrlTransition();
    };
    window.addEventListener('popstate', this.boundPopstateListener);

    // 5. Listen to hashchange
    this.boundHashchangeListener = () => {
      this.handleUrlTransition();
    };
    window.addEventListener('hashchange', this.boundHashchangeListener);
  }

  private handleUrlTransition(): void {
    if (this.isDestroyed || typeof window === 'undefined') return;
    const newUrl = window.location.href;
    if (newUrl === this.currentUrl) return;

    this.currentUrl = newUrl;

    // 1. Abort prior in-flight requests from the previous page context
    this.apiClient.abortAllRequests();

    // 2. Revert any active remediation from previous page immediately
    this.domRemediator.revert();

    // 3. Notify callback
    if (this.onUrlChangeCallback) {
      this.onUrlChangeCallback(newUrl);
    }

    // 4. Trigger fresh page package fetch for new URL
    this.apiClient.fetchPagePackage(newUrl);
  }

  private initMutationObserver(): void {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;

    const targetNode = document.body || document.documentElement;
    if (!targetNode) return;

    this.mutationObserver = new MutationObserver((mutations) => {
      if (this.isDestroyed) return;

      // Filter out mutations that originated inside the widget
      const hasMeaningfulMutation = mutations.some((mutation) => {
        const target = mutation.target as HTMLElement;
        if (!target) return false;
        if (target.closest && target.closest('raawi-accessibility-widget')) return false;
        if (target.getAttribute && target.getAttribute('data-raawi-owned') === 'true') return false;
        return true;
      });

      if (!hasMeaningfulMutation) return;

      this.scheduleFreshnessCheck();
    });

    this.mutationObserver.observe(targetNode, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['title', 'role'],
    });
  }

  private scheduleFreshnessCheck(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.checkCurrentPageFreshness();
    }, this.debounceMs);
  }

  /**
   * Re-evaluates content freshness against the live DOM
   */
  public checkCurrentPageFreshness(): void {
    if (this.isDestroyed) return;

    const currentPackage = this.apiClient.getData();
    if (!currentPackage) return;

    const liveFp = computeLivePageFingerprint();
    const freshness = evaluateFreshness(currentPackage.fingerprint, liveFp);

    if (freshness.status === 'outdated') {
      // Immediately revert widget-owned remediation on stale detection
      this.domRemediator.revert();

      // Notify callback
      if (this.onStaleDetectedCallback) {
        this.onStaleDetectedCallback(freshness.reason);
      }

      // Mark client state as outdated
      (this.apiClient as any).notify('outdated', currentPackage, freshness.reason);
    }
  }

  public destroy(): void {
    this.isDestroyed = true;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    if (typeof window !== 'undefined') {
      if (this.boundPopstateListener) {
        window.removeEventListener('popstate', this.boundPopstateListener);
        this.boundPopstateListener = null;
      }
      if (this.boundHashchangeListener) {
        window.removeEventListener('hashchange', this.boundHashchangeListener);
        this.boundHashchangeListener = null;
      }

      // Unregister from cooperative history registry
      const registry = getHistoryRegistry();
      if (this.urlTransitionListener) {
        registry.pushListeners.delete(this.urlTransitionListener);
        registry.replaceListeners.delete(this.urlTransitionListener);
        this.urlTransitionListener = null;
      }

      // Safe teardown: Only restore if NO other Raawi instances are listening
      // AND history.pushState was NOT wrapped by host / third-party after us!
      if (registry.pushListeners.size === 0) {
        if (typeof history !== 'undefined' && history.pushState === registry.wrappedPushState) {
          history.pushState = registry.originalPushState!;
          registry.originalPushState = null;
          registry.wrappedPushState = null;
        }
      }

      if (registry.replaceListeners.size === 0) {
        if (typeof history !== 'undefined' && history.replaceState === registry.wrappedReplaceState) {
          history.replaceState = registry.originalReplaceState!;
          registry.originalReplaceState = null;
          registry.wrappedReplaceState = null;
        }
      }
    }
  }
}
