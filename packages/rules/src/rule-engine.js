export class RuleEngine {
    rules = new Map();
    registerRule(rule) {
        this.rules.set(rule.id, rule);
    }
    registerRules(rules) {
        rules.forEach((rule) => this.registerRule(rule));
    }
    async evaluatePage(page, ruleIds) {
        const rulesToRun = ruleIds
            ? ruleIds.map((id) => this.rules.get(id)).filter((r) => r !== undefined)
            : Array.from(this.rules.values());
        const results = [];
        for (const rule of rulesToRun) {
            try {
                const result = await rule.evaluate(page);
                results.push(result);
            }
            catch (error) {
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
    getRule(id) {
        return this.rules.get(id);
    }
    getAllRules() {
        return Array.from(this.rules.values());
    }
    getRulesByLevel(level) {
        return Array.from(this.rules.values()).filter((rule) => rule.level === level);
    }
}
//# sourceMappingURL=rule-engine.js.map