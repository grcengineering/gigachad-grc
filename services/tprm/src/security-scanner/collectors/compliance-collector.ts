import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import * as http from 'http';
import { ComplianceIndicators } from '../dto/security-scan.dto';

@Injectable()
export class ComplianceCollector {
  private readonly logger = new Logger(ComplianceCollector.name);

  // Common trust portal paths - prioritized list (most common first)
  private readonly TRUST_PORTAL_PATHS = [
    '/trust',
    '/trust/',
    '/security',
    '/trust-center',
  ];

  // Common privacy policy paths - prioritized list
  // Includes "privacy notice" variations (e.g., Twilio uses /legal/privacy)
  private readonly PRIVACY_POLICY_PATHS = [
    '/privacy',
    '/privacy-policy',
    '/privacy-notice',
    '/legal/privacy',
    '/legal/privacy-policy',
    '/legal/privacy-notice',
  ];

  private readonly TRUST_PORTAL_PROVIDERS = [
    { pattern: /vanta/i, name: 'Vanta' },
    { pattern: /drata/i, name: 'Drata' },
    { pattern: /secureframe/i, name: 'SecureFrame' },
    { pattern: /safebase/i, name: 'SafeBase' },
    { pattern: /anecdotes/i, name: 'Anecdotes' },
    { pattern: /trustcloud/i, name: 'TrustCloud' },
  ];

  private readonly CERTIFICATION_PATTERNS = [
    { pattern: /soc\s*2?\s*type\s*(ii|2)/i, cert: 'SOC 2 Type II', key: 'hasSOC2', type: 'Type II' },
    { pattern: /soc\s*2?\s*type\s*(i|1)/i, cert: 'SOC 2 Type I', key: 'hasSOC2', type: 'Type I' },
    { pattern: /soc\s*2/i, cert: 'SOC 2', key: 'hasSOC2', type: null },
    { pattern: /iso\s*27001/i, cert: 'ISO 27001', key: 'hasISO27001' },
    { pattern: /gdpr/i, cert: 'GDPR', key: 'hasGDPR' },
    { pattern: /hipaa/i, cert: 'HIPAA', key: 'hasHIPAA' },
    { pattern: /pci[\s-]?dss/i, cert: 'PCI DSS', key: 'hasPCIDSS' },
    { pattern: /iso\s*27701/i, cert: 'ISO 27701' },
    { pattern: /fedramp/i, cert: 'FedRAMP' },
    { pattern: /csa\s*star/i, cert: 'CSA STAR' },
  ];

  /**
   * Collect compliance indicators for a target URL
   */
  async collect(targetUrl: string): Promise<ComplianceIndicators> {
    const result: ComplianceIndicators = {
      hasTrustPortal: false,
      hasSOC2: false,
      hasISO27001: false,
      hasGDPR: false,
      hasHIPAA: false,
      hasPCIDSS: false,
      certifications: [],
      hasSecurityWhitepaper: false,
      hasBugBounty: false,
      hasPrivacyPolicy: false,
    };

    try {
      const url = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);

      // Check main page for compliance indicators
      const mainPageContent = await this.fetchPageContent(url);
      if (mainPageContent) {
        this.analyzePage(mainPageContent, result);
      }

      // Check common trust portal and privacy paths in parallel (limited concurrency)
      await this.checkPathsInParallel(url, result);

      // Check for bug bounty programs
      await this.checkBugBounty(url, result);
    } catch (error) {
      this.logger.warn(`Failed to collect compliance info for ${targetUrl}: ${error.message}`);
    }

