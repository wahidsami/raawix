import { Resend } from 'resend';
import { config } from '../config.js';

/**
 * Send welcome email when a new user account is created.
 * No-op if RESEND_API_KEY is not set.
 */
export async function sendWelcomeEmail(to: string, loginUrl: string): Promise<void> {
  if (!config.resendApiKey) {
    console.log('[EMAIL] Resend not configured, skipping welcome email');
    return;
  }
  try {
    const resend = new Resend(config.resendApiKey);
    await resend.emails.send({
      from: config.resendFromEmail,
      to,
      subject: 'Your Raawi X account has been created',
      text: `Your account has been created. You can log in at: ${loginUrl}`,
      html: `<p>Your account has been created. You can <a href="${loginUrl}">log in here</a>.</p>`,
    });
  } catch (error) {
    console.error('[EMAIL] Failed to send welcome email:', error);
    // Do not throw; user is already created
  }
}

/**
 * Send password reset email with link.
 * No-op if RESEND_API_KEY is not set.
 */
export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
  expiresInMinutes: number
): Promise<void> {
  if (!config.resendApiKey) {
    console.log('[EMAIL] Resend not configured, skipping password reset email');
    return;
  }
  try {
    const resend = new Resend(config.resendApiKey);
    await resend.emails.send({
      from: config.resendFromEmail,
      to,
      subject: 'Reset your Raawi X password',
      text: `Use this link to reset your password (valid for ${expiresInMinutes} minutes): ${resetLink}`,
      html: `<p>Use this link to <a href="${resetLink}">reset your password</a> (valid for ${expiresInMinutes} minutes).</p>`,
    });
  } catch (error) {
    console.error('[EMAIL] Failed to send password reset email:', error);
    // Do not throw; caller will still return generic success to avoid enumeration
  }
}
