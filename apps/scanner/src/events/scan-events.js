import { EventEmitter } from 'node:events';
/**
 * Global event emitter for scan progress
 * Additive wrapper around existing pipeline - does not break existing flow
 */
class ScanEventEmitter extends EventEmitter {
    activeScans = new Map();
    /**
     * Emit event and store for late subscribers
     */
    emitEvent(scanId, event) {
        // Store event for late subscribers (SSE clients that connect after event)
        if (!this.activeScans.has(scanId)) {
            this.activeScans.set(scanId, []);
        }
        const events = this.activeScans.get(scanId);
        events.push(event);
        // Keep only last 100 events per scan
        if (events.length > 100) {
            events.shift();
        }
        // Emit to listeners
        this.emit('scan-event', scanId, event);
        this.emit(`scan-${scanId}`, event);
    }
    /**
     * Get stored events for a scan (for late subscribers)
     */
    getStoredEvents(scanId) {
        return this.activeScans.get(scanId) || [];
    }
    /**
     * Clear stored events when scan completes
     */
    clearScan(scanId) {
        this.activeScans.delete(scanId);
    }
}
export const scanEventEmitter = new ScanEventEmitter();
//# sourceMappingURL=scan-events.js.map