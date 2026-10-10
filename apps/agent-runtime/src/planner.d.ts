import type { SemanticPageModel } from '@raawi-x/semantic-engine';
import type { ExecutionPlan, Intent } from './types.js';
/**
 * Action Planner
 *
 * Takes an intent and semantic model, produces an execution plan.
 * Plans the optimal sequence of actions to achieve a goal.
 */
export declare class ActionPlanner {
    private static readonly FIELD_ALIASES;
    private static normalizeModelConfidence;
    private static getModelPageUrl;
    /**
     * Plan execution steps for a given intent and semantic model
     */
    static plan(intent: Intent, model: SemanticPageModel, goalId: string): ExecutionPlan;
    private static planLogin;
    private static planCheckout;
    private static planSearch;
    private static planNavigate;
    private static planFillForm;
    private static planCustom;
    private static findActionByType;
    private static findActionByLabel;
    private static findFormByLabel;
    private static calculatePlanConfidence;
    private static resolveFieldTarget;
}
//# sourceMappingURL=planner.d.ts.map