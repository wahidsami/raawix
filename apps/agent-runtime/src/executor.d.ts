import type { ExecutionPlan, PlannedAction, ExecutionResult, ActionBindings } from './types.js';
/**
 * Action Executor
 *
 * Executes planned actions in sequence using injected action bindings.
 * Defaults to browser DOM bindings when available.
 */
export declare class ActionExecutor {
    private plan;
    private onStepStart?;
    private onStepComplete?;
    private onStepError?;
    private onPlanStart?;
    private onPlanComplete?;
    private timeout;
    private dryRun;
    private bindings;
    constructor(plan: ExecutionPlan, options?: {
        timeout?: number;
        dryRun?: boolean;
        bindings?: ActionBindings;
        onStepStart?: (step: PlannedAction, index: number) => void;
        onStepComplete?: (step: PlannedAction, index: number, result: unknown) => void;
        onStepError?: (step: PlannedAction, index: number, error: Error) => void;
        onPlanStart?: (plan: ExecutionPlan) => void;
        onPlanComplete?: (result: ExecutionResult) => void;
    });
    execute(): Promise<ExecutionResult>;
    private validateStep;
    private executeStep;
}
//# sourceMappingURL=executor.d.ts.map