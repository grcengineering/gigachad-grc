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

// Valid risk score values
const VALID_RISK_SCORES: VendorRiskScore[] = ['very_low', 'low', 'medium', 'high', 'critical'];

function toVendorRiskScore(value: string): VendorRiskScore {
  return VALID_RISK_SCORES.includes(value as VendorRiskScore) ? value as VendorRiskScore : 'medium';
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
    private readonly riskAnalyzer: RiskAnalyzer,
  ) {}

  /**
   * Initiate a security scan for a vendor
   */
  async initiateScan(
    vendorId: string,
    dto: InitiateSecurityScanDto,
    userId: string,
  ): Promise<SecurityScanResult> {
    this.logger.log(`Initiating security scan for vendor ${vendorId}`);

    // Get vendor and determine target URL
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, name: true, website: true, organizationId: true },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${vendorId} not found`);
    }

    const targetUrl = dto.targetUrl || vendor.website;
    if (!targetUrl) {
      throw new BadRequestException(
        'No target URL provided and vendor has no website configured'
      );
    }

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
      this.logger.error(`Security scan failed for ${vendorId}: ${error.message}`, error.stack);
      
      // Store failed assessment
      const _assessment = await this.prisma.vendorAssessment.create({
        data: {
          vendorId,
          organizationId: vendor.organizationId,
          assessmentType: 'security_scan_osint',
          status: 'pending', // Failed scans are marked as pending for retry
          outcomeNotes: `Scan failed: ${error.message}`,
          createdBy: userId,
        },
      });

      throw error;
    }
  }

  /**
   * Get the latest security scan for a vendor
   */
  async getLatestScan(vendorId: string): Promise<SecurityScanResult | null> {
    const assessment = await this.prisma.vendorAssessment.findFirst({
      where: {
        vendorId,
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
  async getScanById(vendorId: string, scanId: string): Promise<SecurityScanResult | null> {
    const assessment = await this.prisma.vendorAssessment.findFirst({
      where: {
        id: scanId,
        vendorId,
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
  async getScanHistory(vendorId: string): Promise<SecurityScanResult[]> {
    const assessments = await this.prisma.vendorAssessment.findMany({
      where: {
        vendorId,
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
