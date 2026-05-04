import type { SemanticPageModel, SemanticAction, SemanticBlock } from '@raawi-x/semantic-engine';
import type { ExecutionPlan, PlannedAction, Intent, AgentGoal } from './types.js';

/**
 * Action Planner
 * 
 * Takes an intent and semantic model, produces an execution plan.
 * Plans the optimal sequence of actions to achieve a goal.
 */
export class ActionPlanner {
  private static normalizeModelConfidence(value: unknown): number {
    if (typeof value === 'number') {
      return Math.max(0, Math.min(1, value));
    }
    if (value === 'high') return 0.9;
    if (value === 'medium') return 0.65;
    if (value === 'low') return 0.4;
    return 0.5;
  }

  private static getModelPageUrl(model: SemanticPageModel): string {
    return (model as any).metadata?.url || (model as any).pageUrl || '';
  }
  /**
   * Plan execution steps for a given intent and semantic model
   */
  static plan(intent: Intent, model: SemanticPageModel, goalId: string): ExecutionPlan {
    const steps: PlannedAction[] = [];
    let priority = 0;

    // Route to specific planner based on intent type
    switch (intent.type) {
      case 'login':
        return this.planLogin(intent, model, goalId, steps, priority);

      case 'checkout':
        return this.planCheckout(intent, model, goalId, steps, priority);

      case 'search':
        return this.planSearch(intent, model, goalId, steps, priority);

      case 'navigate':
        return this.planNavigate(intent, model, goalId, steps, priority);

      case 'fill-form':
        return this.planFillForm(intent, model, goalId, steps, priority);

      default:
        return this.planCustom(intent, model, goalId, steps, priority);
    }
  }

  private static planLogin(intent: Intent, model: SemanticPageModel, goalId: string, steps: PlannedAction[], priority: number): ExecutionPlan {
    const username = intent.parameters.username as string | null;
    const password = intent.parameters.password as string | null;

    if (username) {
      steps.push({
        type: 'fill',
        label: 'Enter username',
        target: {
          fieldKey: 'username',
        },
        value: username,
        priority: priority++,
      });
    }

    if (password) {
      steps.push({
        type: 'fill',
        label: 'Enter password',
        target: {
          fieldKey: 'password',
        },
        value: password,
        priority: priority++,
      });
    }

    // Find and click submit button
    const submitAction = this.findActionByType(model, 'submit');
    if (submitAction) {
      steps.push({
        type: 'click',
        label: 'Submit login',
        target: {
          actionId: submitAction.id,
          selector: submitAction.selector,
        },
        priority: priority++,
      });
    }

    // Check for MFA token if needed
    const mfaToken = intent.parameters.mfaToken as string | null;
    if (mfaToken) {
      steps.push({
        type: 'fill',
        label: 'Enter MFA code',
        target: {
          fieldKey: 'mfa',
        },
        value: mfaToken,
        priority: priority++,
      });

      const mfaSubmit = this.findActionByLabel(model, ['verify', 'confirm', 'submit']);
      if (mfaSubmit) {
        steps.push({
          type: 'click',
          label: 'Confirm MFA',
          target: {
            actionId: mfaSubmit.id,
            selector: mfaSubmit.selector,
          },
          priority: priority++,
        });
      }
    }

    return {
      goalId,
      goal: 'login',
      steps,
      confidence: this.calculatePlanConfidence(model, steps),
      estimatedDuration: steps.length * 500, // ~500ms per step
      metadata: {
        generatedAt: new Date().toISOString(),
        pageUrl: this.getModelPageUrl(model),
        modelVersion: '1.0',
      },
    };
  }

