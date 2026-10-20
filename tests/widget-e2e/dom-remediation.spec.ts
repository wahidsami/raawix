import { test, expect } from '@playwright/test';

test.describe('Phase 5.4 Real-Browser AssistiveMap Integration & Safe Remediation', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept page package API request with mock fixture
    await page.route('**/api/widget/page-package*', async (route) => {
      const url = new URL(route.request().url());

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          targetUrl: url.searchParams.get('url') || 'http://localhost:4173/good',
          matchConfidence: 'high',
          guidance: {
            summary: 'Unified Digital Government Portal for All Citizens and Residents',
            landmarks: [
              { role: 'banner', label: 'Main Header', selector: 'header' },
              { role: 'main', label: 'Main Content', selector: 'main' },
              { role: 'contentinfo', label: 'Footer', selector: 'footer' },
            ],
          },
          assistiveMap: {
            imageDescriptions: [
              {
                selector: '#e2e-missing-img',
                description: 'Support and assistance services illustration',
                confidence: 'high',
              },
              {
                selector: '#e2e-revert-img',
                description: 'Service portal overview banner',
                confidence: 'high',
              },
            ],
            labelOverrides: [
              {
                selector: '#e2e-unlabeled-btn',
                ariaLabel: 'Open and close main navigation menu',
                confidence: 'high',
              },
              {
                selector: '#e2e-revert-btn',
                ariaLabel: 'Toggle quick actions panel',
                confidence: 'high',
              },
            ],
          },
        }),
      });
    });

    await page.goto('/good?e2e=1');
    await page.waitForSelector('[data-testid="raawi-launcher"]', { state: 'visible', timeout: 15000 });
  });

  test('1. Page Insights card displays map status badge, summary and landmarks count', async ({ page }) => {
    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    // Verify Page Insights card exists in Assist tab
    const insightsCard = page.locator('[data-testid="raawi-insights-card"]');
    await expect(insightsCard).toBeVisible();

    // Status badge shows map is active/ready
    const statusBadge = page.locator('[data-testid="raawi-map-status-badge"]');
    await expect(statusBadge).toBeVisible();

    // Summary and landmarks badges rendered
    await expect(insightsCard).toContainText('Unified Digital Government Portal');
    await expect(insightsCard).toContainText('Landmarks');
  });

  test('2. Remediation toggle is opt-in by default and safely enriches missing semantics', async ({ page }) => {
    // Inject a test target without alt and an icon button without label into host page
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'e2e-test-targets';
      container.innerHTML = `
        <img id="e2e-missing-img" src="/placeholder.png">
        <img id="e2e-authored-img" src="/logo.png" alt="Official Department Logo">
        <img id="e2e-decorative-img" src="/line.png" alt="">
        <button id="e2e-unlabeled-btn"><svg></svg></button>
      `;
      document.body.appendChild(container);
    });

    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    const remediationToggle = page.locator('[data-testid="raawi-tool-remediation"]');
    const remediationLabel = page.locator('label:has(#raawi-toggle-remediation)');
    await expect(remediationLabel).toBeVisible();
    await expect(remediationToggle).not.toBeChecked(); // Opt-in default

    // Before activation, missing image has no alt
    const hasAltBefore = await page.evaluate(() => {
      const img = document.getElementById('e2e-missing-img');
      return img?.hasAttribute('alt');
    });
    expect(hasAltBefore).toBe(false);

    // Turn ON safe auto-remediation via toggle label
    await remediationLabel.click();
    await expect(remediationToggle).toBeChecked();

    // Verify alt added to image missing description
    const imgAlt = await page.evaluate(() => {
      return document.getElementById('e2e-missing-img')?.getAttribute('alt');
    });
    expect(imgAlt).toBe('Support and assistance services illustration');

    // Verify aria-label added to unlabeled button
    const btnLabel = await page.evaluate(() => {
      return document.getElementById('e2e-unlabeled-btn')?.getAttribute('aria-label');
    });
    expect(btnLabel).toBe('Open and close main navigation menu');

    // Verify authored alt was strictly preserved
    const authoredAlt = await page.evaluate(() => {
      return document.getElementById('e2e-authored-img')?.getAttribute('alt');
    });
    expect(authoredAlt).toBe('Official Department Logo');

    // Verify intentional decorative alt="" was strictly preserved
    const decorativeAlt = await page.evaluate(() => {
      return document.getElementById('e2e-decorative-img')?.getAttribute('alt');
    });
    expect(decorativeAlt).toBe('');
  });

  test('3. Reverting remediation or clicking reset cleans up all widget-applied attributes', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'e2e-test-targets-revert';
      container.innerHTML = `
        <img id="e2e-revert-img" src="/banner.png">
        <button id="e2e-revert-btn"><svg></svg></button>
      `;
      document.body.appendChild(container);
    });

    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    const remediationToggle = page.locator('[data-testid="raawi-tool-remediation"]');
    const remediationLabel = page.locator('label:has(#raawi-toggle-remediation)');
    await remediationLabel.click();
    await expect(remediationToggle).toBeChecked();

    // Verify applied
    const appliedState = await page.evaluate(() => {
      const img = document.getElementById('e2e-revert-img');
      const btn = document.getElementById('e2e-revert-btn');
      return {
        imgAlt: img?.getAttribute('alt'),
        btnLabel: btn?.getAttribute('aria-label'),
      };
    });
    expect(appliedState.imgAlt).toBeTruthy();
    expect(appliedState.btnLabel).toBeTruthy();

    // Toggle OFF via label click
    await remediationLabel.click();
    await expect(remediationToggle).not.toBeChecked();

    // Verify completely removed without trace
    const revertedState = await page.evaluate(() => {
      const img = document.getElementById('e2e-revert-img');
      const btn = document.getElementById('e2e-revert-btn');
      return {
        imgHasAlt: img?.hasAttribute('alt'),
        btnHasLabel: btn?.hasAttribute('aria-label'),
      };
    });
    expect(revertedState.imgHasAlt).toBe(false);
    expect(revertedState.btnHasLabel).toBe(false);

    // Test Reset All button
    await remediationLabel.click();
    await expect(remediationToggle).toBeChecked();

    const resetBtn = page.locator('[data-testid="raawi-reset-all"]');
    await resetBtn.click();

    await expect(remediationToggle).not.toBeChecked();
    const afterResetHasAlt = await page.evaluate(() => {
      return document.getElementById('e2e-revert-img')?.hasAttribute('alt');
    });
    expect(afterResetHasAlt).toBe(false);
  });

  test('4. Bilingual localization updates Page Insights text in AR and EN', async ({ page }) => {
    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    // Switch to English
    const enBtn = page.locator('button.raawi-lang-btn[data-lang="en"]');
    await enBtn.click();

    // Verify English labels in Page Insights
    const insightsCard = page.locator('[data-testid="raawi-insights-card"]');
    await expect(insightsCard).toContainText('Page Insights');
    await expect(insightsCard).toContainText('Assistive Map Active');
    await expect(insightsCard).toContainText('Enable DOM Auto-Remediation');

    // Switch to Arabic
    const arBtn = page.locator('button.raawi-lang-btn[data-lang="ar"]');
    await arBtn.click();

    await expect(insightsCard).toContainText('معلومات الصفحة');
    await expect(insightsCard).toContainText('خريطة الوصول مفعلة');
    await expect(insightsCard).toContainText('تفعيل معالجة الوصول التلقائية');
  });

  test('5. Graceful offline/error handling preserves independent display tools', async ({ page }) => {
    // Override route to fail network request completely
    await page.unroute('**/api/widget/page-package*');
    await page.route('**/api/widget/page-package*', (route) => route.abort('failed'));

    await page.goto('/good?e2e=1');
    await page.waitForSelector('[data-testid="raawi-launcher"]', { state: 'visible', timeout: 15000 });

    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    // Insights card should show offline badge and disabled remediation toggle
    const statusBadge = page.locator('[data-testid="raawi-map-status-badge"]');
    await expect(statusBadge).toBeVisible();

    const remediationToggle = page.locator('[data-testid="raawi-tool-remediation"]');
    await expect(remediationToggle).toBeDisabled();

    // Independent display tools (Vision tab) must remain 100% operational
    const visionTab = page.locator('.raawi-tab-btn[data-tab="vision"]');
    await visionTab.click();

    const incBtn = page.locator('#raawi-btn-text-inc');
    await incBtn.click();
    const stepperVal = page.locator('#raawi-text-size-val');
    await expect(stepperVal).toHaveText('110%');

    // High contrast toggle works
    const contrastLabel = page.locator('label:has(#raawi-toggle-contrast)');
    await contrastLabel.click();
    const hasContrast = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-raawi-contrast-mode');
    });
    expect(hasContrast).toBe('true');
  });
});
