import type { Page } from 'playwright';

export interface StabilizationConfig {
  waitUntil?: 'domcontentloaded' | 'load' | 'networkidle';
  networkIdleMs?: number;
  stableDomMs?: number;
  maxWaitMs?: number;
  useReadyMarker?: boolean;
}

export interface StabilizationResult {
  readyMarkerHit: boolean;
  networkIdleAchieved: boolean;
  domStableAchieved: boolean;
  timeoutReached: boolean;
  waitDuration: number;
}

const DEFAULT_CONFIG: Required<StabilizationConfig> = {
  waitUntil: 'domcontentloaded',
  networkIdleMs: 800,
  stableDomMs: 600,
  maxWaitMs: 15000,
  useReadyMarker: true,
};

/**
 * Wait for page to be ready for SPA frameworks (React/Angular/Vue)
 * Implements robust waiting strategy without breaking existing pipeline
 */
export class PageStabilizer {
  /**
   * Wait for page stabilization before capturing DOM
   */
  static async waitForStable(
    page: Page,
    config: StabilizationConfig = {}
  ): Promise<StabilizationResult> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const startTime = Date.now();
    const result: StabilizationResult = {
      readyMarkerHit: false,
      networkIdleAchieved: false,
      domStableAchieved: false,
      timeoutReached: false,
      waitDuration: 0,
    };

    try {
      console.log('[WAIT] Starting page stabilization...');

      // Step 1: Wait for ready marker (if enabled and available)
      if (finalConfig.useReadyMarker) {
        try {
          const readyMarkerHit = await page.evaluate(() => {
            return (window as any).__SITE_READY__ === true;
          }).catch(() => false);

          if (readyMarkerHit) {
            result.readyMarkerHit = true;
            result.waitDuration = Date.now() - startTime;
            console.log('[WAIT] Ready marker hit, proceeding immediately');
            return result;
          }

          // Wait for ready marker with timeout
          const markerTimeout = Math.min(finalConfig.maxWaitMs, 3000);
          try {
            await page.waitForFunction(
              () => (window as any).__SITE_READY__ === true,
              { timeout: markerTimeout }
            );
            result.readyMarkerHit = true;
            result.waitDuration = Date.now() - startTime;
            console.log('[WAIT] Ready marker hit within timeout');
            return result;
          } catch {
            console.log('[WAIT] Ready marker not found, continuing with other strategies');
          }
        } catch (error) {
          console.log('[WAIT] Ready marker check failed, continuing:', error);
        }
      }

      // Step 2: Wait for network idle
      try {
        await page.waitForLoadState('networkidle', {
          timeout: finalConfig.maxWaitMs - (Date.now() - startTime),
        });
        result.networkIdleAchieved = true;
        console.log('[WAIT] Network idle achieved');
        
        // Additional wait for networkIdleMs
        await new Promise(resolve => setTimeout(resolve, finalConfig.networkIdleMs));
      } catch (error) {
        console.log('[WAIT] Network idle timeout, continuing with DOM stability check');
      }

      // Step 3: Wait for DOM stability
      const remainingTime = finalConfig.maxWaitMs - (Date.now() - startTime);
      if (remainingTime > 0) {
        const domStable = await this.waitForDomStability(
          page,
          finalConfig.stableDomMs,
          remainingTime
        );
        result.domStableAchieved = domStable;
        
        if (domStable) {
          console.log('[WAIT] DOM stable achieved');
        } else {
          console.log('[WAIT] DOM stability timeout, proceeding with best effort');
        }
      }

      result.waitDuration = Date.now() - startTime;

      // Check if we hit max timeout
      if (result.waitDuration >= finalConfig.maxWaitMs) {
        result.timeoutReached = true;
        console.log('[WAIT] Fallback due to timeout, proceeding with best effort');
      }

      return result;
    } catch (error) {
      result.waitDuration = Date.now() - startTime;
      console.log('[WAIT] Stabilization error, proceeding with best effort:', error);
      return result;
    }
  }

  /**
   * Wait for DOM to be stable (no changes in size/length)
   */
  private static async waitForDomStability(
    page: Page,
    stableDomMs: number,
    maxWaitMs: number
  ): Promise<boolean> {
    const sampleInterval = 200; // Sample every 200ms
    const samplesNeeded = Math.ceil(stableDomMs / sampleInterval);
    const samples: number[] = [];
    let stableCount = 0;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const currentSize = await page.evaluate(() => {
          return document.documentElement.innerHTML.length;
        });

        samples.push(currentSize);

        // Keep only last N samples
        if (samples.length > samplesNeeded) {
          samples.shift();
        }

        // Check stability: if we have enough samples, check if delta < 1%
        if (samples.length >= samplesNeeded) {
          const min = Math.min(...samples);
          const max = Math.max(...samples);
          const delta = max - min;
          const percentChange = min > 0 ? (delta / min) * 100 : 0;

          if (percentChange < 1) {
            stableCount++;
            if (stableCount >= 2) {
              // Stable for 2 consecutive checks
              return true;
            }
          } else {
            stableCount = 0;
          }
        }

        await new Promise(resolve => setTimeout(resolve, sampleInterval));
      } catch (error) {
        // If evaluation fails, consider it stable (best effort)
        console.log('[WAIT] DOM stability check error, assuming stable:', error);
        return true;
      }
    }

    return false;
  }
}

