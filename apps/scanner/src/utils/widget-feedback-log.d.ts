export interface WidgetFeedbackEvent {
    at: string;
    url: string;
    event: string;
    scanId?: string;
    locale?: string;
    severity?: 'info' | 'warn' | 'error';
    payload?: Record<string, unknown>;
    userAgent?: string;
    ip?: string;
}
export declare function appendWidgetFeedbackEvent(baseOutputDir: string, feedbackDir: string, event: WidgetFeedbackEvent): Promise<void>;
//# sourceMappingURL=widget-feedback-log.d.ts.map