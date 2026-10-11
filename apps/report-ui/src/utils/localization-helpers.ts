import { getWCAGRuleTitle } from '@raawi-x/core';

export function getLocalizedIssueTitle(
  finding: {
    source?: string;
    wcagIds?: string[];
    wcagId?: string;
    kind?: string;
    issueTitle?: string;
    message?: string;
    rule?: { name?: string };
  },
  t: (key: string, defaultValue: string) => string,
  lang: string
): string {
  const currentLang = lang === 'ar' ? 'ar' : 'en';
  
  // 1. Core WCAG Title lookup
  const primaryWcagId = finding.wcagId || (finding.wcagIds && finding.wcagIds[0]);
  if (primaryWcagId && (!finding.kind || finding.source === 'dom')) {
    const wcagTitle = getWCAGRuleTitle(primaryWcagId, currentLang);
    if (wcagTitle) {
      return wcagTitle;
    }
  }

  // 2. Agent / Vision kind templated lookup
  if (finding.kind) {
    const translatedKind = t(`agentFindings.${finding.kind}`, '');
    if (translatedKind) {
      return translatedKind;
    }
  }

  // 3. Fallbacks
  return finding.issueTitle || finding.message || finding.rule?.name || finding.kind || 'Issue';
}

export function getLocalizedIssueMessage(message: string | undefined, t: (key: string, options?: any) => string): string {
  if (!message) return '';

  // 1. Agent form field heuristic
  let match = message.match(/^(\d+) form field\(s\) appear to lack an accessible name during the form task\.$/);
  if (match) return t('ruleMessages.formFieldMissingName', { count: match[1] });

  // 2. Focusable elements
  match = message.match(/^Only (\d+) focusable element\(s\) found - may need review$/);
  if (match) return t('ruleMessages.focusableElementNeedReview', { count: match[1] });

  // 3. Focus indicator
  match = message.match(/^No visible focus indicator detected\. Checked for: outline, border, box-shadow \(repeated (\d+)x\)$/);
  if (match) return t('ruleMessages.noVisibleFocusIndicator', { count: match[1] });
  if (message === 'No visible focus indicator detected. Checked for: outline, border, box-shadow') {
    return t('ruleMessages.noVisibleFocusIndicator', { count: 1 }).replace(' (repeated 1x)', '').replace(' (تكرر 1 مرة)', '');
  }

  // 4. Undetermined colors from inline styles
  match = message.match(/^Cannot determine text\/background colors from inline styles - check computed styles \(repeated (\d+)x\)$/);
  if (match) return t('ruleMessages.cannotDetermineColors', { count: match[1] });
  if (message === 'Cannot determine text/background colors from inline styles - check computed styles') {
    return t('ruleMessages.cannotDetermineColors', { count: 1 }).replace(' (repeated 1x)', '').replace(' (تكرر 1 مرة)', '');
  }

  // 5. Contrast violations count
  match = message.match(/^Found (\d+) text element\(s\) with insufficient contrast$/);
  if (match) return t('ruleMessages.contrastInsufficient', { count: match[1] });

  // 6. Contrast manual review count
  match = message.match(/^(\d+) element\(s\) need manual contrast review$/);
  if (match) return t('ruleMessages.contrastNeedReview', { count: match[1] });

  // 7. Checked all pass contrast
  match = message.match(/^Checked (\d+) text element\(s\) - all meet contrast requirements$/);
  if (match) return t('ruleMessages.contrastCheckedAllPass', { count: match[1] });

  // 8. Detailed contrast ratio diagnostic with large text
  match = message.match(/^Contrast ratio ([\d\.]+):1 \(below ([\d\.]+):1\)\. Font size suggests large text - needs review\. Text: ([^,]+), BG: (.+)$/);
  if (match) {
    return t('ruleMessages.contrastRatioLargeDetail', {
      ratio: match[1],
      expected: match[2],
      fg: match[3].trim(),
      bg: match[4].trim(),
    });
  }

  // 9. Detailed contrast ratio diagnostic normal text
  match = message.match(/^Contrast ratio ([\d\.]+):1 \(below ([\d\.]+):1\)\. Text: ([^,]+), BG: (.+)$/);
  if (match) {
    return t('ruleMessages.contrastRatioDetail', {
      ratio: match[1],
      expected: match[2],
      fg: match[3].trim(),
      bg: match[4].trim(),
    });
  }

  // 10. Axe-core color contrast diagnostic template:
  // "Element has insufficient color contrast of 2.5:1 (foreground color: #777, background color: #fff, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1"
  match = message.match(/^Element has insufficient color contrast of ([\d\.]+):1 \(foreground color: ([^,]+), background color: ([^,]+), font size: ([^,]+), font weight: ([^\)]+)\)\. Expected contrast ratio of ([\d\.]+):1$/);
  if (match) {
    return t('ruleMessages.axeColorContrast', {
      ratio: match[1],
      fg: match[2].trim(),
      bg: match[3].trim(),
      fontSize: match[4].trim(),
      fontWeight: match[5].trim(),
      expected: match[6],
    });
  }

  // 11. Image missing alt
  match = message.match(/^Found (\d+) image\(s\) with alt text issues$/);
  if (match) return t('ruleMessages.imageMissingAlt', { count: match[1] });

  // 12. Form control without accessible name
  match = message.match(/^Found (\d+) form control\(s\) without accessible names$/);
  if (match) return t('ruleMessages.formControlNoAccessibleName', { count: match[1] });

  // 13. Generic link text
  match = message.match(/^Found (\d+) link\(s\) with potentially generic text that may need review$/);
  if (match) return t('ruleMessages.linkGenericText', { count: match[1] });

  // 14. Potential keyboard traps
  match = message.match(/^Found (\d+) potential keyboard trap\(s\) that need review$/);
  if (match) return t('ruleMessages.keyboardTrapPotential', { count: match[1] });

  // 15. Reflow issues
  match = message.match(/^Found (\d+) potential reflow issue\(s\) - manual testing required$/);
  if (match) return t('ruleMessages.reflowIssuePotential', { count: match[1] });

  // 16. Fallback: preserve original message untouched
  return message;
}
