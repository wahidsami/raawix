import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { getPrismaClient } from '../db/client.js';
import { config } from '../config.js';
import { sendPasswordResetEmail } from '../services/email.js';

const router: Router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || '10', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_FORGOT_PASSWORD_MAX || '5', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_FORGOT_PASSWORD_MAX || '5', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// Allow local emails (e.g., admin@local) for development
const emailSchema = z.string().refine(
  (val) => {
    // Standard email format or local format (admin@local)
    return z.string().email().safeParse(val).success || /^[^\s@]+@[^\s@]+$/.test(val);
  },
  { message: 'Invalid email format' }
);

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

/**
 * POST /api/auth/login
 * Login with email and password, returns JWT token
 */
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'Request body is required', details: 'Body is empty or not parsed' });
    }

    const { email, password } = loginSchema.parse(req.body);

    const prisma = await getPrismaClient();
    if (!prisma) {
      console.error('[AUTH] Database client not available');
      return res.status(503).json({ error: 'Database not available' });
    }

    const user = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );


    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[AUTH] Validation error:', error.errors);
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    console.error('[AUTH] Login error:', error);
    console.error('[AUTH] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user from JWT token
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string; email: string; role: string };

    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const user = await prisma.adminUser.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Auth me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const forgotPasswordSchema = z.object({ email: emailSchema });

/**
 * POST /api/auth/forgot-password
 * Request a password reset email. Always returns same message to avoid email enumeration.
 */
router.post('/forgot-password', forgotPasswordLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const user = await prisma.adminUser.findUnique({ where: { email } });
    if (user) {
      const plainToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = await bcrypt.hash(plainToken, 10);
      const expiresAt = new Date(Date.now() + config.passwordResetExpiryMs);

      await prisma.adminUser.update({
        where: { id: user.id },
        data: { passwordResetToken: tokenHash, passwordResetExpiresAt: expiresAt },
      });

      const baseUrl = config.reportUiOrigin.replace(/\/$/, '');
      const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(plainToken)}&userId=${encodeURIComponent(user.id)}`;
      const expiresInMinutes = Math.round(config.passwordResetExpiryMs / 60000);
      await sendPasswordResetEmail(user.email, resetLink, expiresInMinutes);
    }

    res.json({ message: 'If an account exists, you will receive an email with a reset link.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    console.error('[AUTH] Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  userId: z.string().uuid(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * POST /api/auth/reset-password
 * Reset password using token from email link.
 */
router.post('/reset-password', resetPasswordLimiter, async (req: Request, res: Response) => {
  try {
    const { token, userId, newPassword } = resetPasswordSchema.parse(req.body);
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const user = await prisma.adminUser.findUnique({
      where: { id: userId },
      select: { id: true, passwordResetToken: true, passwordResetExpiresAt: true },
    });

    if (
      !user ||
      !user.passwordResetToken ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt < new Date()
    ) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const valid = await bcrypt.compare(token, user.passwordResetToken);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.adminUser.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    console.error('[AUTH] Reset password error:', error);
    return res.status(400).json({ error: 'Invalid or expired token' });
  }
});

export default router;

