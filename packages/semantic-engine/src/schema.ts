export type SemanticConfidence = 'high' | 'medium' | 'low';

export type SemanticBlockType =
  | 'page'
  | 'section'
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'button'
  | 'link'
  | 'form'
  | 'field'
  | 'list'
  | 'list_item'
  | 'table'
  | 'landmark'
  | 'banner'
  | 'main'
  | 'navigation'
  | 'footer';

export interface SemanticBlock {
  id: string;
  type: SemanticBlockType;
  label?: string;
  content?: string;
  role?: string;
  selector?: string;
  confidence?: SemanticConfidence;
  metadata?: Record<string, unknown>;
  children?: SemanticBlock[];
}

export type SemanticFieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'search'
  | 'tel'
  | 'url'
  | 'checkbox'
  | 'radio'
  | 'select'
  | 'textarea'
  | 'number'
  | 'date'
  | 'file'
  | 'submit'
  | 'reset';

export interface SemanticField {
  id: string;
  type: SemanticFieldType;
  label?: string;
  name?: string;
  placeholder?: string;
  value?: string;
  required?: boolean;
  confidence?: SemanticConfidence;
  metadata?: Record<string, unknown>;
}

export type SemanticActionType =
  | 'navigate'
  | 'click'
  | 'submit'
  | 'input'
  | 'select'
  | 'toggle'
  | 'scroll'
  | 'focus'
  | 'read';

export interface SemanticAction {
  id: string;
  type: SemanticActionType;
  label?: string;
  targetId?: string;
  selector?: string;
  confidence?: SemanticConfidence;
  metadata?: Record<string, unknown>;
}

export type SemanticRelationshipType =
  | 'contains'
  | 'controls'
  | 'labelled_by'
  | 'described_by'
  | 'related'
  | 'ancestor'
  | 'sibling';

export interface SemanticRelationship {
  id: string;
  type: SemanticRelationshipType;
  sourceId: string;
  targetId: string;
  confidence?: SemanticConfidence;
  metadata?: Record<string, unknown>;
}

export interface SemanticPageModel {
  modelVersion: number;
  pageUrl?: string;
  pageNumber?: number;
  title?: string;
  description?: string;
  generatedAt: string;
  confidence: SemanticConfidence;
  sourceMix?: {
    dom: number;
    vision: number;
    ai: number;
  };
  structure: SemanticBlock[];
  actions: SemanticAction[];
  relationships: SemanticRelationship[];
  metadata?: Record<string, unknown>;
}

export interface SemanticBuilderInput {
  html?: string;
  url?: string;
  pageNumber?: number;
  title?: string;
  a11y?: unknown;
  vision?: unknown;
  assistiveMap?: unknown;
  metadata?: Record<string, unknown>;
}

export type SemanticBuilderOutput = SemanticPageModel;
