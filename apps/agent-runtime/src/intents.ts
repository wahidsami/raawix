import type { Intent, AgentGoal, AgentTask } from './types.js';

/**
 * Intent Parser
 * 
 * Maps user goals and context into semantic intents that can be executed.
 * Supports predefined goal types and natural language parsing.
 */
export class IntentParser {
  /**
   * Parse a task into an intent
   */
  static parse(task: AgentTask): Intent {
    // Direct mapping for known goal types
    if (task.goal === 'login') {
      return this.parseLoginIntent(task);
    }

    if (task.goal === 'checkout') {
      return this.parseCheckoutIntent(task);
    }

    if (task.goal === 'search') {
      return this.parseSearchIntent(task);
    }

    if (task.goal === 'navigate') {
      return this.parseNavigateIntent(task);
    }

    if (task.goal === 'fill-form') {
      return this.parseFillFormIntent(task);
    }

    // Fallback for custom goals
    return {
      type: 'custom',
      confidence: 0.5,
      parameters: task.context || {},
      description: task.description,
    };
  }

  private static parseLoginIntent(task: AgentTask): Intent {
    const context = task.context || {};
    return {
      type: 'login',
      confidence: 0.95,
      parameters: {
        username: context.username || context.email || null,
        password: context.password || null,
        rememberMe: context.rememberMe || false,
        mfaToken: context.mfaToken || null,
      },
      description: 'Log in with provided credentials',
    };
  }

  private static parseCheckoutIntent(task: AgentTask): Intent {
    const context = task.context || {};
    return {
      type: 'checkout',
      confidence: 0.9,
      parameters: {
        shippingAddress: context.shippingAddress || null,
        billingAddress: context.billingAddress || null,
        cardToken: context.cardToken || null,
        applyCoupon: context.couponCode || null,
        expressCheckout: context.expressCheckout || false,
      },
      description: 'Complete checkout flow with provided information',
    };
  }

  private static parseSearchIntent(task: AgentTask): Intent {
    const context = task.context || {};
    return {
      type: 'search',
      confidence: 0.92,
      parameters: {
        query: context.query || context.searchTerm || '',
        filters: context.filters || {},
        resultLimit: context.resultLimit || 10,
      },
      description: `Search for: ${context.query || context.searchTerm || 'unspecified'}`,
    };
  }

  private static parseNavigateIntent(task: AgentTask): Intent {
    const context = task.context || {};
    return {
      type: 'navigate',
      confidence: 0.88,
      parameters: {
        target: context.target || context.destination || '',
        menuPath: context.menuPath || null,
        searchSelector: context.selector || null,
      },
      description: `Navigate to: ${context.target || context.destination || 'destination'}`,
    };
  }

  private static parseFillFormIntent(task: AgentTask): Intent {
    const context = task.context || {};
    return {
      type: 'fill-form',
      confidence: 0.85,
      parameters: {
        formId: context.formId || null,
        fields: context.fields || {},
        skipOptional: context.skipOptional || false,
        submitAfter: context.submitAfter !== false, // Default true
      },
      description: `Fill form with provided data`,
    };
  }

  /**
   * Extract intent from natural language description
   * (This is a placeholder for more advanced NLP)
   */
  static parseFromDescription(description: string): Intent {
    const lowerDesc = description.toLowerCase();

    if (lowerDesc.includes('log in') || lowerDesc.includes('login') || lowerDesc.includes('sign in')) {
      return {
        type: 'login',
        confidence: 0.75,
        parameters: {},
        description,
      };
    }

    if (lowerDesc.includes('checkout') || lowerDesc.includes('purchase') || lowerDesc.includes('buy')) {
      return {
        type: 'checkout',
        confidence: 0.75,
        parameters: {},
        description,
      };
    }

    if (lowerDesc.includes('search') || lowerDesc.includes('find')) {
      return {
        type: 'search',
        confidence: 0.75,
        parameters: {},
        description,
      };
    }

    if (lowerDesc.includes('navigate') || lowerDesc.includes('go to') || lowerDesc.includes('click')) {
      return {
        type: 'navigate',
        confidence: 0.7,
        parameters: {},
        description,
      };
    }

    if (lowerDesc.includes('fill') || lowerDesc.includes('form')) {
      return {
        type: 'fill-form',
        confidence: 0.7,
        parameters: {},
        description,
      };
    }

    return {
      type: 'custom',
      confidence: 0.4,
      parameters: {},
      description,
    };
  }

  /**
   * Merge multiple intents (if multiple goals in one task)
   */
  static mergeIntents(intents: Intent[]): Intent {
    if (intents.length === 0) {
      return {
        type: 'custom',
        confidence: 0,
        parameters: {},
        description: 'No intents',
      };
    }

    if (intents.length === 1) {
      return intents[0];
    }

    // For multiple intents, create a composite
    return {
      type: 'custom',
      confidence: intents.reduce((sum, i) => sum + i.confidence, 0) / intents.length,
      parameters: intents.reduce((acc, i) => ({ ...acc, ...i.parameters }), {}),
      description: `Composite: ${intents.map((i) => i.description).join('; ')}`,
    };
  }
}
