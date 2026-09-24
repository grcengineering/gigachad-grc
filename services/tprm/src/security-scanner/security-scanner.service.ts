import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { SSLCollector } from './collectors/ssl-collector';
import { HeadersCollector } from './collectors/headers-collector';
import { DNSCollector } from './collectors/dns-collector';
import { WebCollector } from './collectors/web-collector';
import { ComplianceCollector } from './collectors/compliance-collector';
import { SubdomainCollector } from './collectors/subdomain-collector';
import { RiskAnalyzer } from './analyzers/risk-analyzer';
import {
  SecurityScanResult,
  InitiateSecurityScanDto,
  scoreToRiskLevel,
  riskLevelToInherentScore,
} from './dto/security-scan.dto';
import { VendorAssessment, VendorRiskScore } from '@prisma/client';
import * as net from 'net';

// Private IP ranges for SSRF protection
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
      return ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd');
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

/**
 * Validates a URL for SSRF protection before scanning.
 * Blocks private IPs, localhost, and non-HTTP(S) protocols.
 */
function validateScanUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
  } catch {
    throw new BadRequestException('Invalid URL format');
  }

  // Block non-HTTP(S) protocols
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new BadRequestException('Only HTTP/HTTPS URLs are allowed for security scanning');
  }

  // Block localhost and private IPs
  const hostname = parsed.hostname.toLowerCase();

  // Check for localhost variations
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    throw new BadRequestException('Cannot scan localhost or loopback addresses');
  }

  // Check for direct IP addresses that are private
  if (net.isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      throw new BadRequestException('Cannot scan private/internal IP addresses');
    }
  }

  // Check for private IP ranges in hostname (for hostnames like 192.168.1.1.example.com)
  const privatePatterns = [
    /^192\.168\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^127\./,
    /^169\.254\./,
    /^0\./,
  ];

  for (const pattern of privatePatterns) {
    if (pattern.test(hostname)) {
      throw new BadRequestException('Cannot scan private/internal addresses');
    }
  }

  // Block internal cloud metadata endpoints
  const blockedHosts = [
    '169.254.169.254', // AWS/GCP/Azure metadata
    'metadata.google.internal',
    'metadata.goog',
    'kubernetes.default',
    'kubernetes.default.svc',
  ];

  if (blockedHosts.includes(hostname)) {
    throw new BadRequestException('Cannot scan cloud metadata or internal service endpoints');
  }
}

// Valid risk score values
const VALID_RISK_SCORES: VendorRiskScore[] = ['very_low', 'low', 'medium', 'high', 'critical'];

function toVendorRiskScore(value: string): VendorRiskScore {
  return VALID_RISK_SCORES.includes(value as VendorRiskScore)
    ? (value as VendorRiskScore)
    : 'medium';
}

// Interface for security scan findings stored in assessment
interface SecurityScanFindings {
  targetUrl: string;
  ssl: SecurityScanResult['ssl'];
  securityHeaders: SecurityScanResult['securityHeaders'];
  missingHeaders: SecurityScanResult['missingHeaders'];
  dns: SecurityScanResult['dns'];
  webPresence: SecurityScanResult['webPresence'];
  compliance: SecurityScanResult['compliance'];
  subdomains: SecurityScanResult['subdomains'];
  categoryScores: SecurityScanResult['categoryScores'];
  overallScore: number;
  riskLevel: SecurityScanResult['riskLevel'];
  findingsList: SecurityScanResult['findings'];
  keyRisks: SecurityScanResult['keyRisks'];
  recommendations: SecurityScanResult['recommendations'];
}

@Injectable()
export class SecurityScannerService {
  private readonly logger = new Logger(SecurityScannerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sslCollector: SSLCollector,
    private readonly headersCollector: HeadersCollector,
    private readonly dnsCollector: DNSCollector,
    private readonly webCollector: WebCollector,
    private readonly complianceCollector: ComplianceCollector,
    private readonly subdomainCollector: SubdomainCollector,
    private readonly riskAnalyzer: RiskAnalyzer
  ) {}

