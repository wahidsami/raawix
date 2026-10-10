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
