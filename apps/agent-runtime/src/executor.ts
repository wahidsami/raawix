import type { ExecutionPlan, PlannedAction, ExecutionResult, ActionBindings } from './types.js';

class BrowserActionBindings implements ActionBindings {
  private ensureDom(): void {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      throw new Error('Browser DOM bindings are unavailable in this runtime. Provide custom ActionBindings.');
    }
  }

  private findFieldByKey(fieldKey: string): HTMLElement | null {
    const selectors = [
      `[name="${fieldKey}"]`,
      `[data-field-key="${fieldKey}"]`,
      `[id="${fieldKey}"]`,
      `[aria-label*="${fieldKey}"]`,
    ];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element as HTMLElement;
    }
    return null;
  }

  async fill(target: { selector?: string; fieldKey?: string }, value: string): Promise<unknown> {
    this.ensureDom();
    let element: HTMLInputElement | HTMLTextAreaElement | null = null;

    if (target.selector) {
      element = document.querySelector(target.selector) as HTMLInputElement | HTMLTextAreaElement | null;
    }
    if (!element && target.fieldKey) {
      element = this.findFieldByKey(target.fieldKey) as HTMLInputElement | HTMLTextAreaElement | null;
    }
    if (!element) throw new Error(`Could not find element for fill action: ${target.selector || target.fieldKey}`);

    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return { filled: true, value };
  }

  async click(target: { selector?: string; actionId?: string }): Promise<unknown> {
    this.ensureDom();
    let element: HTMLElement | null = null;
    if (target.selector) {
      element = document.querySelector(target.selector) as HTMLElement | null;
    }
    if (!element && target.actionId) {
      element = document.querySelector(`[data-action-id="${target.actionId}"]`) as HTMLElement | null;
    }
    if (!element) throw new Error(`Could not find element for click action: ${target.selector || target.actionId}`);
    element.click();
    return { clicked: true };
  }

  async select(target: { selector?: string }, value: string): Promise<unknown> {
    this.ensureDom();
    if (!target.selector) throw new Error('Select action missing selector');
    const element = document.querySelector(target.selector) as HTMLSelectElement | null;
    if (!element) throw new Error(`Could not find select element for action: ${target.selector}`);
    element.value = value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return { selected: true, value };
  }

  async navigate(url: string): Promise<unknown> {
    this.ensureDom();
    window.location.href = url;
    return { navigated: true, url };
  }

  async submit(target: { selector?: string; actionId?: string }): Promise<unknown> {
    this.ensureDom();
    let element: HTMLElement | null = null;
    if (target.selector) {
      element = document.querySelector(target.selector) as HTMLElement | null;
    }
    if (!element && target.actionId) {
      element = document.querySelector(`[data-action-id="${target.actionId}"]`) as HTMLElement | null;
    }
    if (!element) throw new Error(`Could not find form/button for submit action: ${target.selector || target.actionId}`);

    if (element.tagName === 'FORM') {
      (element as HTMLFormElement).requestSubmit?.();
      return { submitted: true, via: 'form' };
    }
    element.click();
    return { submitted: true, via: 'click' };
  }

  async read(target: { selector?: string }): Promise<unknown> {
    this.ensureDom();
    if (!target.selector) throw new Error('Read action missing selector');
    const element = document.querySelector(target.selector);
    if (!element) throw new Error(`Could not find element for read action: ${target.selector}`);
    return { text: element.textContent || '' };
  }

  async wait(durationMs: number): Promise<unknown> {
    await new Promise((resolve) => setTimeout(resolve, durationMs));
    return { waited: true, duration: durationMs };
  }
}

/**
 * Action Executor
 *
 * Executes planned actions in sequence using injected action bindings.
 * Defaults to browser DOM bindings when available.
 */
export class ActionExecutor {
  private plan: ExecutionPlan;
  private onStepStart?: (step: PlannedAction, index: number) => void;
  private onStepComplete?: (step: PlannedAction, index: number, result: unknown) => void;
  private onStepError?: (step: PlannedAction, index: number, error: Error) => void;
  private onPlanStart?: (plan: ExecutionPlan) => void;
  private onPlanComplete?: (result: ExecutionResult) => void;
  private timeout: number;
  private dryRun: boolean;
  private bindings: ActionBindings;

  constructor(plan: ExecutionPlan, options?: {
    timeout?: number;
    dryRun?: boolean;
    bindings?: ActionBindings;
    onStepStart?: (step: PlannedAction, index: number) => void;
    onStepComplete?: (step: PlannedAction, index: number, result: unknown) => void;
    onStepError?: (step: PlannedAction, index: number, error: Error) => void;
    onPlanStart?: (plan: ExecutionPlan) => void;
    onPlanComplete?: (result: ExecutionResult) => void;
  }) {
    this.plan = plan;
    this.timeout = options?.timeout || 30000;
    this.dryRun = options?.dryRun || false;
    this.bindings = options?.bindings || new BrowserActionBindings();
    this.onStepStart = options?.onStepStart;
    this.onStepComplete = options?.onStepComplete;
    this.onStepError = options?.onStepError;
    this.onPlanStart = options?.onPlanStart;
    this.onPlanComplete = options?.onPlanComplete;
  }

  async execute(): Promise<ExecutionResult> {
    const startTime = Date.now();
    const steps = this.plan.steps.slice().sort((a, b) => a.priority - b.priority);
    let completedSteps = 0;
    let failedStep: PlannedAction | undefined;
    let error: Error | undefined;

    this.onPlanStart?.(this.plan);

    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (Date.now() - startTime > this.timeout) {
          throw new Error(`Execution timeout after ${this.timeout}ms`);
        }

        this.onStepStart?.(step, i);
        try {
          if (this.dryRun) {
            await this.validateStep(step);
            this.onStepComplete?.(step, i, { dryRun: true });
          } else {
            const result = await this.executeStep(step);
            this.onStepComplete?.(step, i, result);
          }
          completedSteps++;
        } catch (stepError) {
          const err = stepError instanceof Error ? stepError : new Error(String(stepError));
          this.onStepError?.(step, i, err);
          failedStep = step;
          error = err;
          break;
        }
      }
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
    }

    const duration = Date.now() - startTime;
    const result: ExecutionResult = {
      planId: this.plan.goalId,
      success: error === undefined && completedSteps === steps.length,
      completedSteps,
      totalSteps: steps.length,
      failedStep,
      error: error?.message,
      duration,
    };
    this.onPlanComplete?.(result);
    return result;
  }

  private async validateStep(step: PlannedAction): Promise<void> {
    if (step.type === 'fill' && step.value == null) {
      throw new Error(`Invalid step: missing value for ${step.type}`);
    }
    if (!step.target && step.type !== 'wait' && step.type !== 'navigate' && step.type !== 'custom') {
      throw new Error(`Invalid step: missing target for ${step.type}`);
    }
  }

  private async executeStep(step: PlannedAction): Promise<unknown> {
    switch (step.type) {
      case 'fill':
        return this.bindings.fill(step.target || {}, String(step.value ?? ''));
      case 'click':
        return this.bindings.click(step.target || {});
      case 'select':
        return this.bindings.select(step.target || {}, String(step.value ?? ''));
      case 'navigate':
        return this.bindings.navigate(String(step.value ?? ''));
      case 'submit':
        return this.bindings.submit(step.target || {});
      case 'read':
        return this.bindings.read(step.target || {});
      case 'wait':
        return this.bindings.wait(typeof step.value === 'number' ? step.value : (parseInt(String(step.value ?? 1000), 10) || 1000));
      default:
        return { custom: true, type: step.type };
    }
  }
}
