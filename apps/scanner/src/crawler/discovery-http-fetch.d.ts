/**
 * Fetch HTML for discovery when Playwright cannot load the page (VPS/Docker DNS, IPv6, etc.).
 * Uses IPv4-first DNS and Node's http/https with correct Host + SNI.
 */
/**
 * GET url following redirects (same host or absolute Location). IPv4-first connect address.
 */
export declare function fetchHtmlForDiscovery(urlString: string, timeoutMs: number): Promise<string>;
//# sourceMappingURL=discovery-http-fetch.d.ts.map