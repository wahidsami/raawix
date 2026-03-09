/**
 * WCAG Rule Registry - Maps WCAG IDs to their metadata (level, title, etc.)
 * This is a shared registry that matches the one in the dashboard
 */

export interface WCAGRuleMeta {
  wcagId: string;
  level: 'A' | 'AA' | 'AAA';
  title: string;
}

/**
 * WCAG Rules mapping - matches the registry in apps/report-ui/src/utils/wcag-rules.ts
 */
const wcagRulesMap: Record<string, WCAGRuleMeta> = {
  '1.1.1': {
    wcagId: '1.1.1',
    level: 'A',
    title: 'Non-text Content - Alt Text',
  },
  '2.4.2': {
    wcagId: '2.4.2',
    level: 'A',
    title: 'Page Titled',
  },
  '3.1.1': {
    wcagId: '3.1.1',
    level: 'A',
    title: 'Language of Page',
  },
  '4.1.2': {
    wcagId: '4.1.2',
    level: 'A',
    title: 'Name, Role, Value - Accessible Name for Form Controls',
  },
  '2.4.4': {
    wcagId: '2.4.4',
    level: 'A',
    title: 'Link Purpose (Basic)',
  },
  '2.4.7': {
    wcagId: '2.4.7',
    level: 'A',
    title: 'Focus Visible',
  },
  '2.1.1': {
    wcagId: '2.1.1',
    level: 'A',
    title: 'Keyboard Reachable (Heuristic)',
  },
  '2.1.2': {
    wcagId: '2.1.2',
    level: 'A',
    title: 'No Keyboard Trap',
  },
  '1.4.3': {
    wcagId: '1.4.3',
    level: 'AA',
    title: 'Contrast Minimum',
  },
  '1.4.10': {
    wcagId: '1.4.10',
    level: 'AA',
    title: 'Reflow',
  },
};

/**
 * Get WCAG rule metadata by ID
 */
export function getWCAGRuleMeta(wcagId: string | null | undefined): WCAGRuleMeta | null {
  if (!wcagId) return null;
  return wcagRulesMap[wcagId] || null;
}

/**
 * Get level for a finding from wcagId or ruleId
 * Returns: 'A' | 'AA' | 'AAA' | 'Heuristic' | 'Review' | null
 */
export function getFindingLevel(
  wcagId: string | null | undefined,
  ruleId?: string | null,
  dbLevel?: string | null
): 'A' | 'AA' | 'AAA' | 'Heuristic' | 'Review' | null {
  // First, use database level if available
  if (dbLevel && (dbLevel === 'A' || dbLevel === 'AA' || dbLevel === 'AAA')) {
    return dbLevel as 'A' | 'AA' | 'AAA';
  }

  // Try to get from rule registry
  const ruleMeta = getWCAGRuleMeta(wcagId);
  if (ruleMeta) {
    return ruleMeta.level;
  }

  // Check ruleId for heuristic/review patterns
  if (ruleId) {
    const lowerRuleId = ruleId.toLowerCase();
    if (lowerRuleId.includes('heuristic')) {
      return 'Heuristic';
    }
    if (lowerRuleId.includes('review')) {
      return 'Review';
    }
  }

  return null;
}

