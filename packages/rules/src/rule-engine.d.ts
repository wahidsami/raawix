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
export declare class RuleEngine {
    private rules;
    registerRule(rule: Rule): void;
    registerRules(rules: Rule[]): void;
    evaluatePage(page: PageArtifact, ruleIds?: string[]): Promise<RuleResult[]>;
    getRule(id: string): Rule | undefined;
    getAllRules(): Rule[];
    getRulesByLevel(level: WCAGLevel): Rule[];
}
//# sourceMappingURL=rule-engine.d.ts.map