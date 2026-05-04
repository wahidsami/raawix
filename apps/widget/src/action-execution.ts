import type { SemanticAction } from './semantic-runtime';

function safeQuerySelector(selector?: string): HTMLElement | null {
  if (!selector) {
    return null;
  }

  try {
    return document.querySelector(selector) as HTMLElement | null;
  } catch {
    return null;
  }
}

export interface SemanticActionExecutionResult {
  success: boolean;
  message: string;
  actionType?: string;
}

export function executeSemanticAction(action: SemanticAction, fallbackSelector?: string): SemanticActionExecutionResult {
  const selector = action.selector || fallbackSelector;
  const element = safeQuerySelector(selector);

  if (!element) {
    return {
      success: false,
      message: 'Unable to find the semantic element for this action.',
      actionType: action.type,
    };
  }

  const tagName = element.tagName.toLowerCase();
  const isLink = tagName === 'a' && (element as HTMLAnchorElement).href;
  const isButton = tagName === 'button' || element.getAttribute('role') === 'button';

  try {
    if (action.type === 'navigate' && isLink) {
      window.location.href = (element as HTMLAnchorElement).href;
      return { success: true, message: `Navigated via semantic action: ${action.label}.`, actionType: action.type };
    }

    if ((action.type === 'click' || action.type === 'submit' || isButton || isLink) && element.click) {
      element.click();
      return { success: true, message: `Activated semantic action: ${action.label}.`, actionType: action.type };
    }

    if (action.type === 'submit' && tagName === 'form') {
      (element as HTMLFormElement).requestSubmit?.();
      return { success: true, message: `Submitted the semantic form action: ${action.label}.`, actionType: action.type };
    }
  } catch (error) {
    return {
      success: false,
      message: `Semantic action failed: ${(error as Error)?.message || 'unknown error'}`,
      actionType: action.type,
    };
  }

  try {
    element.focus({ preventScroll: true });
    return {
      success: true,
      message: `Focused semantic action element: ${action.label}.`,
      actionType: action.type,
    };
  } catch {
    return {
      success: false,
      message: `Could not activate semantic action: ${action.label}.`,
      actionType: action.type,
    };
  }
}
