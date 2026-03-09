import { parseStringPromise } from 'xml2js';
import { isSameHostname, normalizeUrl } from './url-utils.js';

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
export async function parseSitemap(
  sitemapUrl: string,
  hostname: string,
  maxUrls: number = 100
): Promise<string[]> {
  try {
    const response = await fetch(sitemapUrl, {
      headers: {
        'User-Agent': 'Raawi-X-Scanner/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sitemap: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();
    const parsed = await parseStringPromise(xml);

    const urls: string[] = [];

    // Check if this is a sitemap index (contains <sitemap> elements)
    if (parsed.sitemapindex && parsed.sitemapindex.sitemap) {
      console.log(`[SITEMAP] Found sitemap index with ${parsed.sitemapindex.sitemap.length} sitemaps`);
      
      // For sitemap index, we'll just extract the first level URLs
      // In production, you might want to recursively fetch nested sitemaps
      // For now, we'll limit to avoid too many requests
      const sitemapEntries = parsed.sitemapindex.sitemap.slice(0, 10); // Limit to 10 nested sitemaps
      
      for (const entry of sitemapEntries) {
        if (entry.loc && entry.loc[0]) {
          try {
            const nestedSitemapUrl = entry.loc[0];
            const nestedUrls = await parseSitemap(nestedSitemapUrl, hostname, maxUrls);
            urls.push(...nestedUrls);
            
            if (urls.length >= maxUrls) {
              break;
            }
          } catch (error) {
            console.warn(`[SITEMAP] Failed to parse nested sitemap: ${entry.loc[0]}`, error);
          }
        }
      }
    } else if (parsed.urlset && parsed.urlset.url) {
      // Regular sitemap with <url> elements
      console.log(`[SITEMAP] Found sitemap with ${parsed.urlset.url.length} URLs`);
      
      for (const urlEntry of parsed.urlset.url) {
        if (urlEntry.loc && urlEntry.loc[0]) {
          const url = urlEntry.loc[0];
          
          // Normalize and validate URL
          try {
            const normalized = normalizeUrl(url);
            
            // Only include URLs from the same hostname
            if (isSameHostname(normalized, hostname)) {
              urls.push(normalized);
              
              if (urls.length >= maxUrls) {
                break;
              }
            }
          } catch (error) {
            console.warn(`[SITEMAP] Failed to normalize URL: ${url}`, error);
          }
        }
      }
    } else {
      console.warn(`[SITEMAP] Unknown sitemap format: ${sitemapUrl}`);
    }

    console.log(`[SITEMAP] Extracted ${urls.length} URLs from sitemap`);
    return urls.slice(0, maxUrls); // Ensure we don't exceed maxUrls
  } catch (error) {
    console.error(`[SITEMAP] Failed to parse sitemap: ${sitemapUrl}`, error);
    throw error;
  }
}

