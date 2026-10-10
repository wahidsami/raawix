import type { Intent, AgentTask } from './types.js';
/**
 * Intent Parser
 *
 * Maps user goals and context into semantic intents that can be executed.
 * Supports predefined goal types and natural language parsing.
 */
export declare class IntentParser {
    /**
     * Parse a task into an intent
     */
    static parse(task: AgentTask): Intent;
    private static parseLoginIntent;
    private static parseCheckoutIntent;
    private static parseSearchIntent;
    private static parseNavigateIntent;
    private static parseFillFormIntent;
    /**
     * Extract intent from natural language description
     * (This is a placeholder for more advanced NLP)
     */
    static parseFromDescription(description: string): Intent;
    /**
     * Merge multiple intents (if multiple goals in one task)
     */
    static mergeIntents(intents: Intent[]): Intent;
}
//# sourceMappingURL=intents.d.ts.map