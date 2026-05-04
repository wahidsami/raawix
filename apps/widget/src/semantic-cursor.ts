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

export class SemanticCursor {
  private segments: SemanticReadingSegment[] = [];
  private currentIndex: number = -1;

  constructor(segments: SemanticReadingSegment[] = []) {
    this.segments = segments;
    this.currentIndex = segments.length > 0 ? 0 : -1;
  }

  /**
   * Update segments (e.g., when page model changes)
   */
  public updateSegments(segments: SemanticReadingSegment[]): void {
    this.segments = segments;
    // Reset cursor if segments changed significantly
    if (this.currentIndex >= segments.length) {
      this.currentIndex = Math.max(0, segments.length - 1);
    }
  }

  /**
   * Get current segment
   */
  public current(): SemanticReadingSegment | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.segments.length) {
      return this.segments[this.currentIndex];
    }
    return null;
  }

  /**
   * Get current cursor state
   */
  public getState(): SemanticCursorState {
    const current = this.current();
    return {
      currentSegmentId: current?.id || null,
      currentSegmentIndex: this.currentIndex,
      totalSegments: this.segments.length,
      mode: (current?.type as any) || 'none',
    };
  }

  /**
   * Move to next segment
   */
  public next(): SemanticReadingSegment | null {
    if (this.segments.length === 0) return null;
    this.currentIndex = Math.min(this.currentIndex + 1, this.segments.length - 1);
    return this.current();
  }

  /**
   * Move to previous segment
   */
  public previous(): SemanticReadingSegment | null {
    if (this.segments.length === 0) return null;
    this.currentIndex = Math.max(this.currentIndex - 1, 0);
    return this.current();
  }

  /**
   * Jump to segment by index
   */
  public jumpToIndex(index: number): SemanticReadingSegment | null {
    if (index >= 0 && index < this.segments.length) {
      this.currentIndex = index;
      return this.current();
    }
    return null;
  }

  /**
   * Jump to segment by ID
   */
  public jumpToSegmentId(id: string): SemanticReadingSegment | null {
    const index = this.segments.findIndex((seg) => seg.id === id);
    if (index >= 0) {
      this.currentIndex = index;
      return this.current();
    }
    return null;
  }

  /**
   * Move to first segment
   */
  public goToStart(): SemanticReadingSegment | null {
    this.currentIndex = this.segments.length > 0 ? 0 : -1;
    return this.current();
  }

  /**
   * Move to last segment
   */
  public goToEnd(): SemanticReadingSegment | null {
    this.currentIndex = Math.max(0, this.segments.length - 1);
    return this.current();
  }

  /**
   * Find next segment of a given type
   */
  public findNextOfType(type: string): SemanticReadingSegment | null {
    if (this.currentIndex < 0) return null;
    for (let i = this.currentIndex + 1; i < this.segments.length; i++) {
      if (this.segments[i].type === type) {
        this.currentIndex = i;
        return this.segments[i];
      }
    }
    return null;
  }

  /**
   * Find previous segment of a given type
   */
  public findPreviousOfType(type: string): SemanticReadingSegment | null {
    if (this.currentIndex < 0) return null;
    for (let i = this.currentIndex - 1; i >= 0; i--) {
      if (this.segments[i].type === type) {
        this.currentIndex = i;
        return this.segments[i];
      }
    }
    return null;
  }

  /**
   * Highlight current segment in DOM
   */
  public highlightCurrent(): void {
    // Clear previous highlights
    document.querySelectorAll('.raawi-semantic-highlight').forEach((el) => {
      el.classList.remove('raawi-semantic-highlight');
      (el as HTMLElement).style.outline = '';
      (el as HTMLElement).style.outlineOffset = '';
    });

    const current = this.current();
    if (current && current.element) {
      current.element.classList.add('raawi-semantic-highlight');
      current.element.style.outline = '3px solid #4a90e2';
      current.element.style.outlineOffset = '4px';
      current.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * Clear highlight
   */
  public clearHighlight(): void {
    document.querySelectorAll('.raawi-semantic-highlight').forEach((el) => {
      el.classList.remove('raawi-semantic-highlight');
      (el as HTMLElement).style.outline = '';
      (el as HTMLElement).style.outlineOffset = '';
    });
  }

  /**
   * Get context around current segment
   */
  public getContext(): { before: SemanticReadingSegment[]; current: SemanticReadingSegment | null; after: SemanticReadingSegment[] } {
    const before = this.segments.slice(Math.max(0, this.currentIndex - 2), this.currentIndex);
    const current = this.current();
    const after = this.segments.slice(this.currentIndex + 1, Math.min(this.segments.length, this.currentIndex + 3));
    return { before, current, after };
  }

  /**
   * Get all segments
   */
  public getAllSegments(): SemanticReadingSegment[] {
    return this.segments.slice();
  }

  /**
   * Get segments of a specific type
   */
  public getSegmentsByType(type: string): SemanticReadingSegment[] {
    return this.segments.filter((seg) => seg.type === type);
  }

  /**
   * Reset cursor to beginning
   */
  public reset(): void {
    this.currentIndex = this.segments.length > 0 ? 0 : -1;
  }
}