  private static planCheckout(intent: Intent, model: SemanticPageModel, goalId: string, steps: PlannedAction[], priority: number): ExecutionPlan {
    const params = intent.parameters;

    // Step 1: Shipping address (if not already filled)
    const shippingForm = this.findFormByLabel(model, ['shipping', 'address']);
    if (shippingForm && params.shippingAddress) {
      steps.push({
        type: 'fill',
        label: 'Fill shipping address',
        target: { fieldKey: 'shipping-address' },
        value: String(JSON.stringify(params.shippingAddress)),
        priority: priority++,
      });
    }

    // Step 2: Billing address (if different)
    if (params.billingAddress) {
      const billingForm = this.findFormByLabel(model, ['billing']);
      if (billingForm) {
        steps.push({
          type: 'fill',
          label: 'Fill billing address',
          target: { fieldKey: 'billing-address' },
          value: String(JSON.stringify(params.billingAddress)),
          priority: priority++,
        });
      }
    }

    // Step 3: Payment (card token or similar)
    if (params.cardToken) {
      steps.push({
        type: 'fill',
        label: 'Enter payment information',
        target: { fieldKey: 'payment' },
        value: String(params.cardToken),
        priority: priority++,
      });
    }

    // Step 4: Apply coupon if provided
    if (params.applyCoupon) {
      const couponField = this.findActionByLabel(model, ['coupon', 'promo', 'code']);
      if (couponField) {
        steps.push({
          type: 'fill',
          label: 'Apply coupon code',
          target: { actionId: couponField.id, selector: couponField.selector },
          value: String(params.applyCoupon),
          priority: priority++,
        });
      }
    }

    // Step 5: Submit order
    const submitAction = this.findActionByLabel(model, ['submit', 'checkout', 'place order', 'pay']);
    if (submitAction) {
      steps.push({
        type: 'click',
        label: 'Place order',
        target: { actionId: submitAction.id, selector: submitAction.selector },
        priority: priority++,
      });
    }

    return {
      goalId,
      goal: 'checkout',
      steps,
      confidence: this.calculatePlanConfidence(model, steps),
      estimatedDuration: steps.length * 1000,
      metadata: {
        generatedAt: new Date().toISOString(),
        pageUrl: this.getModelPageUrl(model),
        modelVersion: '1.0',
      },
    };
  }

  private static planSearch(intent: Intent, model: SemanticPageModel, goalId: string, steps: PlannedAction[], priority: number): ExecutionPlan {
    const query = String(intent.parameters.query || '');

    // Find search input
    const searchField = this.findFormByLabel(model, ['search']);
    if (searchField || query) {
      steps.push({
        type: 'fill',
        label: 'Enter search query',
        target: { fieldKey: 'search' },
        value: query,
        priority: priority++,
      });

      // Find and click search button
      const searchAction = this.findActionByLabel(model, ['search', 'find']);
      if (searchAction) {
        steps.push({
          type: 'click',
          label: 'Execute search',
          target: { actionId: searchAction.id, selector: searchAction.selector },
          priority: priority++,
        });
      }
    }

    // Apply filters if any
    const filters = intent.parameters.filters as Record<string, unknown> | undefined;
    if (filters && Object.keys(filters).length > 0) {
      steps.push({
        type: 'custom',
        label: 'Apply search filters',
        target: { fieldKey: 'filters' },
        value: String(JSON.stringify(filters)),
        priority: priority++,
      });
    }

    return {
      goalId,
      goal: 'search',
      steps,
      confidence: this.calculatePlanConfidence(model, steps),
      estimatedDuration: steps.length * 800,
      metadata: {
        generatedAt: new Date().toISOString(),
        pageUrl: this.getModelPageUrl(model),
        modelVersion: '1.0',
      },
    };
  }

  private static planNavigate(intent: Intent, model: SemanticPageModel, goalId: string, steps: PlannedAction[], priority: number): ExecutionPlan {
    const target = intent.parameters.target as string;
    const menuPath = intent.parameters.menuPath as string[] | null;

    // Navigate via menu path if available
    if (menuPath && menuPath.length > 0) {
      menuPath.forEach((item) => {
        const action = this.findActionByLabel(model, [item]);
        if (action) {
          steps.push({
            type: 'click',
            label: `Navigate to ${item}`,
            target: { actionId: action.id, selector: action.selector },
            priority: priority++,
          });
        }
      });
    } else {
      // Find target by label or description
      const targetAction = this.findActionByLabel(model, [target]);
      if (targetAction) {
        steps.push({
          type: 'click',
          label: `Navigate to ${target}`,
          target: { actionId: targetAction.id, selector: targetAction.selector },
          priority: priority++,
        });
      }
    }

    return {
      goalId,
      goal: 'navigate',
      steps,
      confidence: steps.length > 0 ? 0.85 : 0.3,
      estimatedDuration: steps.length * 600,
      metadata: {
        generatedAt: new Date().toISOString(),
        pageUrl: this.getModelPageUrl(model),
        modelVersion: '1.0',
      },
    };
  }

