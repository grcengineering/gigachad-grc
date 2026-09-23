import { aiClient } from './ai-client.js';
import { useExplicitDemoFallback } from '../demo-mode.js';

interface FindingExplainerParams {
  finding: {
    title: string;
    description: string;
    severity?: string;
    framework?: string;
    controlReference?: string;
  };
  audience?: 'technical' | 'executive' | 'auditor' | 'general';
  includeRemediation?: boolean;
}

interface FindingExplanation {
  findingTitle: string;
  explainedAt: string;
  audience: string;
  summary: string;
  plainLanguageExplanation: string;
  businessImpact: string;
  technicalDetails?: string;
  riskAssessment: {
    severity: string;
    likelihood: string;
    potentialImpact: string[];
  };
  remediation?: {
    overview: string;
    steps: RemediationStep[];
    estimatedEffort: string;
    priority: string;
  };
  relatedControls: string[];
  complianceImplications: string[];
}

interface RemediationStep {
  step: number;
  action: string;
  responsible: string;
  timeline: string;
  details?: string;
}

export async function explainFinding(params: FindingExplainerParams): Promise<FindingExplanation> {
  const { finding, audience = 'general', includeRemediation = true } = params;

  if (!aiClient.isConfigured()) {
    return useExplicitDemoFallback('AI service is not configured', () =>
      generateMockExplanation(finding, audience, includeRemediation)
    );
  }

  const audienceContext = {
    technical: 'Use technical terminology, include specific system details and configurations',
    executive: 'Focus on business impact, risk, and strategic implications. Avoid jargon.',
    auditor:
      'Include compliance framework references, evidence requirements, and control objectives',
    general: 'Use clear, simple language accessible to non-technical stakeholders',
  };

  const systemPrompt = `You are a GRC expert explaining audit findings. ${audienceContext[audience]}

Explain the finding in a way that is clear, actionable, and appropriate for the audience.

Return JSON:
{
  "summary": string,
  "plainLanguageExplanation": string,
  "businessImpact": string,
  ${audience === 'technical' ? '"technicalDetails": string,' : ''}
  "riskAssessment": { "severity": string, "likelihood": string, "potentialImpact": [string] },
  ${includeRemediation ? '"remediation": { "overview": string, "steps": [{ "step": number, "action": string, "responsible": string, "timeline": string }], "estimatedEffort": string, "priority": string },' : ''}
  "relatedControls": [string],
  "complianceImplications": [string]
}`;

  try {
    const result = await aiClient.completeJSON<
      Omit<FindingExplanation, 'findingTitle' | 'explainedAt' | 'audience'>
    >([
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Explain this finding:\nTitle: ${finding.title}\nDescription: ${finding.description}\nSeverity: ${finding.severity || 'Unknown'}\nFramework: ${finding.framework || 'N/A'}\nControl Reference: ${finding.controlReference || 'N/A'}`,
      },
    ]);

    return {
      findingTitle: finding.title,
      explainedAt: new Date().toISOString(),
      audience,
      ...result,
    };
  } catch (error) {
    return useExplicitDemoFallback(
      `AI finding explanation failed: ${error instanceof Error ? error.message : String(error)}`,
      () => generateMockExplanation(finding, audience, includeRemediation)
    );
  }
}

function generateMockExplanation(
  finding: FindingExplainerParams['finding'],
  audience: string,
  includeRemediation: boolean
): FindingExplanation {
  const severityLevel = finding.severity?.toLowerCase() || 'medium';

  const summaries: Record<string, string> = {
    technical: `Technical security gap identified in ${finding.controlReference || 'system controls'}: ${finding.title}`,
    executive: `Business risk identified: ${finding.title} requires attention to maintain security posture and compliance`,
    auditor: `Audit finding for ${finding.framework || 'compliance'} control ${finding.controlReference || 'reference'}: ${finding.title}`,
    general: `A security issue was found: ${finding.title}`,
  };

  const explanations: Record<string, string> = {
    technical: `${finding.description}\n\nThis finding indicates a gap in technical controls that could be exploited by threat actors. The vulnerability exists in the ${finding.controlReference || 'affected system'} and requires immediate technical remediation.`,
    executive: `In simple terms, ${finding.title.toLowerCase()} means our organization has a gap in our security defenses. This could potentially lead to data breaches, regulatory fines, or operational disruptions if not addressed. The good news is that this is a known issue with established solutions.`,
    auditor: `This finding represents a deviation from ${finding.framework || 'compliance'} requirements, specifically control ${finding.controlReference || 'under review'}. The condition observed does not meet the criteria established for this control objective. Evidence of this gap was documented during the assessment period.`,
    general: `We found an issue with how we protect our information. "${finding.title}" means that there's a gap in our security that we need to fix. This is a ${severityLevel} priority item that the security team is working to address.`,
  };

  const impactStatements: Record<string, string[]> = {
    high: [
      'Data breach potential',
      'Regulatory non-compliance',
      'Financial loss',
      'Reputational damage',
    ],
    medium: ['Increased vulnerability', 'Compliance gaps', 'Operational inefficiency'],
    low: ['Minor security gap', 'Documentation deficiency', 'Process improvement opportunity'],
  };

  const result: FindingExplanation = {
    findingTitle: finding.title,
    explainedAt: new Date().toISOString(),
    audience,
    summary: summaries[audience] || summaries.general,
    plainLanguageExplanation: explanations[audience] || explanations.general,
    businessImpact: `If not addressed, this finding could result in ${impactStatements[severityLevel]?.slice(0, 2).join(' and ').toLowerCase() || 'security gaps'}. The ${severityLevel} severity level indicates ${severityLevel === 'high' ? 'urgent attention is required' : severityLevel === 'medium' ? 'timely remediation is recommended' : 'remediation should be planned'}.`,
    riskAssessment: {
      severity: finding.severity || 'Medium',
      likelihood:
        severityLevel === 'high' ? 'Likely' : severityLevel === 'medium' ? 'Possible' : 'Unlikely',
      potentialImpact: impactStatements[severityLevel] || impactStatements.medium,
    },
    relatedControls: [
      finding.controlReference || 'Access Control',
      'Security Monitoring',
      'Incident Response',
    ],
    complianceImplications: [
      `${finding.framework || 'SOC 2'} compliance gap`,
      'Potential audit finding in next assessment',
      'May affect certification status if unresolved',
    ],
  };

  if (audience === 'technical') {
    result.technicalDetails = `The finding relates to ${finding.controlReference || 'security controls'} configuration. Review system logs and configuration settings to identify the root cause. Ensure proper access controls and monitoring are in place.`;
  }

  if (includeRemediation) {
    result.remediation = {
      overview: `Address this finding by implementing the recommended controls and verifying their effectiveness through testing.`,
      steps: [
        {
          step: 1,
          action: 'Assess current state and document gaps',
          responsible: 'Security Team',
          timeline: 'Week 1',
        },
        {
          step: 2,
          action: 'Develop remediation plan',
          responsible: 'Security Manager',
          timeline: 'Week 1-2',
        },
        {
          step: 3,
          action: 'Implement technical controls',
          responsible: 'IT Operations',
          timeline: 'Week 2-4',
        },
        {
          step: 4,
          action: 'Test and validate remediation',
          responsible: 'Security Team',
          timeline: 'Week 4-5',
        },
        {
          step: 5,
          action: 'Document evidence and close finding',
          responsible: 'GRC Team',
          timeline: 'Week 5',
        },
      ],
      estimatedEffort:
        severityLevel === 'high'
          ? '4-6 weeks'
          : severityLevel === 'medium'
            ? '2-4 weeks'
            : '1-2 weeks',
      priority:
        severityLevel === 'high' ? 'Critical' : severityLevel === 'medium' ? 'High' : 'Medium',
    };
  }

  return result;
}
