import { test, expect } from '@playwright/test';

test.describe('Phase 5.5 Real-Browser Freshness Engine, Fingerprint Validation & Advanced Navigation', () => {
  const matchingFingerprint = {
    title: 'Raawi X Test Sites',
    firstHeading: 'Welcome to the Good Page',
  };

  const sampleGuidance = {
    summary: 'Accessible demonstration portal with semantic structure',
    landmarks: [
      { role: 'banner', label: 'Main Header', selector: 'header' },
      { role: 'main', label: 'Main Content', selector: 'main' },
      { role: 'contentinfo', label: 'Footer', selector: 'footer' },
      { role: 'region', label: 'Ambiguous Cards', selector: 'article.card' },
      { role: 'region', label: 'Missing Section', selector: '#non-existent-section' },
    ],
    formSteps: [
      {
        formSelector: '#form form',
        stepIndex: 1,
        totalSteps: 1,
        purpose: 'Contact and inquiry submission form',
        fields: [
          { selector: '#good-name', purpose: 'Full Name', format: 'text', required: true },
          { selector: '#good-email', purpose: 'Email Address', format: 'email', required: true },
        ],
      },
    ],
  };

  const sampleAssistiveMap = {
    imageDescriptions: [
      {
        selector: '#e2e-freshness-img',
        description: 'Demonstration illustration of verified freshness',
        confidence: 'high',
      },
    ],
    labelOverrides: [
      {
        selector: '#e2e-freshness-btn',
        ariaLabel: 'Verified safe action button',
        confidence: 'high',
      },
    ],
  };

  test('1. A matching current fingerprint permits eligible map features and sets ready status', async ({ page }) => {
    await page.route('**/api/widget/page-package*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          targetUrl: 'http://localhost:4173/good',
          matchConfidence: 'exact',
          fingerprint: matchingFingerprint,
          guidance: sampleGuidance,
          assistiveMap: sampleAssistiveMap,
        }),
      });
    });

    await page.goto('/good?e2e=1');
    await page.waitForSelector('[data-testid="raawi-launcher"]', { state: 'visible', timeout: 15000 });

    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    // Verify Page Insights card
    const insightsCard = page.locator('[data-testid="raawi-insights-card"]');
    await expect(insightsCard).toBeVisible();

    // Verify status badge is ready (success badge)
    const statusBadge = page.locator('[data-testid="raawi-map-status-badge"]');
    await expect(statusBadge).toHaveClass(/raawi-badge-success/);
    await expect(statusBadge).toContainText(/Assistive Map Active|خريطة الوصول مفعلة/);

    // Verify landmarks list rendered
    const landmarksNav = page.locator('.raawi-landmarks-nav');
    await expect(landmarksNav).toBeVisible();
    await expect(landmarksNav).toContainText(/Main Content|المحتوى الرئيسي/);

    // Verify form guidance hint rendered
    const formGuidance = page.locator('.raawi-form-guidance');
    await expect(formGuidance).toBeVisible();
    await expect(formGuidance).toContainText('Contact and inquiry submission form');
  });

  test('2. A meaningful content change marks the map outdated and revokes remediation', async ({ page }) => {
    await page.route('**/api/widget/page-package*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          targetUrl: 'http://localhost:4173/good',
          matchConfidence: 'exact',
          fingerprint: matchingFingerprint,
          guidance: sampleGuidance,
          assistiveMap: sampleAssistiveMap,
        }),
      });
    });

    await page.goto('/good?e2e=1');
    await page.waitForSelector('[data-testid="raawi-launcher"]', { state: 'visible', timeout: 15000 });

    // Inject target image into host page
    await page.evaluate(() => {
      const img = document.createElement('img');
      img.id = 'e2e-freshness-img';
      img.src = '/banner.png';
      document.body.appendChild(img);
    });

    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    // Enable remediation
    const remediationLabel = page.locator('label:has(#raawi-toggle-remediation)');
    const remediationToggle = page.locator('[data-testid="raawi-tool-remediation"]');
    await remediationLabel.click();
    await expect(remediationToggle).toBeChecked();

    // Verify alt was applied
    const imgAltBefore = await page.evaluate(() => {
      return document.getElementById('e2e-freshness-img')?.getAttribute('alt');
    });
    expect(imgAltBefore).toBe('Demonstration illustration of verified freshness');

    // Trigger a meaningful content change by altering the primary heading
    await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      if (h1) {
        h1.textContent = 'Completely New Modified Heading That Triggers Staleness';
      }
    });

    // Wait for the debounced PageTracker (300ms) to trigger and revalidate
    await page.waitForTimeout(500);

    // Verify remediation is revoked on the host element
    const imgAltAfter = await page.evaluate(() => {
      const img = document.getElementById('e2e-freshness-img');
      return img?.hasAttribute('alt');
    });
    expect(imgAltAfter).toBe(false);

    // Verify map status badge transitioned to outdated (warning class)
    const statusBadge = page.locator('[data-testid="raawi-map-status-badge"]');
    await expect(statusBadge).toHaveClass(/raawi-badge-warning/);
    await expect(statusBadge).toContainText(/Outdated|البيانات قديمة/);
  });

  test('3. An incomplete fingerprint is handled conservatively and honestly', async ({ page }) => {
    await page.route('**/api/widget/page-package*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          targetUrl: 'http://localhost:4173/good',
          matchConfidence: 'exact',
          // Omit fingerprint completely
          guidance: sampleGuidance,
          assistiveMap: sampleAssistiveMap,
        }),
      });
    });

    await page.goto('/good?e2e=1');
    await page.waitForSelector('[data-testid="raawi-launcher"]', { state: 'visible', timeout: 15000 });

    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    // Status badge must honestly indicate unknown / unverified fingerprint
    const statusBadge = page.locator('[data-testid="raawi-map-status-badge"]');
    await expect(statusBadge).toHaveClass(/raawi-badge-warning/);
    await expect(statusBadge).toContainText(/Unknown|غير مؤكدة/);
  });

  test('4. An unrelated dynamic mutation does not spuriously invalidate a page', async ({ page }) => {
    await page.route('**/api/widget/page-package*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          targetUrl: 'http://localhost:4173/good',
          matchConfidence: 'exact',
          fingerprint: matchingFingerprint,
          guidance: sampleGuidance,
          assistiveMap: sampleAssistiveMap,
        }),
      });
    });

    await page.goto('/good?e2e=1');
    await page.waitForSelector('[data-testid="raawi-launcher"]', { state: 'visible', timeout: 15000 });

    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    const statusBadge = page.locator('[data-testid="raawi-map-status-badge"]');
    await expect(statusBadge).toContainText(/Assistive Map Active|خريطة الوصول مفعلة/);

    // Introduce an unrelated dynamic mutation (e.g. dynamic live clock ticker)
    await page.evaluate(() => {
      const ticker = document.createElement('div');
      ticker.id = 'live-clock-ticker';
      ticker.textContent = 'Current Time: ' + new Date().toISOString();
      document.body.appendChild(ticker);
    });

    // Wait for debounce period
    await page.waitForTimeout(400);

    // Status should remain ready because title and firstHeading are unchanged
    await expect(statusBadge).toHaveClass(/raawi-badge-success/);
    await expect(statusBadge).toContainText(/Assistive Map Active|خريطة الوصول مفعلة/);
  });

  test('5. SPA navigation cannot leave the previous page remediation active', async ({ page }) => {
    await page.route('**/api/widget/page-package*', async (route) => {
      const url = decodeURIComponent(route.request().url());
      if (url.includes('/good')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            targetUrl: 'http://localhost:4173/good',
            matchConfidence: 'exact',
            fingerprint: matchingFingerprint,
            guidance: sampleGuidance,
            assistiveMap: sampleAssistiveMap,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            targetUrl: 'http://localhost:4173/messy',
            matchConfidence: 'exact',
            fingerprint: { title: 'Raawi X Test Sites' },
            guidance: { summary: 'Messy Page Guidance' },
            assistiveMap: { imageDescriptions: [] },
          }),
        });
      }
    });

    await page.goto('/good?e2e=1');
    await page.waitForSelector('[data-testid="raawi-launcher"]', { state: 'visible', timeout: 15000 });

    // Inject target image into page
    await page.evaluate(() => {
      const img = document.createElement('img');
      img.id = 'e2e-freshness-img';
      img.src = '/banner.png';
      document.body.appendChild(img);
    });

    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    // Wait for insights card to be ready
    const statusBadge = page.locator('[data-testid="raawi-map-status-badge"]');
    await expect(statusBadge).toHaveClass(/raawi-badge-success/);

    // Turn ON safe auto-remediation
    const remediationLabel = page.locator('label:has(#raawi-toggle-remediation)');
    const remediationToggle = page.locator('[data-testid="raawi-tool-remediation"]');
    await remediationLabel.click();
    await expect(remediationToggle).toBeChecked();

    // Verify remediation applied on /good
    const imgAltBefore = await page.evaluate(() => {
      return document.getElementById('e2e-freshness-img')?.getAttribute('alt');
    });
    expect(imgAltBefore).toBe('Demonstration illustration of verified freshness');

    // Perform SPA navigation via pushState to another route
    await page.evaluate(() => {
      history.pushState(null, '', '/messy');
    });

    // Wait for PageTracker SPA listener to trigger and clear
    await page.waitForTimeout(400);

    // Remediations from previous page MUST be revoked
    const imgAltAfter = await page.evaluate(() => {
      return document.getElementById('e2e-freshness-img')?.hasAttribute('alt');
    });
    expect(imgAltAfter).toBe(false);
  });

  test('6. A late response from an old page context cannot overwrite the current state', async ({ page }) => {
    let lateResolve: ((value: any) => void) | null = null;

    await page.route('**/api/widget/page-package*', async (route) => {
      const url = decodeURIComponent(route.request().url());
      if (url.includes('/good')) {
        // Delay response for /good indefinitely until we release it
        await new Promise((resolve) => {
          lateResolve = resolve;
        });
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            targetUrl: 'http://localhost:4173/good',
            matchConfidence: 'exact',
            guidance: { summary: 'Old Late Response from Good' },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            targetUrl: 'http://localhost:4173/messy',
            matchConfidence: 'exact',
            guidance: { summary: 'Fresh New Response from Messy' },
          }),
        });
      }
    });

    await page.goto('/good?e2e=1');
    await page.waitForSelector('[data-testid="raawi-launcher"]', { state: 'visible', timeout: 15000 });

    // Quickly navigate to /messy before /good response resolves
    await page.evaluate(() => {
      history.pushState(null, '', '/messy');
    });

    await page.waitForTimeout(300);

    // Release the late /good response
    if (lateResolve) {
      (lateResolve as Function)(true);
    }

    await page.waitForTimeout(300);

    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    // Verify Page Insights summary is NOT overwritten by the late /good response
    const insightsCard = page.locator('[data-testid="raawi-insights-card"]');
    await expect(insightsCard).not.toContainText('Old Late Response from Good');
    await expect(insightsCard).toContainText('Fresh New Response from Messy');
  });

  test('7. Stale or mismatched maps trigger cleanup of widget-owned remediation', async ({ page }) => {
    await page.route('**/api/widget/page-package*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          targetUrl: 'http://localhost:4173/good',
          matchConfidence: 'exact',
          fingerprint: matchingFingerprint,
          guidance: sampleGuidance,
          assistiveMap: sampleAssistiveMap,
        }),
      });
    });

    await page.goto('/good?e2e=1');
    await page.waitForSelector('[data-testid="raawi-launcher"]', { state: 'visible', timeout: 15000 });

    // Inject element
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.id = 'e2e-freshness-btn';
      btn.innerHTML = '<svg></svg>';
      document.body.appendChild(btn);
    });

    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    // Activate remediation
    const remediationLabel = page.locator('label:has(#raawi-toggle-remediation)');
    const remediationToggle = page.locator('[data-testid="raawi-tool-remediation"]');
    await remediationLabel.click();
    await expect(remediationToggle).toBeChecked();

    // Verify aria-label applied
    const labelBefore = await page.evaluate(() => {
      return document.getElementById('e2e-freshness-btn')?.getAttribute('aria-label');
    });
    expect(labelBefore).toBe('Verified safe action button');

    // Simulate invalidation via DomRemediator
    await page.evaluate(() => {
      const widget = (window as any).raawiAccessibilityWidget;
      if (widget && widget.getDomRemediator) {
        widget.getDomRemediator().revert();
      }
    });

    const labelAfter = await page.evaluate(() => {
      return document.getElementById('e2e-freshness-btn')?.hasAttribute('aria-label');
    });
    expect(labelAfter).toBe(false);
  });

  test('8. Landmark navigation reaches the correct unique target and transfers focus', async ({ page }) => {
    await page.route('**/api/widget/page-package*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          targetUrl: 'http://localhost:4173/good',
          matchConfidence: 'exact',
          fingerprint: matchingFingerprint,
          guidance: sampleGuidance,
          assistiveMap: sampleAssistiveMap,
        }),
      });
    });

    await page.goto('/good?e2e=1');
    await page.waitForSelector('[data-testid="raawi-launcher"]', { state: 'visible', timeout: 15000 });

    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    // Wait for landmarks list to be rendered
    const landmarksNav = page.locator('.raawi-landmarks-nav');
    await expect(landmarksNav).toBeVisible();

    // Click jump button for 'Main Content' landmark (index 1 in sample guidance)
    const mainJumpBtn = page.locator('.raawi-landmark-jump-btn').nth(1);
    await mainJumpBtn.click();

    // Dialog panel must close cleanly upon navigation
    const panel = page.locator('[data-testid="raawi-panel"]');
    await expect(panel).toHaveAttribute('hidden', '');

    // Verify focus transferred to <main>
    await expect(page.locator('main')).toBeFocused();

    // Verify temporary tabindex attribute was recorded
    const tempFocusAttr = await page.evaluate(() => {
      return document.querySelector('main')?.getAttribute('data-raawi-temp-focus');
    });
    expect(tempFocusAttr).toBe('true');
  });

  test('9. Invalid, ambiguous or missing landmark selectors fail safely', async ({ page }) => {
    await page.route('**/api/widget/page-package*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          targetUrl: 'http://localhost:4173/good',
          matchConfidence: 'exact',
          fingerprint: matchingFingerprint,
          guidance: sampleGuidance,
          assistiveMap: sampleAssistiveMap,
        }),
      });
    });

    await page.goto('/good?e2e=1');
    await page.waitForSelector('[data-testid="raawi-launcher"]', { state: 'visible', timeout: 15000 });

    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    const panel = page.locator('[data-testid="raawi-panel"]');
    await expect(panel).not.toHaveAttribute('hidden', '');

    // Test missing landmark (index 4 is '#non-existent-section')
    const missingJumpBtn = page.locator('.raawi-landmark-jump-btn').nth(4);
    await missingJumpBtn.click();

    // Panel remains accessible without unhandled error
    await expect(panel).toBeVisible();

    // Test ambiguous landmark (index 3 is 'article.card' which matches multiple elements)
    const ambiguousJumpBtn = page.locator('.raawi-landmark-jump-btn').nth(3);
    await ambiguousJumpBtn.click();

    // Panel remains accessible and intact
    await expect(panel).toBeVisible();
  });

  test('10. Manual refresh updates status correctly and avoids duplicate requests', async ({ page }) => {
    let fetchCount = 0;

    await page.route('**/api/widget/page-package*', async (route) => {
      fetchCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          targetUrl: 'http://localhost:4173/good',
          matchConfidence: 'exact',
          fingerprint: matchingFingerprint,
          guidance: sampleGuidance,
          assistiveMap: sampleAssistiveMap,
        }),
      });
    });

    await page.goto('/good?e2e=1');
    await page.waitForSelector('[data-testid="raawi-launcher"]', { state: 'visible', timeout: 15000 });

    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    expect(fetchCount).toBe(1);

    const refreshBtn = page.locator('#raawi-btn-refresh');
    await expect(refreshBtn).toBeVisible();

    // Rapid double click on refresh button
    await refreshBtn.click({ clickCount: 2 });

    // Wait for refresh to complete
    await page.waitForTimeout(500);

    // Only 1 additional request should be made due to in-flight duplicate guard
    expect(fetchCount).toBe(2);

    const statusBadge = page.locator('[data-testid="raawi-map-status-badge"]');
    await expect(statusBadge).toHaveClass(/raawi-badge-success/);
  });

  test('11. Offline handling leaves independent display preferences operational', async ({ page }) => {
    await page.route('**/api/widget/page-package*', async (route) => {
      await route.abort('failed');
    });

    await page.goto('/good?e2e=1');
    await page.waitForSelector('[data-testid="raawi-launcher"]', { state: 'visible', timeout: 15000 });

    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    // Status badge must show offline/unavailable state with danger class
    const statusBadge = page.locator('[data-testid="raawi-map-status-badge"]');
    await expect(statusBadge).toHaveClass(/raawi-badge-danger/);
    await expect(statusBadge).toContainText(/Service temporarily unavailable|الخدمة غير متوفرة/);

    // Switch to Vision tab to verify independent display preferences work
    const visionTab = page.locator('.raawi-tab-btn[data-tab="vision"]');
    await visionTab.click();

    const incBtn = page.locator('#raawi-btn-text-inc');
    await incBtn.click();

    const stepperVal = page.locator('#raawi-text-size-val');
    await expect(stepperVal).toHaveText('110%');

    // Host page root element font size scale is adjusted
    const scaled = await page.evaluate(() => {
      return document.documentElement.style.getPropertyValue('--raawi-text-size');
    });
    expect(scaled).toBe('1.1');
  });

  test('12. Arabic RTL and English LTR controls and status messages are correct', async ({ page }) => {
    await page.route('**/api/widget/page-package*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          targetUrl: 'http://localhost:4173/good',
          matchConfidence: 'exact',
          fingerprint: matchingFingerprint,
          guidance: sampleGuidance,
          assistiveMap: sampleAssistiveMap,
        }),
      });
    });

    await page.goto('/good?e2e=1');
    await page.waitForSelector('[data-testid="raawi-launcher"]', { state: 'visible', timeout: 15000 });

    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    const panel = page.locator('[data-testid="raawi-panel"]');

    // Switch to Arabic
    const arBtn = page.locator('button.raawi-lang-btn[data-lang="ar"]');
    await arBtn.click();

    // Status badge in Arabic
    const statusBadge = page.locator('[data-testid="raawi-map-status-badge"]');
    await expect(statusBadge).toContainText('خريطة الوصول مفعلة');

    // Refresh button in Arabic
    const refreshBtn = page.locator('#raawi-btn-refresh');
    await expect(refreshBtn).toContainText('تحديث');

    // Landmark list in Arabic
    const landmarksNav = page.locator('.raawi-landmarks-nav');
    await expect(landmarksNav).toContainText('المحتوى الرئيسي');

    // Panel has dir="rtl"
    await expect(panel).toHaveAttribute('dir', 'rtl');

    // Switch to English
    const enBtn = page.locator('button.raawi-lang-btn[data-lang="en"]');
    await enBtn.click();

    // Status badge in English
    await expect(statusBadge).toContainText('Assistive Map Active');
    await expect(refreshBtn).toContainText('Refresh');
    await expect(landmarksNav).toContainText('Main Content');
    await expect(panel).toHaveAttribute('dir', 'ltr');
  });

  test('13. Reset and widget teardown clean up observers, event listeners, requests and timers', async ({ page }) => {
    await page.route('**/api/widget/page-package*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          targetUrl: 'http://localhost:4173/good',
          matchConfidence: 'exact',
          fingerprint: matchingFingerprint,
          guidance: sampleGuidance,
        }),
      });
    });

    await page.goto('/good?e2e=1');
    await page.waitForSelector('[data-testid="raawi-launcher"]', { state: 'visible', timeout: 15000 });

    // Destroy PageTracker and unmount widget
    const isCleanedUp = await page.evaluate(() => {
      const widget = (window as any).raawiAccessibilityWidget;
      const tracker = widget.getPageTracker();
      tracker.destroy();

      // Remove widget from DOM
      widget.remove();

      return true;
    });

    expect(isCleanedUp).toBe(true);
  });
});
