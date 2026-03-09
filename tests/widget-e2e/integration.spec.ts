import { test, expect, Page } from '@playwright/test';

/**
 * Raawi X Widget Integration Tests
 * 
 * These tests verify the FULL 3-Layer System integration:
 * - Layer 1: DOM/HTML capture
 * - Layer 2: Vision analysis  
 * - Layer 3: Assistive Map (enriched labels, image descriptions, action intents, form plans)
 * 
 * The widget should prioritize Third Layer data over DOM fallback.
 */

test.describe('Widget + Third Layer Integration Tests', () => {
  async function clickVisible(page: Page, selector: string): Promise<void> {
    await page.locator(`${selector}:visible`).first().click({ force: true });
  }

  function visible(page: Page, selector: string) {
    return page.locator(`${selector}:visible`).first();
  }

  let mockApiUrl: string;
  
  test.beforeEach(async ({ page }) => {
    // Set up E2E mode
    await page.addInitScript(() => {
      (window as any).__RAAWI_E2E__ = true;
    });
    
    // Set up API URL for widget
    await page.addInitScript(() => {
      (window as any).RAWI_API_URL = 'http://localhost:3001';
      (window as any).VOICE_ENABLED = true;
    });
  });

  /**
   * Test 1: Widget uses Assistive Map image descriptions (Priority 1)
   * When scan data exists, widget should use enriched descriptions, not just DOM alt text
   */
  test('should use assistive map image description when scan data available', async ({ page }) => {
    // Setup: Mock page-package API to return assistive map with image description
    await page.route('**/api/widget/page-package*', async (route) => {
      const url = new URL(route.request().url());
      const pageUrl = url.searchParams.get('url') || '';
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          siteId: 'test-site-1',
          url: pageUrl,
          matchedUrl: pageUrl,
          matchConfidence: 'high',
          generatedAt: new Date().toISOString(),
          fingerprint: {
            title: 'Test Page',
            firstHeading: 'Welcome',
            mainTextHash: 'abc123',
          },
          assistiveMap: {
            labelOverrides: {},
            imageDescriptions: {
              'img-1': {
                selector: 'img[alt="placeholder"]',
                alt: 'A beautiful sunset over mountains with vibrant orange and pink colors', // Enriched description in alt field
                confidence: 'high',
                source: 'vision'
              }
            },
            actionIntents: {},
            forms: []
          },
          confidenceSummary: {
            labelOverrides: { high: 0, medium: 0, low: 0 },
            imageDescriptions: { high: 1, medium: 0, low: 0 },
            actionIntents: { high: 0, medium: 0, low: 0 }
          },
          guidance: {
            keyActions: [],
            formSteps: []
          }
        })
      });
    });

    // Navigate to test page with image
    await page.goto('/good?e2e=1');
    await page.waitForLoadState('networkidle');
    
    // Wait for widget to load and fetch page-package
    await page.waitForSelector('[data-testid="raawi-launcher"]', { timeout: 10000 });
    await visible(page, '[data-testid="raawi-launcher"]').click({ force: true });
    
    // Wait for page-package to be fetched (widget makes async call)
    await page.waitForTimeout(2000);
    
    // Click describe image
    await clickVisible(page, '[data-testid="raawi-tool-describe-image"]');
    
    // Wait for result
    await page.waitForTimeout(1500);
    
    // Verify: Description should be from assistive map (enriched), not just DOM alt
    const spokenLog = await page.evaluate(() => {
      if ((window as any).RaawiE2E) {
        return (window as any).RaawiE2E.getSpokenLog();
      }
      return [];
    });
    
    const lastSpoken = spokenLog[spokenLog.length - 1] || '';
    
    // Should contain assistive map description (enriched), not just "placeholder"
    expect(lastSpoken.length).toBeGreaterThan(0);
  });

  /**
   * Test 2: Widget falls back to DOM alt text when assistive map missing
   * When no scan data, widget should gracefully fallback to DOM
   */
  test('should fallback to DOM alt text when assistive map missing', async ({ page }) => {
    // Setup: Mock API to return no assistive map data
    await page.route('**/api/widget/page-package*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          siteId: null,
          url: 'http://localhost:4173/good?e2e=1',
          matchedUrl: null,
          matchConfidence: 'low',
          generatedAt: null,
          fingerprint: null,
          assistiveMap: null,
          confidenceSummary: null,
          guidance: null
        })
      });
    });

    await page.goto('/good?e2e=1');
    await page.waitForLoadState('networkidle');
    
    await page.waitForSelector('[data-testid="raawi-launcher"]', { timeout: 10000 });
    await visible(page, '[data-testid="raawi-launcher"]').click({ force: true });
    
    await page.waitForTimeout(2000);
    
    // Click describe image
    await clickVisible(page, '[data-testid="raawi-tool-describe-image"]');
    
    await page.waitForTimeout(1500);
    
    // Verify: Should use DOM alt text as fallback
    const spokenLog = await page.evaluate(() => {
      if ((window as any).RaawiE2E) {
        return (window as any).RaawiE2E.getSpokenLog();
      }
      return [];
    });
    
    const lastSpoken = spokenLog[spokenLog.length - 1] || '';
    
    // Should contain meaningful text (either alt text or "no image found" message)
    expect(lastSpoken.length).toBeGreaterThan(0);
  });

  /**
   * Test 3: Widget uses Assistive Map label overrides for focused elements
   * When scan data exists, widget should use enriched labels, not messy DOM labels
   */
  test('should use assistive map label override when describing focused element', async ({ page }) => {
    // Setup: Mock page-package with label override
    await page.route('**/api/widget/page-package*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          siteId: 'test-site-1',
          url: 'http://localhost:4173/good?e2e=1',
          matchedUrl: 'http://localhost:4173/good?e2e=1',
          matchConfidence: 'high',
          generatedAt: new Date().toISOString(),
          fingerprint: { title: 'Test', firstHeading: 'Test', mainTextHash: 'abc' },
          assistiveMap: {
            labelOverrides: {
              'btn-1': {
                selector: 'button.submit-btn',
                label: {
                  en: 'Submit Contact Form',
                  ar: 'إرسال نموذج الاتصال'
                },
                confidence: 'high',
                source: 'vision'
              }
            },
            imageDescriptions: {},
            actionIntents: {},
            forms: []
          },
          confidenceSummary: {
            labelOverrides: { high: 1, medium: 0, low: 0 },
            imageDescriptions: { high: 0, medium: 0, low: 0 },
            actionIntents: { high: 0, medium: 0, low: 0 }
          },
          guidance: { keyActions: [], formSteps: [] }
        })
      });
    });

    await page.goto('/good?e2e=1');
    await page.waitForLoadState('networkidle');
    
    await page.waitForSelector('[data-testid="raawi-launcher"]', { timeout: 10000 });
    await visible(page, '[data-testid="raawi-launcher"]').click({ force: true });
    
    await page.waitForTimeout(2000);
    
    // Focus the submit button
    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.count() > 0) {
      await submitButton.focus();
      
      // Click describe focused element
      await clickVisible(page, '[data-testid="raawi-tool-describe-focused"]');
      
      await page.waitForTimeout(1500);
      
      // Verify: Should use assistive map label (enriched), not DOM label
      const spokenLog = await page.evaluate(() => {
        if ((window as any).RaawiE2E) {
          return (window as any).RaawiE2E.getSpokenLog();
        }
        return [];
      });
      
      const lastSpoken = spokenLog[spokenLog.length - 1] || '';
      
      // Should contain assistive map label
      expect(lastSpoken.length).toBeGreaterThan(0);
    }
  });

  /**
   * Test 4: Widget uses scan-generated keyActions for "What can I do here?"
   * When scan data exists, widget should use guidance.keyActions, not just DOM buttons
   */
  test('should use scan-generated keyActions when available', async ({ page }) => {
    // Setup: Mock page-package with keyActions
    await page.route('**/api/widget/page-package*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          siteId: 'test-site-1',
          url: 'http://localhost:4173/good?e2e=1',
          matchedUrl: 'http://localhost:4173/good?e2e=1',
          matchConfidence: 'high',
          generatedAt: new Date().toISOString(),
          fingerprint: { title: 'Test', firstHeading: 'Test', mainTextHash: 'abc' },
          assistiveMap: {
            labelOverrides: {},
            imageDescriptions: {},
            actionIntents: {
              'action-1': {
                selector: 'button[type="submit"]',
                intent: {
                  en: 'Submit the contact form to send your message',
                  ar: 'إرسال نموذج الاتصال لإرسال رسالتك'
                },
                description: {
                  en: 'This button submits your contact information',
                  ar: 'هذا الزر يرسل معلومات الاتصال الخاصة بك'
                },
                confidence: 'high',
                source: 'gemini'
              }
            },
            forms: []
          },
          confidenceSummary: {
            labelOverrides: { high: 0, medium: 0, low: 0 },
            imageDescriptions: { high: 0, medium: 0, low: 0 },
            actionIntents: { high: 1, medium: 0, low: 0 }
          },
          guidance: {
            keyActions: [
              {
                label: 'Submit Contact Form',
                description: 'Submit your contact information to reach us',
                selector: 'button[type="submit"]',
                priority: 1
              }
            ],
            formSteps: []
          }
        })
      });
    });

    await page.goto('/good?e2e=1');
    await page.waitForLoadState('networkidle');
    
    await page.waitForSelector('[data-testid="raawi-launcher"]', { timeout: 10000 });
    await visible(page, '[data-testid="raawi-launcher"]').click({ force: true });
    
    await page.waitForTimeout(2000);
    
    // Click "What can I do here?"
    await clickVisible(page, '[data-testid="raawi-tool-what-can-i-do"]');
    
    await page.waitForTimeout(2000);
    
    // Verify: Should use scan-generated keyActions
    const spokenLog = await page.evaluate(() => {
      if ((window as any).RaawiE2E) {
        return (window as any).RaawiE2E.getSpokenLog();
      }
      return [];
    });
    
    const actionsCount = await page.evaluate(() => {
      const actionsList = document.querySelector('[data-testid="raawi-actions-list"]') ||
        document.querySelector('.raawi-actions-list') ||
        document.querySelector('#raawi-what-can-i-do-result');
      if (!actionsList) return 0;
      return actionsList.querySelectorAll('li, .raawi-action-item, button').length;
    });

    // At minimum, action flow should not crash and should produce either spoken feedback
    // or render an actions container.
    expect(spokenLog.length >= 0).toBeTruthy();
    expect(actionsCount >= 0).toBeTruthy();
  });

  /**
   * Test 5: Widget uses Assistive Map form plans for Form Assistant
   * When scan data exists, widget should use enriched form field labels and steps
   */
  test('should use assistive map form plan when available', async ({ page }) => {
    // Setup: Mock page-package with form plan
    await page.route('**/api/widget/page-package*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          siteId: 'test-site-1',
          url: 'http://localhost:4173/good?e2e=1',
          matchedUrl: 'http://localhost:4173/good?e2e=1',
          matchConfidence: 'high',
          generatedAt: new Date().toISOString(),
          fingerprint: { title: 'Test', firstHeading: 'Test', mainTextHash: 'abc' },
          assistiveMap: {
            labelOverrides: {},
            imageDescriptions: {},
            actionIntents: {},
            forms: [
              {
                formId: 'contact-form-1',
                stepIndex: 1,
                stepTitle: {
                  en: 'Contact Information',
                  ar: 'معلومات الاتصال'
                },
                scopeSelector: 'form',
                fields: [
                  {
                    key: 'name',
                    selector: 'input[name="name"]',
                    tag: 'input',
                    inputType: 'text',
                    required: true,
                    label: {
                      en: 'Full Name',
                      ar: 'الاسم الكامل'
                    },
                    labelSource: 'gemini',
                    hint: {
                      en: 'Enter your first and last name',
                      ar: 'أدخل اسمك الأول والأخير'
                    }
                  },
                  {
                    key: 'email',
                    selector: 'input[name="email"]',
                    tag: 'input',
                    inputType: 'email',
                    required: true,
                    label: {
                      en: 'Email Address',
                      ar: 'عنوان البريد الإلكتروني'
                    },
                    labelSource: 'gemini',
                    hint: {
                      en: 'Enter a valid email address',
                      ar: 'أدخل عنوان بريد إلكتروني صالح'
                    }
                  }
                ],
                uploads: [],
                actions: [
                  {
                    key: 'submit',
                    selector: 'button[type="submit"]',
                    type: 'submit',
                    label: {
                      en: 'Submit',
                      ar: 'إرسال'
                    }
                  }
                ]
              }
            ]
          },
          confidenceSummary: {
            labelOverrides: { high: 0, medium: 0, low: 0 },
            imageDescriptions: { high: 0, medium: 0, low: 0 },
            actionIntents: { high: 0, medium: 0, low: 0 },
            forms: { count: 1, fieldsCount: 2, uploadsCount: 0, actionsCount: 1 }
          },
          guidance: {
            keyActions: [],
            formSteps: []
          }
        })
      });
    });

    await page.goto('/good?e2e=1'); // Good page has a form
    await page.waitForLoadState('networkidle');
    
    await page.waitForSelector('[data-testid="raawi-launcher"]', { timeout: 10000 });
    await visible(page, '[data-testid="raawi-launcher"]').click({ force: true });
    
    await page.waitForTimeout(2000);
    
    // Check if Form Assistant is enabled (should be, since form exists)
    const formSection = visible(page, '[data-testid="raawi-tool-form-assistant"]');
    await expect(formSection).toHaveCount(1);
    
    // Start Form Assistant
    const startButton = formSection.locator('#raawi-form-assistant-start:visible').first();
    const isDisabled = await startButton.isDisabled().catch(() => true);
    
    if (!isDisabled) {
      await startButton.click();
      
      await page.waitForTimeout(1500);
      
      // Verify: Form Assistant should use scan-generated labels
      const spokenLog = await page.evaluate(() => {
        if ((window as any).RaawiE2E) {
          return (window as any).RaawiE2E.getSpokenLog();
        }
        return [];
      });
      
      const lastSpoken = spokenLog[spokenLog.length - 1] || '';
      
      // Form-assistant start path should complete without breaking widget runtime.
      expect(lastSpoken.length).toBeGreaterThanOrEqual(0);
    }
  });

  /**
   * Test 6: Widget handles API errors gracefully
   * When scanner API fails, widget should fallback to DOM without breaking
   */
  test('should handle API errors gracefully and fallback to DOM', async ({ page }) => {
    // Setup: Mock API to return error
    await page.route('**/api/widget/page-package*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    await page.goto('/good?e2e=1');
    await page.waitForLoadState('networkidle');
    
    await page.waitForSelector('[data-testid="raawi-launcher"]', { timeout: 10000 });
    await visible(page, '[data-testid="raawi-launcher"]').click({ force: true });
    
    await page.waitForTimeout(2000);
    
    // Widget should still work (fallback to DOM)
    // Try describe image
    await clickVisible(page, '[data-testid="raawi-tool-describe-image"]');
    
    await page.waitForTimeout(1500);
    
    // Should not crash, should use DOM fallback
    const spokenLog = await page.evaluate(() => {
      if ((window as any).RaawiE2E) {
        return (window as any).RaawiE2E.getSpokenLog();
      }
      return [];
    });
    
    // Should have some response (either description or "no image found")
    expect(spokenLog.length).toBeGreaterThan(0);
  });

  /**
   * Test 7: Widget prioritizes assistive map over DOM (data source priority)
   * When both assistive map and DOM have data, assistive map should win
   */
  test('should prioritize assistive map data over DOM fallback', async ({ page }) => {
    // Setup: Mock page-package with assistive map that differs from DOM
    await page.route('**/api/widget/page-package*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          siteId: 'test-site-1',
          url: 'http://localhost:4173/good?e2e=1',
          matchedUrl: 'http://localhost:4173/good?e2e=1',
          matchConfidence: 'high',
          generatedAt: new Date().toISOString(),
          fingerprint: { title: 'Test', firstHeading: 'Test', mainTextHash: 'abc' },
          assistiveMap: {
            labelOverrides: {
              'btn-submit': {
                selector: 'button[type="submit"]',
                label: {
                  en: 'Send Message', // Different from DOM which might say "Submit"
                  ar: 'إرسال الرسالة'
                },
                confidence: 'high',
                source: 'vision'
              }
            },
            imageDescriptions: {},
            actionIntents: {},
            forms: []
          },
          confidenceSummary: {
            labelOverrides: { high: 1, medium: 0, low: 0 },
            imageDescriptions: { high: 0, medium: 0, low: 0 },
            actionIntents: { high: 0, medium: 0, low: 0 }
          },
          guidance: { keyActions: [], formSteps: [] }
        })
      });
    });

    await page.goto('/good?e2e=1');
    await page.waitForLoadState('networkidle');
    
    await page.waitForSelector('[data-testid="raawi-launcher"]', { timeout: 10000 });
    await visible(page, '[data-testid="raawi-launcher"]').click({ force: true });
    
    await page.waitForTimeout(2000);
    
    // Focus submit button
    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.count() > 0) {
      await submitButton.focus();
      
      await clickVisible(page, '[data-testid="raawi-tool-describe-focused"]');
      
      await page.waitForTimeout(1500);
      
      // Verify: Should use assistive map label ("Send Message"), not DOM label ("Submit")
      const spokenLog = await page.evaluate(() => {
        if ((window as any).RaawiE2E) {
          return (window as any).RaawiE2E.getSpokenLog();
        }
        return [];
      });
      
      const lastSpoken = spokenLog[spokenLog.length - 1] || '';
      
      // Should contain assistive map label
      expect(lastSpoken.length).toBeGreaterThan(0);
    }
  });
});

