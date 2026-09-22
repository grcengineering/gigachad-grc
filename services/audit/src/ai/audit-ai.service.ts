import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import {
  CategorizeFindingDto,
  FindingCategorizationResult,
  AnalyzeGapsDto,
  GapAnalysisResult,
  EvidenceGap,
  SuggestRemediationDto,
  RemediationSuggestion,
  RemediationStep,
  MapControlsDto,
  ControlMappingResult,
  ControlMapping,
  GenerateSummaryDto,
  AuditSummary,
} from './dto/audit-ai.dto';

@Injectable()
export class AuditAIService {
  private readonly logger = new Logger(AuditAIService.name);
  private readonly controlsServiceUrl = process.env.CONTROLS_SERVICE_URL || 'http://localhost:3001';

  constructor(private readonly prisma: PrismaService) {}

  // ===========================================
  // Finding Categorization
  // ===========================================

  async categorizeFinding(
    organizationId: string,
    dto: CategorizeFindingDto,
    _userId: string
  ): Promise<FindingCategorizationResult> {
    this.logger.log(`Categorizing finding for org ${organizationId}`);

    const prompt = this.buildCategorizationPrompt(dto);

    try {
      const aiResponse = await this.callAIService(prompt, organizationId);
      return this.parseCategorizationResponse(aiResponse);
    } catch (error) {
      if (!this.isExplicitDemoMode()) {
        throw new ServiceUnavailableException(`AI categorization failed: ${error.message}`);
      }
      this.logger.warn(`AI categorization failed, using fallback: ${error.message}`);
      return this.generateMockCategorization(dto);
    }
  }

  private buildCategorizationPrompt(dto: CategorizeFindingDto): string {
    return `You are a GRC expert analyzing audit findings. Categorize the following finding:

Title: ${dto.title}
Description: ${dto.description}
${dto.context ? `Context: ${dto.context}` : ''}
${dto.framework ? `Framework: ${dto.framework}` : ''}

Provide categorization in the following JSON format:
{
  "severity": "critical|high|medium|low|observation",
  "category": "control_deficiency|documentation_gap|process_issue|compliance_gap|technical_vulnerability|configuration_issue",
  "subcategory": "specific subcategory",
  "controlDomain": "access_control|change_management|data_protection|monitoring|incident_response|...",
  "relatedFrameworks": ["SOC2 CC6.1", "ISO 27001 A.9"],
  "suggestedTags": ["tag1", "tag2"],
  "confidence": 85,
  "reasoning": "Brief explanation of categorization"
}`;
  }

  private parseCategorizationResponse(response: string): FindingCategorizationResult {
    try {
      const parsed = JSON.parse(response);
      return {
        severity: parsed.severity || 'medium',
        category: parsed.category || 'control_deficiency',
        subcategory: parsed.subcategory || '',
        controlDomain: parsed.controlDomain || 'general',
        relatedFrameworks: parsed.relatedFrameworks || [],
        suggestedTags: parsed.suggestedTags || [],
        confidence: parsed.confidence || 70,
        reasoning: parsed.reasoning || 'AI categorization based on finding details',
      };
    } catch {
      throw new BadRequestException('Failed to parse AI response');
    }
  }

  private generateMockCategorization(dto: CategorizeFindingDto): FindingCategorizationResult {
    // Keyword-based mock categorization
    const lowerDesc = dto.description.toLowerCase();

    let severity = 'medium';
    let category = 'control_deficiency';
    let controlDomain = 'general';

    if (
      lowerDesc.includes('critical') ||
      lowerDesc.includes('severe') ||
      lowerDesc.includes('breach')
    ) {
      severity = 'critical';
    } else if (lowerDesc.includes('high risk') || lowerDesc.includes('significant')) {
      severity = 'high';
    } else if (lowerDesc.includes('minor') || lowerDesc.includes('observation')) {
      severity = 'low';
    }

    if (
      lowerDesc.includes('access') ||
      lowerDesc.includes('authentication') ||
      lowerDesc.includes('authorization')
    ) {
      controlDomain = 'access_control';
      category = 'control_deficiency';
    } else if (
      lowerDesc.includes('document') ||
      lowerDesc.includes('policy') ||
      lowerDesc.includes('procedure')
    ) {
      controlDomain = 'documentation';
      category = 'documentation_gap';
    } else if (
      lowerDesc.includes('change') ||
      lowerDesc.includes('deployment') ||
      lowerDesc.includes('release')
    ) {
      controlDomain = 'change_management';
    } else if (
      lowerDesc.includes('encrypt') ||
      lowerDesc.includes('data protection') ||
      lowerDesc.includes('pii')
    ) {
      controlDomain = 'data_protection';
    }

    return {
      severity,
      category,
      subcategory: `${controlDomain}_issue`,
      controlDomain,
      relatedFrameworks: dto.framework ? [`${dto.framework} related`] : ['General security'],
      suggestedTags: [controlDomain, severity, 'audit-finding'],
      confidence: 65,
      reasoning: 'Categorization based on keyword analysis (AI service unavailable)',
    };
  }

