import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import * as http from 'http';
import { validateUrl } from '@gigachad-grc/shared';

export interface DiscoveredPage {
  url: string;
  title?: string;
  statusCode?: number;
  contentType?: string;
  size?: number;
  isExternal: boolean;
  linkText?: string;
  foundOn?: string;
}

export interface CrawlResult {
  subdomain: string;
  baseUrl: string;
  crawledAt: string;
  pagesDiscovered: number;
  pages: DiscoveredPage[];
  externalLinks: DiscoveredPage[];
  errors: string[];
}

@Injectable()
export class PageCrawler {
  private readonly logger = new Logger(PageCrawler.name);
  private readonly MAX_PAGES = 50;
  private readonly TIMEOUT = 8000;

  /**
   * Controls whether TLS certificate validation is bypassed.
   *
   * SECURITY WARNING: Disabling TLS validation (ALLOW_INSECURE_TLS=true) should ONLY be used when:
   * - Scanning external sites with known self-signed or invalid certificates
   * - Testing in development environments
   * - Never in production unless explicitly required for security scanning
   *
   * Default: false (secure - TLS validation enabled)
   */
  private readonly allowInsecureTLS = process.env.ALLOW_INSECURE_TLS === 'true';

  constructor() {
    if (this.allowInsecureTLS) {
      this.logger.warn(
        'TLS certificate validation is disabled (ALLOW_INSECURE_TLS=true) - this may allow MITM attacks'
      );
    }
  }

  async crawl(subdomainUrl: string): Promise<CrawlResult> {
    const startTime = Date.now();
    const baseUrl = subdomainUrl.startsWith('http') ? subdomainUrl : `https://${subdomainUrl}`;

    const url = new URL(baseUrl);
    const subdomain = url.hostname;

    this.logger.log(`Starting crawl of ${subdomain}`);

    const result: CrawlResult = {
      subdomain,
      baseUrl,
      crawledAt: new Date().toISOString(),
      pagesDiscovered: 0,
      pages: [],
      externalLinks: [],
      errors: [],
    };

    const visited = new Set<string>();
    const toVisit: Array<{ url: string; foundOn?: string; linkText?: string }> = [{ url: baseUrl }];

    // BFS crawl with limit
    while (toVisit.length > 0 && visited.size < this.MAX_PAGES) {
      const batch = toVisit.splice(0, 5); // Process 5 at a time

      const promises = batch.map(async (item) => {
        const normalizedUrl = this.normalizeUrl(item.url);
        if (visited.has(normalizedUrl)) return;
        visited.add(normalizedUrl);

        try {
          const pageData = await this.fetchPage(item.url);
          if (!pageData) return;

          const isExternal = !this.isSameDomain(item.url, subdomain);

          const page: DiscoveredPage = {
            url: item.url,
            title: pageData.title,
            statusCode: pageData.statusCode,
            contentType: pageData.contentType,
            size: pageData.size,
            isExternal,
            linkText: item.linkText,
            foundOn: item.foundOn,
          };

          if (isExternal) {
            result.externalLinks.push(page);
          } else {
            result.pages.push(page);

            // Extract links from internal pages only
            if (pageData.html && result.pages.length < this.MAX_PAGES) {
              const links = this.extractLinks(pageData.html, item.url, subdomain);
              for (const link of links) {
                const normalizedLink = this.normalizeUrl(link.url);
                if (
                  !visited.has(normalizedLink) &&
                  !toVisit.some((t) => this.normalizeUrl(t.url) === normalizedLink)
                ) {
                  toVisit.push({
                    url: link.url,
                    foundOn: item.url,
                    linkText: link.text,
                  });
                }
              }
            }
          }
        } catch (err) {
          result.errors.push(`Failed to fetch ${item.url}: ${err.message}`);
        }
      });

      await Promise.all(promises);

      // Timeout check
      if (Date.now() - startTime > 30000) {
        this.logger.warn(`Crawl timeout reached for ${subdomain}`);
        break;
      }
    }

    result.pagesDiscovered = result.pages.length;
    this.logger.log(
      `Crawl complete: ${result.pages.length} pages, ${result.externalLinks.length} external links`
    );

    return result;
  }

