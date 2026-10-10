export interface SitemapUrl {
    loc: string;
    lastmod?: string;
    changefreq?: string;
    priority?: string;
}
/**
 * Parse sitemap.xml and extract URLs
 * Supports both regular sitemaps and sitemap index files
 */
export declare function parseSitemap(sitemapUrl: string, hostname: string, maxUrls?: number): Promise<string[]>;
//# sourceMappingURL=sitemap-parser.d.ts.map