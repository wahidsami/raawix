export interface UrlPolicyResult {
    allowed: boolean;
    reason?: string;
}
/**
 * Check if URL is allowed based on policy
 */
export declare function checkUrlPolicy(url: string, seedUrl?: string): Promise<UrlPolicyResult>;
/**
 * Check if redirect URL is safe (not to private network)
 */
export declare function checkRedirectSafety(url: string): Promise<UrlPolicyResult>;
//# sourceMappingURL=url-policy.d.ts.map