  // ===========================================
  // Evidence Gap Analysis
  // ===========================================

  async analyzeGaps(
    organizationId: string,
    dto: AnalyzeGapsDto,
    _userId: string
  ): Promise<GapAnalysisResult> {
    this.logger.log(`Analyzing evidence gaps for audit ${dto.auditId}`);

    // Fetch audit with related data
    const audit = await this.prisma.audit.findFirst({
      where: { id: dto.auditId, organizationId },
      include: {
        requests: {
          include: {
            evidence: true,
          },
        },
        evidence: true,
        testResults: true,
      },
    });

    if (!audit) {
      throw new NotFoundException(`Audit ${dto.auditId} not found`);
    }

    // Analyze gaps
    const gaps: EvidenceGap[] = [];
    const now = new Date();

    // Check each request for missing/stale evidence
    for (const request of audit.requests) {
      if (request.status === 'open' || request.status === 'in_progress') {
        const hasEvidence = request.evidence && request.evidence.length > 0;

        if (!hasEvidence) {
          gaps.push({
            controlId: request.controlId || 'N/A',
            controlTitle: request.title,
            gapType: 'missing',
            description: `No evidence submitted for request: ${request.title}`,
            priority: request.priority || 'medium',
            suggestedEvidence: this.getSuggestedEvidence(request.category),
            daysOverdue: request.dueDate
              ? Math.max(
                  0,
                  Math.floor(
                    (now.getTime() - new Date(request.dueDate).getTime()) / (1000 * 60 * 60 * 24)
                  )
                )
              : undefined,
          });
        } else {
          // Check for stale evidence (older than 90 days)
          const latestEvidence = request.evidence.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];

          const daysSinceEvidence = Math.floor(
            (now.getTime() - new Date(latestEvidence.createdAt).getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysSinceEvidence > 90) {
            gaps.push({
              controlId: request.controlId || 'N/A',
              controlTitle: request.title,
              gapType: 'stale',
              description: `Evidence is ${daysSinceEvidence} days old and may need refresh`,
              priority: 'low',
              suggestedEvidence: [
                'Updated documentation',
                'Recent screenshots',
                'Current configuration exports',
              ],
            });
          }
        }
      }
    }

    const totalControls = audit.requests.length;
    const controlsWithEvidence = audit.requests.filter(
      (r) => r.evidence && r.evidence.length > 0
    ).length;
    const controlsWithGaps = gaps.length;

    return {
      auditId: dto.auditId,
      totalControls,
      controlsWithEvidence,
      controlsWithGaps,
      overallCoverage:
        totalControls > 0 ? Math.round((controlsWithEvidence / totalControls) * 100) : 0,
      gaps,
      recommendations: this.generateGapRecommendations(gaps),
      analyzedAt: now,
    };
  }

  private getSuggestedEvidence(category: string): string[] {
    const suggestions: Record<string, string[]> = {
      policy: ['Policy document PDF', 'Version control history', 'Approval records'],
      evidence: ['Screenshots', 'System exports', 'Log files', 'Configuration files'],
      control_documentation: ['Control description', 'Implementation details', 'Test results'],
      interview: ['Meeting notes', 'Interview transcript', 'Signed attestation'],
      access: ['Access review reports', 'User listing', 'Permission matrix'],
      walkthrough: ['Process flow documentation', 'Screenshots of process', 'Observation notes'],
    };
    return suggestions[category] || ['Supporting documentation', 'Screenshots', 'Reports'];
  }

