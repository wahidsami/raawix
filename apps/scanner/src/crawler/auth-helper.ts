import type { Browser, BrowserContext, Page } from 'playwright';
import type { AuthProfileData } from '../db/auth-profile-repository.js';
import { join } from 'node:path';
import { writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { launchChromium } from './browser-launch.js';

export interface LoginResult {
  success: boolean;
  message: string;
  error?: string;
  storageStatePath?: string;
}

export interface AuthProfileDetectionResult {
  success: boolean;
  message: string;
  error?: string;
  loginSucceeded: boolean;
  verificationCheckpointDetected: boolean;
  detected: {
    loginUrl: string;
    usernameSelector?: string;
    passwordSelector?: string;
    submitSelector?: string;
    successUrlPrefix?: string | null;
    successSelector?: string | null;
    postLoginSeedPaths: string[];
    confidence: 'high' | 'medium' | 'low';
    notes: string[];
  };
}

const USERNAME_SELECTOR_CANDIDATES = [
  'input[autocomplete="username"]',
  'input[type="email"]',
  'input[name*="email" i]',
  'input[id*="email" i]',
  'input[name*="user" i]',
  'input[id*="user" i]',
  'input[name*="login" i]',
  'input[id*="login" i]',
  'input[type="text"]',
];

const PASSWORD_SELECTOR_CANDIDATES = [
  'input[autocomplete="current-password"]',
  'input[type="password"]',
  'input[name*="password" i]',
  'input[id*="password" i]',
  'input[name*="pass" i]',
  'input[id*="pass" i]',
];

const SUBMIT_SELECTOR_CANDIDATES = [
  'button[type="submit"]',
  'input[type="submit"]',
  'button[name*="login" i]',
  'button[id*="login" i]',
  'button[name*="sign" i]',
  'button[id*="sign" i]',
  '[role="button"][name*="login" i]',
];

async function firstVisibleSelector(page: Page, selectors: string[]): Promise<string | undefined> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count().catch(() => 0)) {
      if (await locator.isVisible().catch(() => false)) {
        return selector;
      }
    }
  }
  return undefined;
}

async function detectSubmitSelectorByText(page: Page): Promise<string | undefined> {
  const candidates = [
    { selector: 'button', text: /sign[\s-]*in|log[\s-]*in|login|submit|continue|next/i },
    { selector: 'a[role="button"]', text: /sign[\s-]*in|log[\s-]*in|login|submit|continue|next/i },
    { selector: 'input[type="button"], input[type="submit"]', text: /sign[\s-]*in|log[\s-]*in|login|submit|continue|next/i },
  ];

  for (const candidate of candidates) {
    const locator = page.locator(candidate.selector).filter({ hasText: candidate.text }).first();
    if (await locator.count().catch(() => 0)) {
      if (await locator.isVisible().catch(() => false)) {
        return candidate.selector.includes(',') ? 'input[type="submit"]' : candidate.selector;
      }
    }
  }

  return undefined;
}

async function detectVerificationCheckpoint(page: Page): Promise<boolean> {
  const otpSelectors = [
    'input[autocomplete="one-time-code"]',
    'input[name*="otp" i]',
    'input[id*="otp" i]',
    'input[name*="code" i]',
    'input[id*="code" i]',
    'input[name*="verification" i]',
    'input[id*="verification" i]',
    'input[name*="token" i]',
    'input[id*="token" i]',
  ];

  for (const selector of otpSelectors) {
    const locator = page.locator(selector).first();
    if (await locator.count().catch(() => 0)) {
      if (await locator.isVisible().catch(() => false)) {
        return true;
      }
    }
  }

  const bodyText = (await page.locator('body').innerText().catch(() => '')) || '';
  return /verification code|enter code|one[-\s]?time code|otp|two-factor|2fa/i.test(bodyText);
}

async function collectPostLoginSeedPaths(page: Page, loginUrl: string): Promise<string[]> {
  try {
    const url = new URL(loginUrl);
    return await page.evaluate(({ origin, currentPathname }: { origin: string; currentPathname: string }) => {
      const discovered = new Set<string>();
      if (currentPathname && currentPathname !== '/' && currentPathname !== '/login') {
        discovered.add(currentPathname);
      }

      const interesting = /dashboard|account|profile|home|portal|settings|projects|workspace|app/i;
      for (const anchor of Array.from(document.querySelectorAll('a[href]'))) {
        const href = anchor.getAttribute('href');
        if (!href) continue;
        try {
          const absolute = new URL(href, origin);
          if (absolute.origin !== origin) continue;
          const path = absolute.pathname || '/';
          if (path === '/' || path === '/login') continue;
          if (interesting.test(path) || discovered.size < 5) {
            discovered.add(path);
          }
          if (discovered.size >= 5) break;
        } catch {
          continue;
        }
      }

      return Array.from(discovered).slice(0, 5);
    }, { origin: url.origin, currentPathname: new URL(page.url()).pathname });
  } catch {
    return [];
  }
}

