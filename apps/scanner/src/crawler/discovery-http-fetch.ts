/**
 * Fetch HTML for discovery when Playwright cannot load the page (VPS/Docker DNS, IPv6, etc.).
 * Uses IPv4-first DNS and Node's http/https with correct Host + SNI.
 */

import * as http from 'node:http';
import * as https from 'node:https';
import { lookup } from 'node:dns/promises';

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function resolveConnectAddress(hostname: string): Promise<string> {
  try {
    const r = await lookup(hostname, { family: 4, verbatim: false });
    return r.address;
  } catch {
    const r = await lookup(hostname, { family: 0, verbatim: false });
    return r.address;
  }
}

function requestOnce(
  targetUrl: URL,
  connectHost: string,
  timeoutMs: number
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const isHttps = targetUrl.protocol === 'https:';
    const lib = isHttps ? https : http;
    const port = targetUrl.port ? Number(targetUrl.port) : isHttps ? 443 : 80;

    const req = lib.request(
      {
        host: connectHost,
        port,
        path: targetUrl.pathname + targetUrl.search,
        method: 'GET',
        servername: targetUrl.hostname,
        timeout: timeoutMs,
        headers: {
          Host: targetUrl.hostname,
          'User-Agent': DEFAULT_UA,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`socket timeout after ${timeoutMs}ms`));
    });
    req.end();
  });
}

/**
 * GET url following redirects (same host or absolute Location). IPv4-first connect address.
 */
export async function fetchHtmlForDiscovery(urlString: string, timeoutMs: number): Promise<string> {
  let current = new URL(urlString);
  if (current.protocol !== 'http:' && current.protocol !== 'https:') {
    throw new Error(`Unsupported protocol: ${current.protocol}`);
  }

  for (let redirect = 0; redirect < 10; redirect++) {
    const address = await resolveConnectAddress(current.hostname);
    const res = await requestOnce(current, address, timeoutMs);

    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      current = new URL(res.headers.location, current);
      continue;
    }

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return res.body;
    }

    throw new Error(`HTTP ${res.statusCode} for ${current.toString()}`);
  }

  throw new Error('Too many redirects');
}