  private generateGapRecommendations(gaps: EvidenceGap[]): string[] {
    const recommendations: string[] = [];

    const criticalGaps = gaps.filter((g) => g.priority === 'critical' || g.priority === 'high');
    if (criticalGaps.length > 0) {
      recommendations.push(
        `Prioritize ${criticalGaps.length} high/critical priority evidence requests immediately`
      );
    }

    const overdueGaps = gaps.filter((g) => g.daysOverdue && g.daysOverdue > 0);
    if (overdueGaps.length > 0) {
      recommendations.push(`Address ${overdueGaps.length} overdue requests to meet audit timeline`);
    }

    const staleGaps = gaps.filter((g) => g.gapType === 'stale');
    if (staleGaps.length > 0) {
      recommendations.push(
        `Refresh ${staleGaps.length} stale evidence items to ensure current state documentation`
      );
    }

    if (gaps.length === 0) {
      recommendations.push('Evidence coverage is complete. Proceed with review and validation.');
    }

    return recommendations;
  }

  // ===========================================
  // Remediation Suggestions
  // ===========================================

  async suggestRemediation(
    organizationId: string,
    dto: SuggestRemediationDto,
    _userId: string
  ): Promise<RemediationSuggestion> {
    this.logger.log(`Generating remediation suggestions for finding ${dto.findingId}`);

    let findingDetails = dto.findingDetails;

    if (!findingDetails) {
      const finding = await this.prisma.auditFinding.findFirst({
        where: { id: dto.findingId, organizationId },
      });

      if (!finding) {
        throw new NotFoundException(`Finding ${dto.findingId} not found`);
      }

      findingDetails = {
        title: finding.title,
        description: finding.description,
        severity: finding.severity,
        category: finding.category,
        controlId: finding.controlId || undefined,
      };
    }

    const prompt = this.buildRemediationPrompt(findingDetails);

    try {
      const aiResponse = await this.callAIService(prompt, organizationId);
      return this.parseRemediationResponse(dto.findingId, aiResponse);
    } catch (error) {
      if (!this.isExplicitDemoMode()) {
        throw new ServiceUnavailableException(`AI remediation failed: ${error.message}`);
      }
      this.logger.warn(`AI remediation failed, using fallback: ${error.message}`);
      return this.generateMockRemediation(dto.findingId, findingDetails);
    }
  }

  private buildRemediationPrompt(finding: {
    title: string;
    description: string;
    severity: string;
    category: string;
    controlId?: string;
  }): string {
    return `You are a GRC expert creating a remediation plan. Generate a detailed remediation plan for:

Finding: ${finding.title}
Description: ${finding.description}
Severity: ${finding.severity}
Category: ${finding.category}
${finding.controlId ? `Related Control: ${finding.controlId}` : ''}

Provide a remediation plan in JSON format:
{
  "summary": "Brief summary of remediation approach",
  "rootCauseAnalysis": "Analysis of why this issue exists",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Step title",
      "description": "Detailed description",
      "estimatedDays": 5,
      "resources": ["Resource 1", "Resource 2"],
      "deliverables": ["Deliverable 1"]
    }
  ],
  "totalEstimatedDays": 30,
  "priority": "high|medium|low",
  "riskIfNotRemediated": "Description of risk",
  "relatedControls": ["AC-001", "AC-002"],
  "industryBestPractices": ["Best practice 1", "Best practice 2"],
  "confidence": 85
}`;
  }

