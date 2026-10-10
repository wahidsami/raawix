import type { SemanticPageModel } from '@raawi-x/semantic-engine';
import type { AgentExecutionOptions, ExecutionResult, ExecutionPlan } from './types.js';
/**
 * Raawi X Agent
 *
 * Goal-driven execution engine that uses semantic models to plan and execute tasks.
 * Supports login, checkout, search, navigation, and form filling.
 */
export declare class RaawiAgent {
    private verbose;
    constructor(options?: {
        verbose?: boolean;
    });
    /**
     * Execute a task using semantic model
     */
    execute(options: AgentExecutionOptions): Promise<ExecutionResult>;
    /**
     * Get the plan without executing
     */
    getPlan(options: AgentExecutionOptions): Promise<ExecutionPlan>;
    /**
     * Analyze if a goal is achievable on the current page
     */
    analyzeAchievability(goal: string, model: SemanticPageModel): {
        achievable: boolean;
        score: number;
        reasons: string[];
    };
    /**
     * List available goals on current page
     */
    suggestGoals(model: SemanticPageModel): string[];
    private generateGoalId;
    private log;
}
export default RaawiAgent;
//# sourceMappingURL=agent.d.ts.map