// Re-export new rule engine
export { RuleEngine } from './rule-engine.js';
export { allWcagRules, wcag111Rule, wcag242Rule, wcag311Rule, wcag412Rule, wcag244Rule, wcag247Rule, wcag211Rule, wcag212Rule, wcag143Rule, wcag1410Rule, } from './wcag-rules.js';
export { wcagRulesMap, getWCAGRule, getWCAGRuleTitle, getWCAGRuleDescription, formatWCAGId, getRuleMeta } from './wcag-metadata.js';
// Legacy rule engine for backward compatibility
export class LegacyRuleEngine {
    rules = new Map();
    registerRule(rule) {
        this.rules.set(rule.id, rule);
    }
    async runRules(document, ruleIds) {
        const rulesToRun = ruleIds
            ? ruleIds.map((id) => this.rules.get(id)).filter((r) => r !== undefined)
            : Array.from(this.rules.values());
        const findings = [];
        for (const rule of rulesToRun) {
            try {
                const ruleFindings = await rule.check(document);
                findings.push(...ruleFindings);
            }
            catch (error) {
                console.error(`Error running rule ${rule.id}:`, error);
            }
        }
        return findings;
    }
    getRule(id) {
        return this.rules.get(id);
    }
    getAllRules() {
        return Array.from(this.rules.values());
    }
}
// Legacy WCAG rules for backward compatibility
function getSelector(element) {
    if (element.id) {
        return `#${element.id}`;
    }
    if (element.className) {
        const classes = Array.from(element.classList)
            .map((c) => `.${c}`)
            .join('');
        return `${element.tagName.toLowerCase()}${classes}`;
    }
    return element.tagName.toLowerCase();
}
export const wcagRules = [
    {
        id: 'wcag-1.1.1',
        name: 'Images must have alt text',
        description: 'All images must have an alt attribute',
        severity: 'error',
        check: async (document) => {
            const findings = [];
            const images = document.querySelectorAll('img');
            images.forEach((img, index) => {
                if (!img.hasAttribute('alt')) {
                    findings.push({
                        id: `wcag-1.1.1-${index}`,
                        ruleId: 'wcag-1.1.1',
                        severity: 'error',
                        message: 'Image missing alt attribute',
                        element: img.outerHTML.substring(0, 100),
                        selector: getSelector(img),
                    });
                }
            });
            return findings;
        },
    },
    {
        id: 'wcag-2.4.2',
        name: 'Page must have a title',
        description: 'HTML document must have a title element',
        severity: 'error',
        check: async (document) => {
            const findings = [];
            const title = document.querySelector('title');
            if (!title || !title.textContent?.trim()) {
                findings.push({
                    id: 'wcag-2.4.2-1',
                    ruleId: 'wcag-2.4.2',
                    severity: 'error',
                    message: 'Page missing title element or title is empty',
                });
            }
            return findings;
        },
    },
    {
        id: 'wcag-4.1.2',
        name: 'Form inputs must have labels',
        description: 'All form inputs should have associated labels',
        severity: 'warning',
        check: async (document) => {
            const findings = [];
            const inputs = document.querySelectorAll('input, textarea, select');
            inputs.forEach((input, index) => {
                const id = input.getAttribute('id');
                const hasLabel = id
                    ? document.querySelector(`label[for="${id}"]`) !== null
                    : input.closest('label') !== null;
                const ariaLabel = input.getAttribute('aria-label');
                const ariaLabelledBy = input.getAttribute('aria-labelledby');
                if (!hasLabel && !ariaLabel && !ariaLabelledBy) {
                    findings.push({
                        id: `wcag-4.1.2-${index}`,
                        ruleId: 'wcag-4.1.2',
                        severity: 'warning',
                        message: 'Form input missing label',
                        element: input.outerHTML.substring(0, 100),
                        selector: getSelector(input),
                    });
                }
            });
            return findings;
        },
    },
];
//# sourceMappingURL=index.js.map