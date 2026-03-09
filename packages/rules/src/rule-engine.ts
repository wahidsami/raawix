import type { PageArtifact, RuleResult } from '@raawi-x/core';

export type WCAGLevel = 'A' | 'AA' | 'AAA';

export interface Rule {
  id: string;
  wcagId?: string;
  level?: WCAGLevel;
  title: string;
  description: string;
  evaluate: (page: PageArtifact) => Promise<RuleResult> | RuleResult;
}

export class RuleEngine {
  private rules: Map<string, Rule> = new Map();

  registerRule(rule: Rule): void {
    this.rules.set(rule.id, rule);
  }

  registerRules(rules: Rule[]): void {
    rules.forEach((rule) => this.registerRule(rule));
  }

  async evaluatePage(page: PageArtifact, ruleIds?: string[]): Promise<RuleResult[]> {
    const rulesToRun = ruleIds
      ? ruleIds.map((id) => this.rules.get(id)).filter((r): r is Rule => r !== undefined)
      : Array.from(this.rules.values());

    const results: RuleResult[] = [];

    for (const rule of rulesToRun) {
      try {
        const result = await rule.evaluate(page);
        results.push(result);
      } catch (error) {
        // If rule evaluation fails, create a needs_review result
        results.push({
          ruleId: rule.id,
          wcagId: rule.wcagId,
          status: 'needs_review',
          confidence: 'low',
          evidence: [],
          howToVerify: 'Rule evaluation failed - manual review required',
          message: error instanceof Error ? error.message : 'Unknown error during rule evaluation',
        });
      }
    }

    return results;
  }

  getRule(id: string): Rule | undefined {
    return this.rules.get(id);
  }

  getAllRules(): Rule[] {
    return Array.from(this.rules.values());
  }

  getRulesByLevel(level: WCAGLevel): Rule[] {
    return Array.from(this.rules.values()).filter((rule) => rule.level === level);
  }
}

