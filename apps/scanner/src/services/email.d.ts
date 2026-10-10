/**
 * Send welcome email when a new user account is created.
 * No-op if RESEND_API_KEY is not set.
 */
export declare function sendWelcomeEmail(to: string, loginUrl: string): Promise<void>;
/**
 * Send password reset email with link.
 * No-op if RESEND_API_KEY is not set.
 */
export declare function sendPasswordResetEmail(to: string, resetLink: string, expiresInMinutes: number): Promise<void>;
//# sourceMappingURL=email.d.ts.map