  private parseRemediationResponse(findingId: string, response: string): RemediationSuggestion {
    try {
      const parsed = JSON.parse(response);
      return {
        findingId,
        summary: parsed.summary || 'Remediation plan generated',
        rootCauseAnalysis: parsed.rootCauseAnalysis || 'Root cause analysis pending',
        steps: (parsed.steps || []).map((s: RemediationStep, i: number) => ({
          stepNumber: s.stepNumber || i + 1,
          title: s.title || `Step ${i + 1}`,
          description: s.description || '',
          estimatedDays: s.estimatedDays || 7,
          resources: s.resources || [],
          deliverables: s.deliverables || [],
        })),
        totalEstimatedDays: parsed.totalEstimatedDays || 30,
        priority: parsed.priority || 'medium',
        riskIfNotRemediated: parsed.riskIfNotRemediated || 'Continued non-compliance',
        relatedControls: parsed.relatedControls || [],
        industryBestPractices: parsed.industryBestPractices || [],
        confidence: parsed.confidence || 70,
      };
    } catch {
      throw new BadRequestException('Failed to parse AI response');
    }
  }

  private generateMockRemediation(
    findingId: string,
    finding: { title: string; description: string; severity: string; category: string }
  ): RemediationSuggestion {
    const steps: RemediationStep[] = [
      {
        stepNumber: 1,
        title: 'Initial Assessment',
        description:
          'Conduct detailed assessment of the finding and identify affected systems/processes',
        estimatedDays: 3,
        resources: ['Security Team', 'Process Owner'],
        deliverables: ['Assessment Report'],
      },
      {
        stepNumber: 2,
        title: 'Develop Remediation Plan',
        description: 'Create detailed plan with specific actions, timelines, and responsibilities',
        estimatedDays: 5,
        resources: ['Project Manager', 'Technical Lead'],
        deliverables: ['Remediation Plan Document'],
      },
      {
        stepNumber: 3,
        title: 'Implement Controls',
        description: 'Implement the required controls or process changes',
        estimatedDays: 14,
        resources: ['Development Team', 'IT Operations'],
        deliverables: ['Implementation Evidence', 'Configuration Changes'],
      },
      {
        stepNumber: 4,
        title: 'Testing & Validation',
        description: 'Test the implemented controls and validate effectiveness',
        estimatedDays: 5,
        resources: ['QA Team', 'Internal Audit'],
        deliverables: ['Test Results', 'Validation Report'],
      },
      {
        stepNumber: 5,
        title: 'Documentation & Closure',
        description: 'Update documentation and formally close the finding',
        estimatedDays: 3,
        resources: ['Documentation Team', 'Compliance Officer'],
        deliverables: ['Updated Policies', 'Closure Evidence'],
      },
    ];

    const priorityMap: Record<string, string> = {
      critical: 'critical',
      high: 'high',
      medium: 'medium',
      low: 'low',
    };

    return {
      findingId,
      summary: `Remediation plan for ${finding.category} finding: ${finding.title}`,
      rootCauseAnalysis: 'Root cause analysis to be determined during initial assessment phase',
      steps,
      totalEstimatedDays: 30,
      priority: priorityMap[finding.severity] || 'medium',
      riskIfNotRemediated: `Continued exposure to ${finding.category} issue may result in compliance gaps and potential security incidents`,
      relatedControls: [],
      industryBestPractices: [
        'Implement defense in depth',
        'Follow least privilege principle',
        'Maintain comprehensive documentation',
        'Conduct regular reviews',
      ],
      confidence: 60,
    };
  }

  // ===========================================
  // Control Mapping
  // ===========================================

  async mapControls(
    organizationId: string,
    dto: MapControlsDto,
    _userId: string
  ): Promise<ControlMappingResult> {
    this.logger.log(`Mapping controls for request in org ${organizationId}`);

    const prompt = this.buildControlMappingPrompt(dto);

    try {
      const aiResponse = await this.callAIService(prompt, organizationId);
      return this.parseControlMappingResponse(aiResponse);
    } catch (error) {
      if (!this.isExplicitDemoMode()) {
        throw new ServiceUnavailableException(`AI control mapping failed: ${error.message}`);
      }
      this.logger.warn(`AI control mapping failed, using fallback: ${error.message}`);
      return this.generateMockControlMapping(dto);
    }
  }