export async function detectScriptedLoginProfile(input: {
  loginUrl: string;
  usernameValue: string;
  passwordValue?: string;
}): Promise<AuthProfileDetectionResult> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  const notes: string[] = [];

  try {
    browser = await launchChromium();
    context = await browser.newContext();
    page = await context.newPage();

    await page.goto(input.loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const usernameSelector = await firstVisibleSelector(page, USERNAME_SELECTOR_CANDIDATES);
    const passwordSelector = await firstVisibleSelector(page, PASSWORD_SELECTOR_CANDIDATES);
    const submitSelector =
      (await firstVisibleSelector(page, SUBMIT_SELECTOR_CANDIDATES)) ||
      (await detectSubmitSelectorByText(page));

    if (!usernameSelector || !submitSelector) {
      return {
        success: false,
        message: 'Could not detect the login form reliably. Open advanced settings and confirm the selectors.',
        error: 'Login form detection failed',
        loginSucceeded: false,
        verificationCheckpointDetected: false,
        detected: {
          loginUrl: input.loginUrl,
          usernameSelector,
          passwordSelector,
          submitSelector,
          successUrlPrefix: null,
          successSelector: null,
          postLoginSeedPaths: [],
          confidence: 'low',
          notes: [
            'We could not confidently detect the username field or submit action.',
          ],
        },
      };
    }

    await page.fill(usernameSelector, input.usernameValue);
    if (passwordSelector && input.passwordValue) {
      await page.fill(passwordSelector, input.passwordValue);
    } else if (!passwordSelector) {
      notes.push('No password field was detected automatically.');
    }

    await page.click(submitSelector);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined);
    await page.waitForTimeout(1500);

    const verificationCheckpointDetected = await detectVerificationCheckpoint(page);
    const currentUrl = page.url();
    const loginUrl = input.loginUrl;
    const pathChanged = (() => {
      try {
        const current = new URL(currentUrl);
        const initial = new URL(loginUrl);
        return `${current.origin}${current.pathname}` !== `${initial.origin}${initial.pathname}`;
      } catch {
        return currentUrl !== loginUrl;
      }
    })();
    const passwordStillVisible = passwordSelector
      ? await page.locator(passwordSelector).first().isVisible().catch(() => false)
      : false;
    const loginSucceeded = verificationCheckpointDetected || pathChanged || !passwordStillVisible;
    const successUrlPrefix = pathChanged
      ? (() => {
          try {
            const current = new URL(currentUrl);
            return `${current.origin}${current.pathname}`;
          } catch {
            return currentUrl;
          }
        })()
      : null;
    const postLoginSeedPaths = loginSucceeded
      ? await collectPostLoginSeedPaths(page, loginUrl)
      : [];

    if (verificationCheckpointDetected) {
      notes.push('A verification-code step was detected after login submit.');
    }
    if (!successUrlPrefix) {
      notes.push('No stable success URL was detected. Fallback success heuristics will be used.');
    }
    if (postLoginSeedPaths.length === 0) {
      notes.push('No post-login paths were auto-detected; authenticated discovery can still continue from the current page.');
    }

    const confidence: 'high' | 'medium' | 'low' =
      usernameSelector && passwordSelector && submitSelector && successUrlPrefix
        ? 'high'
        : loginSucceeded
          ? 'medium'
          : 'low';

    return {
      success: loginSucceeded || verificationCheckpointDetected,
      message: verificationCheckpointDetected
        ? 'Detected the login flow and reached a verification-code checkpoint. Raawi can pause there during scans.'
        : loginSucceeded
          ? 'Detected and tested the login flow successfully.'
          : 'Selectors were detected, but login success could not be confirmed. Review advanced settings before saving.',
      loginSucceeded,
      verificationCheckpointDetected,
      detected: {
        loginUrl: input.loginUrl,
        usernameSelector,
        passwordSelector,
        submitSelector,
        successUrlPrefix,
        successSelector: null,
        postLoginSeedPaths,
        confidence,
        notes,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Login detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
      loginSucceeded: false,
      verificationCheckpointDetected: false,
      detected: {
        loginUrl: input.loginUrl,
        successUrlPrefix: null,
        successSelector: null,
        postLoginSeedPaths: [],
        confidence: 'low',
        notes: ['The detection run failed before a stable login profile could be inferred.'],
      },
    };
  } finally {
    if (page) await page.close().catch(() => undefined);
    if (context) await context.close().catch(() => undefined);
    if (browser) await browser.close().catch(() => undefined);
  }
}

/**
 * Test login flow for an auth profile
 * Used by the "Test Login" button in dashboard
 */
