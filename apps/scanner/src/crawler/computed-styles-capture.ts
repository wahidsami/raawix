import type { Page } from 'playwright';
import type { ComputedStyleData, ComputedContrastEvidence } from '@raawi-x/core';
import { parseColor, getContrastRatio } from '@raawi-x/rules';

export async function captureComputedStyles(page: Page): Promise<ComputedStyleData> {
  const result: ComputedStyleData = {
    focus: { sampledElements: [] },
    contrast: { sampledElements: [] },
  };

  try {
    const rawData = await page.evaluate(() => {
      function getSelector(el: Element): string {
        if (el.id) return `#${el.id}`;
        let path = el.tagName.toLowerCase();
        if (el.className && typeof el.className === 'string') {
          const classes = el.className.trim().split(/\s+/).filter(Boolean);
          if (classes.length > 0) {
            path += `.${classes.slice(0, 2).join('.')}`;
          }
        }
        return path;
      }

      // 1. Focus evaluation: sample focusable elements (excluding hidden inputs)
      const focusCandidates = Array.from(
        document.querySelectorAll(
          'a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      )
        .filter((el) => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        })
        .slice(0, 30);

      const focusResults = focusCandidates.map((el) => {
        const initialStyle = window.getComputedStyle(el);
        const initialOutline = initialStyle.outlineStyle;
        const initialOutlineWidth = initialStyle.outlineWidth;
        const initialOutlineColor = initialStyle.outlineColor;
        const initialBoxShadow = initialStyle.boxShadow;
        const initialBorderColor = initialStyle.borderColor;

        let hasVisibleIndicator = false;
        const methods: string[] = [];

        try {
          (el as HTMLElement).focus({ preventScroll: true });
          const focusedStyle = window.getComputedStyle(el);

          const hasOutline =
            focusedStyle.outlineStyle !== 'none' &&
            parseFloat(focusedStyle.outlineWidth || '0') > 0 &&
            focusedStyle.outlineColor !== 'transparent' &&
            focusedStyle.outlineColor !== 'rgba(0, 0, 0, 0)';

          const hasBoxShadow =
            focusedStyle.boxShadow !== 'none' &&
            focusedStyle.boxShadow !== initialBoxShadow;

          const hasBorderChange =
            focusedStyle.borderColor !== initialBorderColor;

          if (hasOutline) {
            hasVisibleIndicator = true;
            methods.push('outline');
          }
          if (hasBoxShadow) {
            hasVisibleIndicator = true;
            methods.push('box-shadow');
          }
          if (hasBorderChange) {
            hasVisibleIndicator = true;
            methods.push('border');
          }

          const item = {
            selector: getSelector(el),
            tagName: el.tagName.toLowerCase(),
            htmlSnippet: el.outerHTML.slice(0, 300),
            hasVisibleIndicator,
            methods,
            styles: {
              outlineWidth: focusedStyle.outlineWidth,
              outlineStyle: focusedStyle.outlineStyle,
              outlineColor: focusedStyle.outlineColor,
              boxShadow: focusedStyle.boxShadow,
              borderColor: focusedStyle.borderColor,
            },
          };
          (el as HTMLElement).blur();
          return item;
        } catch {
          return {
            selector: getSelector(el),
            tagName: el.tagName.toLowerCase(),
            htmlSnippet: el.outerHTML.slice(0, 300),
            hasVisibleIndicator: false,
            methods: [],
          };
        }
      });

      // 2. Contrast evaluation
      const textCandidates = Array.from(
        document.querySelectorAll(
          'p, span, h1, h2, h3, h4, h5, h6, a, button, label, li, td, th'
        )
      )
        .filter((el) => {
          const text = (el.textContent || '').trim();
          if (!text) return false;
          if (
            el.children.length > 0 &&
            Array.from(el.children).some((c) => /^(p|h[1-6]|div|ul|ol|table)$/i.test(c.tagName))
          ) {
            return false;
          }
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity || '1') > 0;
        })
        .slice(0, 50);

      const contrastResults = textCandidates.map((el) => {
        const style = window.getComputedStyle(el);
        const textColor = style.color;
        const fontSize = style.fontSize;
        const fontWeight = style.fontWeight;

        let current: Element | null = el;
        let resolvedBg = '';
        let isUndetermined = false;

        while (current && current !== document.documentElement) {
          const cStyle = window.getComputedStyle(current);
          const bg = cStyle.backgroundColor;
          if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
            resolvedBg = bg;
            break;
          }
          if (cStyle.backgroundImage && cStyle.backgroundImage !== 'none') {
            isUndetermined = true;
            break;
          }
          current = current.parentElement;
        }

        if (!resolvedBg && !isUndetermined) {
          resolvedBg = 'rgb(255, 255, 255)';
        }

        const pxMatch = fontSize.match(/^([\d.]+)px$/);
        const px = pxMatch ? parseFloat(pxMatch[1]) : 16;
        const isBold = fontWeight === 'bold' || parseInt(fontWeight, 10) >= 700;
        const isLargeText = px >= 24 || (px >= 18.66 && isBold);

        return {
          selector: getSelector(el),
          tagName: el.tagName.toLowerCase(),
          htmlSnippet: el.outerHTML.slice(0, 300),
          text: (el.textContent || '').trim().slice(0, 100),
          textColor,
          backgroundColor: resolvedBg || 'transparent',
          isUndetermined,
          fontSize,
          fontWeight,
          isLargeText,
        };
      });

      return {
        focus: focusResults,
        contrast: contrastResults,
      };
    });

    result.focus = {
      sampledElements: rawData.focus,
    };

    result.contrast = {
      sampledElements: rawData.contrast.map((c: any) => {
        let contrastRatio: number | null = null;
        if (!c.isUndetermined && c.textColor && c.backgroundColor) {
          const textRgb = parseColor(c.textColor);
          const bgRgb = parseColor(c.backgroundColor);
          if (textRgb && bgRgb) {
            contrastRatio = getContrastRatio(textRgb, bgRgb);
          }
        }

        const item: ComputedContrastEvidence = {
          selector: c.selector,
          tagName: c.tagName,
          htmlSnippet: c.htmlSnippet,
          text: c.text,
          textColor: c.textColor,
          backgroundColor: c.backgroundColor,
          contrastRatio,
          fontSize: c.fontSize,
          fontWeight: c.fontWeight,
          isLargeText: c.isLargeText,
        };
        return item;
      }),
    };
  } catch (error) {
    console.warn('[Capture] Failed to evaluate computed styles in browser:', error);
  }

  return result;
}
