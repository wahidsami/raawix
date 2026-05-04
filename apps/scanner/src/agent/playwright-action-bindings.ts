import type { Page } from 'playwright';
import type { ActionBindings } from '@raawi-x/agent-runtime';

function escapeAttributeValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function createPlaywrightActionBindings(page: Page): ActionBindings {
  const fieldAliases: Record<string, string[]> = {
    username: ['username', 'user', 'email', 'login', 'identifier'],
    password: ['password', 'pass', 'pwd'],
    mfa: ['mfa', 'otp', 'verification', 'code', 'token'],
    search: ['search', 'query', 'keyword', 'q'],
    name: ['name', 'full name', 'fullname'],
    email: ['email', 'e-mail', 'mail'],
    message: ['message', 'comment', 'details', 'description'],
  };

  const resolveLocator = (target: { selector?: string; fieldKey?: string; actionId?: string }) => {
    if (target.selector) {
      return page.locator(target.selector).first();
    }
    if (target.fieldKey) {
      const key = escapeAttributeValue(target.fieldKey);
      const aliases = fieldAliases[target.fieldKey.toLowerCase()] || [target.fieldKey];
      const aliasSelector = aliases
        .map((alias) => {
          const safe = escapeAttributeValue(alias);
          return [
            `[name*="${safe}" i]`,
            `[id*="${safe}" i]`,
            `[aria-label*="${safe}" i]`,
            `[placeholder*="${safe}" i]`,
            `[autocomplete*="${safe}" i]`,
            `input[type="${safe}"]`,
          ].join(', ');
        })
        .join(', ');
      return page
        .locator(
          [
            `[name="${key}"]`,
            `[data-field-key="${key}"]`,
            `#${key}`,
            `input[aria-label*="${key}" i]`,
            `textarea[aria-label*="${key}" i]`,
            aliasSelector,
          ].join(', ')
        )
        .first();
    }
    if (target.actionId) {
      const id = escapeAttributeValue(target.actionId);
      return page
        .locator(
          [
            `[data-action-id="${id}"]`,
            `[id="${id}"]`,
            `[name="${id}"]`,
            `[aria-label*="${id}" i]`,
            `button:has-text("${id}")`,
            `a:has-text("${id}")`,
          ].join(', ')
        )
        .first();
    }
    return null;
  };

  return {
    async fill(target, value) {
      const locator = resolveLocator(target);
      if (!locator) throw new Error('Fill target not provided.');
      await locator.fill(value);
      return { filled: true, value };
    },
    async click(target) {
      const locator = resolveLocator(target);
      if (!locator) throw new Error('Click target not provided.');
      await locator.click();
      return { clicked: true };
    },
    async select(target, value) {
      if (!target.selector) throw new Error('Select action requires a selector.');
      await page.locator(target.selector).first().selectOption({ value });
      return { selected: true, value };
    },
    async navigate(url) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      return { navigated: true, url };
    },
    async submit(target) {
      const locator = resolveLocator(target);
      if (!locator) throw new Error('Submit target not provided.');
      await locator.click();
      return { submitted: true };
    },
    async read(target) {
      if (!target.selector) throw new Error('Read action requires selector.');
      const text = await page.locator(target.selector).first().innerText();
      return { text };
    },
    async wait(durationMs) {
      await page.waitForTimeout(durationMs);
      return { waited: true, duration: durationMs };
    },
  };
}
