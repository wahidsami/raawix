/**
 * Phase 4: Repository for Journey definitions (deterministic steps per Property).
 * Persistence only; no execution logic. Execution will be added in Phase 4.1.
 * Journeys are deterministic; credentials must be referenced via env placeholders (e.g. ${env:VAR}).
 */
export type JourneyWhen = 'before_crawl' | 'after_crawl';
export interface JourneyRecord {
    id: string;
    propertyId: string;
    name: string;
    when: JourneyWhen;
    stepsJson: unknown;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Get enabled journeys for a property (for execution hook).
 */
export declare function getEnabledJourneysByProperty(propertyId: string): Promise<JourneyRecord[]>;
/**
 * Get all journeys for a property (for CRUD/listing).
 */
export declare function getJourneysByProperty(propertyId: string): Promise<JourneyRecord[]>;
/**
 * Create a journey.
 */
export declare function createJourney(params: {
    propertyId: string;
    name: string;
    when: JourneyWhen;
    stepsJson: unknown;
    enabled?: boolean;
}): Promise<JourneyRecord | null>;
/**
 * Update a journey.
 */
export declare function updateJourney(id: string, params: {
    name?: string;
    when?: JourneyWhen;
    stepsJson?: unknown;
    enabled?: boolean;
}): Promise<JourneyRecord | null>;
/**
 * Disable a journey (soft-disable via enabled flag).
 */
export declare function disableJourney(id: string): Promise<boolean>;
//# sourceMappingURL=journey-repository.d.ts.map