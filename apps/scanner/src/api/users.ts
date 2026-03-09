import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getPrismaClient } from '../db/client.js';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { sendWelcomeEmail } from '../services/email.js';
import { config } from '../config.js';

const router: Router = Router();

const emailSchema = z.string().refine(
  (val) => z.string().email().safeParse(val).success || /^[^\s@]+@[^\s@]+$/.test(val),
  { message: 'Invalid email format' }
);

const createUserSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'viewer']).optional().default('viewer'),
});

const updateUserSchema = z.object({
  role: z.enum(['admin', 'viewer']).optional(),
  newPassword: z.string().min(8).optional(),
});

/**
 * GET /api/users
 * List all admin users (admin only). Does not expose passwordHash or reset tokens.
 */
router.get('/users', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }
    const users = await prisma.adminUser.findMany({
      select: { id: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
  } catch (error) {
    console.error('[USERS] List error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/users
 * Create a new admin user (admin only). Optionally send welcome email.
 */
router.post('/users', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const body = createUserSchema.parse(req.body);
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const existing = await prisma.adminUser.findUnique({ where: { email: body.email } });
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.adminUser.create({
      data: { email: body.email, passwordHash, role: body.role },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    const loginUrl = config.reportUiOrigin.replace(/\/$/, '') + '/login';
    await sendWelcomeEmail(user.email, loginUrl);

    res.status(201).json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    console.error('[USERS] Create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/users/:id
 * Update user role and/or password (admin only). Prevent self-demotion of last admin.
 */
router.patch('/users/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const body = updateUserSchema.parse(req.body);
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const target = await prisma.adminUser.findUnique({ where: { id } });
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (body.role !== undefined && req.user?.userId === id && body.role !== 'admin') {
      const adminCount = await prisma.adminUser.count({ where: { role: 'admin' } });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot demote the last admin' });
      }
    }

    const data: { role?: string; passwordHash?: string } = {};
    if (body.role !== undefined) data.role = body.role;
    if (body.newPassword) data.passwordHash = await bcrypt.hash(body.newPassword, 10);

    const user = await prisma.adminUser.update({
      where: { id },
      data,
      select: { id: true, email: true, role: true, createdAt: true },
    });

    res.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    console.error('[USERS] Update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user (admin only). Cannot delete self.
 */
router.delete('/users/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (req.user?.userId === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    await prisma.adminUser.delete({ where: { id } });
    res.status(204).send();
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('[USERS] Delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
