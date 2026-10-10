import type { SemanticPageModel } from '@raawi-x/semantic-engine';
/**
 * Agent Goal - what the user wants to accomplish
 */
export type AgentGoal = 'login' | 'checkout' | 'search' | 'navigate' | 'fill-form' | 'custom';
export interface AgentTask {
    goal: AgentGoal;
    description: string;
    context?: Record<string, unknown>;
}
/**
 * Planned action to execute
 */
export type ActionType = 'fill' | 'click' | 'select' | 'navigate' | 'submit' | 'read' | 'wait' | 'custom';
export interface PlannedAction {
    type: ActionType;
    label: string;
    description?: string;
    target?: {
        actionId?: string;
        selector?: string;
        fieldKey?: string;
    };
    value?: string | number | Record<string, unknown>;
    conditional?: {
        checkType: 'element-visible' | 'element-exists' | 'text-contains';
        target: string;
        expected: string | boolean;
    };
    priority: number;
}
export interface ActionBindings {
    fill(target: {
        selector?: string;
        fieldKey?: string;
    }, value: string): Promise<unknown>;
    click(target: {
        selector?: string;
        actionId?: string;
    }): Promise<unknown>;
    select(target: {
        selector?: string;
    }, value: string): Promise<unknown>;
    navigate(url: string): Promise<unknown>;
    submit(target: {
        selector?: string;
        actionId?: string;
    }): Promise<unknown>;
    read(target: {
        selector?: string;
    }): Promise<unknown>;
    wait(durationMs: number): Promise<unknown>;
}
/**
 * Execution plan - ordered list of actions to reach goal
 */
export interface ExecutionPlan {
    goalId: string;
    goal: AgentGoal;
    steps: PlannedAction[];
    confidence: number;
    estimatedDuration: number;
    metadata: {
        generatedAt: string;
        pageUrl: string;
        modelVersion: string;
    };
}
/**
 * Execution result
 */
export interface ExecutionResult {
    planId: string;
    success: boolean;
    completedSteps: number;
    totalSteps: number;
    failedStep?: PlannedAction;
    error?: string;
    output?: Record<string, unknown>;
    duration: number;
}
/**
 * Agent execution options
 */
export interface AgentExecutionOptions {
    model: SemanticPageModel;
    task: AgentTask;
    timeout?: number;
    dryRun?: boolean;
    verbose?: boolean;
    bindings?: ActionBindings;
    callbacks?: {
        onStepStart?: (step: PlannedAction, index: number) => void;
        onStepComplete?: (step: PlannedAction, index: number, result: unknown) => void;
        onStepError?: (step: PlannedAction, index: number, error: Error) => void;
        onPlanStart?: (plan: ExecutionPlan) => void;
        onPlanComplete?: (result: ExecutionResult) => void;
    };
}
/**
 * Intent extracted from goal
 */
export interface Intent {
    type: AgentGoal;
    confidence: number;
    parameters: Record<string, unknown>;
    description: string;
}
//# sourceMappingURL=types.d.ts.map