import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { getPrismaClient } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';

const router: Router = Router();

class DomainSiteConflictError extends Error {
  constructor() {
    super('DOMAIN_SITE_CONFLICT');
    this.name = 'DomainSiteConflictError';
  }
}

// Validation schemas
const createEntitySchema = z.object({
  nameEn: z.string().min(1),
  nameAr: z.string().optional(),
  type: z.enum(['government', 'private']),
  sector: z.string().optional(),
  status: z.enum(['active', 'onboarding', 'paused']).optional(),
  notes: z.string().optional(),
  logoPath: z.string().optional(),
});

const updateEntitySchema = createEntitySchema.partial().omit({ type: true }); // type cannot be changed (affects code format)

const createContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

const createPropertySchema = z.object({
  domain: z.string().min(1),
  displayNameEn: z.string().optional(),
  displayNameAr: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

const updatePropertySchema = z
  .object({
    domain: z.string().min(1).optional(),
    displayNameEn: z.string().optional(),
    displayNameAr: z.string().optional(),
    isPrimary: z.boolean().optional(),
    defaultScanPipeline: z.record(z.unknown()).nullable().optional(),
  })
  .refine(
    (d) =>
      d.domain !== undefined ||
      d.displayNameEn !== undefined ||
      d.displayNameAr !== undefined ||
      d.isPrimary !== undefined ||
      d.defaultScanPipeline !== undefined,
    { message: 'At least one field is required' }
  );

/**
 * Generate a unique entity code
 * Format: GOV-000123 for government, RAAWI-XXXXXX for private
 */
function generateEntityCode(type: 'government' | 'private'): string {
  if (type === 'government') {
    // Format: GOV-000123 (6 digits, zero-padded)
    const randomNum = Math.floor(Math.random() * 999999) + 1;
    return `GOV-${String(randomNum).padStart(6, '0')}`;
  } else {
    // Format: RAAWI-XXXXXX (6 random alphanumeric chars)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `RAAWI-${code}`;
  }
}

/**
 * GET /api/entities
 * List all entities with optional filters
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { status, type, search } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { nameEn: { contains: search as string, mode: 'insensitive' } },
        { nameAr: { contains: search as string, mode: 'insensitive' } },
        { code: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const entities = await prisma.entity.findMany({
      where,
      include: {
        _count: {
          select: {
            properties: true,
            scans: true,
            contacts: true,
          },
        },
        properties: {
          take: 1,
          orderBy: { isPrimary: 'desc' },
          include: {
            scans: {
              where: { status: 'completed' },
              orderBy: { completedAt: 'desc' },
              take: 1,
              select: {
                id: true,
                completedAt: true,
                summaryJson: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate compliance scores for each entity
    const entitiesWithScores = await Promise.all(
      entities.map(async (entity: any) => {
        // Get latest scan across all properties
        const latestScans = await prisma.scan.findMany({
          where: {
            entityId: entity.id,
            status: 'completed',
          },
          orderBy: { completedAt: 'desc' },
          take: 1,
          select: {
            summaryJson: true,
            completedAt: true,
          },
        });

        let latestComplianceScore = null;
        if (latestScans.length > 0 && latestScans[0].summaryJson) {
          const summary = latestScans[0].summaryJson as any;
          // Extract compliance info from summary
          const aTotal = (summary.byLevel?.A?.total || 0);
          const aPass = (summary.byLevel?.A?.pass || 0);
          const aaTotal = (summary.byLevel?.AA?.total || 0);
          const aaPass = (summary.byLevel?.AA?.pass || 0);

          latestComplianceScore = {
            scoreA: aTotal > 0 ? Math.round((aPass / aTotal) * 100) : 100,
            scoreAA: aaTotal > 0 ? Math.round((aaPass / aaTotal) * 100) : 100,
            lastScanDate: latestScans[0].completedAt,
          };
        }

        return {
          ...entity,
          latestComplianceScore,
        };
      })
    );

    res.json({ entities: entitiesWithScores });
  } catch (error) {
    console.error('[ENTITIES] Error fetching entities:', error);
    res.status(500).json({ error: 'Failed to fetch entities' });
  }
});

/**
 * GET /api/entities/:id
 * Get entity by ID with full details
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const entity = await prisma.entity.findUnique({
      where: { id: req.params.id },
      include: {
        contacts: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        properties: {
          include: {
            _count: {
              select: {
                sites: true,
                scans: true,
              },
            },
            sites: {
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        _count: {
          select: {
            scans: true,
            properties: true,
            contacts: true,
          },
        },
      },
    });

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    res.json({ entity });
  } catch (error) {
    console.error('[ENTITIES] Error fetching entity:', error);
    res.status(500).json({ error: 'Failed to fetch entity' });
  }
});

/**
 * POST /api/entities
 * Create a new entity
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const data = createEntitySchema.parse(req.body);

    // Generate unique entity code
    let entityCode = generateEntityCode(data.type);
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure code is unique (retry if collision)
    while (attempts < maxAttempts) {
      const existing = await prisma.entity.findUnique({
        where: { code: entityCode },
      });
      if (!existing) {
        break;
      }
      entityCode = generateEntityCode(data.type);
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return res.status(500).json({ error: 'Failed to generate unique entity code' });
    }

    const entity = await prisma.entity.create({
      data: {
        ...data,
        code: entityCode,
        status: data.status || 'active',
      },
      include: {
        _count: {
          select: {
            properties: true,
            scans: true,
            contacts: true,
          },
        },
      },
    });

    res.status(201).json({ entity });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    console.error('[ENTITIES] Error creating entity:', error);
    res.status(500).json({ error: 'Failed to create entity' });
  }
});

/**
 * PUT /api/entities/:id
 * Update an entity
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const data = updateEntitySchema.parse(req.body);
    const entity = await prisma.entity.update({
      where: { id: req.params.id },
      data,
      include: {
        _count: {
          select: {
            properties: true,
            scans: true,
            contacts: true,
          },
        },
      },
    });

    res.json({ entity });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    console.error('[ENTITIES] Error updating entity:', error);
    if ((error as any).code === 'P2025') {
      return res.status(404).json({ error: 'Entity not found' });
    }
    res.status(500).json({ error: 'Failed to update entity' });
  }
});

/**
 * DELETE /api/entities/:id
 * Delete an entity (soft delete by setting status to paused, or hard delete)
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    // Check if entity has scans - if yes, soft delete (set status to paused)
    const entity = await prisma.entity.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { scans: true },
        },
      },
    });

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    if (entity._count.scans > 0) {
      // Soft delete
      await prisma.entity.update({
        where: { id: req.params.id },
        data: { status: 'paused' },
      });
      res.json({ message: 'Entity paused (has existing scans)' });
    } else {
      // Hard delete
      await prisma.entity.delete({
        where: { id: req.params.id },
      });
      res.json({ message: 'Entity deleted' });
    }
  } catch (error) {
    console.error('[ENTITIES] Error deleting entity:', error);
    res.status(500).json({ error: 'Failed to delete entity' });
  }
});

/**
 * POST /api/entities/:id/contacts
 * Add a contact to an entity
 */
router.post('/:id/contacts', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const data = createContactSchema.parse(req.body);

    // If setting as primary, unset other primary contacts
    if (data.isPrimary) {
      await prisma.entityContact.updateMany({
        where: {
          entityId: req.params.id,
          isPrimary: true,
        },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.entityContact.create({
      data: {
        ...data,
        entityId: req.params.id,
        isPrimary: data.isPrimary || false,
      },
    });

    res.status(201).json({ contact });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    console.error('[ENTITIES] Error creating contact:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

/**
 * POST /api/entities/:id/properties
 * Add a property to an entity
 */
router.post('/:id/properties', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const data = createPropertySchema.parse(req.body);

    // If setting as primary, unset other primary properties
    if (data.isPrimary) {
      await prisma.property.updateMany({
        where: {
          entityId: req.params.id,
          isPrimary: true,
        },
        data: { isPrimary: false },
      });
    }

    // Get or create Site for this domain
    let site = await prisma.site.findUnique({
      where: { domain: data.domain },
    });

    if (!site) {
      site = await prisma.site.create({
        data: { domain: data.domain },
      });
    }

    const property = await prisma.property.create({
      data: {
        ...data,
        entityId: req.params.id,
        isPrimary: data.isPrimary || false,
      },
    });

    // Link site to property
    await prisma.site.update({
      where: { id: site.id },
      data: {
        propertyId: property.id,
        entityId: req.params.id,
      },
    });

    res.status(201).json({ property });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    console.error('[ENTITIES] Error creating property:', error);
    if ((error as any).code === 'P2002') {
      return res.status(409).json({ error: 'Property with this domain already exists for this entity' });
    }
    res.status(500).json({ error: 'Failed to create property' });
  }
});

/**
 * PUT /api/entities/:id/properties/:propertyId
 * Update a property (domain, display names, primary). Verifies property belongs to entity.
 */
router.put('/:id/properties/:propertyId', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { id: entityId, propertyId } = req.params;

    const existing = await prisma.property.findFirst({
      where: { id: propertyId, entityId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const data = updatePropertySchema.parse(req.body);

    const domainChanging =
      data.domain !== undefined && data.domain !== existing.domain;

    if (domainChanging) {
      const conflict = await prisma.property.findFirst({
        where: {
          entityId,
          domain: data.domain!,
          NOT: { id: propertyId },
        },
      });
      if (conflict) {
        return res.status(409).json({
          error: 'Another property on this entity already uses that domain',
        });
      }
    }

    if (data.isPrimary === true) {
      await prisma.property.updateMany({
        where: { entityId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    try {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        if (domainChanging) {
          await tx.site.updateMany({
            where: { propertyId },
            data: { propertyId: null, entityId: null },
          });
        }

        await tx.property.update({
          where: { id: propertyId },
          data: {
            ...(data.domain !== undefined && { domain: data.domain }),
            ...(data.displayNameEn !== undefined && {
              displayNameEn: data.displayNameEn || null,
            }),
            ...(data.displayNameAr !== undefined && {
              displayNameAr: data.displayNameAr || null,
            }),
            ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
            ...(data.defaultScanPipeline !== undefined && {
              defaultScanPipeline:
                data.defaultScanPipeline === null
                  ? Prisma.DbNull
                  : (data.defaultScanPipeline as Prisma.InputJsonValue),
            }),
          },
        });

        if (domainChanging) {
          const newDomain = data.domain!;
          const site = await tx.site.findUnique({
            where: { domain: newDomain },
          });
          if (site?.propertyId && site.propertyId !== propertyId) {
            throw new DomainSiteConflictError();
          }
          let target = site;
          if (!target) {
            target = await tx.site.create({
              data: { domain: newDomain },
            });
          }
          await tx.site.update({
            where: { id: target.id },
            data: { propertyId, entityId },
          });
        }
      });
    } catch (e) {
      if (e instanceof DomainSiteConflictError) {
        return res.status(409).json({
          error: 'That domain is already linked to another property',
        });
      }
      throw e;
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        _count: {
          select: { sites: true, scans: true },
        },
      },
    });

    res.json({ property });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    console.error('[ENTITIES] Error updating property:', error);
    if ((error as any).code === 'P2002') {
      return res.status(409).json({ error: 'Property with this domain already exists for this entity' });
    }
    res.status(500).json({ error: 'Failed to update property' });
  }
});

/**
 * GET /api/properties
 * List properties with optional filters
 */
router.get('/properties/list', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { entityId, domain } = req.query;

    const where: any = {};
    if (entityId) where.entityId = entityId;
    if (domain) where.domain = { contains: domain as string, mode: 'insensitive' };

    const properties = await prisma.property.findMany({
      where,
      include: {
        entity: {
          select: {
            id: true,
            nameEn: true,
            nameAr: true,
          },
        },
        _count: {
          select: {
            sites: true,
            scans: true,
          },
        },
        scans: {
          take: 1,
          orderBy: { completedAt: 'desc' },
          select: {
            scanId: true,
            completedAt: true,
            status: true,
          },
        },
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({ properties });
  } catch (error) {
    console.error('[ENTITIES] Error fetching properties:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

export default router;

