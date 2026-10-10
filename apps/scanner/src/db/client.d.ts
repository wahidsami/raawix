/**
 * Get Prisma client instance (singleton)
 * Note: Prisma client must be generated first with: pnpm --filter scanner db:generate
 */
export declare function getPrismaClient(): Promise<any | null>;
/**
 * Disconnect Prisma client (for cleanup)
 */
export declare function disconnectPrisma(): Promise<void>;
//# sourceMappingURL=client.d.ts.map