  private async fetchPage(url: string): Promise<{
    html: string;
    title?: string;
    statusCode: number;
    contentType?: string;
    size: number;
  } | null> {
    // SSRF Protection: Validate URL before making request
    try {
      const validation = await validateUrl(url);
      if (!validation.valid) {
        this.logger.warn(`SSRF protection blocked request to ${url}: ${validation.error}`);
        return null;
      }
    } catch (err) {
      this.logger.warn(`URL validation failed for ${url}: ${err.message}`);
      return null;
    }

    return new Promise((resolve) => {
      const isHttps = url.startsWith('https');
      const lib = isHttps ? https : http;

      const timeout = setTimeout(() => resolve(null), this.TIMEOUT);

      const req = lib.get(
        url,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; GRC-SecurityBot/1.0)',
            Accept: 'text/html,application/xhtml+xml',
          },
          timeout: this.TIMEOUT,
          rejectUnauthorized: !this.allowInsecureTLS, // Default: true (secure)
        },
        (res) => {
          // Handle redirects
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            clearTimeout(timeout);
            const redirectUrl = this.resolveUrl(res.headers.location, url);
            this.fetchPage(redirectUrl).then(resolve);
            return;
          }

          const contentType = res.headers['content-type'] || '';

          // Only process HTML
          if (!contentType.includes('text/html')) {
            clearTimeout(timeout);
            resolve({
              html: '',
              statusCode: res.statusCode || 200,
              contentType,
              size: parseInt(res.headers['content-length'] || '0', 10),
            });
            return;
          }

          let data = '';
          let size = 0;
          const maxSize = 500000; // 500KB limit

          res.on('data', (chunk) => {
            size += chunk.length;
            if (size < maxSize) {
              data += chunk;
            }
          });

          res.on('end', () => {
            clearTimeout(timeout);
            const title = this.extractTitle(data);
            resolve({
              html: data,
              title,
              statusCode: res.statusCode || 200,
              contentType,
              size,
            });
          });

          res.on('error', () => {
            clearTimeout(timeout);
            resolve(null);
          });
        }
      );

      req.on('error', () => {
        clearTimeout(timeout);
        resolve(null);
      });

      req.on('timeout', () => {
        req.destroy();
        clearTimeout(timeout);
        resolve(null);
      });
    });
  }

  private extractTitle(html: string): string | undefined {
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return match ? match[1].trim().substring(0, 200) : undefined;
  }

  private extractLinks(
    html: string,
    baseUrl: string,
    _targetDomain: string
  ): Array<{ url: string; text: string }> {
    const links: Array<{ url: string; text: string }> = [];
    const seen = new Set<string>();

    // Match anchor tags with href
    const regex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)</gi;
    let match;

    while ((match = regex.exec(html)) !== null && links.length < 100) {
      const href = match[1];
      const text = match[2].trim().substring(0, 100);

      // Skip anchors
      if (href.startsWith('#')) {
        continue;
      }

      try {
        const resolvedUrl = this.resolveUrl(href, baseUrl);
        const parsedUrl = new URL(resolvedUrl);

        // SSRF Protection: Only allow http: and https: protocols
        // This prevents SSRF via protocols like file:, ftp:, gopher:, dict:, etc.
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
          continue;
        }

        const normalized = this.normalizeUrl(resolvedUrl);

        if (!seen.has(normalized)) {
          seen.add(normalized);
          links.push({ url: resolvedUrl, text: text || href });
        }
      } catch {
        // Invalid URL, skip
      }
    }

    return links;
  }

  private resolveUrl(href: string, baseUrl: string): string {
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return href;
    }
    const base = new URL(baseUrl);
    return new URL(href, base).toString();
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove trailing slash, lowercase hostname
      let normalized = `${parsed.protocol}//${parsed.hostname.toLowerCase()}${parsed.pathname}`;
      if (
        normalized.endsWith('/') &&
        normalized.length > parsed.protocol.length + 3 + parsed.hostname.length
      ) {
        normalized = normalized.slice(0, -1);
      }
      return normalized;
    } catch {
      return url.toLowerCase();
    }
  }

  private isSameDomain(url: string, targetDomain: string): boolean {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      const target = targetDomain.toLowerCase();
      return hostname === target || hostname.endsWith('.' + target);
    } catch {
      return false;
    }
  }
}