  private static planFillForm(intent: Intent, model: SemanticPageModel, goalId: string, steps: PlannedAction[], priority: number): ExecutionPlan {
    const fields = intent.parameters.fields as Record<string, string> | undefined;
    const submitAfter = intent.parameters.submitAfter !== false;

    if (fields && Object.keys(fields).length > 0) {
      Object.entries(fields).forEach(([fieldKey, value]) => {
        steps.push({
          type: 'fill',
          label: `Fill ${fieldKey}`,
          target: { fieldKey },
          value: String(value),
          priority: priority++,
        });
      });
    }

    // Submit if requested
    if (submitAfter) {
      const submitAction = this.findActionByLabel(model, ['submit', 'send', 'confirm']);
      if (submitAction) {
        steps.push({
          type: 'click',
          label: 'Submit form',
          target: { actionId: submitAction.id, selector: submitAction.selector },
          priority: priority++,
        });
      }
    }

    return {
      goalId,
      goal: 'fill-form',
      steps,
      confidence: this.calculatePlanConfidence(model, steps),
      estimatedDuration: steps.length * 600,
      metadata: {
        generatedAt: new Date().toISOString(),
        pageUrl: this.getModelPageUrl(model),
        modelVersion: '1.0',
      },
    };
  }

  private static planCustom(intent: Intent, model: SemanticPageModel, goalId: string, steps: PlannedAction[], _priority: number): ExecutionPlan {
    return {
      goalId,
      goal: 'custom',
      steps,
      confidence: (intent.confidence || 0.5) * 0.7, // Custom plans are less confident
      estimatedDuration: 5000,
      metadata: {
        generatedAt: new Date().toISOString(),
        pageUrl: this.getModelPageUrl(model),
        modelVersion: '1.0',
      },
    };
  }

  // Helper methods

  private static findActionByType(model: SemanticPageModel, type: string): SemanticAction | null {
    if (!model.actions || !Array.isArray(model.actions)) {
      return null;
    }
    return (model.actions as SemanticAction[]).find((a) => a.type === type) || null;
  }

  private static findActionByLabel(model: SemanticPageModel, labels: string[]): SemanticAction | null {
    if (!model.actions || !Array.isArray(model.actions)) {
      return null;
    }

    const lowerLabels = labels.map((l) => l.toLowerCase());
    return (model.actions as SemanticAction[]).find((a) => {
      const actionLabel = (a.label || '').toLowerCase();
      return lowerLabels.some((label) => actionLabel.includes(label) || label.includes(actionLabel));
    }) || null;
  }

  private static findFormByLabel(model: SemanticPageModel, labels: string[]): SemanticBlock | null {
    if (!model.structure || !Array.isArray(model.structure)) {
      return null;
    }

    const lowerLabels = labels.map((l) => l.toLowerCase());
    return (model.structure as SemanticBlock[]).find((block) => {
      if (block.type !== 'form') return false;
      const blockLabel = (block.label || '').toLowerCase();
      return lowerLabels.some((label) => blockLabel.includes(label) || label.includes(blockLabel));
    }) || null;
  }

  private static calculatePlanConfidence(model: SemanticPageModel, steps: PlannedAction[]): number {
    if (steps.length === 0) return 0.3;

    const modelConfidence = this.normalizeModelConfidence((model as any).confidence);
    const stepCoverage = Math.min(steps.length / 5, 1); // Higher confidence for more steps planned
    return Math.min(modelConfidence * (0.7 + stepCoverage * 0.3), 1);
  }
}
