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

