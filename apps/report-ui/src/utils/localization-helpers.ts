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

  let match = message.match(/^(\d+) form field\(s\) appear to lack an accessible name during the form task\.$/);
  if (match) return t('ruleMessages.formFieldMissingName', { count: match[1] });

  match = message.match(/^Only (\d+) focusable element\(s\) found - may need review$/);
  if (match) return t('ruleMessages.focusableElementNeedReview', { count: match[1] });

  match = message.match(/^No visible focus indicator detected\. Checked for: outline, border, box-shadow \(repeated (\d+)x\)$/);
  if (match) return t('ruleMessages.noVisibleFocusIndicator', { count: match[1] });
  if (message === 'No visible focus indicator detected. Checked for: outline, border, box-shadow') return t('ruleMessages.noVisibleFocusIndicator', { count: 1 }).replace(' (repeated 1x)', '').replace(' (تكرر 1 مرة)', '');

  match = message.match(/^Cannot determine text\/background colors from inline styles - check computed styles \(repeated (\d+)x\)$/);
  if (match) return t('ruleMessages.cannotDetermineColors', { count: match[1] });
  if (message === 'Cannot determine text/background colors from inline styles - check computed styles') return t('ruleMessages.cannotDetermineColors', { count: 1 }).replace(' (repeated 1x)', '').replace(' (تكرر 1 مرة)', '');

  return message;
}
