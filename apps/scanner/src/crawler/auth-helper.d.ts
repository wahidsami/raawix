import type { Browser, BrowserContext } from 'playwright';
import type { AuthProfileData } from '../db/auth-profile-repository.js';
export interface LoginResult {
    success: boolean;
    message: string;
    error?: string;
    storageStatePath?: string;
}
export interface AuthProfileDetectionResult {
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
}
export declare function detectScriptedLoginProfile(input: {
    loginUrl: string;
    usernameValue: string;
    passwordValue?: string;
}): Promise<AuthProfileDetectionResult>;
/**
 * Test login flow for an auth profile
 * Used by the "Test Login" button in dashboard
 */
export declare function testLoginFlow(profile: AuthProfileData): Promise<LoginResult>;
/**
 * Perform login and save storage state
 * Returns path to storage state file
 */
export declare function performLoginAndSaveState(profile: AuthProfileData, outputDir: string, scanId: string): Promise<{
    storageStatePath: string;
    success: boolean;
    error?: string;
}>;
/**
 * Load storage state and create context with it
 */
export declare function loadStorageState(storageStatePath: string, browser: Browser): Promise<BrowserContext | null>;
//# sourceMappingURL=auth-helper.d.ts.map