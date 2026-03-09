/**
 * Compliance Scoring Utilities
 * 
 * Scoring method:
 * - Pass = 1.0
 * - Fail = 0.0
 * - Needs Review = 0.5 (configurable)
 * - N/A = excluded from calculation
 */

export interface ComplianceScores {
  scoreA: number | null; // WCAG A compliance score (0-100) or null if no applicable findings
  scoreAA: number | null; // WCAG AA compliance score (0-100) or null if no applicable findings
  needsReviewRate: number; // Percentage of findings needing review (0-100)
  totalRules: number;
  passedRules: number;
  failedRules: number;
  needsReviewRules: number;
  // Per-level counts
  aCounts: { passed: number; failed: number; needsReview: number; total: number };
  aaCounts: { passed: number; failed: number; needsReview: number; total: number };
}

export interface RuleResult {
  level: 'A' | 'AA' | 'AAA' | 'Heuristic' | 'Review' | null;
  status: 'pass' | 'fail' | 'needs_review' | 'na';
}

const NEEDS_REVIEW_WEIGHT = 0.5; // Configurable weight for needs_review

/**
 * Calculate compliance scores from rule results
 */
export function calculateComplianceScores(ruleResults: RuleResult[]): ComplianceScores {
  // Filter out N/A rules
  const applicableRules = ruleResults.filter(r => r.status !== 'na');
  
  // Separate by level (AA should NOT include A - they are separate)
  const levelA = applicableRules.filter(r => r.level === 'A');
  const levelAA = applicableRules.filter(r => r.level === 'AA');
  
  const calculateLevelScore = (rules: RuleResult[]): { 
    score: number | null; 
    passed: number; 
    failed: number; 
    needsReview: number;
    total: number;
  } => {
    if (rules.length === 0) {
      return { score: null, passed: 0, failed: 0, needsReview: 0, total: 0 };
    }
    
    let totalWeight = 0;
    let weightedScore = 0;
    let passed = 0;
    let failed = 0;
    let needsReview = 0;
    
    for (const rule of rules) {
      if (rule.status === 'pass') {
        totalWeight += 1;
        weightedScore += 1;
        passed++;
      } else if (rule.status === 'fail') {
        totalWeight += 1;
        weightedScore += 0;
        failed++;
      } else if (rule.status === 'needs_review') {
        totalWeight += 1;
        weightedScore += NEEDS_REVIEW_WEIGHT;
        needsReview++;
      }
    }
    
    const score = totalWeight > 0 ? (weightedScore / totalWeight) * 100 : null;
    
    return {
      score: score !== null ? Math.round(score * 100) / 100 : null,
      passed,
      failed,
      needsReview,
      total: rules.length,
    };
  };
  
  const aResult = calculateLevelScore(levelA);
  const aaResult = calculateLevelScore(levelAA);
  
  // Needs review rate: count of needs_review / total applicable rules (A + AA combined)
  const totalApplicable = levelA.length + levelAA.length;
  const totalNeedsReview = levelA.filter(r => r.status === 'needs_review').length + 
                          levelAA.filter(r => r.status === 'needs_review').length;
  
  const needsReviewRate = totalApplicable > 0
    ? (totalNeedsReview / totalApplicable) * 100
    : 0;
  
  return {
    scoreA: aResult.score,
    scoreAA: aaResult.score,
    needsReviewRate: Math.round(needsReviewRate * 100) / 100,
    totalRules: applicableRules.length,
    passedRules: aResult.passed + aaResult.passed,
    failedRules: aResult.failed + aaResult.failed,
    needsReviewRules: totalNeedsReview,
    aCounts: {
      passed: aResult.passed,
      failed: aResult.failed,
      needsReview: aResult.needsReview,
      total: aResult.total,
    },
    aaCounts: {
      passed: aaResult.passed,
      failed: aaResult.failed,
      needsReview: aaResult.needsReview,
      total: aaResult.total,
    },
  };
}

/**
 * Aggregate scores from multiple scans (weighted by number of applicable findings)
 */
export function aggregateScores(scanScores: Array<{ scores: ComplianceScores; pageCount: number }>): ComplianceScores {
  if (scanScores.length === 0) {
    return {
      scoreA: null,
      scoreAA: null,
      needsReviewRate: 0,
      totalRules: 0,
      passedRules: 0,
      failedRules: 0,
      needsReviewRules: 0,
      aCounts: { passed: 0, failed: 0, needsReview: 0, total: 0 },
      aaCounts: { passed: 0, failed: 0, needsReview: 0, total: 0 },
    };
  }
  
  // Aggregate by combining all findings and recalculating
  // This ensures proper weighting by number of findings, not just pages
  let totalACount = 0;
  let totalAWeightedScore = 0;
  let totalAACount = 0;
  let totalAAWeightedScore = 0;
  let totalRules = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalNeedsReview = 0;
  let aCounts = { passed: 0, failed: 0, needsReview: 0, total: 0 };
  let aaCounts = { passed: 0, failed: 0, needsReview: 0, total: 0 };
  
  for (const { scores } of scanScores) {
    // Aggregate A level
    if (scores.aCounts.total > 0 && scores.scoreA !== null) {
      totalACount += scores.aCounts.total;
      totalAWeightedScore += scores.scoreA * scores.aCounts.total;
      aCounts.passed += scores.aCounts.passed;
      aCounts.failed += scores.aCounts.failed;
      aCounts.needsReview += scores.aCounts.needsReview;
      aCounts.total += scores.aCounts.total;
    }
    
    // Aggregate AA level
    if (scores.aaCounts.total > 0 && scores.scoreAA !== null) {
      totalAACount += scores.aaCounts.total;
      totalAAWeightedScore += scores.scoreAA * scores.aaCounts.total;
      aaCounts.passed += scores.aaCounts.passed;
      aaCounts.failed += scores.aaCounts.failed;
      aaCounts.needsReview += scores.aaCounts.needsReview;
      aaCounts.total += scores.aaCounts.total;
    }
    
    totalRules += scores.totalRules;
    totalPassed += scores.passedRules;
    totalFailed += scores.failedRules;
    totalNeedsReview += scores.needsReviewRules;
  }
  
  // Calculate aggregated scores
  const aggregatedScoreA = totalACount > 0 
    ? Math.round((totalAWeightedScore / totalACount) * 100) / 100 
    : null;
  const aggregatedScoreAA = totalAACount > 0 
    ? Math.round((totalAAWeightedScore / totalAACount) * 100) / 100 
    : null;
  
  const needsReviewRate = totalRules > 0 
    ? Math.round((totalNeedsReview / totalRules) * 100 * 100) / 100 
    : 0;
  
  return {
    scoreA: aggregatedScoreA,
    scoreAA: aggregatedScoreAA,
    needsReviewRate,
    totalRules,
    passedRules: totalPassed,
    failedRules: totalFailed,
    needsReviewRules: totalNeedsReview,
    aCounts,
    aaCounts,
  };
}

