import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import * as http from 'http';
import { SecurityHeaders } from '../dto/security-scan.dto';
import { validateUrl } from '@gigachad-grc/shared';

@Injectable()
export class HeadersCollector {
  private readonly logger = new Logger(HeadersCollector.name);

  private readonly SECURITY_HEADERS = [
    'strict-transport-security',
    'content-security-policy',
    'x-frame-options',
    'x-content-type-options',
    'x-xss-protection',
    'referrer-policy',
    'permissions-policy',
  ];

  /**
   * Collect security headers from a target URL
   */
  async collect(targetUrl: string): Promise<{
    headers: SecurityHeaders;
    missingHeaders: string[];
  }> {
    const headers: SecurityHeaders = {};
    const missingHeaders: string[] = [];

    try {
      const url = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
      const responseHeaders = await this.fetchHeaders(url);

      // Map response headers to our SecurityHeaders interface
      if (responseHeaders['strict-transport-security']) {
        headers.strictTransportSecurity = responseHeaders['strict-transport-security'];
      } else {
        missingHeaders.push('Strict-Transport-Security');
      }

      if (responseHeaders['content-security-policy']) {
        headers.contentSecurityPolicy = responseHeaders['content-security-policy'];
      } else {
        missingHeaders.push('Content-Security-Policy');
      }

      if (responseHeaders['x-frame-options']) {
        headers.xFrameOptions = responseHeaders['x-frame-options'];
      } else {
        missingHeaders.push('X-Frame-Options');
      }

      if (responseHeaders['x-content-type-options']) {
        headers.xContentTypeOptions = responseHeaders['x-content-type-options'];
      } else {
        missingHeaders.push('X-Content-Type-Options');
      }

      if (responseHeaders['x-xss-protection']) {
        headers.xXssProtection = responseHeaders['x-xss-protection'];
      }

      if (responseHeaders['referrer-policy']) {
        headers.referrerPolicy = responseHeaders['referrer-policy'];
      }

      if (responseHeaders['permissions-policy']) {
        headers.permissionsPolicy = responseHeaders['permissions-policy'];
      }
    } catch (error) {
      this.logger.warn(`Failed to collect headers for ${targetUrl}: ${error.message}`);
    }

    return { headers, missingHeaders };
  }

  private async fetchHeaders(url: URL): Promise<Record<string, string>> {
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
          method: 'HEAD',
          timeout: 15000,
          headers: {
            'User-Agent': 'GigaChad-GRC Security Scanner/1.0',
          },
        },
        (res) => {
          const headers: Record<string, string> = {};
          for (const [key, value] of Object.entries(res.headers)) {
            if (typeof value === 'string') {
              headers[key.toLowerCase()] = value;
            } else if (Array.isArray(value)) {
              headers[key.toLowerCase()] = value.join(', ');
            }
          }
          resolve(headers);
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
}
