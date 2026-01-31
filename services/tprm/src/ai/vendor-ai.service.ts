import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { VendorDocument, Vendor, VendorAssessment } from '@prisma/client';

// Type for vendor document with vendor relation
interface VendorDocumentWithVendor extends VendorDocument {
  vendor: Pick<Vendor, 'id' | 'name' | 'organizationId'>;
}

// Type for AI service response
interface AIServiceResponse {
  reportPeriod?: { startDate: string; endDate: string };
  serviceOrganization?: string;
  auditor?: string;
  opinionType?: string;
  exceptions?: SOC2Exception[];
  cuecs?: CUEC[];
  subserviceOrganizations?: SubserviceOrg[];
  controlGaps?: ControlGap[];
  suggestedRiskScore?: string;
  summary?: string;
  confidence?: number;
}

// ============================================
// Types for SOC 2 Analysis
// ============================================

export interface SOC2Exception {
  controlId: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  managementResponse?: string;
}

export interface CUEC {
  description: string;
  responsibility: string;
  status: 'implemented' | 'not_implemented' | 'unknown';
}

export interface SubserviceOrg {
  name: string;
  services: string;
  carveOutOrInclusiveMethod: string;
}

export interface ControlGap {
  area: string;
  description: string;
  recommendation: string;
  priority: 'low' | 'medium' | 'high';
}

export interface SOC2AnalysisResult {
  documentId: string;
  vendorId: string;
  analyzedAt: string;
  reportPeriod?: {
    startDate: string;
    endDate: string;
  };
  serviceOrganization?: string;
  auditor?: string;
  opinionType?: string;
  exceptions: SOC2Exception[];
  cuecs: CUEC[];
  subserviceOrganizations: SubserviceOrg[];
  controlGaps: ControlGap[];
  suggestedRiskScore: string;
  summary: string;
  confidence: number;
  // Mock mode indicators
  isMockMode?: boolean;
  mockModeReason?: string;
}

// ============================================
// Vendor AI Service
// ============================================

@Injectable()
export class VendorAIService {
  private readonly logger = new Logger(VendorAIService.name);
  private readonly aiServiceUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {
    // URL of the main controls service AI endpoint
    this.aiServiceUrl = process.env.CONTROLS_SERVICE_URL || 'http://localhost:3001';
  }

