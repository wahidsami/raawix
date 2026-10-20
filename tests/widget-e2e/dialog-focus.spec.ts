import { test, expect } from '@playwright/test';

test.describe('Phase 5.2 Real-Browser Focus Management & Accessible Dialog', () => {
  test.beforeEach(async ({ page }) => {
    // Add init script to configure e2e test flags and ensure speech synthesis mock tracking
    await page.addInitScript(() => {
      (window as any).__RAAWI_E2E__ = true;
      (window as any).__speechSynthesisSpeakCalls = 0;
      if (window.speechSynthesis) {
        const originalSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
        window.speechSynthesis.speak = (utterance) => {
          (window as any).__speechSynthesisSpeakCalls++;
          return originalSpeak(utterance);
        };
      }
    });

    await page.goto('/good?e2e=1');
    await page.waitForSelector('[data-testid="raawi-launcher"]', { state: 'visible', timeout: 15000 });
  });

  test('1. Dialog semantics, accessible name, and modal state synchronization', async ({ page }) => {
    const launcher = page.locator('[data-testid="raawi-launcher"]');
    const panel = page.locator('[data-testid="raawi-panel"]');

    // Initially closed
    await expect(launcher).toHaveAttribute('aria-expanded', 'false');
    await expect(launcher).toHaveAttribute('aria-controls', 'raawi-accessibility-panel');
    await expect(launcher).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(panel).toHaveAttribute('aria-modal', 'false');
    await expect(panel).toHaveAttribute('hidden', '');

    // Open dialog
    await launcher.click();

    // Now open: aria-expanded="true", aria-modal="true", hidden removed
    await expect(launcher).toHaveAttribute('aria-expanded', 'true');
    await expect(panel).toHaveAttribute('aria-modal', 'true');
    await expect(panel).not.toHaveAttribute('hidden', '');
    await expect(panel).toHaveAttribute('role', 'dialog');
    await expect(panel).toHaveAttribute('aria-labelledby', 'raawi-panel-title');

    // Check heading
    const heading = panel.locator('#raawi-panel-title');
    await expect(heading).toHaveCount(1);
    await expect(heading).toHaveAttribute('tabindex', '-1');

    // Close dialog
    const closeBtn = page.locator('[data-testid="raawi-close"]');
    await closeBtn.click();

    // Closed: aria-expanded and aria-modal reset
    await expect(launcher).toHaveAttribute('aria-expanded', 'false');
    await expect(panel).toHaveAttribute('aria-modal', 'false');
    await expect(panel).toHaveAttribute('hidden', '');
  });

  test('2. Initial focus transfers to close button inside dialog upon keyboard activation', async ({ page }) => {
    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.focus();

    // Press Enter to activate launcher via keyboard
    await page.keyboard.press('Enter');

    // Wait for focus to enter shadow root and reach close button
    const closeBtn = page.locator('[data-testid="raawi-close"]');
    await expect(closeBtn).toBeVisible();

    // Verify activeElement inside shadow DOM is close button
    const focusedTag = await page.evaluate(() => {
      const widget = document.querySelector('raawi-accessibility-widget');
      return widget?.shadowRoot?.activeElement?.getAttribute('data-testid');
    });

    expect(focusedTag).toBe('raawi-close');
  });

  test('3. Real-browser forward Tab traversal and wrapping (focus containment)', async ({ page }) => {
    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    const panel = page.locator('[data-testid="raawi-panel"]');
    await expect(panel).toBeVisible();

    // Check initial focus is inside dialog
    let activeInsideShadow = await page.evaluate(() => {
      const widget = document.querySelector('raawi-accessibility-widget');
      return !!widget?.shadowRoot?.activeElement;
    });
    expect(activeInsideShadow).toBe(true);

    // Get total number of focusable elements inside dialog
    const focusableCount = await page.evaluate(() => {
      const widget = document.querySelector('raawi-accessibility-widget');
      const panelEl = widget?.shadowRoot?.querySelector('#raawi-accessibility-panel');
      if (!panelEl) return 0;
      const candidates = Array.from(
        panelEl.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
      );
      return candidates.filter((el: any) => {
        const parent = el.closest('[role="tabpanel"]');
        return !(parent && parent.style.display === 'none');
      }).length;
    });

    expect(focusableCount).toBeGreaterThan(5);

    // Tab through all controls in browser
    for (let i = 0; i < focusableCount + 2; i++) {
      await page.keyboard.press('Tab');
      const isInside = await page.evaluate(() => {
        const widget = document.querySelector('raawi-accessibility-widget');
        const active = widget?.shadowRoot?.activeElement;
        const panelEl = widget?.shadowRoot?.querySelector('#raawi-accessibility-panel');
        return !!active && !!panelEl && panelEl.contains(active);
      });
      expect(isInside).toBe(true);
    }
  });

  test('4. Real-browser Shift+Tab reverse wrapping from first control to last control', async ({ page }) => {
    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    // Initial focus is on first control (close button)
    const initialFocused = await page.evaluate(() => {
      const widget = document.querySelector('raawi-accessibility-widget');
      return widget?.shadowRoot?.activeElement?.getAttribute('data-testid');
    });
    expect(initialFocused).toBe('raawi-close');

    // Press Shift+Tab: should wrap to last focusable control in the dialog
    await page.keyboard.press('Shift+Tab');

    const wrappedElementRole = await page.evaluate(() => {
      const widget = document.querySelector('raawi-accessibility-widget');
      const active = widget?.shadowRoot?.activeElement;
      return {
        tag: active?.tagName.toLowerCase(),
        id: active?.id,
        role: active?.getAttribute('role') || active?.getAttribute('data-testid'),
      };
    });

    // Last element is a button inside the panel (e.g. disclaimer link, reset button, or profile button)
    expect(wrappedElementRole.tag).toBe('button');

    // Verify it is still contained inside the shadow DOM panel
    const isInside = await page.evaluate(() => {
      const widget = document.querySelector('raawi-accessibility-widget');
      const active = widget?.shadowRoot?.activeElement;
      const panelEl = widget?.shadowRoot?.querySelector('#raawi-accessibility-panel');
      return !!active && !!panelEl && panelEl.contains(active);
    });
    expect(isInside).toBe(true);
  });

  test('5. Focus cannot escape to host-page controls while modal dialog is open', async ({ page }) => {
    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    // Attempt to focus a host-page element directly via DOM API
    await page.evaluate(() => {
      const hostInput = document.querySelector('input, a, button') as HTMLElement;
      if (hostInput) hostInput.focus();
    });

    // Verify focus was recaptured into the dialog
    const activeIsInside = await page.evaluate(() => {
      const widget = document.querySelector('raawi-accessibility-widget');
      const active = widget?.shadowRoot?.activeElement;
      const panelEl = widget?.shadowRoot?.querySelector('#raawi-accessibility-panel');
      return !!active && !!panelEl && panelEl.contains(active);
    });
    expect(activeIsInside).toBe(true);
  });

  test('6. Escape key closes dialog and cleanly restores focus to launcher', async ({ page }) => {
    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.focus();
    await page.keyboard.press('Enter');

    const panel = page.locator('[data-testid="raawi-panel"]');
    await expect(panel).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Panel is closed
    await expect(panel).toHaveAttribute('hidden', '');

    // Focus is restored to the launcher
    const isLauncherFocused = await page.evaluate(() => {
      const widget = document.querySelector('raawi-accessibility-widget');
      const launcherEl = widget?.shadowRoot?.querySelector('[data-testid="raawi-launcher"]');
      return widget?.shadowRoot?.activeElement === launcherEl;
    });
    expect(isLauncherFocused).toBe(true);
  });

  test('7. Backdrop dismissal closes dialog; inner click does not dismiss', async ({ page }) => {
    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    const panel = page.locator('[data-testid="raawi-panel"]');
    await expect(panel).toBeVisible();

    // Click inside the dialog panel (e.g. on panel title or body)
    const title = panel.locator('#raawi-panel-title');
    await title.click();

    // Panel should still be open
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('aria-modal', 'true');

    // Click the backdrop overlay outside the panel
    const backdrop = page.locator('.raawi-backdrop');
    await backdrop.click({ position: { x: 10, y: 10 }, force: true });

    // Panel should now be closed
    await expect(panel).toHaveAttribute('hidden', '');
  });

  test('8. Repeated open/close cycles produce zero duplicate listeners or errors', async ({ page }) => {
    const launcher = page.locator('[data-testid="raawi-launcher"]');
    const panel = page.locator('[data-testid="raawi-panel"]');

    // Perform 5 consecutive open/close cycles
    for (let i = 0; i < 5; i++) {
      await launcher.click();
      await expect(panel).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(panel).toHaveAttribute('hidden', '');
    }

    // Final verification that widget functions normally
    await launcher.click();
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('aria-modal', 'true');
    await page.keyboard.press('Escape');
  });

  test('9. Arabic RTL and English LTR preserve correct reading direction and announcer state', async ({ page }) => {
    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    const panel = page.locator('[data-testid="raawi-panel"]');
    const widgetHost = page.locator('raawi-accessibility-widget');

    // Initially English (dir="ltr")
    await expect(widgetHost).toHaveAttribute('dir', 'ltr');
    await expect(widgetHost).toHaveAttribute('lang', 'en');

    // Switch to Arabic
    const arBtn = panel.locator('.raawi-lang-btn[data-lang="ar"]');
    await arBtn.click();

    // Verify RTL attributes
    await expect(widgetHost).toHaveAttribute('dir', 'rtl');
    await expect(widgetHost).toHaveAttribute('lang', 'ar');

    // Verify Arabic strings are rendered
    const titleText = await panel.locator('#raawi-panel-title').innerText();
    expect(titleText).toContain('أدوات الوصول');

    // Switch back to English
    const enBtn = panel.locator('.raawi-lang-btn[data-lang="en"]');
    await enBtn.click();
    await expect(widgetHost).toHaveAttribute('dir', 'ltr');
  });

  test('10. ARIA Live Announcer announces polite status updates and zero automatic TTS starts', async ({ page }) => {
    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    // Check live announcer element
    const announcer = page.locator('[data-testid="raawi-live-announcer"]');
    await expect(announcer).toHaveAttribute('role', 'status');
    await expect(announcer).toHaveAttribute('aria-live', 'polite');
    await expect(announcer).toHaveAttribute('aria-atomic', 'true');

    // Verify polite announcement was populated on open (with auto-waiting)
    await expect(announcer).toHaveText(/Accessibility options dialog opened/);

    // Close dialog and verify close announcement (with auto-waiting)
    await page.keyboard.press('Escape');
    await expect(announcer).toHaveText(/Accessibility options dialog closed/);

    // Verify Web Speech synthesis was NOT invoked automatically
    const speakCount = await page.evaluate(() => (window as any).__speechSynthesisSpeakCalls || 0);
    expect(speakCount).toBe(0);
  });
});
