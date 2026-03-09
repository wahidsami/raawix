import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getPrismaClient } from '../db/client.js';
import { z } from 'zod';
import { DEFAULT_SCANNER_SETTINGS } from '../config/scanner-settings.js';

const router: express.Router = express.Router();

// Scanner settings schema (for PUT request)
const updateSettingsSchema = z.object({
  maxPages: z.number().int().min(1).max(500).optional(),
  maxDepth: z.number().int().min(1).max(20).optional(),
  maxRuntimeMs: z.number().int().min(60000).max(7200000).optional(), // 1 min to 2 hours in ms
});

// GET /api/settings - Get current scanner settings
router.get('/settings', requireAuth, async (_req, res) => {
  try {
    const prisma = await getPrismaClient();

    if (!prisma) {
      console.warn('[SETTINGS] Database not available, returning config defaults');
      return res.json({
        id: 'config-default',
        maxPages: DEFAULT_SCANNER_SETTINGS.maxPages,
        maxDepth: DEFAULT_SCANNER_SETTINGS.maxDepth,
        maxRuntimeMs: DEFAULT_SCANNER_SETTINGS.maxRuntimeMs,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Try to get scanner settings from database
    let settings;
    try {
      settings = await prisma.scannerSettings?.findFirst();
    } catch (dbError) {
      console.warn('[SETTINGS] scannerSettings model not available, returning config defaults:', dbError);
      return res.json({
        id: 'config-default',
        maxPages: DEFAULT_SCANNER_SETTINGS.maxPages,
        maxDepth: DEFAULT_SCANNER_SETTINGS.maxDepth,
        maxRuntimeMs: DEFAULT_SCANNER_SETTINGS.maxRuntimeMs,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    if (!settings) {
      // Try to create default settings
      try {
        settings = await prisma.scannerSettings.create({
          data: {
            maxPages: DEFAULT_SCANNER_SETTINGS.maxPages,
            maxDepth: DEFAULT_SCANNER_SETTINGS.maxDepth,
            maxRuntimeMs: DEFAULT_SCANNER_SETTINGS.maxRuntimeMs,
          },
        });
      } catch (createError) {
        console.warn('[SETTINGS] Failed to create settings in DB, returning config defaults:', createError);
        return res.json({
          id: 'config-default',
          maxPages: DEFAULT_SCANNER_SETTINGS.maxPages,
          maxDepth: DEFAULT_SCANNER_SETTINGS.maxDepth,
          maxRuntimeMs: DEFAULT_SCANNER_SETTINGS.maxRuntimeMs,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    res.json(settings);
  } catch (error) {
    console.error('[SETTINGS] Failed to fetch settings:', error);
    // Return config defaults as last resort
    res.json({
      id: 'config-default',
      maxPages: DEFAULT_SCANNER_SETTINGS.maxPages,
      maxDepth: DEFAULT_SCANNER_SETTINGS.maxDepth,
      maxRuntimeMs: DEFAULT_SCANNER_SETTINGS.maxRuntimeMs,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
});

// PUT /api/settings - Update scanner settings
router.put('/settings', requireAuth, async (req, res) => {
  try {
    // Validate request body
    const validated = updateSettingsSchema.parse(req.body);

    const prisma = await getPrismaClient();

    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    // Get existing settings or create if doesn't exist
    let settings = await prisma.scannerSettings.findFirst();

    if (settings) {
      // Update existing settings
      settings = await prisma.scannerSettings.update({
        where: { id: settings.id },
        data: validated,
      });
    } else {
      // Create new settings
      settings = await prisma.scannerSettings.create({
        data: {
          maxPages: validated.maxPages ?? 500,
          maxDepth: validated.maxDepth ?? 10,
          maxRuntimeMs: validated.maxRuntimeMs ?? 10800000, // 3 hours
        },
      });
    }

    console.log('[SETTINGS] Scanner settings updated:', settings);

    res.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    console.error('[SETTINGS] Failed to update settings:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update settings',
    });
  }
});

export default router;
