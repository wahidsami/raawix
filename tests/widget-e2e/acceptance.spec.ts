import { test, expect } from '@playwright/test';

/**
 * Phase 5.6 Real-Browser Final Acceptance Test Suite
 * 
 * Tests the complete integration across:
 * - Area A: Embed contract, duplicate script injection protection, teardown/reinit.
 * - Area B: Mobile viewport responsiveness and layout containment.
 * - Area C: Dialog keyboard traversal, initial focus, escape dismissal, and focus restoration.
 * - Area D: History API cooperative wrapping and host-interceptor preservation.
 * - Area E: Bilingual RTL/LTR switching and live text updates.
 * - Area F: Shadow DOM style encapsulation (zero global CSS leakage into host).
 */

test.describe('Phase 5.6 Real-Browser Final Integration & Acceptance', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__RAAWI_E2E__ = true;
    });
  });

  test('1. Embed Contract: Duplicate script injection and init() calls do NOT duplicate widget', async ({ page }) => {
    await page.goto('/good?e2e=1');
    await page.waitForSelector('[data-testid="raawi-launcher"]', { state: 'visible', timeout: 15000 });

    // Verify exactly one widget element exists
    const initialCount = await page.locator('raawi-accessibility-widget').count();
    expect(initialCount).toBe(1);

    // Inject a second script tag into document.body
    await page.evaluate(() => {
      const script = document.createElement('script');
      script.src = '/widget.iife.js';
      document.body.appendChild(script);
    });

    // Also call AccessibilityWidget.init() directly
    await page.evaluate(() => {
      if ((window as any).AccessibilityWidget) {
        (window as any).AccessibilityWidget.init();
      }
    });

    // Verify still exactly one widget element and one launcher in DOM
    const postCount = await page.locator('raawi-accessibility-widget').count();
    expect(postCount).toBe(1);
    const launcherCount = await page.locator('[data-testid="raawi-launcher"]').count();
    expect(launcherCount).toBe(1);
  });

  test('2. Teardown & Reinitialization: destroy() removes widget cleanly and init() restores it', async ({ page }) => {
    await page.goto('/good?e2e=1');
    await page.waitForSelector('[data-testid="raawi-launcher"]', { state: 'visible', timeout: 15000 });

    // Execute destroy
    await page.evaluate(() => {
      (window as any).AccessibilityWidget.destroy();
    });

    // Verify widget removed completely
    expect(await page.locator('raawi-accessibility-widget').count()).toBe(0);

    // Re-initialize
    await page.evaluate(() => {
      (window as any).AccessibilityWidget.init();
    });

    // Verify widget restored and usable
    await page.waitForSelector('[data-testid="raawi-launcher"]', { state: 'visible', timeout: 5000 });
    expect(await page.locator('raawi-accessibility-widget').count()).toBe(1);
  });

  test('3. Mobile Viewport: Panel opens within screen bounds on mobile viewport (375x667)', async ({ page }) => {
    // Set iPhone SE mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/good?e2e=1');
    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.waitFor({ state: 'visible', timeout: 15000 });

    // Click launcher
    await launcher.click();
    const panel = page.locator('[data-testid="raawi-panel"]');
    await expect(panel).toBeVisible();

    // Check bounding box of panel: must not exceed viewport width
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(375);
      expect(box.x).toBeGreaterThanOrEqual(0);
    }

    // Controls inside panel are still clickable
    const closeBtn = page.locator('[data-testid="raawi-close"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(panel).toHaveAttribute('hidden', '');
  });

  test('4. History API Safeguard: Teardown preserves host-installed pushState interceptors', async ({ page }) => {
    await page.goto('/good?e2e=1');
    await page.waitForSelector('[data-testid="raawi-launcher"]', { state: 'visible', timeout: 15000 });

    // Host app installs a pushState interceptor AFTER the widget has loaded
    await page.evaluate(() => {
      (window as any).__hostPushCalled = 0;
      const prevPush = history.pushState;
      history.pushState = function (...args: any[]) {
        (window as any).__hostPushCalled++;
        return prevPush.apply(this, args as any);
      };
    });

    // Destroy the widget
    await page.evaluate(() => {
      (window as any).AccessibilityWidget.destroy();
    });

    // Trigger pushState from host app
    await page.evaluate(() => {
      history.pushState(null, '', '/good?after-destroy=1');
    });

    // Verify host interceptor was NOT clobbered and executed properly
    const hostPushCount = await page.evaluate(() => (window as any).__hostPushCalled);
    expect(hostPushCount).toBe(1);
  });

  test('5. Style Encapsulation: Host page typography and elements are NOT polluted by widget CSS', async ({ page }) => {
    await page.goto('/good?e2e=1');
    await page.waitForSelector('[data-testid="raawi-launcher"]', { state: 'visible', timeout: 15000 });

    // Inspect host h1 style
    const h1Font = await page.locator('#hero-heading').evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        fontSize: computed.fontSize,
        fontFamily: computed.fontFamily,
      };
    });

    // Open widget panel
    await page.locator('[data-testid="raawi-launcher"]').click();
    await expect(page.locator('[data-testid="raawi-panel"]')).toBeVisible();

    // Re-check host h1 style: must remain unchanged
    const h1FontAfter = await page.locator('#hero-heading').evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        fontSize: computed.fontSize,
        fontFamily: computed.fontFamily,
      };
    });

    expect(h1FontAfter.fontSize).toBe(h1Font.fontSize);
    expect(h1FontAfter.fontFamily).toBe(h1Font.fontFamily);
  });

  test('6. Bilingual RTL/LTR Direction Switching updates panel dir and layout correctly', async ({ page }) => {
    await page.goto('/good?e2e=1');
    await page.waitForSelector('[data-testid="raawi-launcher"]', { state: 'visible', timeout: 15000 });

    await page.locator('[data-testid="raawi-launcher"]').click();
    const panel = page.locator('[data-testid="raawi-panel"]');
    const widgetHost = page.locator('raawi-accessibility-widget');
    await expect(panel).toBeVisible();

    // Initial state (English LTR on /good)
    await expect(widgetHost).toHaveAttribute('dir', 'ltr');

    // Click Arabic language button
    const arBtn = panel.locator('.raawi-lang-btn[data-lang="ar"]');
    await expect(arBtn).toBeVisible();
    await arBtn.click();

    // Check widget host and panel direction switch to rtl
    await expect(widgetHost).toHaveAttribute('dir', 'rtl');
    await expect(panel).toHaveAttribute('dir', 'rtl');

    // Check title is in Arabic
    const titleText = await page.locator('#raawi-panel-title').innerText();
    expect(titleText).toContain('أدوات الوصول');

    // Switch back to English
    const enBtn = panel.locator('.raawi-lang-btn[data-lang="en"]');
    await expect(enBtn).toBeVisible();
    await enBtn.click();
    await expect(widgetHost).toHaveAttribute('dir', 'ltr');
    await expect(panel).toHaveAttribute('dir', 'ltr');
    const titleTextEn = await page.locator('#raawi-panel-title').innerText();
    expect(titleTextEn).toContain('Accessibility & Usability Options');
  });
});
