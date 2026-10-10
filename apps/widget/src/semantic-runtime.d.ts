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
export declare class SemanticRuntime {
    static buildReadingQueue(model: SemanticPageModel, mode: 'full' | 'summary' | 'detailed-summary'): SemanticReadingQueue;
    static collectActions(model: SemanticPageModel): SemanticActionCandidate[];
    static getSemanticSummary(model: SemanticPageModel): string | null;
    static getSemanticSections(model: SemanticPageModel): Array<{
        heading: string;
        text: string;
        selector?: string;
    }>;
    static getSemanticForms(model: SemanticPageModel): Array<{
        heading: string;
        text: string;
        selector?: string;
    }>;
    static getSemanticActions(model: SemanticPageModel): Array<{
        label: string;
        text: string;
        selector?: string;
    }>;
    static findSemanticElement(selector?: string): HTMLElement | null;
}
//# sourceMappingURL=semantic-runtime.d.ts.map