export async function testLoginFlow(profile: AuthProfileData): Promise<LoginResult> {
  if (profile.authType !== 'scripted_login') {
    return {
      success: false,
      message: 'Test login only supported for scripted_login auth type',
      error: 'Invalid auth type',
    };
  }

  if (!profile.loginUrl || !profile.usernameSelector || !profile.usernameValue || !profile.submitSelector) {
    return {
      success: false,
      message: 'Missing required fields for scripted login',
      error: 'Missing required configuration',
    };
  }

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    browser = await launchChromium();
    context = await browser.newContext();

    page = await context.newPage();

    // Navigate to login URL
    await page.goto(profile.loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Fill username
    await page.fill(profile.usernameSelector, profile.usernameValue);

    // Fill password if provided
    if (profile.passwordSelector && profile.passwordValue) {
      await page.fill(profile.passwordSelector, profile.passwordValue);
    }

    // Click submit
    await page.click(profile.submitSelector);

    // Wait for success indicator
    let success = false;
    if (profile.successUrlPrefix) {
      // Wait for URL to match prefix
      await page.waitForURL((url) => url.href.startsWith(profile.successUrlPrefix!), { timeout: 10000 });
      success = true;
    } else if (profile.successSelector) {
      // Wait for selector to appear
      await page.waitForSelector(profile.successSelector, { timeout: 10000 });
      success = true;
    } else {
      // Default: wait 3 seconds and check if we're still on login page
      await page.waitForTimeout(3000);
      const currentUrl = page.url();
      success = !currentUrl.includes('login') && currentUrl !== profile.loginUrl;
    }

    if (success) {
      return {
        success: true,
        message: 'Login test successful',
      };
    } else {
      return {
        success: false,
        message: 'Login test failed: Success indicator not found',
        error: 'Success indicator not found',
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Login test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

/**
 * Perform login and save storage state
 * Returns path to storage state file
 */
export async function performLoginAndSaveState(
  profile: AuthProfileData,
  outputDir: string,
  scanId: string
): Promise<{ storageStatePath: string; success: boolean; error?: string }> {
  if (profile.authType !== 'scripted_login') {
    return {
      storageStatePath: '',
      success: false,
      error: 'Auth type not supported for login',
    };
  }

  if (!profile.loginUrl || !profile.usernameSelector || !profile.usernameValue || !profile.submitSelector) {
    return {
      storageStatePath: '',
      success: false,
      error: 'Missing required fields for scripted login',
    };
  }

  const storageStatePath = join(outputDir, scanId, 'auth-storage-state.json');
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    browser = await launchChromium();
    context = await browser.newContext();

    // Set extra headers if provided
    if (profile.extraHeaders) {
      await context.setExtraHTTPHeaders(profile.extraHeaders);
    }

    page = await context.newPage();

    console.log(`[AUTH] Navigating to login URL: ${profile.loginUrl}`);
    await page.goto(profile.loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    console.log(`[AUTH] Filling username field: ${profile.usernameSelector}`);
    await page.fill(profile.usernameSelector, profile.usernameValue);

    if (profile.passwordSelector && profile.passwordValue) {
      console.log(`[AUTH] Filling password field: ${profile.passwordSelector}`);
      await page.fill(profile.passwordSelector, profile.passwordValue);
    }

    console.log(`[AUTH] Clicking submit button: ${profile.submitSelector}`);
    await page.click(profile.submitSelector);

    // Wait for success indicator
    let success = false;
    if (profile.successUrlPrefix) {
      console.log(`[AUTH] Waiting for URL prefix: ${profile.successUrlPrefix}`);
      await page.waitForURL((url) => url.href.startsWith(profile.successUrlPrefix!), { timeout: 15000 });
      success = true;
    } else if (profile.successSelector) {
      console.log(`[AUTH] Waiting for success selector: ${profile.successSelector}`);
      await page.waitForSelector(profile.successSelector, { timeout: 15000 });
      success = true;
    } else {
      // Default: wait 3 seconds and check if we're still on login page
      await page.waitForTimeout(3000);
      const currentUrl = page.url();
      success = !currentUrl.includes('login') && currentUrl !== profile.loginUrl;
    }

    if (!success) {
      return {
        storageStatePath: '',
        success: false,
        error: 'Login failed: Success indicator not found',
      };
    }

    console.log(`[AUTH] Login successful, saving storage state to: ${storageStatePath}`);

    // Save storage state (cookies, localStorage, sessionStorage)
    const storageState = await context.storageState();
    await writeFile(storageStatePath, JSON.stringify(storageState, null, 2), 'utf-8');

    return {
      storageStatePath,
      success: true,
    };
  } catch (error) {
    console.error(`[AUTH] Login failed:`, error);
    return {
      storageStatePath: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

/**
 * Load storage state and create context with it
 */
export async function loadStorageState(
  storageStatePath: string,
  browser: Browser
): Promise<BrowserContext | null> {
  try {
    if (!existsSync(storageStatePath)) {
      console.warn(`[AUTH] Storage state file not found: ${storageStatePath}`);
      return null;
    }

    const storageState = JSON.parse(await readFile(storageStatePath, 'utf-8'));
    const context = await browser.newContext({ storageState });
    console.log(`[AUTH] Loaded storage state from: ${storageStatePath}`);
    return context;
  } catch (error) {
    console.error(`[AUTH] Failed to load storage state:`, error);
    return null;
  }
}

