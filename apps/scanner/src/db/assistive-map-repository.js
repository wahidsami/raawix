import { getPrismaClient } from './client.js';
import { StructuredLogger } from '../utils/logger.js';
/**
 * Repository for assistive map persistence
 */
export class AssistiveMapRepository {
    logger;
    constructor() {
        this.logger = new StructuredLogger();
    }
    /**
     * Get or create site by domain
     */
    async getOrCreateSite(domain) {
        const prisma = await getPrismaClient();
        if (!prisma) {
            return null;
        }
        try {
            const site = await prisma.site.upsert({
                where: { domain },
                create: {
                    domain,
                },
                update: {
                    updatedAt: new Date(),
                },
            });
            return site.id;
        }
        catch (error) {
            this.logger.error('Failed to get or create site', {
                domain,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
        }
    }
    /**
     * Get or create page version
     */
    async getOrCreatePageVersion(siteId, canonicalUrl, finalUrl, fingerprintHash, scanId) {
        const prisma = await getPrismaClient();
        if (!prisma) {
            return null;
        }
        try {
            const pageVersion = await prisma.pageVersion.upsert({
                where: {
                    siteId_canonicalUrl_fingerprintHash: {
                        siteId,
                        canonicalUrl,
                        fingerprintHash,
                    },
                },
                create: {
                    siteId,
                    canonicalUrl,
                    finalUrl: finalUrl || null,
                    fingerprintHash,
                    scanId: scanId || null,
                },
                update: {
                    finalUrl: finalUrl || null,
                    scanId: scanId || null,
                    updatedAt: new Date(),
                },
            });
            return pageVersion.id;
        }
        catch (error) {
            this.logger.error('Failed to get or create page version', {
                siteId,
                canonicalUrl,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
        }
    }
    /**
     * Upsert assistive map
     */
    async upsertAssistiveMap(pageVersionId, map, confidenceSummary) {
        const prisma = await getPrismaClient();
        if (!prisma) {
            return false;
        }
        try {
            await prisma.assistiveMap.upsert({
                where: { pageVersionId },
                create: {
                    pageVersionId,
                    json: map,
                    confidenceSummary: confidenceSummary,
                },
                update: {
                    json: map,
                    confidenceSummary: confidenceSummary,
                    updatedAt: new Date(),
                },
            });
            return true;
        }
        catch (error) {
            this.logger.error('Failed to upsert assistive map', {
                pageVersionId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return false;
        }
    }
    /**
     * Get assistive map for page version
     */
    async getAssistiveMap(pageVersionId) {
        const prisma = await getPrismaClient();
        if (!prisma) {
            return null;
        }
        try {
            const assistiveMap = await prisma.assistiveMap.findUnique({
                where: { pageVersionId },
            });
            if (!assistiveMap) {
                return null;
            }
            return {
                map: assistiveMap.json,
                confidenceSummary: assistiveMap.confidenceSummary,
            };
        }
        catch (error) {
            this.logger.error('Failed to get assistive map', {
                pageVersionId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
        }
    }
    /**
     * Find page version by URL (with matching strategies)
     */
    async findPageVersionByUrl(domain, requestUrl, canonicalUrl) {
        const prisma = await getPrismaClient();
        if (!prisma) {
            return null;
        }
        try {
            // Get site
            const site = await prisma.site.findUnique({
                where: { domain },
            });
            if (!site) {
                return null;
            }
            // Strategy 1: Exact canonical URL match
            let pageVersion = await prisma.pageVersion.findFirst({
                where: {
                    siteId: site.id,
                    canonicalUrl,
                },
                orderBy: {
                    generatedAt: 'desc',
                },
            });
            if (pageVersion) {
                return {
                    pageVersionId: pageVersion.id,
                    matchedUrl: pageVersion.canonicalUrl,
                    matchConfidence: 'high',
                };
            }
            // Strategy 2: Final URL match
            pageVersion = await prisma.pageVersion.findFirst({
                where: {
                    siteId: site.id,
                    finalUrl: requestUrl,
                },
                orderBy: {
                    generatedAt: 'desc',
                },
            });
            if (pageVersion) {
                return {
                    pageVersionId: pageVersion.id,
                    matchedUrl: pageVersion.finalUrl || pageVersion.canonicalUrl,
                    matchConfidence: 'high',
                };
            }
            // Strategy 3: Queryless match
            const requestUrlObj = new URL(requestUrl);
            requestUrlObj.search = '';
            const querylessUrl = requestUrlObj.toString();
            pageVersion = await prisma.pageVersion.findFirst({
                where: {
                    siteId: site.id,
                    OR: [
                        { canonicalUrl: { startsWith: querylessUrl.split('?')[0] } },
                        { finalUrl: { startsWith: querylessUrl.split('?')[0] } },
                    ],
                },
                orderBy: {
                    generatedAt: 'desc',
                },
            });
            if (pageVersion) {
                return {
                    pageVersionId: pageVersion.id,
                    matchedUrl: pageVersion.canonicalUrl,
                    matchConfidence: 'medium',
                };
            }
            return null;
        }
        catch (error) {
            this.logger.error('Failed to find page version by URL', {
                domain,
                requestUrl,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
        }
    }
}
export const assistiveMapRepository = new AssistiveMapRepository();
//# sourceMappingURL=assistive-map-repository.js.map