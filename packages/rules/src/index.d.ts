import type { Finding } from '@raawi-x/core';
export interface LegacyRule {
    id: string;
    name: string;
    description: string;
    severity: 'error' | 'warning' | 'info';
    check: (document: Document) => Promise<Finding[]>;
}
export { RuleEngine, type Rule, type WCAGLevel } from './rule-engine.js';
export { allWcagRules, wcag111Rule, wcag242Rule, wcag311Rule, wcag412Rule, wcag244Rule, wcag247Rule, wcag211Rule, wcag212Rule, wcag143Rule, wcag1410Rule, } from './wcag-rules.js';
export { type WCAGRule, wcagRulesMap, getWCAGRule, getWCAGRuleTitle, getWCAGRuleDescription, formatWCAGId, getRuleMeta } from './wcag-metadata.js';
export declare class LegacyRuleEngine {
    private rules;
    registerRule(rule: LegacyRule): void;
    runRules(document: Document, ruleIds?: string[]): Promise<Finding[]>;
    getRule(id: string): LegacyRule | undefined;
    getAllRules(): LegacyRule[];
}
export declare const wcagRules: LegacyRule[];
//# sourceMappingURL=index.d.ts.map