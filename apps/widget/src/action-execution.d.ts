import type { SemanticAction } from './semantic-runtime';
export interface SemanticActionExecutionResult {
    success: boolean;
    message: string;
    actionType?: string;
}
export declare function executeSemanticAction(action: SemanticAction, fallbackSelector?: string): SemanticActionExecutionResult;
//# sourceMappingURL=action-execution.d.ts.map