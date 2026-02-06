import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import * as http from 'http';
import { WebPresenceInfo } from '../dto/security-scan.dto';
import { validateUrl } from '@gigachad-grc/shared';

@Injectable()
export class WebCollector {
  private readonly logger = new Logger(WebCollector.name);

  /**
   * Collect web presence information for a target URL
   */
  async collect(targetUrl: string): Promise<WebPresenceInfo> {
    const result: WebPresenceInfo = {
      accessible: false,
      hasContactInfo: false,
      hasPrivacyPolicy: false,
      hasTermsOfService: false,
    };

    try {
      const url = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
      const { statusCode, body } = await this.fetchPage(url);

      result.statusCode = statusCode;
      result.accessible = statusCode === 200;

      if (body) {
        // Extract title
        const titleMatch = body.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
          result.title = titleMatch[1].trim();
        }

        // Look for contact email
        const emailMatch = body.match(/[\w.-]+@[\w.-]+\.\w+/);
        if (emailMatch) {
          result.hasContactInfo = true;
          result.contactEmail = emailMatch[0];
        }

        // Check for contact page link
        if (body.toLowerCase().includes('contact') || body.toLowerCase().includes('mailto:')) {
          result.hasContactInfo = true;
        }

        // Check for privacy policy
        const privacyPatterns = [/href=["']([^"']*privacy[^"']*)/i, /privacy\s*policy/i];
        for (const pattern of privacyPatterns) {
          const match = body.match(pattern);
          if (match) {
            result.hasPrivacyPolicy = true;
            if (match[1]) {
              result.privacyPolicyUrl = this.resolveUrl(url, match[1]);
            }
            break;
          }
        }

        // Check for terms of service
        const tosPatterns = [/terms\s*(of\s*)?(service|use)/i, /href=["']([^"']*terms[^"']*)/i];
        for (const pattern of tosPatterns) {
          if (pattern.test(body)) {
            result.hasTermsOfService = true;
            break;
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to collect web presence for ${targetUrl}: ${error.message}`);
    }

    return result;
  }

  private async fetchPage(url: URL): Promise<{ statusCode: number; body: string }> {
    // SSRF Protection: Validate URL before making request
    const validation = await validateUrl(url.toString());
    if (!validation.valid) {
      throw new Error(`SSRF protection blocked request: ${validation.error}`);
    }

    return new Promise((resolve, reject) => {
      const protocol = url.protocol === 'https:' ? https : http;

      const req = protocol.request(
        {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname || '/',
          method: 'GET',
          timeout: 10000,
          headers: {
            'User-Agent': 'GigaChad-GRC Security Scanner/1.0',
            Accept: 'text/html,application/xhtml+xml',
          },
        },
        (res) => {
          let body = '';

          // Handle redirects with SSRF protection
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            const redirectUrl = new URL(res.headers.location, url);
            // Redirect URL will be validated by the recursive call to fetchPage
            return this.fetchPage(redirectUrl).then(resolve).catch(reject);
          }

          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            body += chunk;
            // Limit body size to prevent memory issues
            if (body.length > 500000) {
              req.destroy();
            }
          });
          res.on('end', () => {
            resolve({ statusCode: res.statusCode || 0, body });
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

  private resolveUrl(baseUrl: URL, relativePath: string): string {
    try {
      if (relativePath.startsWith('http')) {
        return relativePath;
      }
      return new URL(relativePath, baseUrl).toString();
    } catch {
      return relativePath;
    }
  }
}
