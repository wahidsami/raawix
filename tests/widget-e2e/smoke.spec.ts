import { test, expect } from '@playwright/test';

test.describe('Widget Smoke E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__RAAWI_E2E__ = true;
    });
  });

  test('opens widget on good page', async ({ page }) => {
    await page.goto('/good?e2e=1');
    await page.waitForSelector('[data-testid="raawi-launcher"]', { timeout: 15000 });

    await page.locator('[data-testid="raawi-launcher"]:visible').first().click({ force: true });
    await expect(page.locator('[data-testid="raawi-panel"]').first()).toHaveCount(1);
  });
});
