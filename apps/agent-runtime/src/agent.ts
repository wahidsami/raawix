import type { SemanticPageModel } from '@raawi-x/semantic-engine';
import type { AgentExecutionOptions, ExecutionResult, ExecutionPlan } from './types.js';
import { IntentParser } from './intents.js';
import { ActionPlanner } from './planner.js';
import { ActionExecutor } from './executor.js';

/**
 * Raawi X Agent
 * 
 * Goal-driven execution engine that uses semantic models to plan and execute tasks.
 * Supports login, checkout, search, navigation, and form filling.
 */
export class RaawiAgent {
  private verbose: boolean = false;

  constructor(options?: { verbose?: boolean }) {
    this.verbose = options?.verbose || false;
  }

  /**
   * Execute a task using semantic model
   */
  async execute(options: AgentExecutionOptions): Promise<ExecutionResult> {
    const goalId = this.generateGoalId();

    try {
      this.log(`[Agent] Starting execution of ${options.task.goal}`);

      // Step 1: Parse intent from task
      this.log(`[Agent] Parsing intent...`);
      const intent = IntentParser.parse(options.task);
      this.log(`[Agent] Intent: ${intent.type} (confidence: ${intent.confidence})`);

      // Step 2: Plan execution
      this.log(`[Agent] Planning actions...`);
      const plan = ActionPlanner.plan(intent, options.model, goalId);
      this.log(`[Agent] Plan generated with ${plan.steps.length} steps (confidence: ${plan.confidence})`);

      // If dry-run, return plan without executing
      if (options.dryRun) {
        this.log(`[Agent] Dry-run mode: plan only (not executing)`);
        return {
          planId: goalId,
          success: true,
          completedSteps: 0,
          totalSteps: plan.steps.length,
          duration: 0,
        };
      }

      // Step 3: Execute plan
      this.log(`[Agent] Executing plan...`);
      const executor = new ActionExecutor(plan, {
        timeout: options.timeout || 30000,
        dryRun: options.dryRun || false,
        bindings: options.bindings,
        onStepStart: (step, index) => {
          this.log(`[Agent] Step ${index + 1}/${plan.steps.length}: ${step.label}`);
          options.callbacks?.onStepStart?.(step, index);
        },
        onStepComplete: (step, index, result) => {
          this.log(`[Agent] Step ${index + 1} completed`);
          options.callbacks?.onStepComplete?.(step, index, result);
        },
        onStepError: (step, index, error) => {
          this.log(`[Agent] Step ${index + 1} failed: ${error.message}`);
          options.callbacks?.onStepError?.(step, index, error);
        },
        onPlanStart: (plan) => {
          options.callbacks?.onPlanStart?.(plan);
        },
        onPlanComplete: (result) => {
          this.log(
            `[Agent] Execution ${result.success ? 'succeeded' : 'failed'} (${result.completedSteps}/${result.totalSteps} steps, ${result.duration}ms)`
          );
          options.callbacks?.onPlanComplete?.(result);
        },
      });

      const result = await executor.execute();
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log(`[Agent] Execution failed: ${errorMsg}`);
      return {
        planId: goalId,
        success: false,
        completedSteps: 0,
        totalSteps: 0,
        error: errorMsg,
        duration: 0,
      };
    }
  }

  /**
   * Get the plan without executing
   */
  async getPlan(options: AgentExecutionOptions): Promise<ExecutionPlan> {
    const goalId = this.generateGoalId();

    this.log(`[Agent] Planning ${options.task.goal}...`);

    const intent = IntentParser.parse(options.task);
    const plan = ActionPlanner.plan(intent, options.model, goalId);

    return plan;
  }

  /**
   * Analyze if a goal is achievable on the current page
   */
  analyzeAchievability(goal: string, model: SemanticPageModel): { achievable: boolean; score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    // Check if model has required actions
    const actions = (model.actions || []) as any[];
    const forms = ((model.structure || []) as any[]).filter((b: any) => b.type === 'form');

    if (goal.toLowerCase().includes('login')) {
      if (forms.length > 0) {
        score += 0.5;
        reasons.push('Form detected');
      }
      const submitAction = actions.find((a: any) => (a.label || '').toLowerCase().includes('submit'));
      if (submitAction) {
        score += 0.3;
        reasons.push('Submit action found');
      }
      if (actions.find((a: any) => (a.label || '').toLowerCase().includes('login'))) {
        score += 0.2;
        reasons.push('Login action found');
      }
    }

    if (goal.toLowerCase().includes('checkout')) {
      if (forms.length >= 2) {
        score += 0.4;
        reasons.push('Multiple forms detected (payment likely)');
      }
      if (actions.find((a: any) => (a.label || '').toLowerCase().includes('checkout'))) {
        score += 0.3;
        reasons.push('Checkout action found');
      }
    }

    if (goal.toLowerCase().includes('search')) {
      if (actions.find((a: any) => (a.label || '').toLowerCase().includes('search'))) {
        score += 0.4;
        reasons.push('Search action found');
      }
      if (forms.some((f: any) => (f.label || '').toLowerCase().includes('search'))) {
        score += 0.3;
        reasons.push('Search form detected');
      }
    }

    // Add confidence from model
    const modelConfidence =
      typeof (model as any).confidence === 'number'
        ? (model as any).confidence
        : (model as any).confidence === 'high'
          ? 0.9
          : (model as any).confidence === 'medium'
            ? 0.65
            : (model as any).confidence === 'low'
              ? 0.4
              : 0.5;
    score = Math.min(score + modelConfidence * 0.2, 1);

    return {
      achievable: score > 0.5,
      score,
      reasons,
    };
  }

  /**
   * List available goals on current page
   */
  suggestGoals(model: SemanticPageModel): string[] {
    const goals: string[] = [];
    const actions = (model.actions || []) as any[];
    const forms = ((model.structure || []) as any[]).filter((b: any) => b.type === 'form');

    // Suggest based on detected elements
    const hasLoginForm = forms.some((f: any) => (f.label || '').toLowerCase().includes('login'));
    const hasCheckoutFlow = forms.length >= 2 && actions.some((a: any) => (a.label || '').toLowerCase().includes('checkout'));
    const hasSearch = actions.some((a: any) => (a.label || '').toLowerCase().includes('search'));
    const hasNav = actions.length > 3;

    if (hasLoginForm || actions.some((a: any) => (a.label || '').toLowerCase().includes('login'))) {
      goals.push('login');
    }
    if (hasCheckoutFlow) {
      goals.push('checkout');
    }
    if (hasSearch) {
      goals.push('search');
    }
    if (hasNav) {
      goals.push('navigate');
    }
    if (forms.length > 0) {
      goals.push('fill-form');
    }

    return Array.from(new Set(goals)); // Remove duplicates
  }

  private generateGoalId(): string {
    return `goal-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(message);
    }
  }
}

export default RaawiAgent;
