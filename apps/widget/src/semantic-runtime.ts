export interface SemanticPageModel {
  metadata?: {
    url?: string;
    title?: string;
    language?: string;
    scanId?: string;
    matchedUrl?: string;
  };
  structure?: SemanticBlock[];
  actions?: SemanticAction[];
  relationships?: SemanticRelationship[];
  confidence?: number;
  sourceMix?: {
    dom?: number;
    vision?: number;
    ai?: number;
  };
}

export interface SemanticAction {
  id: string;
  type: 'click' | 'fill' | 'select' | 'navigate' | 'submit' | 'custom' | string;
  label: string;
  description?: string;
  selector?: string;
  targetBlockId?: string;
  confidence?: number;
}

export interface SemanticField {
  key?: string;
  selector?: string;
  tag?: string;
  inputType?: string;
  role?: string;
  required?: boolean;
  label?: string;
  hint?: string;
}

export interface SemanticBlock {
  type: string;
  label?: string;
  content?: string;
  selector?: string;
  fields?: SemanticField[];
  items?: Array<Record<string, unknown>>;
  confidence?: number;
}

export interface SemanticRelationship {
  from?: string;
  to?: string;
  type?: string;
  confidence?: number;
}

export interface SemanticReadingSegment {
  id: string;
  type: string;
  text: string;
  heading?: string;
  element?: HTMLElement | null;
  priority: number;
}

export interface SemanticReadingQueue {
  segments: SemanticReadingSegment[];
  currentIndex: number;
  mode: 'full' | 'summary' | 'detailed-summary';
}

export interface SemanticActionCandidate {
  label: string;
  description: string;
  selector?: string;
  element: HTMLElement | null;
  semanticAction?: SemanticAction;
}

export class SemanticRuntime {
  static buildReadingQueue(model: SemanticPageModel, mode: 'full' | 'summary' | 'detailed-summary'): SemanticReadingQueue {
    const segments: SemanticReadingSegment[] = [];
    let priority = 0;

    const pageTitle = model.metadata?.title || document.title || 'Page';
    segments.push({
      id: 'title',
      type: 'title',
      text: `Page: ${pageTitle}`,
      priority: priority++,
    });

    const summaryText = this.getSemanticSummary(model);
    if (summaryText) {
      segments.push({
        id: 'summary',
        type: 'summary',
        text: `Summary: ${summaryText}`,
        priority: priority++,
      });
    }

    if (mode === 'summary') {
      return { segments, currentIndex: 0, mode };
    }

    const sections = this.getSemanticSections(model).slice(0, 5);
    sections.forEach((section, idx) => {
      segments.push({
        id: `section-${idx}`,
        type: 'section',
        text: section.text,
        heading: section.heading,
        element: this.findSemanticElement(section.selector),
        priority: priority++,
      });
    });

    if (mode === 'detailed-summary') {
      return { segments, currentIndex: 0, mode };
    }

    const forms = this.getSemanticForms(model).slice(0, 3);
    forms.forEach((form, idx) => {
      segments.push({
        id: `form-${idx}`,
        type: 'form',
        text: form.text,
        heading: form.heading,
        element: this.findSemanticElement(form.selector),
        priority: priority++,
      });
    });

    const actions = this.getSemanticActions(model).slice(0, 5);
    actions.forEach((action, idx) => {
      segments.push({
        id: `action-${idx}`,
        type: 'action',
        text: action.text,
        heading: action.label,
        element: this.findSemanticElement(action.selector),
        priority: priority++,
      });
    });

    return { segments, currentIndex: 0, mode };
  }

  static collectActions(model: SemanticPageModel): SemanticActionCandidate[] {
    if (!model?.actions || !Array.isArray(model.actions)) {
      return [];
    }

    return model.actions.map((action) => {
      const label = typeof action.label === 'string' ? action.label : (typeof action.type === 'string' ? action.type : 'Action');
      const description = typeof action.description === 'string' ? action.description : '';
      const selector = typeof action.selector === 'string' ? action.selector : undefined;
      return {
        label,
        description,
        selector,
        element: selector ? this.findSemanticElement(selector) : null,
        semanticAction: action,
      };
    }).filter((candidate) => candidate.label && candidate.label.trim().length > 0);
  }

  static getSemanticSummary(model: SemanticPageModel): string | null {
    if (!model?.structure || !Array.isArray(model.structure)) {
      return null;
    }

    const pageBlock = model.structure.find((block) => block?.type === 'page' && typeof block?.content === 'string');
    if (pageBlock) {
      return pageBlock.content || null;
    }

    const headingBlock = model.structure.find((block) => block?.type === 'heading' && typeof block?.content === 'string');
    if (headingBlock) {
      return headingBlock.content || null;
    }

    const paragraphBlock = model.structure.find((block) => block?.type === 'paragraph' && typeof block?.content === 'string');
    return paragraphBlock?.content || null;
  }

  static getSemanticSections(model: SemanticPageModel): Array<{ heading: string; text: string; selector?: string }> {
    if (!model?.structure || !Array.isArray(model.structure)) {
      return [];
    }

    return model.structure
      .filter((block) => ['section', 'heading', 'paragraph', 'list', 'text'].includes(block?.type))
      .map((block) => ({
        heading: typeof block?.label === 'string' ? block.label : (typeof block?.content === 'string' ? block.content.split('.')[0] : 'Section'),
        text: typeof block?.content === 'string' ? block.content : '',
        selector: typeof block?.selector === 'string' ? block.selector : undefined,
      }));
  }

  static getSemanticForms(model: SemanticPageModel): Array<{ heading: string; text: string; selector?: string }> {
    if (!model?.structure || !Array.isArray(model.structure)) {
      return [];
    }

    return model.structure
      .filter((block) => block?.type === 'form')
      .map((block) => ({
        heading: typeof block?.label === 'string' ? block.label : 'Form',
        text: Array.isArray(block?.fields)
          ? block.fields.slice(0, 4).map((field) => `${field?.label || 'Field'}${field?.required ? ' (required)' : ''}`).join(', ')
          : 'Form fields available',
        selector: typeof block?.selector === 'string' ? block.selector : undefined,
      }));
  }

  static getSemanticActions(model: SemanticPageModel): Array<{ label: string; text: string; selector?: string }> {
    if (!model?.actions || !Array.isArray(model.actions)) {
      return [];
    }

    return model.actions.map((action) => ({
      label: typeof action?.label === 'string' ? action.label : (typeof action?.type === 'string' ? action.type : 'Action'),
      text: typeof action?.label === 'string' ? action.label : (typeof action?.type === 'string' ? `Action: ${action.type}` : 'Action'),
      selector: typeof action?.selector === 'string' ? action.selector : undefined,
    }));
  }

  static findSemanticElement(selector?: string): HTMLElement | null {
    if (!selector) {
      return null;
    }

    try {
      return document.querySelector(selector) as HTMLElement | null;
    } catch {
      return null;
    }
  }
}