  /**
   * Initiate a security scan for a vendor
   */
  async initiateScan(
    vendorId: string,
    dto: InitiateSecurityScanDto,
    userId: string,
    organizationId: string
  ): Promise<SecurityScanResult> {
    this.logger.log(`Initiating security scan for vendor ${vendorId}`);

    // Get vendor and determine target URL
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, organizationId, deletedAt: null },
      select: { id: true, name: true, website: true, organizationId: true },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${vendorId} not found`);
    }

    const targetUrl = dto.targetUrl || vendor.website;
    if (!targetUrl) {
      throw new BadRequestException('No target URL provided and vendor has no website configured');
    }

    // SSRF Protection: Validate URL before scanning
    validateScanUrl(targetUrl);

    this.logger.log(`Scanning target: ${targetUrl}`);

    try {
      // Run all collectors in parallel with 90-second global timeout
      const collectWithTimeout = async () => {
        const [ssl, headersResult, dns, webPresence, compliance, subdomains] = await Promise.all([
          this.sslCollector.collect(targetUrl),
          this.headersCollector.collect(targetUrl),
          this.dnsCollector.collect(targetUrl),
          this.webCollector.collect(targetUrl),
          this.complianceCollector.collect(targetUrl),
          this.subdomainCollector.collect(targetUrl),
        ]);
        return { ssl, headersResult, dns, webPresence, compliance, subdomains };
      };

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Security scan timed out after 90 seconds'));
        }, 90000);
      });

      const { ssl, headersResult, dns, webPresence, compliance, subdomains } = await Promise.race([
        collectWithTimeout(),
        timeoutPromise,
      ]);

      const { headers: securityHeaders, missingHeaders } = headersResult;

      // Analyze collected data
      const analysis = this.riskAnalyzer.analyze({
        ssl,
        securityHeaders,
        missingHeaders,
        dns,
        webPresence,
        compliance,
        subdomains,
      });

      const riskLevel = scoreToRiskLevel(analysis.overallScore);

      // Store as VendorAssessment
      const assessment = await this.prisma.vendorAssessment.create({
        data: {
          vendorId,
          organizationId: vendor.organizationId,
          assessmentType: 'security_scan_osint',
          status: 'completed',
          completedAt: new Date(),
          inherentRiskScore: riskLevelToInherentScore(riskLevel),
          outcome: 'completed',
          outcomeNotes: analysis.summary,
          findings: JSON.stringify({
            targetUrl,
            ssl,
            securityHeaders,
            missingHeaders,
            dns,
            webPresence,
            compliance,
            subdomains,
            categoryScores: analysis.categoryScores,
            overallScore: analysis.overallScore,
            riskLevel,
            findingsList: analysis.findings,
            keyRisks: analysis.keyRisks,
            recommendations: analysis.recommendations,
          }),
          recommendations: analysis.recommendations.join('\n'),
          createdBy: userId,
        },
      });

      // Optionally update vendor's inherent risk score
      await this.prisma.vendor.update({
        where: { id: vendorId },
        data: {
          inherentRiskScore: toVendorRiskScore(riskLevelToInherentScore(riskLevel)),
        },
      });

      // Audit log
      await this.audit.log({
        organizationId: vendor.organizationId,
        userId,
        action: 'SECURITY_SCAN_COMPLETED',
        entityType: 'vendor_assessment',
        entityId: assessment.id,
        entityName: `${vendor.name} - Security Scan`,
        description: `Completed OSINT security scan for ${vendor.name}. Risk Level: ${riskLevel}`,
        metadata: {
          vendorId,
          vendorName: vendor.name,
          targetUrl,
          overallScore: analysis.overallScore,
          riskLevel,
          findingsCount: analysis.findings.length,
        },
      });

      const result: SecurityScanResult = {
        id: assessment.id,
        vendorId,
        targetUrl,
        scannedAt: new Date().toISOString(),
        status: 'completed',
        ssl,
        securityHeaders,
        missingHeaders,
        dns,
        webPresence,
        compliance,
        subdomains,
        categoryScores: analysis.categoryScores,
        overallScore: analysis.overallScore,
        riskLevel,
        findings: analysis.findings,
        summary: analysis.summary,
        keyRisks: analysis.keyRisks,
        recommendations: analysis.recommendations,
      };

      return result;
    } catch (error) {
      // Security: Log detailed error internally but store generic message in database
      this.logger.error(`Security scan failed for ${vendorId}: ${error.message}`, error.stack);

      // Sanitize error message to prevent storing sensitive internal details
      const sanitizedErrorMessage = this.sanitizeErrorMessage(error.message);

      // Store failed assessment with sanitized error
      const _assessment = await this.prisma.vendorAssessment.create({
        data: {
          vendorId,
          organizationId: vendor.organizationId,
          assessmentType: 'security_scan_osint',
          status: 'pending', // Failed scans are marked as pending for retry
          outcomeNotes: `Scan failed: ${sanitizedErrorMessage}`,
          createdBy: userId,
        },
      });

      throw error;
    }
  }

  /**
   * Get the latest security scan for a vendor
   */
  async getLatestScan(
    vendorId: string,
    organizationId: string
  ): Promise<SecurityScanResult | null> {
    const assessment = await this.prisma.vendorAssessment.findFirst({
      where: {
        vendorId,
        organizationId,
        vendor: { organizationId, deletedAt: null },
        assessmentType: 'security_scan_osint',
        status: 'completed',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!assessment) {
      return null;
    }

    return this.assessmentToScanResult(assessment);
  }

  /**
   * Get a specific security scan by ID
   */
  async getScanById(
    vendorId: string,
    scanId: string,
    organizationId: string
  ): Promise<SecurityScanResult | null> {
    const assessment = await this.prisma.vendorAssessment.findFirst({
      where: {
        id: scanId,
        vendorId,
        organizationId,
        vendor: { organizationId, deletedAt: null },
        assessmentType: 'security_scan_osint',
      },
    });

    if (!assessment) {
      return null;
    }

    return this.assessmentToScanResult(assessment);
  }

  /**
   * Get all security scans for a vendor
   */
  async getScanHistory(vendorId: string, organizationId: string): Promise<SecurityScanResult[]> {
    const assessments = await this.prisma.vendorAssessment.findMany({
      where: {
        vendorId,
        organizationId,
        vendor: { organizationId, deletedAt: null },
        assessmentType: 'security_scan_osint',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return assessments
      .map((a) => this.assessmentToScanResult(a))
      .filter((r): r is SecurityScanResult => r !== null);
  }

  async verifyVendorAccess(vendorId: string, organizationId: string): Promise<void> {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${vendorId} not found`);
    }
  }

  /**
   * Security: Sanitize error messages before storing in database
   * Removes potentially sensitive information like file paths, stack traces, and internal details
   */
  private sanitizeErrorMessage(message: string): string {
    if (!message) return 'An unexpected error occurred';

    // Known safe error messages that can be passed through
    const safePatterns = [
      /^Security scan timed out/i,
      /^No target URL provided/i,
      /^Vendor with ID .* not found$/i,
      /^Invalid URL format$/i,
      /^Only HTTP\/HTTPS URLs are allowed/i,
      /^Cannot scan localhost/i,
      /^Cannot scan private/i,
      /^Cannot scan cloud metadata/i,
    ];

    for (const pattern of safePatterns) {
      if (pattern.test(message)) {
        return message;
      }
    }

    // For other errors, return a generic message to avoid exposing internal details
    return 'Security scan encountered an error. Please try again or contact support.';
  }

  private assessmentToScanResult(assessment: VendorAssessment): SecurityScanResult | null {
    // Parse findings - handle both string and object cases
    let findings: SecurityScanFindings | null = null;
    if (assessment.findings) {
      if (typeof assessment.findings === 'string') {
        try {
          findings = JSON.parse(assessment.findings) as SecurityScanFindings;
        } catch {
          this.logger.warn(`Failed to parse findings JSON for assessment ${assessment.id}`);
          return null;
        }
      } else {
        findings = assessment.findings as unknown as SecurityScanFindings;
      }
    }

    if (!findings) {
      return null;
    }

    return {
      id: assessment.id,
      vendorId: assessment.vendorId,
      targetUrl: findings.targetUrl,
      scannedAt: assessment.completedAt?.toISOString() || assessment.createdAt.toISOString(),
      status: assessment.status === 'completed' ? 'completed' : 'failed',
      ssl: findings.ssl,
      securityHeaders: findings.securityHeaders,
      missingHeaders: findings.missingHeaders,
      dns: findings.dns,
      webPresence: findings.webPresence,
      compliance: findings.compliance,
      subdomains: findings.subdomains,
      categoryScores: findings.categoryScores,
      overallScore: findings.overallScore,
      riskLevel: findings.riskLevel,
      findings: findings.findingsList || [],
      summary: assessment.outcomeNotes || '',
      keyRisks: findings.keyRisks || [],
      recommendations: findings.recommendations || [],
    };
  }
}
