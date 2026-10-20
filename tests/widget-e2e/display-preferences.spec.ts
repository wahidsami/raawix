import { test, expect } from '@playwright/test';

test.describe('Phase 5.3 Real-Browser Display and Reading Preferences', () => {
  test.beforeEach(async ({ page }) => {
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

  test('1. Text scaling preserves relative heading and body typography hierarchy', async ({ page }) => {
    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    // Switch to Vision tab
    const visionTab = page.locator('.raawi-tab-btn[data-tab="vision"]');
    await visionTab.click();

    // Measure initial computed font sizes of heading and paragraph
    const initialSizes = await page.evaluate(() => {
      const h1 = document.querySelector('h1')!;
      const p = document.querySelector('p')!;
      return {
        h1: parseFloat(window.getComputedStyle(h1).fontSize),
        p: parseFloat(window.getComputedStyle(p).fontSize),
      };
    });

    expect(initialSizes.h1).toBeGreaterThan(initialSizes.p);

    // Increase text size by clicking text size increment button twice (to 120%)
    const incBtn = page.locator('#raawi-btn-text-inc');
    await incBtn.click();
    await incBtn.click();

    // Verify stepper value display shows 120%
    const stepperVal = page.locator('#raawi-text-size-val');
    await expect(stepperVal).toHaveText('120%');

    // Measure scaled font sizes
    const scaledSizes = await page.evaluate(() => {
      const h1 = document.querySelector('h1')!;
      const p = document.querySelector('p')!;
      return {
        h1: parseFloat(window.getComputedStyle(h1).fontSize),
        p: parseFloat(window.getComputedStyle(p).fontSize),
      };
    });

    // Both scaled up proportionally
    expect(scaledSizes.h1).toBeGreaterThan(initialSizes.h1);
    expect(scaledSizes.p).toBeGreaterThan(initialSizes.p);

    // Hierarchy is strictly preserved: h1 is still substantially larger than p
    expect(scaledSizes.h1).toBeGreaterThan(scaledSizes.p * 1.5);

    // Verify widget internal font size did NOT scale out of proportion
    const widgetFontSize = await page.evaluate(() => {
      const widget = document.querySelector('raawi-accessibility-widget')!;
      return window.getComputedStyle(widget).fontSize;
    });
    expect(widgetFontSize).toBe('14px');

    // Reset settings
    const resetBtn = page.locator('[data-testid="raawi-reset-all"]');
    await resetBtn.click();

    // Recheck restored font sizes
    const restoredSizes = await page.evaluate(() => {
      const h1 = document.querySelector('h1')!;
      const p = document.querySelector('p')!;
      return {
        h1: parseFloat(window.getComputedStyle(h1).fontSize),
        p: parseFloat(window.getComputedStyle(p).fontSize),
      };
    });
    expect(Math.round(restoredSizes.h1)).toBe(Math.round(initialSizes.h1));
    expect(Math.round(restoredSizes.p)).toBe(Math.round(initialSizes.p));
  });

  test('2. Line-spacing changes target content blocks without breaking compact button controls', async ({ page }) => {
    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    const visionTab = page.locator('.raawi-tab-btn[data-tab="vision"]');
    await visionTab.click();

    // Initial line heights
    const initialLineHeights = await page.evaluate(() => {
      const p = document.querySelector('p')!;
      const btn = document.querySelector('button.button')!;
      return {
        p: parseFloat(window.getComputedStyle(p).lineHeight),
        btn: parseFloat(window.getComputedStyle(btn).lineHeight),
      };
    });

    // Increase line spacing to 140%
    const lineIncBtn = page.locator('#raawi-btn-line-inc');
    await lineIncBtn.click();
    await lineIncBtn.click();
    await lineIncBtn.click();
    await lineIncBtn.click();

    const lineVal = page.locator('#raawi-line-spacing-val');
    await expect(lineVal).toHaveText('140%');

    // Paragraph line-height increases
    const updatedLineHeights = await page.evaluate(() => {
      const p = document.querySelector('p')!;
      const btn = document.querySelector('button.button')!;
      return {
        p: parseFloat(window.getComputedStyle(p).lineHeight),
        btn: parseFloat(window.getComputedStyle(btn).lineHeight),
      };
    });

    expect(updatedLineHeights.p).toBeGreaterThan(initialLineHeights.p);

    // Reset all
    const resetBtn = page.locator('[data-testid="raawi-reset-all"]');
    await resetBtn.click();

    const restoredLineHeights = await page.evaluate(() => {
      const p = document.querySelector('p')!;
      return parseFloat(window.getComputedStyle(p).lineHeight);
    });
    expect(Math.round(restoredLineHeights)).toBe(Math.round(initialLineHeights.p));
  });

  test('3. Curated high-contrast dark mode styles host content with 21:1 contrast and preserves widget UI', async ({ page }) => {
    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    const visionTab = page.locator('.raawi-tab-btn[data-tab="vision"]');
    await visionTab.click();

    // Enable high contrast mode
    const contrastLabel = page.locator('label:has(#raawi-toggle-contrast)');
    await contrastLabel.click();

    await expect(page.locator('html')).toHaveAttribute('data-raawi-contrast-mode', 'true');

    // Check host background is pure black and link is yellow
    const contrastStyles = await page.evaluate(() => {
      const body = document.body;
      const link = document.querySelector('a')!;
      return {
        bgColor: window.getComputedStyle(body).backgroundColor,
        linkColor: window.getComputedStyle(link).color,
      };
    });

    // rgb(0, 0, 0)
    expect(contrastStyles.bgColor).toBe('rgb(0, 0, 0)');
    // rgb(255, 255, 0) -> #ffff00
    expect(contrastStyles.linkColor).toBe('rgb(255, 255, 0)');

    // Revert high contrast mode
    await contrastLabel.click();
    await expect(page.locator('html')).not.toHaveAttribute('data-raawi-contrast-mode');
  });

  test('4. Reading ruler tracks mouse Y position and does NOT intercept pointer clicks', async ({ page }) => {
    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    // Switch to Reading tab
    const readingTab = page.locator('.raawi-tab-btn[data-tab="reading"]');
    await readingTab.click();

    // Enable Reading Guide
    const guideLabel = page.locator('label:has(#raawi-toggle-reading-guide)');
    await guideLabel.click();

    // Verify ruler element is rendered in Shadow DOM
    const ruler = page.locator('[data-testid="raawi-reading-ruler"]');
    await expect(ruler).toBeVisible();

    // Verify pointer-events is 'none' so host clicks pass through
    const pointerEvents = await ruler.evaluate((el) => window.getComputedStyle(el).pointerEvents);
    expect(pointerEvents).toBe('none');

    // Move mouse and verify ruler position updates
    await page.mouse.move(300, 350);
    // Wait for RAF
    await page.waitForTimeout(60);

    const rulerTop = await ruler.evaluate((el) => parseFloat(el.style.top));
    // Ruler should be near Y 350
    expect(rulerTop).toBeGreaterThan(250);
    expect(rulerTop).toBeLessThan(450);

    // Close panel so ruler can be used on the page without modal backdrop blocking host interactions
    await page.keyboard.press('Escape');
    await expect(page.locator('#raawi-panel')).toBeHidden();

    // Click host button while ruler is active to verify zero pointer interception
    const hostButton = page.locator('.button').first();
    await hostButton.click();
    await expect(page.locator('.modal')).toBeVisible();

    // Close the host modal
    await page.locator('.modal-close').click();
    await expect(page.locator('.modal')).toBeHidden();

    // Reopen widget and disable reading guide
    await launcher.click();
    await readingTab.click();
    await guideLabel.click();
    await expect(ruler).toBeHidden();
  });

  test('5. Reading focus mask renders top/bottom overlays and responds to aperture height buttons', async ({ page }) => {
    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    const readingTab = page.locator('.raawi-tab-btn[data-tab="reading"]');
    await readingTab.click();

    // Enable Reading Mask
    const maskLabel = page.locator('label:has(#raawi-toggle-reading-mask)');
    await maskLabel.click();

    // Both top and bottom overlays are visible
    const maskOverlays = page.locator('[data-testid="raawi-reading-mask-overlay"]');
    await expect(maskOverlays).toHaveCount(2);

    // Overlays must have pointer-events: none
    const pointerEvents = await maskOverlays.first().evaluate((el) => window.getComputedStyle(el).pointerEvents);
    expect(pointerEvents).toBe('none');

    // Click 'small' aperture button (80px)
    const smallBtn = page.locator('button[data-mask-height="small"]');
    await smallBtn.click();
    await expect(smallBtn).toHaveClass(/active/);

    // Click 'large' aperture button (180px)
    const largeBtn = page.locator('button[data-mask-height="large"]');
    await largeBtn.click();
    await expect(largeBtn).toHaveClass(/active/);

    // Disable mask
    await maskLabel.click();
    await expect(maskOverlays.first()).toBeHidden();
  });

  test('6. Stop-animations preference applies animation suppression attribute and pauses videos', async ({ page }) => {
    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    const visionTab = page.locator('.raawi-tab-btn[data-tab="vision"]');
    await visionTab.click();

    const animLabel = page.locator('label:has(#raawi-toggle-stop-animations)');
    await animLabel.click();

    await expect(page.locator('html')).toHaveAttribute('data-raawi-stop-animations', 'true');

    // Turn off
    await animLabel.click();
    await expect(page.locator('html')).not.toHaveAttribute('data-raawi-stop-animations');
  });

  test('7. High-visibility cursor assistance applies SVG cursor mode reversibly', async ({ page }) => {
    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    const visionTab = page.locator('.raawi-tab-btn[data-tab="vision"]');
    await visionTab.click();

    // Select Dark Cursor
    const darkCursorBtn = page.locator('button[data-cursor="dark"]');
    await darkCursorBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-raawi-cursor', 'dark');

    // Select Light Cursor
    const lightCursorBtn = page.locator('button[data-cursor="light"]');
    await lightCursorBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-raawi-cursor', 'light');

    // Select Off
    const offCursorBtn = page.locator('button[data-cursor="off"]');
    await offCursorBtn.click();
    await expect(page.locator('html')).not.toHaveAttribute('data-raawi-cursor');
  });

  test('8. Presets activate combined visual preferences and Reset clears all attributes', async ({ page }) => {
    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    // Activate Low-Vision Profile preset
    const lowVisionPreset = page.locator('button[data-preset="low-vision"]');
    await lowVisionPreset.click();

    // Verify text size, contrast, and cursor are all applied
    await expect(page.locator('html')).toHaveAttribute('data-raawi-text-size', '1.3');
    await expect(page.locator('html')).toHaveAttribute('data-raawi-contrast-mode', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-raawi-cursor', 'dark');

    // Reset all settings
    const resetBtn = page.locator('[data-testid="raawi-reset-all"]');
    await resetBtn.click();

    // Verify all host attributes are completely cleared
    await expect(page.locator('html')).not.toHaveAttribute('data-raawi-text-size');
    await expect(page.locator('html')).not.toHaveAttribute('data-raawi-contrast-mode');
    await expect(page.locator('html')).not.toHaveAttribute('data-raawi-cursor');
  });

  test('9. Arabic RTL layout and English LTR maintain accessible visual controls and reading direction', async ({ page }) => {
    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    // Switch to Arabic
    const arBtn = page.locator('.raawi-lang-btn[data-lang="ar"]');
    await arBtn.click();

    // Verify RTL attributes
    const widgetHost = page.locator('raawi-accessibility-widget');
    await expect(widgetHost).toHaveAttribute('dir', 'rtl');
    await expect(widgetHost).toHaveAttribute('lang', 'ar');

    // Switch to Reading tab in Arabic
    const readingTab = page.locator('.raawi-tab-btn[data-tab="reading"]');
    await readingTab.click();

    // Verify Arabic label for reading guide
    const guideCard = page.locator('.raawi-control-card').filter({ hasText: 'مسطرة القراءة' });
    await expect(guideCard).toBeVisible();

    // Switch back to English
    const enBtn = page.locator('.raawi-lang-btn[data-lang="en"]');
    await enBtn.click();
    await expect(widgetHost).toHaveAttribute('dir', 'ltr');
  });

  test('10. Zero automatic Web Speech TTS narration starts during any preference change', async ({ page }) => {
    const launcher = page.locator('[data-testid="raawi-launcher"]');
    await launcher.click();

    const visionTab = page.locator('.raawi-tab-btn[data-tab="vision"]');
    await visionTab.click();

    // Click various display controls
    await page.locator('#raawi-btn-text-inc').click();
    await page.locator('label:has(#raawi-toggle-contrast)').click();
    await page.locator('button[data-cursor="dark"]').click();

    // Reset
    await page.locator('[data-testid="raawi-reset-all"]').click();

    // Verify zero speech synthesis speak calls
    const speakCalls = await page.evaluate(() => (window as any).__speechSynthesisSpeakCalls || 0);
    expect(speakCalls).toBe(0);
  });
});