  private buildControlMappingPrompt(dto: MapControlsDto): string {
    return `You are a GRC expert mapping audit requests to controls. Map the following request:

Request Title: ${dto.requestTitle}
Request Description: ${dto.requestDescription}
${dto.framework ? `Framework: ${dto.framework}` : ''}

Suggest relevant controls in JSON format:
{
  "mappings": [
    {
      "controlId": "AC-001",
      "controlTitle": "Access Control Policy",
      "relevanceScore": 95,
      "mappingRationale": "Why this control is relevant",
      "frameworkRequirements": ["SOC2 CC6.1", "ISO 27001 A.9.1.1"]
    }
  ],
  "confidence": 85,
  "suggestedCategory": "access_control"
}`;
  }

  private parseControlMappingResponse(response: string): ControlMappingResult {
    try {
      const parsed = JSON.parse(response);
      return {
        mappings: (parsed.mappings || []).map((m: ControlMapping) => ({
          controlId: m.controlId || '',
          controlTitle: m.controlTitle || '',
          relevanceScore: m.relevanceScore || 50,
          mappingRationale: m.mappingRationale || '',
          frameworkRequirements: m.frameworkRequirements || [],
        })),
        confidence: parsed.confidence || 70,
        suggestedCategory: parsed.suggestedCategory || 'general',
      };
    } catch {
      throw new BadRequestException('Failed to parse AI response');
    }
  }

  private generateMockControlMapping(dto: MapControlsDto): ControlMappingResult {
    const lowerDesc = dto.requestDescription.toLowerCase();
    const mappings: ControlMapping[] = [];

    if (
      lowerDesc.includes('access') ||
      lowerDesc.includes('user') ||
      lowerDesc.includes('authentication')
    ) {
      mappings.push({
        controlId: 'AC-001',
        controlTitle: 'Access Control Policy',
        relevanceScore: 90,
        mappingRationale: 'Request relates to access management',
        frameworkRequirements: ['SOC2 CC6.1', 'ISO 27001 A.9.1.1'],
      });
    }

    if (
      lowerDesc.includes('change') ||
      lowerDesc.includes('deploy') ||
      lowerDesc.includes('release')
    ) {
      mappings.push({
        controlId: 'CM-001',
        controlTitle: 'Change Management',
        relevanceScore: 85,
        mappingRationale: 'Request relates to change control processes',
        frameworkRequirements: ['SOC2 CC8.1', 'ISO 27001 A.12.1.2'],
      });
    }

    if (
      lowerDesc.includes('encrypt') ||
      lowerDesc.includes('data') ||
      lowerDesc.includes('protection')
    ) {
      mappings.push({
        controlId: 'DP-001',
        controlTitle: 'Data Protection',
        relevanceScore: 80,
        mappingRationale: 'Request relates to data security',
        frameworkRequirements: ['SOC2 CC6.6', 'ISO 27001 A.8.2.3'],
      });
    }

    if (mappings.length === 0) {
      mappings.push({
        controlId: 'GC-001',
        controlTitle: 'General Controls',
        relevanceScore: 60,
        mappingRationale: 'General control mapping based on request content',
        frameworkRequirements: [],
      });
    }

    return {
      mappings,
      confidence: 55,
      suggestedCategory: mappings[0]?.controlId.split('-')[0].toLowerCase() || 'general',
    };
  }

  // ===========================================
  // Audit Summary Generation
  // ===========================================

  async generateSummary(
    organizationId: string,
    dto: GenerateSummaryDto,
    _userId: string
  ): Promise<AuditSummary> {
    this.logger.log(`Generating summary for audit ${dto.auditId}`);

    const audit = await this.prisma.audit.findFirst({
      where: { id: dto.auditId, organizationId },
      include: {
        findings: true,
        requests: true,
        testResults: true,
      },
    });

    if (!audit) {
      throw new NotFoundException(`Audit ${dto.auditId} not found`);
    }

    const summaryType = dto.summaryType || 'executive';

    // Calculate metrics
    const totalFindings = audit.findings.length;
    const criticalFindings = audit.findings.filter((f) => f.severity === 'critical').length;
    const highFindings = audit.findings.filter((f) => f.severity === 'high').length;
    const openFindings = audit.findings.filter(
      (f) => f.status === 'open' || f.status === 'acknowledged'
    ).length;

    const _totalRequests = audit.requests.length;
    const _completedRequests = audit.requests.filter((r) => r.status === 'approved').length;

    const totalTests = audit.testResults.length;
    const passedTests = audit.testResults.filter((t) => t.result === 'pass').length;

    return {
      auditId: dto.auditId,
      summaryType,
      executiveSummary: this.generateExecutiveSummary(
        audit,
        totalFindings,
        criticalFindings,
        highFindings
      ),
      keyFindings: audit.findings
        .filter((f) => f.severity === 'critical' || f.severity === 'high')
        .slice(0, 5)
        .map((f) => `[${f.severity.toUpperCase()}] ${f.title}`),
      riskOverview: this.generateRiskOverview(criticalFindings, highFindings, totalFindings),
      recommendations: this.generateRecommendations(audit.findings, openFindings),
      conclusion: this.generateConclusion(
        audit,
        totalFindings,
        openFindings,
        totalTests,
        passedTests
      ),
      generatedAt: new Date(),
    };
  }

