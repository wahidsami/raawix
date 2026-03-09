import { config } from '../config.js';

// PrismaClient will be available after running: pnpm --filter scanner db:generate
let prisma: any = null;
let prismaInitialized = false;

/**
 * Get Prisma client instance (singleton)
 * Note: Prisma client must be generated first with: pnpm --filter scanner db:generate
 */
export async function getPrismaClient(): Promise<any | null> {
  if (!config.database.enabled || !config.database.url) {
    console.error('[DB] Database not enabled or DATABASE_URL not set');
    console.error('[DB] enabled:', config.database.enabled, 'url:', config.database.url ? 'set' : 'not set');
    return null;
  }

  if (!prismaInitialized) {
    try {
      // Dynamic import for PrismaClient (ES modules compatible)
      console.log('[DB] Initializing Prisma client...');
      const prismaModule = await import('@prisma/client');
      const { PrismaClient } = prismaModule;
      console.log('[DB] PrismaClient imported, creating instance...');
      prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      });
      console.log('[DB] PrismaClient instance created, testing connection...');
      // Test connection
      await prisma.$connect();
      prismaInitialized = true;
      console.log('[DB] Prisma client initialized successfully');
    } catch (error) {
      // Prisma client not generated yet or not available - return null
      console.error('[DB] Failed to initialize Prisma client');
      console.error('[DB] Error:', error instanceof Error ? error.message : error);
      console.error('[DB] Stack:', error instanceof Error ? error.stack : 'No stack trace');
      // This allows the system to work without database
      return null;
    }
  }

  return prisma;
}

/**
 * Disconnect Prisma client (for cleanup)
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    prismaInitialized = false;
  }
}
