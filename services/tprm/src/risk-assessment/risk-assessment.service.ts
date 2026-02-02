import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import {
  CreateRiskAssessmentDto,
  RiskAssessmentResult,
  LikelihoodResult,
  ImpactResult,
} from './dto/risk-assessment.dto';
import { VendorRiskScore } from '@prisma/client';

// Interface for parsed findings from VendorAssessment
interface RiskAssessmentFindings {
  title: string;
  description?: string;
  assessor: string;
  assetScore: number;
  threatScore: number;
  likelihood: LikelihoodResult;
  impact: ImpactResult;
  totalScore: number;
  riskLevel: RiskAssessmentResult['riskLevel'];
  recommendedAction: string;
  nextReviewDate?: string;
}

// Valid risk score values
const VALID_RISK_SCORES: VendorRiskScore[] = ['very_low', 'low', 'medium', 'high', 'critical'];

function toVendorRiskScore(value: string): VendorRiskScore {
  return VALID_RISK_SCORES.includes(value as VendorRiskScore) ? value as VendorRiskScore : 'medium';
}

// ============================================
// Risk Level Calculation Functions
// ============================================

function getLikelihoodLevel(total: number): LikelihoodResult['level'] {
  if (total >= 60) return 'Very High';
  if (total >= 45) return 'High';
  if (total >= 30) return 'Moderate';
  if (total >= 15) return 'Low';
  return 'Very Low';
}

function getLikelihoodScore(total: number): number {
  if (total >= 60) return 25;
  if (total >= 45) return 20;
  if (total >= 30) return 15;
  if (total >= 15) return 10;
  return 5;
}

function getImpactLevel(total: number): ImpactResult['level'] {
  if (total >= 25) return 'Very High';
  if (total >= 20) return 'High';
  if (total >= 15) return 'Moderate';
  if (total >= 10) return 'Low';
  return 'Very Low';
}

function getImpactScore(total: number): number {
  if (total >= 25) return 25;
  if (total >= 20) return 20;
  if (total >= 15) return 15;
  if (total >= 10) return 10;
  return 5;
}

function getRiskLevel(score: number): RiskAssessmentResult['riskLevel'] {
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Medium';
  if (score >= 20) return 'Low';
  return 'Minimal';
}

function getRecommendedAction(level: RiskAssessmentResult['riskLevel']): string {
  switch (level) {
    case 'Critical':
      return 'Immediate action required - escalate to leadership';
    case 'High':
      return 'Develop mitigation plan within 30 days';
    case 'Medium':
      return 'Address within quarterly planning';
    case 'Low':
      return 'Monitor and address as resources allow';
    default:
      return 'Accept or monitor only';
  }
}

function mapRiskLevelToInherentScore(level: RiskAssessmentResult['riskLevel']): string {
  switch (level) {
    case 'Critical':
      return 'critical';
    case 'High':
      return 'high';
    case 'Medium':
      return 'medium';
    case 'Low':
      return 'low';
    default:
      return 'low';
  }
}

// ============================================
// Risk Assessment Service
// ============================================