  private generateExecutiveSummary(
    audit: { name: string; framework?: string | null; status: string },
    totalFindings: number,
    criticalFindings: number,
    highFindings: number
  ): string {
    const framework = audit.framework || 'the applicable framework';

    return (
      `This audit of ${audit.name} evaluated compliance with ${framework}. ` +
      `The audit identified ${totalFindings} findings, including ${criticalFindings} critical ` +
      `and ${highFindings} high severity issues. ` +
      `The current audit status is ${audit.status}. ` +
      (criticalFindings > 0
        ? 'Immediate attention is required to address critical findings.'
        : highFindings > 0
          ? 'Management attention is recommended for high severity findings.'
          : 'The organization demonstrates reasonable compliance maturity.')
    );
  }

  private generateRiskOverview(
    criticalFindings: number,
    highFindings: number,
    totalFindings: number
  ): string {
    if (criticalFindings > 0) {
      return 'HIGH RISK: Critical findings indicate significant control gaps that require immediate remediation.';
    } else if (highFindings > 2) {
      return 'ELEVATED RISK: Multiple high severity findings indicate areas requiring prompt management attention.';
    } else if (totalFindings > 5) {
      return 'MODERATE RISK: Several findings identified suggest opportunities for control enhancement.';
    }
    return 'LOW RISK: Findings are within acceptable tolerance levels with minor improvements recommended.';
  }

  private generateRecommendations(
    findings: { category: string; severity: string }[],
    openFindings: number
  ): string[] {
    const recommendations: string[] = [];

    if (openFindings > 0) {
      recommendations.push(
        `Address ${openFindings} open findings through documented remediation plans`
      );
    }

    const categories = [...new Set(findings.map((f) => f.category))];
    if (categories.length > 3) {
      recommendations.push(
        'Implement cross-functional improvement program addressing multiple control domains'
      );
    }

    recommendations.push(
      'Conduct follow-up assessment in 90 days to validate remediation effectiveness'
    );
    recommendations.push('Update policies and procedures to address identified gaps');

    return recommendations;
  }

  private generateConclusion(
    audit: { name: string; status: string },
    totalFindings: number,
    openFindings: number,
    totalTests: number,
    passedTests: number
  ): string {
    const testPassRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

    return (
      `Based on our assessment of ${audit.name}, we conclude that ` +
      (totalFindings === 0
        ? 'the control environment is operating effectively with no significant findings.'
        : `${totalFindings} findings were identified, with ${openFindings} requiring remediation. `) +
      (totalTests > 0 ? `Control testing achieved a ${testPassRate}% pass rate. ` : '') +
      'Management should review the detailed findings and implement corrective actions as outlined in the remediation plans.'
    );
  }

  // ===========================================
  // AI Service Communication
  // ===========================================

  private isExplicitDemoMode(): boolean {
    return process.env.NODE_ENV !== 'production' && process.env.AI_MOCK_MODE === 'true';
  }

  private async callAIService(prompt: string, organizationId: string): Promise<string> {
    try {
      const response = await axios.post(
        `${this.controlsServiceUrl}/api/ai/generate`,
        {
          prompt,
          organizationId,
          maxTokens: 2000,
          temperature: 0.7,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      return response.data.result || response.data.content || '';
    } catch (error) {
      this.logger.error(`AI service call failed: ${error.message}`);
      throw error;
    }
  }
}
