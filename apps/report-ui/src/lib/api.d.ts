export interface LoginResponse {
    token: string;
    user: {
        id: string;
        email: string;
        role: string;
        createdAt?: string;
    };
}
export interface User {
    id: string;
    email: string;
    role: string;
    createdAt: string;
}
declare class ApiClient {
    private token;
    setToken(token: string | null): void;
    getToken(): string | null;
    private request;
    login(email: string, password: string): Promise<LoginResponse>;
    getMe(): Promise<{
        user: User;
    }>;
    logout(): void;
    getUsers(): Promise<{
        users: User[];
    }>;
    createUser(body: {
        email: string;
        password: string;
        role?: string;
    }): Promise<{
        user: User;
    }>;
    updateUser(id: string, body: {
        role?: string;
        newPassword?: string;
    }): Promise<{
        user: User;
    }>;
    deleteUser(id: string): Promise<void>;
    get<T>(endpoint: string): Promise<T>;
    post<T>(endpoint: string, body?: any): Promise<T>;
    put<T>(endpoint: string, body?: any): Promise<T>;
    delete<T>(endpoint: string): Promise<T>;
    getScans(params?: {
        status?: string;
        hostname?: string;
        dateFrom?: string;
        dateTo?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        scans: Array<{
            scanId: string;
            seedUrl: string;
            status: string;
            startedAt: string;
            completedAt?: string;
            hostname: string;
            summary: {
                totalPages: number;
                aFailures: number;
                aaFailures: number;
                needsReview?: number;
            };
        }>;
        total: number;
        limit: number;
        offset: number;
    }>;
    getScanDetail(scanId: string): Promise<any>;
    getScanDebug(scanId: string): Promise<any>;
    cancelScan(scanId: string): Promise<{
        scanId: string;
        status: string;
        message: string;
    }>;
    resumeScan(scanId: string, code: string): Promise<{
        scanId: string;
        status: string;
        message: string;
    }>;
    getScannerConfig(): Promise<{
        allowedPorts: number[];
        allowAllPorts: boolean;
        allowLocalhost: boolean;
        maxPagesHardLimit: number;
        maxDepthHardLimit: number;
        raawiAgentEnabled: boolean;
    }>;
    deleteScan(scanId: string): Promise<{
        message: string;
        deleted: any;
    }>;
    exportPDF(scanId: string, locale?: 'en' | 'ar'): Promise<Blob>;
    exportExcel(scanId: string, locale?: 'en' | 'ar'): Promise<Blob>;
    getComplianceScores(level: 'scan' | 'property' | 'entity', id: string): Promise<any>;
    getSites(): Promise<{
        sites: Array<{
            id: string;
            domain: string;
            createdAt: string;
            lastScan?: {
                scanId: string;
                completedAt: string;
                totalPages: number;
                aFailures: number;
                aaFailures: number;
            };
            totalScans: number;
            issueSummary: {
                total: number;
                critical: number;
                important: number;
            };
        }>;
    }>;
    getFindings(params?: {
        site?: string;
        scanId?: string;
        wcagId?: string;
        status?: string;
        confidence?: string;
        limit?: number;
        offset?: number;
        entityId?: string;
    }): Promise<{
        findings: Array<{
            id: string;
            ruleId: string;
            wcagId?: string;
            level?: string;
            status: string;
            confidence: string;
            message?: string;
            howToVerify?: string;
            evidence?: Array<{
                type: string;
                value: string;
                selector?: string;
                description?: string;
            }>;
            site?: string;
            scanId?: string;
            pageUrl?: string;
            pageNumber?: number;
        }>;
        total: number;
        limit: number;
        offset: number;
    }>;
    getOverview(): Promise<{
        kpis: {
            totalSites: number;
            totalScans: number;
            pagesScanned: number;
            wcagAFailures: number;
            wcagAAFailures: number;
            needsReview: number;
            visionFindings: number;
        };
        charts: {
            scansOverTime: Array<{
                date: string;
                count: number;
            }>;
            failuresByLevel: Array<{
                level: string;
                failures: number;
            }>;
            topFailingRules: Array<{
                rule: string;
                failures: number;
            }>;
            topAffectedSites: Array<{
                domain: string;
                issues: number;
            }>;
        };
    }>;
    getWidgetAnalytics(): Promise<{
        uniqueSessions: number;
        widgetOpens: number;
        voiceUsage: number;
        topPages: Array<{
            url: string;
            count: number;
        }>;
        dailyUsage: Array<{
            date: string;
            sessions: number;
            opens: number;
        }>;
        commandUsage: Array<{
            command: string;
            count: number;
        }>;
    }>;
    getAssistiveMaps(): Promise<{
        maps: Array<{
            id: string;
            siteId: string;
            domain: string;
            canonicalUrl: string;
            generatedAt: string;
            confidenceSummary: {
                high: number;
                medium: number;
                low: number;
            };
            pageVersionId: string;
        }>;
    }>;
    getEntities(params?: {
        status?: string;
        type?: string;
        search?: string;
    }): Promise<{
        entities: Array<{
            id: string;
            nameEn: string;
            nameAr?: string;
            type: string;
            sector?: string;
            status: string;
            notes?: string;
            createdAt: string;
            updatedAt: string;
            _count: {
                properties: number;
                scans: number;
                contacts: number;
            };
            properties?: Array<{
                id: string;
                domain: string;
                displayNameEn?: string;
                displayNameAr?: string;
                isPrimary: boolean;
            }>;
        }>;
    }>;
    getEntity(id: string): Promise<{
        entity: {
            id: string;
            nameEn: string;
            nameAr?: string;
            type: string;
            sector?: string;
            status: string;
            notes?: string;
            createdAt: string;
            updatedAt: string;
            contacts: Array<{
                id: string;
                name: string;
                email: string;
                phone?: string;
                role?: string;
                isPrimary: boolean;
            }>;
            properties: Array<{
                id: string;
                domain: string;
                displayNameEn?: string;
                displayNameAr?: string;
                isPrimary: boolean;
                _count: {
                    sites: number;
                    scans: number;
                };
                sites?: Array<{
                    id: string;
                    domain: string;
                }>;
            }>;
            _count: {
                scans: number;
                properties: number;
                contacts: number;
            };
        };
    }>;
    createEntity(data: {
        nameEn: string;
        nameAr?: string;
        type: 'government' | 'private';
        sector?: string;
        status?: 'active' | 'onboarding' | 'paused';
        notes?: string;
    }): Promise<{
        entity: any;
    }>;
    updateEntity(id: string, data: Partial<{
        nameEn: string;
        nameAr?: string;
        type: 'government' | 'private';
        sector?: string;
        status?: 'active' | 'onboarding' | 'paused';
        notes?: string;
    }>): Promise<{
        entity: any;
    }>;
    deleteEntity(id: string): Promise<{
        message: string;
    }>;
    addEntityContact(entityId: string, data: {
        name: string;
        email: string;
        phone?: string;
        role?: string;
        isPrimary?: boolean;
    }): Promise<{
        contact: any;
    }>;
    addEntityProperty(entityId: string, data: {
        domain: string;
        displayNameEn?: string;
        displayNameAr?: string;
        isPrimary?: boolean;
    }): Promise<{
        property: any;
    }>;
    updateEntityProperty(entityId: string, propertyId: string, data: {
        domain?: string;
        displayNameEn?: string;
        displayNameAr?: string;
        isPrimary?: boolean;
        defaultScanPipeline?: Record<string, unknown> | null;
    }): Promise<{
        property: any;
    }>;
    getProperties(params?: {
        entityId?: string;
        domain?: string;
    }): Promise<{
        properties: Array<{
            id: string;
            entityId: string;
            domain: string;
            displayNameEn?: string;
            displayNameAr?: string;
            isPrimary: boolean;
            defaultScanPipeline?: unknown;
            entity: {
                id: string;
                nameEn: string;
                nameAr?: string;
            };
            _count: {
                sites: number;
                scans: number;
            };
            scans?: Array<{
                scanId: string;
                completedAt?: string;
                status: string;
            }>;
        }>;
    }>;
    getPropertyAuthProfile(propertyId: string): Promise<{
        id: string;
        propertyId: string;
        authType: 'none' | 'cookie' | 'scripted_login';
        loginUrl?: string | null;
        successUrlPrefix?: string | null;
        successSelector?: string | null;
        usernameSelector?: string | null;
        passwordSelector?: string | null;
        submitSelector?: string | null;
        usernameSecretSource?: 'missing' | 'stored' | 'env';
        passwordSecretSource?: 'missing' | 'stored' | 'env';
        usernameEnvVarName?: string | null;
        passwordEnvVarName?: string | null;
        usernameEnvVarPresent?: boolean | null;
        passwordEnvVarPresent?: boolean | null;
        hasUsernameValue?: boolean;
        hasPasswordValue?: boolean;
        secretHealth?: 'ready' | 'missing_env';
        postLoginSeedPaths?: string[] | null;
        extraHeaders?: Record<string, string> | null;
        isActive: boolean;
        lastTestedAt?: string | null;
        lastTestResult?: string | null;
        lastTestError?: string | null;
    }>;
    savePropertyAuthProfile(propertyId: string, data: {
        authType: 'none' | 'cookie' | 'scripted_login';
        loginUrl?: string;
        successUrlPrefix?: string;
        successSelector?: string;
        usernameSelector?: string;
        passwordSelector?: string;
        submitSelector?: string;
        usernameValue?: string;
        passwordValue?: string;
        postLoginSeedPaths?: string[];
        extraHeaders?: Record<string, string>;
        isActive?: boolean;
    }): Promise<{
        id: string;
        propertyId: string;
        authType: 'none' | 'cookie' | 'scripted_login';
        loginUrl?: string | null;
        successUrlPrefix?: string | null;
        successSelector?: string | null;
        usernameSelector?: string | null;
        passwordSelector?: string | null;
        submitSelector?: string | null;
        usernameSecretSource?: 'missing' | 'stored' | 'env';
        passwordSecretSource?: 'missing' | 'stored' | 'env';
        usernameEnvVarName?: string | null;
        passwordEnvVarName?: string | null;
        usernameEnvVarPresent?: boolean | null;
        passwordEnvVarPresent?: boolean | null;
        hasUsernameValue?: boolean;
        hasPasswordValue?: boolean;
        secretHealth?: 'ready' | 'missing_env';
        postLoginSeedPaths?: string[] | null;
        extraHeaders?: Record<string, string> | null;
        isActive: boolean;
        lastTestedAt?: string | null;
        lastTestResult?: string | null;
        lastTestError?: string | null;
    }>;
    testPropertyAuthProfile(propertyId: string): Promise<{
        success: boolean;
        message: string;
        error?: string;
    }>;
    detectPropertyAuthProfile(propertyId: string, data: {
        loginUrl: string;
        usernameValue: string;
        passwordValue?: string;
    }): Promise<{
        success: boolean;
        message: string;
        error?: string;
        loginSucceeded: boolean;
        verificationCheckpointDetected: boolean;
        detected: {
            loginUrl: string;
            usernameSelector?: string;
            passwordSelector?: string;
            submitSelector?: string;
            successUrlPrefix?: string | null;
            successSelector?: string | null;
            postLoginSeedPaths: string[];
            confidence: 'high' | 'medium' | 'low';
            notes: string[];
        };
    }>;
    deletePropertyAuthProfile(propertyId: string): Promise<{
        success: boolean;
    }>;
    startScan(data: {
        entityId?: string;
        propertyId?: string;
        authProfileId?: string;
        seedUrl: string;
        maxPages: number;
        maxDepth: number;
        scanPipeline?: {
            layer1?: boolean;
            layer2?: boolean;
            layer3?: boolean;
            analysisAgent?: boolean;
            screenshotMode?: 'none' | 'viewport' | 'full';
            scanPreset?: 'full' | 'fast';
        };
    }): Promise<{
        scanId: string;
        status: string;
        message: string;
    }>;
}
export declare const apiClient: ApiClient;
export {};
//# sourceMappingURL=api.d.ts.map