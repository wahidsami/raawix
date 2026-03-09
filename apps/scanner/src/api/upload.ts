/**
 * File Upload API
 * Handles entity logo uploads
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import multer from 'multer';
import { existsSync, mkdirSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

const router: Router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = resolve('uploads/entity-logos');

    // Ensure directory exists
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: entity-{random}-{timestamp}.{ext}
    const uniqueId = randomBytes(8).toString('hex');
    const timestamp = Date.now();
    const ext = extname(file.originalname);
    const filename = `entity-${uniqueId}-${timestamp}${ext}`;
    cb(null, filename);
  },
});

// File filter: only images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PNG and JPG are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max
    files: 1,
  },
});

/**
 * POST /api/upload/entity-logo
 * Upload entity logo
 */
router.post('/entity-logo', requireAuth, upload.single('logo'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Return relative path that can be stored in database
    const relativePath = `uploads/entity-logos/${req.file.filename}`;

    res.json({
      success: true,
      filename: req.file.filename,
      path: relativePath,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    console.error('[UPLOAD] Error uploading entity logo:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to upload file'
    });
  }
});

export default router;
