export interface RaawiExecutionPageSummary {
    pageNumber: number;
    pageUrl: string;
    hasPlan: boolean;
    hasExecution: boolean;
    dryRun: boolean;
    success: boolean | null;
    totalSteps: number;
    completedSteps: number;
    error?: string;
}
export declare function loadRaawiExecutionPageSummary(input: {
    outputDir: string;
    scanId: string;
    pageNumber: number;
    pageUrl: string;
}): Promise<RaawiExecutionPageSummary>;
export declare function loadRaawiExecutionPageSummaries(input: {
    outputDir: string;
    scanId: string;
    pages: Array<{
        pageNumber: number;
        pageUrl: string;
    }>;
}): Promise<RaawiExecutionPageSummary[]>;
//# sourceMappingURL=raawi-execution-summary.d.ts.map