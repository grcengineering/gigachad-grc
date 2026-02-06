import { Injectable, Logger } from '@nestjs/common';
import * as dns from 'dns';
import * as https from 'https';
import * as http from 'http';
import { promisify } from 'util';
import { randomBytes } from 'crypto';
import { validateUrl } from '@gigachad-grc/shared';

const dnsResolve = promisify(dns.resolve);

export interface SubdomainInfo {
  subdomain: string;
  fullDomain: string;
  resolved: boolean;
  ipAddresses?: string[];
  accessible?: boolean;
  httpStatus?: number;
  redirectsTo?: string;
  hasSSL?: boolean;
}

export interface SubdomainScanResult {
  domain: string;
  totalChecked: number;
  discovered: SubdomainInfo[];
  hasWildcard: boolean;
  wildcardIp?: string;
}

@Injectable()
export class SubdomainCollector {
  private readonly logger = new Logger(SubdomainCollector.name);

  // Common subdomains to check - prioritized by likelihood
  private readonly COMMON_SUBDOMAINS = [
    // High priority - very common
    'www',
    'api',
    'app',
    'mail',
    'webmail',
    'remote',
    'blog',
    'shop',
    'store',
    'support',
    'help',
    'docs',
    'dev',
    'staging',
    'test',
    'beta',
    'demo',
    'portal',
    'admin',
    'login',
    'secure',
    'cdn',
    'assets',
    'static',
    'media',
    'images',
    'img',
    // Medium priority - common services
    'ftp',
    'sftp',
    'vpn',
    'gateway',
    'proxy',
    'ns1',
    'ns2',
    'dns',
    'mx',
    'smtp',
    'pop',
    'imap',
    // Lower priority - still worth checking
    'dashboard',
    'console',
    'panel',
    'manage',
    'my',
    'account',
    'accounts',
    'billing',
    'status',
    'monitoring',
    'metrics',
    'analytics',
    'tracking',
    'events',
    'webhook',
    'webhooks',
    'callback',
    'oauth',
    'auth',
    'sso',
    'identity',
    'id',
  ];

  /**
   * Scan for subdomains of a target domain
   */
  async collect(targetUrl: string): Promise<SubdomainScanResult> {
    const url = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
    const domain = this.extractBaseDomain(url.hostname);

    this.logger.log(`Starting subdomain enumeration for ${domain}`);

    const result: SubdomainScanResult = {
      domain,
      totalChecked: 0,
      discovered: [],
      hasWildcard: false,
    };

    // First check for wildcard DNS
    const wildcardCheck = await this.checkWildcard(domain);
    result.hasWildcard = wildcardCheck.hasWildcard;
    result.wildcardIp = wildcardCheck.wildcardIp;

    if (result.hasWildcard) {
      this.logger.debug(`Wildcard DNS detected for ${domain} (${result.wildcardIp})`);
    }

    // Check subdomains in parallel batches
    const batchSize = 10;
    for (let i = 0; i < this.COMMON_SUBDOMAINS.length; i += batchSize) {
      const batch = this.COMMON_SUBDOMAINS.slice(i, i + batchSize);
      const checks = batch.map((sub) => this.checkSubdomain(sub, domain, result.wildcardIp));

      const results = await Promise.all(checks);
      result.totalChecked += batch.length;

      for (const subInfo of results) {
        if (subInfo && subInfo.resolved) {
          // Skip if it resolves to the same IP as wildcard (false positive)
          if (!result.hasWildcard || !this.isSameAsWildcard(subInfo, result.wildcardIp)) {
            result.discovered.push(subInfo);
          }
        }
      }

      // Limit to first 20 discovered subdomains for performance
      if (result.discovered.length >= 20) {
        this.logger.debug(`Reached subdomain limit (20), stopping enumeration`);
        break;
      }
    }

    this.logger.log(`Subdomain scan complete: found ${result.discovered.length} subdomains`);
    return result;
  }

  /**
   * Extract base domain from hostname (e.g., www.example.com -> example.com)
   */
  private extractBaseDomain(hostname: string): string {
    const parts = hostname.split('.');
    // Handle common TLDs like .co.uk, .com.au, etc.
    if (parts.length > 2) {
      const lastTwo = parts.slice(-2).join('.');
      const knownMultiPartTlds = ['co.uk', 'com.au', 'co.nz', 'co.jp', 'com.br', 'co.in'];
      if (knownMultiPartTlds.includes(lastTwo)) {
        return parts.slice(-3).join('.');
      }
    }
    return parts.slice(-2).join('.');
  }