  /**
   * Analyze a SOC 2 report document using AI
   */
  async analyzeSOC2Report(
    vendorId: string,
    documentId: string,
    userId: string,
    organizationId: string,
  ): Promise<SOC2AnalysisResult> {
    this.logger.log(`Analyzing SOC 2 report for vendor ${vendorId}, document ${documentId}`);

    // Get the vendor document
    const document = await this.prisma.vendorDocument.findFirst({
      where: {
        id: documentId,
        vendorId,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            organizationId: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found for vendor ${vendorId}`);
    }

    // Check if it's a SOC 2 document type
    if (!document.documentType.toLowerCase().includes('soc2') && 
        !document.documentType.toLowerCase().includes('soc 2')) {
      throw new BadRequestException('Document is not a SOC 2 report');
    }

    // Build the AI prompt for SOC 2 analysis
    const analysisPrompt = this.buildSOC2AnalysisPrompt(document);

    try {
      // Call the AI service for analysis
      const aiResponse = await this.callAIService(analysisPrompt, organizationId);
      
      // Parse and structure the response
      const analysisResult = this.parseAIResponse(aiResponse, documentId, vendorId);

      // Store the analysis result
      await this.storeAnalysisResult(document.id, analysisResult, userId);

      // Log the audit event
      await this.audit.log({
        organizationId: document.vendor.organizationId,
        userId,
        action: 'AI_ANALYZE_SOC2_REPORT',
        entityType: 'vendor_document',
        entityId: document.id,
        entityName: document.title,
        description: `AI analysis completed for SOC 2 report: ${document.title}`,
        metadata: {
          vendorId,
          vendorName: document.vendor.name,
          exceptionsFound: analysisResult.exceptions.length,
          suggestedRiskScore: analysisResult.suggestedRiskScore,
        },
      });

      return analysisResult;
    } catch (error) {
      this.logger.error(`Failed to analyze SOC 2 report: ${error.message}`, error.stack);
      
      // Return mock analysis for demo/testing
      if (process.env.AI_MOCK_MODE === 'true' || !process.env.OPENAI_API_KEY) {
        return this.generateMockAnalysis(documentId, vendorId, document.title);
      }
      
      throw error;
    }
  }

  /**
   * Build the AI prompt for SOC 2 analysis
   */
  private buildSOC2AnalysisPrompt(document: VendorDocumentWithVendor): string {
    return `You are a SOC 2 Type II report analyst. Analyze the following SOC 2 report and extract key information.

Document Title: ${document.title}
Document Type: ${document.documentType}
${document.description ? `Description: ${document.description}` : ''}

Please analyze this SOC 2 Type II report and provide:

1. **Report Period**: Start and end dates of the audit period
2. **Service Organization**: Name of the audited organization
3. **Auditor**: Name of the auditing firm
4. **Opinion Type**: Unqualified, Qualified, Adverse, or Disclaimer
5. **Exceptions**: List any control exceptions or deviations found, with:
   - Control ID/area
   - Description of the exception
   - Severity (low, medium, high, critical)
   - Category (Security, Availability, Confidentiality, Processing Integrity, Privacy)
   - Management response if available
6. **CUECs**: Complementary User Entity Controls that need to be implemented
7. **Subservice Organizations**: Any subservice organizations mentioned and whether carved out or inclusive
8. **Control Gaps**: Any areas where controls may be insufficient
9. **Risk Assessment**: Overall suggested risk score (low, medium, high, critical) based on findings
10. **Summary**: A brief executive summary of the report findings

Respond in JSON format with this structure:
{
  "reportPeriod": { "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD" },
  "serviceOrganization": "string",
  "auditor": "string",
  "opinionType": "string",
  "exceptions": [{ "controlId": "string", "description": "string", "severity": "low|medium|high|critical", "category": "string", "managementResponse": "string" }],
  "cuecs": [{ "description": "string", "responsibility": "string", "status": "implemented|not_implemented|unknown" }],
  "subserviceOrganizations": [{ "name": "string", "services": "string", "carveOutOrInclusiveMethod": "carve_out|inclusive" }],
  "controlGaps": [{ "area": "string", "description": "string", "recommendation": "string", "priority": "low|medium|high" }],
  "suggestedRiskScore": "low|medium|high|critical",
  "summary": "string",
  "confidence": 0-100
}`;
  }

  /**
   * Call the AI service for analysis
   */
  private async callAIService(prompt: string, organizationId: string): Promise<AIServiceResponse | null> {
    // Try to call the controls service AI endpoint using native fetch
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const response = await fetch(
        `${this.aiServiceUrl}/api/ai/analyze`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            organizationId,
            type: 'soc2_analysis',
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`);
      }

      return await response.json() as AIServiceResponse;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`AI service call failed, using mock mode: ${message}`);
      return null;
    }
  }

  /**
   * Parse the AI response into structured format
   */
  private parseAIResponse(
    aiResponse: AIServiceResponse | string | null,
    documentId: string,
    vendorId: string,
  ): SOC2AnalysisResult {
    if (!aiResponse) {
      return this.generateMockAnalysis(documentId, vendorId, 'SOC 2 Report');
    }

    try {
      const parsed: AIServiceResponse = typeof aiResponse === 'string' ? JSON.parse(aiResponse) : aiResponse;
      
      return {
        documentId,
        vendorId,
        analyzedAt: new Date().toISOString(),
        reportPeriod: parsed.reportPeriod,
        serviceOrganization: parsed.serviceOrganization,
        auditor: parsed.auditor,
        opinionType: parsed.opinionType,
        exceptions: parsed.exceptions || [],
        cuecs: parsed.cuecs || [],
        subserviceOrganizations: parsed.subserviceOrganizations || [],
        controlGaps: parsed.controlGaps || [],
        suggestedRiskScore: parsed.suggestedRiskScore || 'medium',
        summary: parsed.summary || 'Analysis completed',
        confidence: parsed.confidence || 75,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to parse AI response: ${message}`);
      return this.generateMockAnalysis(documentId, vendorId, 'SOC 2 Report');
    }
  }

  /**
   * Generate mock analysis for demo/testing purposes
   */
  private generateMockAnalysis(
    documentId: string,
    vendorId: string,
    documentTitle: string,
  ): SOC2AnalysisResult {
    this.logger.warn(`Generating mock SOC 2 analysis for document ${documentId} - AI service not configured`);
    
    const now = new Date();
    const startDate = new Date(now);
    startDate.setFullYear(startDate.getFullYear() - 1);

    // Determine mock mode reason
    const mockReason = !process.env.OPENAI_API_KEY 
      ? 'AI service not configured - set OPENAI_API_KEY environment variable'
      : process.env.AI_MOCK_MODE === 'true'
        ? 'AI_MOCK_MODE is enabled'
        : 'AI service call failed - using demo data';

    return {
      documentId,
      vendorId,
      analyzedAt: now.toISOString(),
      reportPeriod: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
      },
      serviceOrganization: 'Vendor Organization (Demo)',
      auditor: 'Sample Audit Firm LLP (Demo)',
      opinionType: 'Unqualified',
      exceptions: [
        {
          controlId: 'CC6.1',
          description: '[DEMO] Access review process was not consistently performed on a quarterly basis during the audit period.',
          severity: 'medium',
          category: 'Security',
          managementResponse: 'Management has implemented automated quarterly access review reminders and assigned dedicated ownership.',
        },
        {
          controlId: 'CC7.2',
          description: '[DEMO] Change management documentation was incomplete for 2 of 25 sampled changes.',
          severity: 'low',
          category: 'Security',
          managementResponse: 'Enhanced change management checklist has been implemented.',
        },
      ],
      cuecs: [
        {
          description: '[DEMO] User access permissions should be reviewed and approved by the User Entity prior to granting access.',
          responsibility: 'User Entity',
          status: 'unknown',
        },
        {
          description: '[DEMO] User Entity is responsible for the security of credentials used to access the service.',
          responsibility: 'User Entity',
          status: 'unknown',
        },
        {
          description: '[DEMO] User Entity should maintain appropriate network security controls for accessing the service.',
          responsibility: 'User Entity',
          status: 'unknown',
        },
      ],
      subserviceOrganizations: [
        {
          name: 'Amazon Web Services (AWS) (Demo)',
          services: 'Cloud Infrastructure',
          carveOutOrInclusiveMethod: 'carve_out',
        },
      ],
      controlGaps: [
        {
          area: 'Access Management',
          description: '[DEMO] Quarterly access reviews could benefit from automation to ensure consistency.',
          recommendation: 'Implement automated access review workflows with approval tracking.',
          priority: 'medium',
        },
      ],
      suggestedRiskScore: 'low',
      summary: `[DEMO MODE] Analysis of ${documentTitle}: This is sample data because the AI service is not configured. The demo shows a SOC 2 Type II report with an unqualified opinion and two minor exceptions. Configure OPENAI_API_KEY for real AI-powered analysis.`,
      confidence: 50, // Lower confidence for mock data
      isMockMode: true,
      mockModeReason: mockReason,
    };
  }

  /**
   * Store the analysis result for future reference
   */
  private async storeAnalysisResult(
    documentId: string,
    result: SOC2AnalysisResult,
    userId: string,
  ): Promise<void> {
    // Update the document with the analysis result
    await this.prisma.vendorDocument.update({
      where: { id: documentId },
      data: {
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewStatus: 'approved',
        reviewNotes: JSON.stringify({
          aiAnalysis: result,
          analyzedAt: result.analyzedAt,
        }),
      },
    });
  }

  /**
   * Get previous analysis for a document
   */
  async getPreviousAnalysis(documentId: string): Promise<SOC2AnalysisResult | null> {
    const document = await this.prisma.vendorDocument.findUnique({
      where: { id: documentId },
      select: { reviewNotes: true },
    });

    if (!document?.reviewNotes) return null;

    try {
      const notes = JSON.parse(document.reviewNotes);
      return notes.aiAnalysis || null;
    } catch {
      return null;
    }
  }

  /**
   * Create an assessment from AI analysis
   */
  async createAssessmentFromAnalysis(
    vendorId: string,
    analysis: SOC2AnalysisResult,
    userId: string,
    organizationId: string,
  ): Promise<VendorAssessment> {
    // Get vendor name for audit log
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { name: true },
    });

    // Create a new vendor assessment based on the AI analysis
    const assessment = await this.prisma.vendorAssessment.create({
      data: {
        vendorId,
        organizationId,
        assessmentType: 'soc2_review',
        status: 'completed',
        completedAt: new Date(),
        inherentRiskScore: analysis.suggestedRiskScore,
        outcome: analysis.exceptions.length === 0 ? 'approved' : 'approved_with_conditions',
        outcomeNotes: analysis.summary,
        findings: JSON.parse(JSON.stringify({
          exceptions: analysis.exceptions,
          cuecs: analysis.cuecs,
          controlGaps: analysis.controlGaps,
          aiGenerated: true,
          sourceDocumentId: analysis.documentId,
        })),
        recommendations: analysis.controlGaps
          .map((g) => `${g.area}: ${g.recommendation}`)
          .join('\n'),
        createdBy: userId,
      },
    });

    // Log audit event
    await this.audit.log({
      organizationId,
      userId,
      action: 'CREATE_ASSESSMENT_FROM_AI',
      entityType: 'assessment',
      entityId: assessment.id,
      entityName: `${vendor?.name || 'Unknown'} - SOC 2 Review`,
      description: `Created assessment from AI analysis of SOC 2 report`,
      metadata: {
        vendorId,
        sourceDocumentId: analysis.documentId,
        exceptionsCount: analysis.exceptions.length,
        riskScore: analysis.suggestedRiskScore,
      },
    });

    return assessment;
  }
}

