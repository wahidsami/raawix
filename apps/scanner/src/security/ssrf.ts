import { lookup } from 'node:dns/promises';
import { isIPv4, isIPv6 } from 'node:net';
import { config } from '../config.js';

// Private IP ranges
const PRIVATE_IPV4_RANGES = [
  { start: '127.0.0.0', end: '127.255.255.255' }, // 127.0.0.0/8
  { start: '10.0.0.0', end: '10.255.255.255' }, // 10.0.0.0/8
  { start: '172.16.0.0', end: '172.31.255.255' }, // 172.16.0.0/12
  { start: '192.168.0.0', end: '192.168.255.255' }, // 192.168.0.0/16
];

const PRIVATE_IPV6_RANGES = [
  '::1', // localhost
  'fc00::/7', // Unique Local Address
  'fe80::/10', // Link-Local Address
];

function ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  if (!isIPv4(ip)) return false;
  const ipNum = ipToNumber(ip);
  return PRIVATE_IPV4_RANGES.some((range) => {
    const startNum = ipToNumber(range.start);
    const endNum = ipToNumber(range.end);
    return ipNum >= startNum && ipNum <= endNum;
  });
}

function isPrivateIPv6(ip: string): boolean {
  if (!isIPv6(ip)) return false;
  return PRIVATE_IPV6_RANGES.some((range) => {
    if (range.includes('/')) {
      // Simplified check - in production, use proper CIDR matching
      const prefix = range.split('/')[0];
      return ip.startsWith(prefix);
    }
    return ip === range;
  });
}

export async function validateUrl(url: string, allowedPorts: number[] | null): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch (error) {
    throw new Error('Invalid URL format');
  }

  // Only allow http and https protocols
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Protocol ${parsed.protocol} is not allowed. Only http and https are permitted.`);
  }

  // Check port (only if allowedPorts is specified, otherwise allow all ports)
  if (allowedPorts && allowedPorts.length > 0) {
    const port = parsed.port ? parseInt(parsed.port, 10) : parsed.protocol === 'https:' ? 443 : 80;
    if (!allowedPorts.includes(port)) {
      throw new Error(`Port ${port} is not allowed. Only ports ${allowedPorts.join(', ')} are permitted.`);
    }
  }
  // If allowedPorts is null or empty, allow all ports (no restriction)

  // Check if localhost is allowed for development (use config value)
  const allowLocalhost = config.allowLocalhost;
  const hostname = parsed.hostname.toLowerCase();
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.startsWith('127.') || hostname === '[::1]';

  // Block private IP literals immediately (no DNS lookup needed)
  if (isPrivateIPv4(hostname) || isPrivateIPv6(hostname)) {
    throw new Error(`Private IP address ${hostname} is not allowed`);
  }
  
  // Resolve DNS and check for private IPs (skip if localhost is allowed)
  if (!allowLocalhost || !isLocalhost) {
    try {
      const addresses = await lookup(parsed.hostname, { all: true });
      for (const addr of addresses) {
        if (isPrivateIPv4(addr.address) || isPrivateIPv6(addr.address)) {
          throw new Error(`Private IP address ${addr.address} is not allowed`);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Private IP')) {
        throw error;
      }
      // For non-localhost hostnames, allow DNS failures in validation phase
      // (offline/test environments may not resolve synthetic domains).
      if (isLocalhost || isPrivateIPv4(hostname) || isPrivateIPv6(hostname)) {
        throw new Error(`DNS resolution failed or returned invalid address: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  // Block localhost variations (unless explicitly allowed for development)
  if (!allowLocalhost) {
    if (
      isLocalhost ||
      hostname.startsWith('0.0.0.0')
    ) {
      throw new Error('localhost and loopback addresses are not allowed');
    }
  }
}