  /**
   * Check if domain has wildcard DNS configured
   */
  private async checkWildcard(
    domain: string
  ): Promise<{ hasWildcard: boolean; wildcardIp?: string }> {
    // Generate a random subdomain that shouldn't exist
    const randomSubdomain = `nonexistent-${randomBytes(6).toString('hex')}`;
    const testDomain = `${randomSubdomain}.${domain}`;

    try {
      const addresses = await dnsResolve(testDomain, 'A');
      if (addresses && addresses.length > 0) {
        return { hasWildcard: true, wildcardIp: addresses[0] as string };
      }
    } catch {
      // NXDOMAIN or other error means no wildcard
    }

    return { hasWildcard: false };
  }

  /**
   * Check if a specific subdomain exists and is accessible
   */
  private async checkSubdomain(
    subdomain: string,
    baseDomain: string,
    wildcardIp?: string
  ): Promise<SubdomainInfo | null> {
    const fullDomain = `${subdomain}.${baseDomain}`;

    const info: SubdomainInfo = {
      subdomain,
      fullDomain,
      resolved: false,
    };

    try {
      // DNS resolution with 3 second timeout
      const addresses = (await Promise.race([
        dnsResolve(fullDomain, 'A'),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('DNS timeout')), 3000)),
      ])) as string[];

      if (addresses && addresses.length > 0) {
        info.resolved = true;
        info.ipAddresses = addresses;

        // Skip HTTP check if same as wildcard
        if (wildcardIp && addresses.includes(wildcardIp)) {
          return info;
        }

        // SSRF Protection: Use centralized URL validation to check for private IPs
        const validation = await validateUrl(`https://${fullDomain}`);
        if (!validation.valid) {
          this.logger.debug(
            `Skipping HTTP check for ${fullDomain} - SSRF protection: ${validation.error}`
          );
          return info;
        }

        // Check HTTP/HTTPS accessibility
        const httpCheck = await this.checkHttpAccess(fullDomain);
        info.accessible = httpCheck.accessible;
        info.httpStatus = httpCheck.status;
        info.hasSSL = httpCheck.hasSSL;
        info.redirectsTo = httpCheck.redirectsTo;
      }
    } catch {
      // Subdomain doesn't exist or timeout
      return null;
    }

    return info;
  }

  /**
   * Check if subdomain is HTTP/HTTPS accessible
   */
  private async checkHttpAccess(
    domain: string
  ): Promise<{ accessible: boolean; status?: number; hasSSL?: boolean; redirectsTo?: string }> {
    // Try HTTPS first
    try {
      const httpsResult = await this.fetchHead(`https://${domain}`);
      return {
        accessible: true,
        status: httpsResult.status,
        hasSSL: true,
        redirectsTo: httpsResult.redirectsTo,
      };
    } catch {
      // HTTPS failed, try HTTP
    }

    try {
      const httpResult = await this.fetchHead(`http://${domain}`);
      return {
        accessible: true,
        status: httpResult.status,
        hasSSL: false,
        redirectsTo: httpResult.redirectsTo,
      };
    } catch {
      return { accessible: false };
    }
  }

  /**
   * Perform HEAD request to check accessibility
   */
  private async fetchHead(url: string): Promise<{ status: number; redirectsTo?: string }> {
    // SSRF Protection: Validate URL before making request
    const validation = await validateUrl(url);
    if (!validation.valid) {
      throw new Error(`SSRF protection blocked request: ${validation.error}`);
    }

    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;

      const req = protocol.request(
        {
          hostname: urlObj.hostname,
          port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
          path: '/',
          method: 'HEAD',
          timeout: 3000,
          headers: {
            'User-Agent': 'GigaChad-GRC Security Scanner/1.0',
          },
        },
        (res) => {
          const redirectsTo = res.headers.location;
          resolve({
            status: res.statusCode || 0,
            redirectsTo: redirectsTo ? redirectsTo : undefined,
          });
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  /**
   * Check if subdomain IPs match wildcard IP
   */
  private isSameAsWildcard(subInfo: SubdomainInfo, wildcardIp?: string): boolean {
    if (!wildcardIp || !subInfo.ipAddresses) return false;
    return subInfo.ipAddresses.every((ip) => ip === wildcardIp);
  }
}
