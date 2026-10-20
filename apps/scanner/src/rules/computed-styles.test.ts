import { describe, it, expect } from 'vitest';
import { wcag247Rule, wcag143Rule } from '@raawi-x/rules';
import type { PageArtifact } from '@raawi-x/core';

describe('Workstream 2: Focus and Contrast Evaluation', () => {
  describe('WCAG 2.4.7 Focus Visible', () => {
    it('passes when computed styles confirm visible focus indicators from stylesheets', async () => {
      const page: PageArtifact = {
        pageNumber: 1,
        url: 'https://example.com',
        html: '<html><body><button id="btn1">Click</button><a href="#" id="link1">Link</a></body></html>',
        computedStyles: {
          focus: {
            sampledElements: [
              {
                selector: '#btn1',
                tagName: 'button',
                htmlSnippet: '<button id="btn1">Click</button>',
                hasVisibleIndicator: true,
                methods: ['outline'],
                styles: {
                  outlineWidth: '2px',
                  outlineStyle: 'solid',
                  outlineColor: 'rgb(0, 102, 204)',
                },
              },
              {
                selector: '#link1',
                tagName: 'a',
                htmlSnippet: '<a href="#" id="link1">Link</a>',
                hasVisibleIndicator: true,
                methods: ['box-shadow'],
                styles: {
                  boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.6)',
                },
              },
            ],
          },
        },
      };

      const result = await wcag247Rule.evaluate(page);
      expect(result.status).toBe('pass');
      expect(result.confidence).toBe('high');
      expect(result.message).toContain('2/2 sampled elements have focus indicators');
    });

    it('fails when computed styles confirm no focus indicator in browser', async () => {
      const page: PageArtifact = {
        pageNumber: 1,
        url: 'https://example.com',
        html: '<html><body><button id="btn1">Click</button></body></html>',
        computedStyles: {
          focus: {
            sampledElements: [
              {
                selector: '#btn1',
                tagName: 'button',
                htmlSnippet: '<button id="btn1">Click</button>',
                hasVisibleIndicator: false,
                methods: [],
                styles: {
                  outlineStyle: 'none',
                  outlineWidth: '0px',
                  boxShadow: 'none',
                },
              },
            ],
          },
        },
      };

      const result = await wcag247Rule.evaluate(page);
      expect(result.status).toBe('fail');
      expect(result.confidence).toBe('high');
      expect(result.evidence.length).toBe(1);
      expect(result.evidence[0].selector).toBe('#btn1');
    });

    it('returns needs_review without false failure when running purely statically without computed styles', async () => {
      const page: PageArtifact = {
        pageNumber: 1,
        url: 'https://example.com',
        html: '<html><body><button id="btn1">Click</button></body></html>',
        // No computedStyles provided - static JSDOM run
      };

      const result = await wcag247Rule.evaluate(page);
      expect(result.status).toBe('needs_review');
      expect(result.confidence).toBe('low');
      expect(result.howToVerify).toContain('Static parser cannot verify external CSS focus styles');
    });
  });

  describe('WCAG 1.4.3 Contrast Minimum', () => {
    it('passes for normal text meeting 4.5:1 ratio via computed styles', async () => {
      const page: PageArtifact = {
        pageNumber: 1,
        url: 'https://example.com',
        html: '<html><body><p id="p1">Dark text on white</p></body></html>',
        computedStyles: {
          contrast: {
            sampledElements: [
              {
                selector: '#p1',
                tagName: 'p',
                htmlSnippet: '<p id="p1">Dark text on white</p>',
                text: 'Dark text on white',
                textColor: 'rgb(0, 0, 0)',
                backgroundColor: 'rgb(255, 255, 255)',
                contrastRatio: 21,
                fontSize: '16px',
                fontWeight: '400',
                isLargeText: false,
              },
            ],
          },
        },
      };

      const result = await wcag143Rule.evaluate(page);
      expect(result.status).toBe('pass');
      expect(result.confidence).toBe('high');
    });

    it('supports large-text threshold (3:1 instead of 4.5:1)', async () => {
      const page: PageArtifact = {
        pageNumber: 1,
        url: 'https://example.com',
        html: '<html><body><h1 id="h1">Large Heading</h1></body></html>',
        computedStyles: {
          contrast: {
            sampledElements: [
              {
                selector: '#h1',
                tagName: 'h1',
                htmlSnippet: '<h1 id="h1">Large Heading</h1>',
                text: 'Large Heading',
                textColor: 'rgb(120, 120, 120)',
                backgroundColor: 'rgb(255, 255, 255)',
                contrastRatio: 3.5, // Between 3.0 and 4.5
                fontSize: '28px',
                fontWeight: '700',
                isLargeText: true,
              },
            ],
          },
        },
      };

      const result = await wcag143Rule.evaluate(page);
      expect(result.status).toBe('pass');
    });

    it('fails when normal text has contrast below 4.5:1', async () => {
      const page: PageArtifact = {
        pageNumber: 1,
        url: 'https://example.com',
        html: '<html><body><p id="p1">Low contrast text</p></body></html>',
        computedStyles: {
          contrast: {
            sampledElements: [
              {
                selector: '#p1',
                tagName: 'p',
                htmlSnippet: '<p id="p1">Low contrast text</p>',
                text: 'Low contrast text',
                textColor: 'rgb(150, 150, 150)',
                backgroundColor: 'rgb(255, 255, 255)',
                contrastRatio: 2.8,
                fontSize: '14px',
                fontWeight: '400',
                isLargeText: false,
              },
            ],
          },
        },
      };

      const result = await wcag143Rule.evaluate(page);
      expect(result.status).toBe('fail');
      expect(result.evidence.length).toBe(1);
      expect(result.evidence[0].description).toContain('2.80:1 (below 4.5:1)');
    });

    it('returns needs_review when background color cannot be determined (e.g. image background)', async () => {
      const page: PageArtifact = {
        pageNumber: 1,
        url: 'https://example.com',
        html: '<html><body><p id="p1">Text over background image</p></body></html>',
        computedStyles: {
          contrast: {
            sampledElements: [
              {
                selector: '#p1',
                tagName: 'p',
                htmlSnippet: '<p id="p1">Text over background image</p>',
                text: 'Text over background image',
                textColor: 'rgb(255, 255, 255)',
                backgroundColor: 'transparent',
                contrastRatio: null, // undetermined background
                fontSize: '16px',
                fontWeight: '400',
                isLargeText: false,
              },
            ],
          },
        },
      };

      const result = await wcag143Rule.evaluate(page);
      expect(result.status).toBe('needs_review');
      expect(result.evidence.length).toBe(1);
      expect(result.evidence[0].description).toContain('Cannot determine computed background color');
    });
  });
});
