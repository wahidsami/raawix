// @ts-ignore
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getLocalizedIssueMessage } from '../utils/localization-helpers';

describe('Localization Completeness Check', () => {
  const enPath = path.resolve(__dirname, '../i18n/locales/en.json');
  const arPath = path.resolve(__dirname, '../i18n/locales/ar.json');

  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));

  function getLeafPaths(obj: Record<string, any>, prefix = ''): string[] {
    const paths: string[] = [];
    for (const key of Object.keys(obj)) {
      const full = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        paths.push(...getLeafPaths(obj[key], full));
      } else {
        paths.push(full);
      }
    }
    return paths;
  }

  const enPaths = new Set(getLeafPaths(en));
  const arPaths = new Set(getLeafPaths(ar));

  it('verifies exact 1:1 key parity between en.json and ar.json', () => {
    const missingInAr = [...enPaths].filter((p) => !arPaths.has(p));
    const missingInEn = [...arPaths].filter((p) => !enPaths.has(p));

    expect(missingInAr).toEqual([]);
    expect(missingInEn).toEqual([]);
    expect(enPaths.size).toBe(arPaths.size);
  });

  it('verifies every identified missing key from the audit is present in both dictionaries', () => {
    const requiredAuditKeys = [
      'scanMonitor.auditModeLegacyLabel',
      'scanMonitor.raawiAgentReport',
      'scanMonitor.technicalAuditReport',
      'scanMonitor.raawiAgentIntro',
      'scanMonitor.legacyScanResultsIntro',
      'scanMonitor.authenticated',
      'scanMonitor.authFailed',
      'scanMonitor.inactiveAuthProfile',
      'scanMonitor.unsupportedAuthProfile',
      'scanMonitor.technicalEvidenceIntro',
      'scanMonitor.notRun',
      'scanMonitor.pausedForCode',
      'scanMonitor.resumed',
      'scanMonitor.resumeFailed',
      'scans.pageDetail',
    ];

    for (const key of requiredAuditKeys) {
      expect(enPaths.has(key), `Missing ${key} in en.json`).toBe(true);
      expect(arPaths.has(key), `Missing ${key} in ar.json`).toBe(true);
    }
  });

  it('verifies all 55 canonical report subcategories are mapped in both locales', () => {
    const expectedSubcategories = [
      'Missing alt text',
      'Decorative images incorrectly announced',
      'Icons without labels',
      'CAPTCHA without alternatives',
      'Image-based buttons without description',
      'Missing or incorrect headings structure (H1-H6)',
      'Poor readability (complex language)',
      'Missing page titles',
      'Incorrect language declaration',
      'Abbreviations not explained',
      'Low text contrast',
      'Low contrast for UI components',
      'Reliance on color alone',
      'Placeholder text too light to read',
      'Disabled states not distinguishable',
      'Not accessible via keyboard',
      'Missing focus indicator',
      'Incorrect tab order',
      'Keyboard traps',
      'Missing skip links',
      'Navigation inconsistency',
      'Missing labels',
      'Placeholder instead of label',
      'Missing error messages',
      'Errors not explained',
      'Required fields not indicated',
      'No input instructions',
      'Incorrect associations',
      'Missing captions',
      'Missing transcripts',
      'No audio descriptions',
      'Auto-play without control',
      'No pause/stop controls',
      'Small tap targets',
      'Gesture-only interactions',
      'No gesture alternatives',
      'Elements too close',
      'No orientation support',
      'Motion without fallback',
      'Missing ARIA roles',
      'Improper HTML structure',
      'Screen reader issues',
      'Inaccessible custom components',
      'Missing landmarks',
      'Duplicate IDs',
      'Time limits without warning',
      'No extend option',
      'Auto-refresh',
      'Unstoppable animations',
      'Moving content without control',
      'Voice control problems',
      'Zoom issues',
      'Cognitive complexity',
      'CAPTCHA barriers',
      'Memory-based challenges',
    ];

    for (const sub of expectedSubcategories) {
      const key = `taxonomy.subcategories.${sub}`;
      expect(enPaths.has(key), `Subcategory ${sub} missing in en.json`).toBe(true);
      expect(arPaths.has(key), `Subcategory ${sub} missing in ar.json`).toBe(true);
      expect(ar.taxonomy.subcategories[sub]).toBeTruthy();
      expect(en.taxonomy.subcategories[sub]).toBe(sub);
    }
  });

  it('verifies supported issue-message templates interpolate in English and Arabic', () => {
    function createMockT(locale: 'en' | 'ar') {
      const dict = locale === 'en' ? en : ar;
      return (key: string, options?: Record<string, any>) => {
        const parts = key.split('.');
        let val: any = dict;
        for (const p of parts) {
          val = val?.[p];
        }
        if (typeof val !== 'string') return key;
        if (!options) return val;
        let res = val;
        for (const optKey of Object.keys(options)) {
          res = res.replace(new RegExp(`{{${optKey}}}`, 'g'), String(options[optKey]));
        }
        return res;
      };
    }

    const tEn = createMockT('en');
    const tAr = createMockT('ar');

    // 1. Form field missing name
    const formMsg = '2 form field(s) appear to lack an accessible name during the form task.';
    expect(getLocalizedIssueMessage(formMsg, tEn)).toBe('2 form field(s) appear to lack an accessible name during the form task.');
    expect(getLocalizedIssueMessage(formMsg, tAr)).toContain('2');
    expect(getLocalizedIssueMessage(formMsg, tAr)).toContain('حقل');

    // 2. Insufficient contrast count
    const contrastCountMsg = 'Found 4 text element(s) with insufficient contrast';
    expect(getLocalizedIssueMessage(contrastCountMsg, tEn)).toBe('Found 4 text element(s) with insufficient contrast');
    expect(getLocalizedIssueMessage(contrastCountMsg, tAr)).toContain('4');
    expect(getLocalizedIssueMessage(contrastCountMsg, tAr)).toContain('تباين');

    // 3. Contrast ratio detail
    const ratioMsg = 'Contrast ratio 2.50:1 (below 4.5:1). Text: #777777, BG: #ffffff';
    expect(getLocalizedIssueMessage(ratioMsg, tEn)).toBe('Contrast ratio 2.50:1 (below 4.5:1). Text: #777777, BG: #ffffff');
    expect(getLocalizedIssueMessage(ratioMsg, tAr)).toContain('2.50:1');
    expect(getLocalizedIssueMessage(ratioMsg, tAr)).toContain('#777777');

    // 4. Axe-core structured contrast message
    const axeMsg = 'Element has insufficient color contrast of 2.5:1 (foreground color: #777777, background color: #ffffff, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1';
    expect(getLocalizedIssueMessage(axeMsg, tEn)).toBe(axeMsg);
    expect(getLocalizedIssueMessage(axeMsg, tAr)).toContain('2.5:1');
    expect(getLocalizedIssueMessage(axeMsg, tAr)).toContain('#777777');
    expect(getLocalizedIssueMessage(axeMsg, tAr)).toContain('#ffffff');

    // 5. Unknown message preserves exact raw content safely without fallback distortion
    const rawTechnicalEvidence = 'Selector: div.header > span.badge[data-active="true"]';
    expect(getLocalizedIssueMessage(rawTechnicalEvidence, tEn)).toBe(rawTechnicalEvidence);
    expect(getLocalizedIssueMessage(rawTechnicalEvidence, tAr)).toBe(rawTechnicalEvidence);
  });
});
