import { aiClient } from './ai-client.js';
import { useExplicitDemoFallback } from '../demo-mode.js';

interface RequirementMapperParams {
  control: {
    id?: string;
    title: string;
    description: string;
    category?: string;
  };
  targetFrameworks: string[];
  confidenceThreshold?: number;
}

interface RequirementMapping {
  framework: string;
  requirement: string;
  requirementTitle: string;
  confidence: number;
  rationale: string;
  coverage: 'full' | 'partial' | 'minimal';
}

interface RequirementMapperResult {
  controlId: string;
  controlTitle: string;
  mappedAt: string;
  mappings: RequirementMapping[];
  unmappedFrameworks: string[];
  suggestedEnhancements: string[];
}

// Framework requirement databases
const frameworkRequirements: Record<string, { id: string; title: string; keywords: string[] }[]> = {
  SOC2: [
    {
      id: 'CC1.1',
      title: 'Control Environment - Integrity and Ethical Values',
      keywords: ['integrity', 'ethics', 'code of conduct', 'behavior'],
    },
    {
      id: 'CC1.4',
      title: 'Control Environment - Commitment to Competence',
      keywords: ['training', 'competence', 'skills', 'awareness'],
    },
    {
      id: 'CC5.1',
      title: 'Control Activities - Selection and Development',
      keywords: ['control', 'policy', 'procedure', 'standard'],
    },
    {
      id: 'CC5.2',
      title: 'Control Activities - Technology General Controls',
      keywords: ['technology', 'system', 'application', 'infrastructure'],
    },
    {
      id: 'CC6.1',
      title: 'Logical and Physical Access - Access Security',
      keywords: ['access', 'authentication', 'authorization', 'identity'],
    },
    {
      id: 'CC6.2',
      title: 'Logical and Physical Access - Registration and Authorization',
      keywords: ['registration', 'provisioning', 'deprovisioning', 'access request'],
    },
    {
      id: 'CC6.3',
      title: 'Logical and Physical Access - Access Removal',
      keywords: ['termination', 'access removal', 'deactivation'],
    },
    {
      id: 'CC6.6',
      title: 'Logical and Physical Access - System Boundaries',
      keywords: ['firewall', 'network', 'boundary', 'segmentation'],
    },
    {
      id: 'CC6.7',
      title: 'Logical and Physical Access - Transmission Protection',
      keywords: ['encryption', 'TLS', 'SSL', 'transmission', 'transit'],
    },
    {
      id: 'CC6.8',
      title: 'Logical and Physical Access - Malicious Software Prevention',
      keywords: ['malware', 'antivirus', 'endpoint', 'protection'],
    },
    {
      id: 'CC7.1',
      title: 'System Operations - Infrastructure Management',
      keywords: ['infrastructure', 'configuration', 'baseline', 'hardening'],
    },
    {
      id: 'CC7.2',
      title: 'System Operations - Anomaly Detection',
      keywords: ['monitoring', 'detection', 'logging', 'alert', 'SIEM'],
    },
    {
      id: 'CC7.3',
      title: 'System Operations - Security Event Evaluation',
      keywords: ['incident', 'event', 'triage', 'analysis'],
    },
    {
      id: 'CC7.4',
      title: 'System Operations - Incident Response',
      keywords: ['response', 'incident', 'containment', 'eradication'],
    },
    {
      id: 'CC8.1',
      title: 'Change Management',
      keywords: ['change', 'management', 'approval', 'testing', 'release'],
    },
    {
      id: 'CC9.2',
      title: 'Risk Mitigation - Vendor Management',
      keywords: ['vendor', 'third party', 'supplier', 'assessment'],
    },
  ],
  ISO27001: [
    {
      id: 'A.5.1',
      title: 'Policies for information security',
      keywords: ['policy', 'security policy', 'information security'],
    },
    { id: 'A.5.15', title: 'Access control', keywords: ['access', 'control', 'authorization'] },
    {
      id: 'A.5.16',
      title: 'Identity management',
      keywords: ['identity', 'user', 'account', 'management'],
    },
    {
      id: 'A.5.17',
      title: 'Authentication information',
      keywords: ['password', 'authentication', 'credential'],
    },
    {
      id: 'A.5.24',
      title: 'Incident management planning',
      keywords: ['incident', 'response', 'planning'],
    },
    {
      id: 'A.6.3',
      title: 'Information security awareness',
      keywords: ['awareness', 'training', 'education'],
    },
    {
      id: 'A.7.1',
      title: 'Physical security perimeters',
      keywords: ['physical', 'perimeter', 'facility'],
    },
    {
      id: 'A.8.2',
      title: 'Privileged access rights',
      keywords: ['privileged', 'admin', 'elevated', 'root'],
    },
    {
      id: 'A.8.7',
      title: 'Protection against malware',
      keywords: ['malware', 'virus', 'protection'],
    },
    {
      id: 'A.8.8',
      title: 'Management of technical vulnerabilities',
      keywords: ['vulnerability', 'patch', 'remediation'],
    },
    { id: 'A.8.15', title: 'Logging', keywords: ['log', 'logging', 'audit trail'] },
    { id: 'A.8.20', title: 'Networks security', keywords: ['network', 'firewall', 'security'] },
    {
      id: 'A.8.24',
      title: 'Use of cryptography',
      keywords: ['encryption', 'cryptography', 'cipher'],
    },
    { id: 'A.8.32', title: 'Change management', keywords: ['change', 'management', 'control'] },
  ],
  HIPAA: [
    {
      id: '164.308(a)(1)',
      title: 'Security Management Process',
      keywords: ['risk', 'security', 'management'],
    },
    {
      id: '164.308(a)(3)',
      title: 'Workforce Security',
      keywords: ['workforce', 'access', 'authorization'],
    },
    {
      id: '164.308(a)(5)',
      title: 'Security Awareness and Training',
      keywords: ['training', 'awareness', 'education'],
    },
    {
      id: '164.308(a)(6)',
      title: 'Security Incident Procedures',
      keywords: ['incident', 'response', 'procedure'],
    },
    {
      id: '164.310(a)(1)',
      title: 'Facility Access Controls',
      keywords: ['facility', 'physical', 'access'],
    },
    {
      id: '164.312(a)(1)',
      title: 'Access Control',
      keywords: ['access', 'control', 'authentication'],
    },
    { id: '164.312(b)', title: 'Audit Controls', keywords: ['audit', 'logging', 'monitoring'] },
    { id: '164.312(c)(1)', title: 'Integrity', keywords: ['integrity', 'data', 'protection'] },
    {
      id: '164.312(e)(1)',
      title: 'Transmission Security',
      keywords: ['transmission', 'encryption', 'network'],
    },
  ],
  GDPR: [
    {
      id: 'Article 5',
      title: 'Principles relating to processing',
      keywords: ['processing', 'principles', 'lawfulness'],
    },
    {
      id: 'Article 25',
      title: 'Data protection by design',
      keywords: ['design', 'default', 'privacy'],
    },
    {
      id: 'Article 30',
      title: 'Records of processing activities',
      keywords: ['records', 'processing', 'documentation'],
    },
    {
      id: 'Article 32',
      title: 'Security of processing',
      keywords: ['security', 'processing', 'technical', 'organizational'],
    },
    {
      id: 'Article 33',
      title: 'Notification of breach',
      keywords: ['breach', 'notification', 'incident'],
    },
    {
      id: 'Article 35',
      title: 'Data protection impact assessment',
      keywords: ['impact', 'assessment', 'DPIA', 'risk'],
    },
  ],
};

