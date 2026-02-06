import { Injectable, Logger } from '@nestjs/common';
import * as tls from 'tls';
import * as http from 'http';
import { SSLInfo } from '../dto/security-scan.dto';
import { validateUrl } from '@gigachad-grc/shared';

@Injectable()
export class SSLCollector {
  private readonly logger = new Logger(SSLCollector.name);

  /**
   * Controls whether TLS certificate validation is bypassed during SSL inspection.
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

  /**
   * Collect SSL/TLS information for a target URL
   */
  async collect(targetUrl: string): Promise<SSLInfo> {
    const result: SSLInfo = {
      enabled: false,
      grade: 'N/A',
      httpRedirectsToHttps: false,
    };

    try {
      const url = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
      const hostname = url.hostname;
      const port = url.port ? parseInt(url.port) : 443;

      // Check TLS certificate
      const tlsResult = await this.checkTLS(hostname, port);
      result.enabled = tlsResult.enabled;
      result.issuer = tlsResult.issuer;
      result.expiry = tlsResult.expiry;
      result.daysUntilExpiry = tlsResult.daysUntilExpiry;
      result.grade = tlsResult.grade;

      // Check HTTP to HTTPS redirect
      result.httpRedirectsToHttps = await this.checkHttpRedirect(hostname);
    } catch (error) {
      this.logger.warn(`Failed to collect SSL info for ${targetUrl}: ${error.message}`);
    }

    return result;
  }

  private async checkTLS(
    hostname: string,
    port: number
  ): Promise<{
    enabled: boolean;
    issuer?: string;
    expiry?: string;
    daysUntilExpiry?: number;
    grade: SSLInfo['grade'];
  }> {
    const result = {
      enabled: false,
      issuer: undefined as string | undefined,
      expiry: undefined as string | undefined,
      daysUntilExpiry: undefined as number | undefined,
      grade: 'N/A' as SSLInfo['grade'],
    };

    // SSRF Protection: Validate hostname before connecting
    const validation = await validateUrl(`https://${hostname}:${port}`);
    if (!validation.valid) {
      this.logger.warn(`SSRF protection blocked TLS check for ${hostname}: ${validation.error}`);
      return result;
    }

    return new Promise((resolve) => {
      const socket = tls.connect(
        {
          host: hostname,
          port,
          servername: hostname,
          rejectUnauthorized: !this.allowInsecureTLS, // Default: true (secure)
          timeout: 10000,
        },
        () => {
          const cert = socket.getPeerCertificate();
          if (cert && cert.valid_to) {
            result.enabled = true;
            result.issuer = cert.issuer?.CN || cert.issuer?.O || 'Unknown';
            result.expiry = cert.valid_to;

            // Calculate days until expiry
            const expiryDate = new Date(cert.valid_to);
            const now = new Date();
            result.daysUntilExpiry = Math.floor(
              (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );

            // Determine grade based on certificate validity
            if (socket.authorized) {
              if (result.daysUntilExpiry < 0) {
                result.grade = 'F'; // Expired
              } else if (result.daysUntilExpiry < 30) {
                result.grade = 'C'; // Expiring soon
              } else {
                result.grade = 'A'; // Valid
              }
            } else {
              result.grade = 'F'; // Invalid certificate
            }
          }
          socket.end();
          resolve(result);
        }
      );

      socket.on('error', (err) => {
        this.logger.debug(`TLS error for ${hostname}: ${err.message}`);
        socket.destroy();
        resolve(result);
      });

      socket.on('timeout', () => {
        this.logger.debug(`TLS timeout for ${hostname}`);
        socket.destroy();
        resolve(result);
      });
    });
  }

  private async checkHttpRedirect(hostname: string): Promise<boolean> {
    // SSRF Protection: Validate hostname before making request
    const validation = await validateUrl(`http://${hostname}`);
    if (!validation.valid) {
      this.logger.warn(
        `SSRF protection blocked HTTP redirect check for ${hostname}: ${validation.error}`
      );
      return false;
    }

    return new Promise((resolve) => {
      const req = http.request(
        {
          hostname,
          port: 80,
          path: '/',
          method: 'HEAD',
          timeout: 10000,
        },
        (res) => {
          // Check if response is a redirect to HTTPS
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400) {
            const location = res.headers.location;
            if (location && location.startsWith('https://')) {
              resolve(true);
              return;
            }
          }
          resolve(false);
        }
      );

      req.on('error', () => {
        resolve(false);
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  }
}
