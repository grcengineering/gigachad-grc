import { Logger } from '@nestjs/common';
import * as dns from 'dns';
import { promisify } from 'util';
import * as net from 'net';

const dnsLookup = promisify(dns.lookup);

export class SSRFProtectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SSRFProtectionError';
  }
}

export interface SSRFValidationOptions {
  allowPrivateIPs?: boolean;
  allowedProtocols?: string[];
  allowedHosts?: string[];
  blockedHosts?: string[];
  maxRedirects?: number;
}

const DEFAULT_OPTIONS: SSRFValidationOptions = {
  allowPrivateIPs: false,
  allowedProtocols: ['http:', 'https:'],
  allowedHosts: [],
  blockedHosts: ['localhost', '127.0.0.1', '0.0.0.0', '::1'],
  maxRedirects: 5,
};

const PRIVATE_IP_RANGES = [
  { start: '10.0.0.0', end: '10.255.255.255' },
  { start: '172.16.0.0', end: '172.31.255.255' },
  { start: '192.168.0.0', end: '192.168.255.255' },
  { start: '127.0.0.0', end: '127.255.255.255' },
  { start: '169.254.0.0', end: '169.254.255.255' },
  { start: '0.0.0.0', end: '0.255.255.255' },
];

function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function isPrivateIP(ip: string): boolean {
  if (!net.isIPv4(ip)) {
    if (net.isIPv6(ip)) {
      const normalizedIp = ip.toLowerCase();
      // Security: Comprehensive IPv6 private address detection
      // ::1 - loopback
      // fe80:: - link-local
      // fc00::/7 - unique local addresses (includes fc00:: and fd00::)
      // ::ffff:0:0/96 - IPv4-mapped addresses (check the mapped portion separately)
      return (
        normalizedIp === '::1' ||
        normalizedIp.startsWith('fe80:') ||
        normalizedIp.startsWith('fc00:') ||
        normalizedIp.startsWith('fd00:') ||
        normalizedIp.startsWith('fc') ||
        normalizedIp.startsWith('fd') ||
        normalizedIp === '::' ||
        normalizedIp.startsWith('::ffff:127.') ||
        normalizedIp.startsWith('::ffff:10.') ||
        normalizedIp.startsWith('::ffff:192.168.') ||
        normalizedIp.startsWith('::ffff:172.16.') ||
        normalizedIp.startsWith('::ffff:172.17.') ||
        normalizedIp.startsWith('::ffff:172.18.') ||
        normalizedIp.startsWith('::ffff:172.19.') ||
        normalizedIp.startsWith('::ffff:172.20.') ||
        normalizedIp.startsWith('::ffff:172.21.') ||
        normalizedIp.startsWith('::ffff:172.22.') ||
        normalizedIp.startsWith('::ffff:172.23.') ||
        normalizedIp.startsWith('::ffff:172.24.') ||
        normalizedIp.startsWith('::ffff:172.25.') ||
        normalizedIp.startsWith('::ffff:172.26.') ||
        normalizedIp.startsWith('::ffff:172.27.') ||
        normalizedIp.startsWith('::ffff:172.28.') ||
        normalizedIp.startsWith('::ffff:172.29.') ||
        normalizedIp.startsWith('::ffff:172.30.') ||
        normalizedIp.startsWith('::ffff:172.31.')
      );
    }
    return false;
  }

  const ipNum = ipToNumber(ip);
  for (const range of PRIVATE_IP_RANGES) {
    const start = ipToNumber(range.start);
    const end = ipToNumber(range.end);
    if (ipNum >= start && ipNum <= end) {
      return true;
    }
  }
  return false;
}

export async function validateUrl(
  targetUrl: string,
  options: SSRFValidationOptions = {}
): Promise<{ valid: boolean; error?: string; resolvedIP?: string }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const logger = new Logger('SSRFProtection');

  try {
    const parsed = new URL(targetUrl);

    if (!opts.allowedProtocols?.includes(parsed.protocol)) {
      return { valid: false, error: `Protocol ${parsed.protocol} not allowed` };
    }

    const hostname = parsed.hostname.toLowerCase();

    if (opts.blockedHosts?.some((h) => hostname === h || hostname.endsWith('.' + h))) {
      return { valid: false, error: `Host ${hostname} is blocked` };
    }

    if (
      opts.allowedHosts?.length &&
      !opts.allowedHosts.some((h) => hostname === h || hostname.endsWith('.' + h))
    ) {
      return { valid: false, error: `Host ${hostname} not in allowlist` };
    }

    if (net.isIP(hostname)) {
      if (!opts.allowPrivateIPs && isPrivateIP(hostname)) {
        return { valid: false, error: `Direct IP ${hostname} is a private address` };
      }
      return { valid: true, resolvedIP: hostname };
    }

    try {
      const { address } = await dnsLookup(hostname);

      if (!opts.allowPrivateIPs && isPrivateIP(address)) {
        logger.warn(
          `DNS rebinding attempt detected: ${hostname} resolved to private IP ${address}`
        );
        return { valid: false, error: `Host ${hostname} resolves to private IP ${address}` };
      }

      return { valid: true, resolvedIP: address };
    } catch {
      return { valid: false, error: `Failed to resolve hostname: ${hostname}` };
    }
  } catch {
    return { valid: false, error: `Invalid URL: ${targetUrl}` };
  }
}

export async function safeFetch(
  targetUrl: string,
  options: RequestInit = {},
  ssrfOptions: SSRFValidationOptions = {}
): Promise<Response> {
  const validation = await validateUrl(targetUrl, ssrfOptions);

  if (!validation.valid) {
    throw new SSRFProtectionError(validation.error || 'URL validation failed');
  }

  const fetchOptions: RequestInit = {
    ...options,
    redirect: 'manual',
  };

  let currentUrl = targetUrl;
  let redirectCount = 0;
  const maxRedirects = ssrfOptions.maxRedirects ?? DEFAULT_OPTIONS.maxRedirects ?? 5;

  while (redirectCount < maxRedirects) {
    // codeql[js/request-forgery] suppressed: This IS the SSRF protection module - URL is validated by validateUrl() before fetch
    const response = await fetch(currentUrl, fetchOptions);

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) break;

      const redirectUrl = new URL(location, currentUrl).toString();
      const redirectValidation = await validateUrl(redirectUrl, ssrfOptions);

      if (!redirectValidation.valid) {
        throw new SSRFProtectionError(`Redirect blocked: ${redirectValidation.error}`);
      }

      currentUrl = redirectUrl;
      redirectCount++;
      continue;
    }

    return response;
  }

  throw new SSRFProtectionError('Too many redirects');
}