export async function mapRequirements(
  params: RequirementMapperParams
): Promise<RequirementMapperResult> {
  const { control, targetFrameworks, confidenceThreshold = 0.6 } = params;
  const controlId = control.id || `ctrl-${Date.now()}`;

  if (!aiClient.isConfigured()) {
    return useExplicitDemoFallback('AI service is not configured', () =>
      generateMockMappings(controlId, control, targetFrameworks, confidenceThreshold)
    );
  }

  const systemPrompt = `You are a GRC compliance expert. Map the provided control to requirements in the specified frameworks.
For each mapping, provide:
- The specific requirement ID and title
- Confidence score (0-1)
- Coverage level (full, partial, minimal)
- Rationale for the mapping

Return JSON:
{
  "mappings": [{
    "framework": string,
    "requirement": string,
    "requirementTitle": string,
    "confidence": number,
    "rationale": string,
    "coverage": "full" | "partial" | "minimal"
  }],
  "unmappedFrameworks": [string],
  "suggestedEnhancements": [string]
}`;

  try {
    const result = await aiClient.completeJSON<
      Omit<RequirementMapperResult, 'controlId' | 'controlTitle' | 'mappedAt'>
    >([
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Map this control to ${targetFrameworks.join(', ')}:\nTitle: ${control.title}\nDescription: ${control.description}\nCategory: ${control.category || 'General'}`,
      },
    ]);

    return {
      controlId,
      controlTitle: control.title,
      mappedAt: new Date().toISOString(),
      ...result,
    };
  } catch (error) {
    return useExplicitDemoFallback(
      `AI requirement mapping failed: ${error instanceof Error ? error.message : String(error)}`,
      () => generateMockMappings(controlId, control, targetFrameworks, confidenceThreshold)
    );
  }
}

function generateMockMappings(
  controlId: string,
  control: RequirementMapperParams['control'],
  targetFrameworks: string[],
  confidenceThreshold: number
): RequirementMapperResult {
  const mappings: RequirementMapping[] = [];
  const unmappedFrameworks: string[] = [];
  const controlText = `${control.title} ${control.description}`.toLowerCase();

  for (const framework of targetFrameworks) {
    const requirements = frameworkRequirements[framework];
    if (!requirements) {
      unmappedFrameworks.push(framework);
      continue;
    }

    let foundMapping = false;
    for (const req of requirements) {
      const matchScore = calculateMatchScore(controlText, req.keywords);
      if (matchScore >= confidenceThreshold) {
        mappings.push({
          framework,
          requirement: req.id,
          requirementTitle: req.title,
          confidence: Math.round(matchScore * 100) / 100,
          rationale: `Control addresses ${req.keywords.filter((k) => controlText.includes(k)).join(', ')} which aligns with ${req.id}`,
          coverage: matchScore > 0.8 ? 'full' : matchScore > 0.6 ? 'partial' : 'minimal',
        });
        foundMapping = true;
      }
    }

    if (!foundMapping) {
      unmappedFrameworks.push(framework);
    }
  }

  // Sort by confidence
  mappings.sort((a, b) => b.confidence - a.confidence);

  return {
    controlId,
    controlTitle: control.title,
    mappedAt: new Date().toISOString(),
    mappings,
    unmappedFrameworks,
    suggestedEnhancements: generateEnhancements(mappings, unmappedFrameworks),
  };
}

function calculateMatchScore(text: string, keywords: string[]): number {
  const matchedKeywords = keywords.filter((k) => text.includes(k.toLowerCase()));
  return matchedKeywords.length / keywords.length;
}

function generateEnhancements(mappings: RequirementMapping[], unmapped: string[]): string[] {
  const enhancements: string[] = [];

  const partialMappings = mappings.filter(
    (m) => m.coverage === 'partial' || m.coverage === 'minimal'
  );
  if (partialMappings.length > 0) {
    enhancements.push(
      `Enhance control to fully address: ${partialMappings.map((m) => m.requirement).join(', ')}`
    );
  }

  if (unmapped.length > 0) {
    enhancements.push(
      `Consider expanding control scope to address ${unmapped.join(', ')} requirements`
    );
  }

  return enhancements;
}
