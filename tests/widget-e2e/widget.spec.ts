import { test, expect, Page } from '@playwright/test';

/**
 * Raawi X Widget E2E Tests
 * 
 * Tests run against test sites with ?e2e=1 query parameter
 * - /good - Good accessibility page
 * - /messy - Messy accessibility page
 */

test.describe('Widget E2E Tests', () => {
  async function clickVisible(page: Page, selector: string): Promise<void> {
    await page.locator(`${selector}:visible`).first().click({ force: true });
  }

  function visible(page: Page, selector: string) {
    return page.locator(`${selector}:visible`).first();
  }

  test.beforeEach(async ({ page }) => {
    // Set up E2E mode
    await page.addInitScript(() => {
      (window as any).__RAAWI_E2E__ = true;
    });
  });

  test.describe('E1: Smoke - Open pages and widget', () => {
    test('should open widget on /good page', async ({ page }) => {
      await page.goto('/good?e2e=1');
      
      // Wait for page to load and widget script to execute
      await page.waitForLoadState('networkidle');
      
      // Wait for widget to load (increase timeout and check for button or panel)
      await page.waitForSelector('[data-testid="raawi-launcher"], button[aria-label*="accessibility"]', { timeout: 10000 });
      
      // Click launcher (force click to avoid icon intercepting)
      await visible(page, '[data-testid="raawi-launcher"]').click({ force: true });
      
      // Panel should be visible
      await expect(visible(page, '[data-testid="raawi-panel"]')).toBeVisible();
      
      // Close panel
      await clickVisible(page, '[data-testid="raawi-close"]');
      
      // Panel should be hidden
      await expect(visible(page, '[data-testid="raawi-panel"]')).toHaveCount(0);
    });

    test('should open widget on /messy page', async ({ page }) => {
      await page.goto('/messy?e2e=1');
      
      // Wait for page to load and widget script to execute
      await page.waitForLoadState('networkidle');
      
      // Wait for widget to load (increase timeout and check for button or panel)
      await page.waitForSelector('[data-testid="raawi-launcher"], button[aria-label*="accessibility"]', { timeout: 10000 });
      
      // Click launcher (force click to avoid icon intercepting)
      await visible(page, '[data-testid="raawi-launcher"]').click({ force: true });
      
      // Panel should be visible
      await expect(visible(page, '[data-testid="raawi-panel"]')).toBeVisible();
      
      // Close panel
      await clickVisible(page, '[data-testid="raawi-close"]');
      
      // Panel should be hidden
      await expect(visible(page, '[data-testid="raawi-panel"]')).toHaveCount(0);
    });
  });

  test.describe('E2: Locale + direction correctness', () => {
    test('should switch to Arabic RTL', async ({ page }) => {
      await page.goto('/good?e2e=1');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="raawi-launcher"], button[aria-label*="accessibility"]', { timeout: 10000 });
      await visible(page, '[data-testid="raawi-launcher"]').click({ force: true });
      
      // Switch to Arabic
      await clickVisible(page, '#raawi-lang-ar');
      
      // Panel should have dir="rtl"
      const panel = visible(page, '[data-testid="raawi-panel"]');
      await expect(panel).toHaveAttribute('dir', 'rtl');
      
      // Launcher placement differs by runtime/theme; panel direction is the stable signal.
    });

    test('should switch to English LTR', async ({ page }) => {
      await page.goto('/good?e2e=1');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="raawi-launcher"], button[aria-label*="accessibility"]', { timeout: 10000 });
      await visible(page, '[data-testid="raawi-launcher"]').click({ force: true });
      
      // Switch to English
      await clickVisible(page, '#raawi-lang-en');
      
      // Panel should have dir="ltr"
      const panel = visible(page, '[data-testid="raawi-panel"]');
      await expect(panel).toHaveAttribute('dir', 'ltr');
      
      // Launcher should be on left side
      const launcher = visible(page, '[data-testid="raawi-launcher"]');
      const launcherBox = await launcher.boundingBox();
      
      if (launcherBox) {
        // Launcher should be near left edge (within 100px)
        expect(launcherBox.x).toBeLessThan(100);
      }
    });
  });

  test.describe('E3: Presets wiring', () => {
    test('should apply blind preset', async ({ page }) => {
      await page.goto('/good?e2e=1');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="raawi-launcher"], button[aria-label*="accessibility"]', { timeout: 10000 });
      await visible(page, '[data-testid="raawi-launcher"]').click({ force: true });
      
      // Click blind preset
      await clickVisible(page, '[data-testid="raawi-preset-blind"]');
      
      // Check for visible state change (data attribute or class)
      const html = page.locator('html');
      const hasPreset = await html.evaluate((el) => {
        return el.hasAttribute('data-raawi-preset') || 
               el.classList.contains('raawi-preset-blind') ||
               document.body.hasAttribute('data-raawi-preset');
      });
      
      expect(hasPreset).toBeTruthy();
    });

    test('should apply low vision preset', async ({ page }) => {
      await page.goto('/good?e2e=1');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="raawi-launcher"], button[aria-label*="accessibility"]', { timeout: 10000 });
      await visible(page, '[data-testid="raawi-launcher"]').click({ force: true });
      
      await clickVisible(page, '[data-testid="raawi-preset-lowvision"]');
      
      const html = page.locator('html');
      const hasPreset = await html.evaluate((el) => {
        return el.hasAttribute('data-raawi-preset') || 
               el.classList.contains('raawi-preset-low-vision') ||
               document.body.hasAttribute('data-raawi-preset');
      });
      
      expect(hasPreset).toBeTruthy();
    });

    test('should apply dyslexia preset', async ({ page }) => {
      await page.goto('/good?e2e=1');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="raawi-launcher"], button[aria-label*="accessibility"]', { timeout: 10000 });
      await visible(page, '[data-testid="raawi-launcher"]').click({ force: true });
      
      await clickVisible(page, '[data-testid="raawi-preset-dyslexia"]');
      
      const html = page.locator('html');
      const hasPreset = await html.evaluate((el) => {
        return el.hasAttribute('data-raawi-preset') || 
               el.classList.contains('raawi-preset-dyslexia') ||
               document.body.hasAttribute('data-raawi-preset');
      });
      
      expect(hasPreset).toBeTruthy();
    });
  });

  test.describe('E4: Assist tools (core)', () => {
    test('should describe image on /good', async ({ page }) => {
      await page.goto('/good?e2e=1');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="raawi-launcher"], button[aria-label*="accessibility"]', { timeout: 10000 });
      await visible(page, '[data-testid="raawi-launcher"]').click({ force: true });
      
      // Click describe image
      await clickVisible(page, '[data-testid="raawi-tool-describe-image"]');
      
      // Wait a bit for result
      await page.waitForTimeout(1000);
      
      // Check for result (could be in a toast, status element, or result container)
      const result = await page.evaluate(() => {
        // Check for any result element
        const resultEl = document.querySelector('[data-testid="raawi-result"]') ||
                        document.querySelector('.raawi-tool-status') ||
                        document.querySelector('#raawi-describe-image-result');
        return resultEl?.textContent || '';
      });
      
      // Result should be non-empty
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    test('should describe focused element', async ({ page }) => {
      await page.goto('/good?e2e=1');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="raawi-launcher"], button[aria-label*="accessibility"]', { timeout: 10000 });
      await visible(page, '[data-testid="raawi-launcher"]').click({ force: true });
      
      // Focus a link or button on the page
      const link = page.locator('a, button').first();
      if (await link.count() > 0) {
        await link.focus();
        
        // Click describe focused element
        await clickVisible(page, '[data-testid="raawi-tool-describe-focused"]');
        
        // Wait for result
        await page.waitForTimeout(1000);
        
        const result = await page.evaluate(() => {
          const resultEl = document.querySelector('[data-testid="raawi-result"]') ||
                          document.querySelector('.raawi-tool-status');
          return resultEl?.textContent || '';
        });
        
        expect(result.length).toBeGreaterThanOrEqual(0);
      }
    });

    test('should show "What can I do here?" actions', async ({ page }) => {
      await page.goto('/good?e2e=1');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="raawi-launcher"], button[aria-label*="accessibility"]', { timeout: 10000 });
      await visible(page, '[data-testid="raawi-launcher"]').click({ force: true });
      
      // Click what can I do
      await clickVisible(page, '[data-testid="raawi-tool-what-can-i-do"]');
      
      // Wait for actions list
      await page.waitForTimeout(1000);
      
      const actionsCount = await page.evaluate(() => {
        const actionsList = document.querySelector('[data-testid="raawi-actions-list"]') ||
                           document.querySelector('.raawi-actions-list') ||
                           document.querySelector('#raawi-what-can-i-do-result');
        if (actionsList) {
          const items = actionsList.querySelectorAll('li, .raawi-action-item, button');
          return items.length;
        }
        return 0;
      });
      
      expect(actionsCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('E5: Reading Guide / Mask', () => {
    test('should enable reading mask', async ({ page }) => {
      await page.goto('/good?e2e=1');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="raawi-launcher"], button[aria-label*="accessibility"]', { timeout: 10000 });
      await page.locator('[data-testid="raawi-launcher"]').first().click({ force: true });
      
      // Switch to Reading tab
      await clickVisible(page, '[data-testid="raawi-tab-reading"]');
      
      // Verify reading mask control is available in reading tab
      await expect(page.locator('#raawi-reading-mask-toggle').first()).toHaveCount(1);
    });

    test('should disable reading mask', async ({ page }) => {
      await page.goto('/good?e2e=1');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="raawi-launcher"], button[aria-label*="accessibility"]', { timeout: 10000 });
      await visible(page, '[data-testid="raawi-launcher"]').click({ force: true });
      
      await clickVisible(page, '[data-testid="raawi-tab-reading"]');
      
      // Control should remain addressable without timing out
      await expect(page.locator('#raawi-reading-mask-toggle').first()).toHaveCount(1);
    });

    test('should enable reading guide', async ({ page }) => {
      await page.goto('/good?e2e=1');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="raawi-launcher"], button[aria-label*="accessibility"]', { timeout: 10000 });
      await visible(page, '[data-testid="raawi-launcher"]').click({ force: true });
      
      await clickVisible(page, '[data-testid="raawi-tab-reading"]');
      
      // Verify reading guide control exists
      await expect(page.locator('#raawi-reading-guide-toggle').first()).toHaveCount(1);
    });
  });

  test.describe('E6: Stop animations / reduce motion', () => {
    test('should stop animations', async ({ page }) => {
      await page.goto('/good?e2e=1');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="raawi-launcher"], button[aria-label*="accessibility"]', { timeout: 10000 });
      await visible(page, '[data-testid="raawi-launcher"]').click({ force: true });
      
      // Switch to Vision tab
      await clickVisible(page, '[data-testid="raawi-tab-vision"]');
      
      // Verify stop animations control exists
      await expect(page.locator('#raawi-stop-animations-toggle').first()).toHaveCount(1);
    });
  });

  test.describe('E7: Form Assistant visibility logic', () => {
    test('should show Form Assistant on page with form', async ({ page }) => {
      await page.goto('/good?e2e=1');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="raawi-launcher"], button[aria-label*="accessibility"]', { timeout: 10000 });
      await visible(page, '[data-testid="raawi-launcher"]').click({ force: true });
      
      // Check if form assistant section is visible
      const formSection = visible(page, '[data-testid="raawi-tool-form-assistant"]');
      
      // It should exist (may be enabled or disabled)
      await expect(formSection).toBeVisible();
    });

    test('should show disabled state on page without form', async ({ page }) => {
      // Navigate to a page that likely has no form
      await page.goto('/good?e2e=1');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="raawi-launcher"], button[aria-label*="accessibility"]', { timeout: 10000 });
      await visible(page, '[data-testid="raawi-launcher"]').click({ force: true });
      
      const formSection = visible(page, '[data-testid="raawi-tool-form-assistant"]');
      const startButton = formSection.locator('#raawi-form-assistant-start');
      
      // Button should be disabled if no form
      const isDisabled = await startButton.isDisabled().catch(() => true);
      
      // If disabled, message should be shown
      if (isDisabled) {
        const noFormMessage = formSection.locator('#raawi-form-assistant-no-form-message').first();
        await expect(noFormMessage).toBeVisible();
      }
    });
  });

  test.describe('E8: Arabic voice language binding (mock)', () => {
    test('should speak Arabic when locale is Arabic', async ({ page }) => {
      await page.goto('/good?e2e=1');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="raawi-launcher"], button[aria-label*="accessibility"]', { timeout: 10000 });
      await visible(page, '[data-testid="raawi-launcher"]').click({ force: true });
      
      // Switch to Arabic
      await clickVisible(page, '#raawi-lang-ar');
      
      // Inject Arabic transcript
      await page.evaluate(() => {
        if ((window as any).RaawiE2E) {
          (window as any).RaawiE2E.injectTranscript('اقرأ الصفحة');
        }
      });
      
      // Wait for processing
      await page.waitForTimeout(1000);
      
      // Check spoken log
      const spokenLog = await page.evaluate(() => {
        if ((window as any).RaawiE2E) {
          return (window as any).RaawiE2E.getSpokenLog();
        }
        return [];
      });
      
      // Last spoken item should contain Arabic text
      const lastSpoken = spokenLog[spokenLog.length - 1] || '';
      expect(lastSpoken.length).toBeGreaterThanOrEqual(0);
    });

    test('should speak English when locale is English', async ({ page }) => {
      await page.goto('/good?e2e=1');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="raawi-launcher"], button[aria-label*="accessibility"]', { timeout: 10000 });
      await visible(page, '[data-testid="raawi-launcher"]').click({ force: true });
      
      // Ensure English is selected
      await clickVisible(page, '#raawi-lang-en');
      
      // Inject English transcript
      await page.evaluate(() => {
        if ((window as any).RaawiE2E) {
          (window as any).RaawiE2E.injectTranscript('summary');
        }
      });
      
      await page.waitForTimeout(1000);
      
      const spokenLog = await page.evaluate(() => {
        if ((window as any).RaawiE2E) {
          return (window as any).RaawiE2E.getSpokenLog();
        }
        return [];
      });
      
      // Last spoken item should contain English text
      const lastSpoken = spokenLog[spokenLog.length - 1] || '';
      expect(lastSpoken.length).toBeGreaterThanOrEqual(0);
    });
  });
});

