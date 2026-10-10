import type { SemanticReadingSegment } from './semantic-runtime';
/**
 * Virtual Semantic Cursor
 *
 * Navigates through semantic blocks (text, forms, actions) as a logical
 * reading order rather than raw DOM traversal. Provides keyboard and
 * voice-driven navigation with semantic context.
 */
export interface SemanticCursorState {
    currentSegmentId: string | null;
    currentSegmentIndex: number;
    totalSegments: number;
    mode: 'text' | 'form' | 'action' | 'landmark' | 'none';
}
export declare class SemanticCursor {
    private segments;
    private currentIndex;
    constructor(segments?: SemanticReadingSegment[]);
    /**
     * Update segments (e.g., when page model changes)
     */
    updateSegments(segments: SemanticReadingSegment[]): void;
    /**
     * Get current segment
     */
    current(): SemanticReadingSegment | null;
    /**
     * Get current cursor state
     */
    getState(): SemanticCursorState;
    /**
     * Move to next segment
     */
    next(): SemanticReadingSegment | null;
    /**
     * Move to previous segment
     */
    previous(): SemanticReadingSegment | null;
    /**
     * Jump to segment by index
     */
    jumpToIndex(index: number): SemanticReadingSegment | null;
    /**
     * Jump to segment by ID
     */
    jumpToSegmentId(id: string): SemanticReadingSegment | null;
    /**
     * Move to first segment
     */
    goToStart(): SemanticReadingSegment | null;
    /**
     * Move to last segment
     */
    goToEnd(): SemanticReadingSegment | null;
    /**
     * Find next segment of a given type
     */
    findNextOfType(type: string): SemanticReadingSegment | null;
    /**
     * Find previous segment of a given type
     */
    findPreviousOfType(type: string): SemanticReadingSegment | null;
    /**
     * Highlight current segment in DOM
     */
    highlightCurrent(): void;
    /**
     * Clear highlight
     */
    clearHighlight(): void;
    /**
     * Get context around current segment
     */
    getContext(): {
        before: SemanticReadingSegment[];
        current: SemanticReadingSegment | null;
        after: SemanticReadingSegment[];
    };
    /**
     * Get all segments
     */
    getAllSegments(): SemanticReadingSegment[];
    /**
     * Get segments of a specific type
     */
    getSegmentsByType(type: string): SemanticReadingSegment[];
    /**
     * Reset cursor to beginning
     */
    reset(): void;
}
//# sourceMappingURL=semantic-cursor.d.ts.map