export class SemanticCursor {
    segments = [];
    currentIndex = -1;
    constructor(segments = []) {
        this.segments = segments;
        this.currentIndex = segments.length > 0 ? 0 : -1;
    }
    /**
     * Update segments (e.g., when page model changes)
     */
    updateSegments(segments) {
        this.segments = segments;
        // Reset cursor if segments changed significantly
        if (this.currentIndex >= segments.length) {
            this.currentIndex = Math.max(0, segments.length - 1);
        }
    }
    /**
     * Get current segment
     */
    current() {
        if (this.currentIndex >= 0 && this.currentIndex < this.segments.length) {
            return this.segments[this.currentIndex];
        }
        return null;
    }
    /**
     * Get current cursor state
     */
    getState() {
        const current = this.current();
        return {
            currentSegmentId: current?.id || null,
            currentSegmentIndex: this.currentIndex,
            totalSegments: this.segments.length,
            mode: current?.type || 'none',
        };
    }
    /**
     * Move to next segment
     */
    next() {
        if (this.segments.length === 0)
            return null;
        this.currentIndex = Math.min(this.currentIndex + 1, this.segments.length - 1);
        return this.current();
    }
    /**
     * Move to previous segment
     */
    previous() {
        if (this.segments.length === 0)
            return null;
        this.currentIndex = Math.max(this.currentIndex - 1, 0);
        return this.current();
    }
    /**
     * Jump to segment by index
     */
    jumpToIndex(index) {
        if (index >= 0 && index < this.segments.length) {
            this.currentIndex = index;
            return this.current();
        }
        return null;
    }
    /**
     * Jump to segment by ID
     */
    jumpToSegmentId(id) {
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
    goToStart() {
        this.currentIndex = this.segments.length > 0 ? 0 : -1;
        return this.current();
    }
    /**
     * Move to last segment
     */
    goToEnd() {
        this.currentIndex = Math.max(0, this.segments.length - 1);
        return this.current();
    }
    /**
     * Find next segment of a given type
     */
    findNextOfType(type) {
        if (this.currentIndex < 0)
            return null;
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
    findPreviousOfType(type) {
        if (this.currentIndex < 0)
            return null;
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
    highlightCurrent() {
        // Clear previous highlights
        document.querySelectorAll('.raawi-semantic-highlight').forEach((el) => {
            el.classList.remove('raawi-semantic-highlight');
            el.style.outline = '';
            el.style.outlineOffset = '';
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
    clearHighlight() {
        document.querySelectorAll('.raawi-semantic-highlight').forEach((el) => {
            el.classList.remove('raawi-semantic-highlight');
            el.style.outline = '';
            el.style.outlineOffset = '';
        });
    }
    /**
     * Get context around current segment
     */
    getContext() {
        const before = this.segments.slice(Math.max(0, this.currentIndex - 2), this.currentIndex);
        const current = this.current();
        const after = this.segments.slice(this.currentIndex + 1, Math.min(this.segments.length, this.currentIndex + 3));
        return { before, current, after };
    }
    /**
     * Get all segments
     */
    getAllSegments() {
        return this.segments.slice();
    }
    /**
     * Get segments of a specific type
     */
    getSegmentsByType(type) {
        return this.segments.filter((seg) => seg.type === type);
    }
    /**
     * Reset cursor to beginning
     */
    reset() {
        this.currentIndex = this.segments.length > 0 ? 0 : -1;
    }
}
//# sourceMappingURL=semantic-cursor.js.map