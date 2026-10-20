import { describe, it, expect } from 'vitest';
import { wcag412Rule, wcag212Rule } from '@raawi-x/rules';
import { getFocusableElements } from '@raawi-x/rules/dist/utils/focus.js';
import { JSDOM } from 'jsdom';
import type { PageArtifact } from '@raawi-x/core';

describe('Workstream 1: Hidden-Input Handling', () => {
  it('does NOT produce a missing-accessible-name failure for input[type="hidden"] alone', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Test Page</title></head>
        <body>
          <input type="hidden" name="csrf_token" id="csrf" value="secret123" />
          <input type="hidden" name="cf-turnstile-response" id="turnstile" value="response" />
        </body>
      </html>
    `;

    const page: PageArtifact = {
      pageNumber: 1,
      url: 'https://example.com',
      html,
    };

    const result = await wcag412Rule.evaluate(page);
    expect(result.status).toBe('pass');
    expect(result.evidence).toHaveLength(0);
  });

  it('detects genuine visible, unnamed controls while ignoring hidden inputs', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Test Page</title></head>
        <body>
          <input type="hidden" name="csrf" value="123" />
          <input type="text" id="unnamed-text" />
          <select id="unnamed-select"><option>Option 1</option></select>
        </body>
      </html>
    `;

    const page: PageArtifact = {
      pageNumber: 1,
      url: 'https://example.com',
      html,
    };

    const result = await wcag412Rule.evaluate(page);
    expect(result.status).toBe('fail');
    expect(result.evidence).toHaveLength(2); // Only the visible text input and select
    const selectors = result.evidence.map((e) => e.selector);
    expect(selectors).toContain('#unnamed-text');
    expect(selectors).toContain('#unnamed-select');
    expect(selectors).not.toContain('input[type="hidden"]');
  });

  it('never samples a hidden input as a keyboard-focusable element', () => {
    const dom = new JSDOM(`
      <html>
        <body>
          <a href="/home">Home</a>
          <button>Click</button>
          <input type="hidden" name="token" id="token" />
          <input type="text" id="visible-input" />
        </body>
      </html>
    `);

    const focusable = getFocusableElements(dom.window.document);
    expect(focusable).toHaveLength(3); // a, button, visible-input
    const ids = focusable.map((el) => el.id);
    expect(ids).not.toContain('token');
    expect(ids).toContain('visible-input');
  });

  it('does not count hidden inputs toward modal or region keyboard traps in wcag212Rule', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Test Page</title></head>
        <body>
          <a href="/home">Home</a>
          <div role="dialog">
            <input type="hidden" name="secret" value="abc" />
          </div>
        </body>
      </html>
    `;

    const page: PageArtifact = {
      pageNumber: 1,
      url: 'https://example.com',
      html,
    };

    const result = await wcag212Rule.evaluate(page);
    expect(result.status).toBe('pass');
  });
});
