export interface AuthProfileData {
    id: string;
    propertyId: string;
    authType: 'none' | 'cookie' | 'scripted_login';
    loginUrl?: string | null;
    successUrlPrefix?: string | null;
    successSelector?: string | null;
    usernameSelector?: string | null;
    passwordSelector?: string | null;
    submitSelector?: string | null;
    usernameValue?: string | null;
    passwordValue?: string | null;
    usernameSecretSource?: 'missing' | 'stored' | 'env';
    passwordSecretSource?: 'missing' | 'stored' | 'env';
    usernameEnvVarName?: string | null;
    passwordEnvVarName?: string | null;
    postLoginSeedPaths?: string[] | null;
    extraHeaders?: Record<string, string> | null;
    isActive: boolean;
    lastTestedAt?: Date | null;
    lastTestResult?: string | null;
    lastTestError?: string | null;
}
/**
 * Repository for managing scan authentication profiles
 * Handles secure storage of credentials (encrypted or env-based)
 */
export declare class AuthProfileRepository {
    private secureStorage;
    private buildProfileData;
    constructor();
    private parseSecretReference;
    private describeSecret;
    private prepareSecretForPersistence;
    private resolveSecretValue;
    /**
     * Get auth profile for a property
     */
    getByPropertyId(propertyId: string, options?: {
        resolveSecrets?: boolean;
    }): Promise<AuthProfileData | null>;
    /**
     * Create or update auth profile
     */
    upsert(propertyId: string, data: {
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
    }): Promise<AuthProfileData>;
    /**
     * Update test result
     */
    updateTestResult(propertyId: string, result: 'success' | 'failed', error?: string): Promise<void>;
    /**
     * Delete auth profile
     */
    delete(propertyId: string): Promise<void>;
}
export declare const authProfileRepository: AuthProfileRepository;
//# sourceMappingURL=auth-profile-repository.d.ts.map