    return result;
  }

  private analyzePage(content: string, result: ComplianceIndicators): void {
    const contentLower = content.toLowerCase();

    // Check for certifications
    for (const { pattern, cert, key, type } of this.CERTIFICATION_PATTERNS) {
      if (pattern.test(content)) {
        if (key) {
          switch (key) {
            case 'hasSOC2': result.hasSOC2 = true; break;
            case 'hasISO27001': result.hasISO27001 = true; break;
            case 'hasGDPR': result.hasGDPR = true; break;
            case 'hasHIPAA': result.hasHIPAA = true; break;
            case 'hasPCIDSS': result.hasPCIDSS = true; break;
          }
        }
        if (type && key === 'hasSOC2') {
          result.soc2Type = type as 'Type I' | 'Type II';
        }
        if (!result.certifications.includes(cert)) {
          result.certifications.push(cert);
        }
      }
    }

    // Check for security whitepaper
    if (
      contentLower.includes('security whitepaper') ||
      contentLower.includes('security overview') ||
      content.match(/security\s*(documentation|docs)/i)
    ) {
      result.hasSecurityWhitepaper = true;
    }

    // Check for bug bounty mentions
    if (
      contentLower.includes('bug bounty') ||
      contentLower.includes('responsible disclosure') ||
      contentLower.includes('vulnerability disclosure')
    ) {
      result.hasBugBounty = true;
    }
  }

  /**
   * Check trust portal and privacy policy paths in parallel for faster scanning
   */
  private async checkPathsInParallel(
    baseUrl: URL,
    result: ComplianceIndicators,
  ): Promise<void> {
    // All paths to check
    const allPaths = [
      ...this.TRUST_PORTAL_PATHS.map((p) => ({ path: p, type: 'trust' as const })),
      ...this.PRIVACY_POLICY_PATHS.map((p) => ({ path: p, type: 'privacy' as const })),
    ];

    // Check all paths in parallel with overall timeout of 15 seconds
    const checkWithTimeout = async (): Promise<void> => {
      const checkPromises = allPaths.map(async ({ path, type }) => {
        try {
          const pathUrl = new URL(path, baseUrl);
          const content = await this.fetchPageContent(pathUrl);
          this.logger.debug(
            `Path ${path} returned ${content ? content.length : 0} chars`,
          );
          return { path, type, content };
        } catch (error) {
          this.logger.debug(`Path ${path} error: ${error.message}`);
          return { path, type, content: null };
        }
      });

      // Race all promises but with a deadline
      const results = await Promise.all(checkPromises);

      for (const res of results) {
        if (!res.content || res.content.length < 500) {
          this.logger.debug(`Path ${res.path} skipped (content too short)`);
          continue;
        }
        const contentLower = res.content.toLowerCase();

        if (res.type === 'trust' && !result.hasTrustPortal) {
          if (
            contentLower.includes('trust') ||
            contentLower.includes('security') ||
            contentLower.includes('compliance') ||
            contentLower.includes('soc') ||
            contentLower.includes('iso')
          ) {
            result.hasTrustPortal = true;
            result.trustPortalUrl = new URL(res.path, baseUrl).toString();
            this.logger.log(`Trust portal detected at ${result.trustPortalUrl}`);
            this.analyzePage(res.content, result);

            // Detect provider
            for (const provider of this.TRUST_PORTAL_PROVIDERS) {
              if (provider.pattern.test(res.content)) {
                result.trustPortalProvider = provider.name;
                break;
              }
            }
          }
        }

        if (res.type === 'privacy' && !result.hasPrivacyPolicy) {
          if (
            contentLower.includes('privacy policy') ||
            contentLower.includes('privacy notice') ||
            contentLower.includes('personal data') ||
            contentLower.includes('personal information') ||
            contentLower.includes('data protection')
          ) {
            result.hasPrivacyPolicy = true;
            result.privacyPolicyUrl = new URL(res.path, baseUrl).toString();
            this.logger.log(`Privacy policy detected at ${result.privacyPolicyUrl}`);
          }
        }
      }
    };

    // Apply overall timeout of 25 seconds for all path checks
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        this.logger.warn(`Path check timeout for ${baseUrl.hostname} - some paths may not have been checked`);
        resolve();
      }, 25000);
    });

    await Promise.race([checkWithTimeout(), timeoutPromise]);
  }

  private async checkBugBounty(baseUrl: URL, result: ComplianceIndicators): Promise<void> {
    const bugBountyPaths = [
      '/.well-known/security.txt',
      '/security.txt',
      '/bug-bounty',
      '/responsible-disclosure',
    ];

    for (const path of bugBountyPaths) {
      try {
        const bugBountyUrl = new URL(path, baseUrl);
        const content = await this.fetchPageContent(bugBountyUrl);
        if (content && content.length > 100) {
          result.hasBugBounty = true;
          result.bugBountyUrl = bugBountyUrl.toString();
          break;
        }
      } catch {
        // Path not accessible, continue
      }
    }
  }

  private async fetchPageContent(url: URL, redirectCount = 0): Promise<string | null> {
    // Limit redirects to prevent infinite loops
    if (redirectCount > 3) {
      return null;
    }

    return new Promise((resolve) => {
      const protocol = url.protocol === 'https:' ? https : http;
      let resolved = false;

      // Hard timeout - resolves null after 10 seconds regardless of request state
      // Allows for redirect chains (docker.com -> www.docker.com) and large pages
      const hardTimeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(null);
        }
      }, 10000);

      const req = protocol.request(
        {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname || '/',
          method: 'GET',
          timeout: 3000,
          headers: {
            'User-Agent': 'GigaChad-GRC Security Scanner/1.0',
            'Accept': 'text/html,application/xhtml+xml,text/plain',
          },
        },
        (res) => {
          // Follow redirects
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            try {
              const redirectUrl = new URL(res.headers.location, url);
              this.fetchPageContent(redirectUrl, redirectCount + 1).then((content) => {
                if (!resolved) {
                  resolved = true;
                  clearTimeout(hardTimeout);
                  resolve(content);
                }
              });
              return;
            } catch {
              if (!resolved) {
                resolved = true;
                clearTimeout(hardTimeout);
                resolve(null);
              }
              return;
            }
          }

          if (res.statusCode !== 200) {
            if (!resolved) {
              resolved = true;
              clearTimeout(hardTimeout);
              resolve(null);
            }
            return;
          }

          let body = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            // Only add if we haven't hit the limit yet
            if (body.length < 300000) {
              body += chunk;
            }
          });
          res.on('end', () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(hardTimeout);
              resolve(body);
            }
          });
        }
      );

      req.on('error', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(hardTimeout);
          resolve(null);
        }
      });
      req.on('timeout', () => {
        req.destroy();
        if (!resolved) {
          resolved = true;
          clearTimeout(hardTimeout);
          resolve(null);
        }
      });

      req.end();
    });
  }
}
