export declare const config: {
    port: number;
    apiKey: string;
    jwtSecret: string;
    jwtExpiresIn: string;
    reportUiOrigin: string;
    passwordResetExpiryMs: number;
    resendApiKey: string;
    resendFromEmail: string;
    maxConcurrentScans: number;
    outputDir: string;
    allowedPorts: number[];
    allowLocalhost: boolean;
    rateLimit: {
        windowMs: number;
        max: number;
    };
    quotas: {
        maxPagesHardLimit: number;
        maxDepthHardLimit: number;
        maxRuntimeMs: number;
        sequentialPageTimeoutMs: number;
        sequentialScanMinRuntimeMs: number;
    };
    getDynamicQuotas: () => Promise<{
        maxPages: number;
        maxDepth: number;
        maxRuntimeMs: number;
    }>;
    urlPolicy: {
        sameOriginOnly: boolean;
        allowedOrigins: string[];
    };
    audit: {
        enabled: boolean;
        logDir: string;
    };
    artifacts: {
        writeA11ySnapshot: boolean;
    };
    feedback: {
        enabled: boolean;
        dir: string;
    };
    raawi: {
        enabled: boolean;
        execution: {
            enabled: boolean;
            enableNonLoginGoals: boolean;
            loginUsername: string;
            loginPassword: string;
            searchQuery: string;
            navigateTarget: string;
            formDefaults: {
                name: string;
                email: string;
                message: string;
            };
        };
    };
    auth: {
        credentialEncryptionKey: string;
    };
    retention: {
        enabled: boolean;
        days: number;
    };
    vision: {
        enabled: boolean;
        ocrEnabled: boolean;
        maxCandidatesPerPage: number;
    };
    gemini: {
        enabled: boolean;
        apiKey: string;
        model: string;
        maxChars: number;
        maxImageBytes: number;
        maxImagesPerScan: number;
    };
    agent: {
        enabled: boolean;
        maxSteps: number;
        maxMs: number;
        probesEnabled: boolean;
    };
    openai: {
        enabled: boolean;
        apiKey: string;
        model: string;
        visionModel: string;
        maxChars: number;
        maxImageBytes: number;
        maxImagesPerScan: number;
        requestTimeoutMs: number;
        visionElementEnrichment: boolean;
    };
    agentAnalyst: {
        enabled: boolean;
        maxPagesPerScan: number;
        maxIssuesPerPage: number;
        cacheTtlMs: number;
    };
    database: {
        url: string;
        enabled: boolean;
    };
};
//# sourceMappingURL=config.d.ts.map