@Injectable()
export class RiskAssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Calculate and store a risk assessment for a vendor
   */
  async createAssessment(
    vendorId: string,
    dto: CreateRiskAssessmentDto,
    userId: string,
    organizationId: string,
  ): Promise<RiskAssessmentResult> {
    // SECURITY: Verify vendor exists AND belongs to user's organization
    const vendor = await this.prisma.vendor.findFirst({
      where: { 
        id: vendorId,
        organizationId, // Tenant isolation - prevents cross-organization access
      },
      select: { id: true, name: true, organizationId: true },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${vendorId} not found`);
    }

    // Calculate likelihood
    const likelihoodTotal = dto.likelihood.frequency + dto.likelihood.capability + dto.likelihood.controlStrength;
    const likelihoodResult: LikelihoodResult = {
      frequency: dto.likelihood.frequency,
      capability: dto.likelihood.capability,
      controlStrength: dto.likelihood.controlStrength,
      total: likelihoodTotal,
      level: getLikelihoodLevel(likelihoodTotal),
      score: getLikelihoodScore(likelihoodTotal),
    };

    // Calculate impact
    const impactTotal =
      dto.impact.productivity +
      dto.impact.response +
      dto.impact.recovery +
      dto.impact.competitive +
      dto.impact.legal +
      dto.impact.reputation;
    const impactResult: ImpactResult = {
      productivity: dto.impact.productivity,
      response: dto.impact.response,
      recovery: dto.impact.recovery,
      competitive: dto.impact.competitive,
      legal: dto.impact.legal,
      reputation: dto.impact.reputation,
      total: impactTotal,
      level: getImpactLevel(impactTotal),
      score: getImpactScore(impactTotal),
    };

    // Calculate total score and risk level
    const totalScore = dto.assetScore + dto.threatScore + likelihoodResult.score + impactResult.score;
    const riskLevel = getRiskLevel(totalScore);
    const recommendedAction = getRecommendedAction(riskLevel);

    // Calculate next review date (3 months from now)
    const nextReviewDate = new Date();
    nextReviewDate.setMonth(nextReviewDate.getMonth() + 3);

    // Store as VendorAssessment
    const assessment = await this.prisma.vendorAssessment.create({
      data: {
        vendorId,
        organizationId: vendor.organizationId,
        assessmentType: 'risk_assessment_wizard',
        status: 'completed',
        completedAt: new Date(),
        inherentRiskScore: mapRiskLevelToInherentScore(riskLevel),
        outcome: 'completed',
        outcomeNotes: `Risk Assessment completed by ${dto.assessor}. Risk Level: ${riskLevel}. ${recommendedAction}`,
        findings: JSON.parse(JSON.stringify({
          title: dto.title,
          description: dto.description,
          assessor: dto.assessor,
          assetScore: dto.assetScore,
          threatScore: dto.threatScore,
          likelihood: likelihoodResult,
          impact: impactResult,
          totalScore,
          riskLevel,
          recommendedAction,
          nextReviewDate: nextReviewDate.toISOString(),
        })),
        recommendations: recommendedAction,
        createdBy: userId,
      },
    });

    // Update vendor's inherent risk score
    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        inherentRiskScore: toVendorRiskScore(mapRiskLevelToInherentScore(riskLevel)),
      },
    });

    // Audit log
    await this.audit.log({
      organizationId: vendor.organizationId,
      userId,
      action: 'CREATE_RISK_ASSESSMENT',
      entityType: 'vendor_assessment',
      entityId: assessment.id,
      entityName: `${vendor.name} - Risk Assessment`,
      description: `Completed risk assessment wizard for ${vendor.name}. Risk Level: ${riskLevel}`,
      metadata: {
        vendorId,
        vendorName: vendor.name,
        totalScore,
        riskLevel,
        assessor: dto.assessor,
      },
    });

    return {
      id: assessment.id,
      vendorId,
      title: dto.title,
      description: dto.description,
      assessor: dto.assessor,
      date: new Date().toISOString().split('T')[0],
      assetScore: dto.assetScore,
      threatScore: dto.threatScore,
      likelihood: likelihoodResult,
      impact: impactResult,
      totalScore,
      riskLevel,
      recommendedAction,
      nextReviewDate: nextReviewDate.toISOString().split('T')[0],
    };
  }

  /**
   * Get the latest risk assessment for a vendor
   */
  async getLatestAssessment(vendorId: string, organizationId: string): Promise<RiskAssessmentResult | null> {
    // SECURITY: Include organizationId in query to prevent IDOR
    const assessment = await this.prisma.vendorAssessment.findFirst({
      where: {
        vendorId,
        organizationId, // Tenant isolation - prevents cross-organization access
        assessmentType: 'risk_assessment_wizard',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!assessment) {
      return null;
    }

    // Handle both old (stringified) and new (object) data formats
    let findings: RiskAssessmentFindings | null = null;
    if (!assessment.findings) {
      return null;
    }
    
    // If findings is a string (old double-serialized data), parse it
    if (typeof assessment.findings === 'string') {
      try {
        findings = JSON.parse(assessment.findings) as RiskAssessmentFindings;
      } catch {
        return null;
      }
    } else {
      findings = assessment.findings as unknown as RiskAssessmentFindings;
    }

    if (!findings) {
      return null;
    }

    return {
      id: assessment.id,
      vendorId,
      title: findings.title,
      description: findings.description,
      assessor: findings.assessor,
      date: assessment.completedAt?.toISOString().split('T')[0] || assessment.createdAt.toISOString().split('T')[0],
      assetScore: findings.assetScore,
      threatScore: findings.threatScore,
      likelihood: findings.likelihood,
      impact: findings.impact,
      totalScore: findings.totalScore,
      riskLevel: findings.riskLevel,
      recommendedAction: findings.recommendedAction,
      nextReviewDate: findings.nextReviewDate?.split('T')[0] || '',
    };
  }

  /**
   * Get all risk assessments for a vendor
   */
  async getAssessmentHistory(vendorId: string, organizationId: string): Promise<RiskAssessmentResult[]> {
    // SECURITY: Include organizationId in query to prevent IDOR
    const assessments = await this.prisma.vendorAssessment.findMany({
      where: {
        vendorId,
        organizationId, // Tenant isolation - prevents cross-organization access
        assessmentType: 'risk_assessment_wizard',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return assessments
      .map((assessment): RiskAssessmentResult | null => {
        // Handle both old (stringified) and new (object) data formats
        let findings: RiskAssessmentFindings | null = null;
        if (!assessment.findings) return null;
        
        // If findings is a string (old double-serialized data), parse it
        if (typeof assessment.findings === 'string') {
          try {
            findings = JSON.parse(assessment.findings) as RiskAssessmentFindings;
          } catch {
            return null;
          }
        } else {
          findings = assessment.findings as unknown as RiskAssessmentFindings;
        }

        if (!findings) return null;

        return {
          id: assessment.id,
          vendorId,
          title: findings.title,
          description: findings.description,
          assessor: findings.assessor,
          date: assessment.completedAt?.toISOString().split('T')[0] || assessment.createdAt.toISOString().split('T')[0],
          assetScore: findings.assetScore,
          threatScore: findings.threatScore,
          likelihood: findings.likelihood,
          impact: findings.impact,
          totalScore: findings.totalScore,
          riskLevel: findings.riskLevel,
          recommendedAction: findings.recommendedAction,
          nextReviewDate: findings.nextReviewDate?.split('T')[0] || '',
        };
      })
      .filter((a): a is RiskAssessmentResult => a !== null);
  }
}
