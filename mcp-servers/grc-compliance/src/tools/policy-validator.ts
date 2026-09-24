interface PolicyValidationParams {
  policyId?: string;
  policyContent?: string;
  framework: 'SOC2' | 'ISO27001' | 'HIPAA' | 'GDPR' | 'PCI-DSS' | 'NIST-CSF';
  requirements?: string[];
}

interface ValidationResult {
  policyId: string;
  framework: string;
  validatedAt: string;
  overallScore: number;
  status: 'compliant' | 'partially_compliant' | 'non_compliant';
  findings: ValidationFinding[];
  missingElements: string[];
  recommendations: string[];
}

interface ValidationFinding {
  requirement: string;
  status: 'met' | 'partially_met' | 'not_met' | 'not_applicable';
  evidence?: string;
  gap?: string;
  recommendation?: string;
}

// Framework requirement mappings
const frameworkRequirements: Record<string, Record<string, string[]>> = {
  SOC2: {
    'Information Security Policy': [
      'Purpose and scope defined',
      'Roles and responsibilities',
      'Security objectives',
      'Management commitment',
      'Policy review schedule',
      'Exception handling process',
    ],
    'Access Control Policy': [
      'User access management',
      'Privileged access management',
      'User authentication requirements',
      'Access review process',
      'Segregation of duties',
    ],
    'Data Classification Policy': [
      'Classification levels defined',
      'Handling requirements per level',
      'Labeling requirements',
      'Data retention periods',
    ],
    'Incident Response Policy': [
      'Incident definition',
      'Response procedures',
      'Escalation matrix',
      'Communication plan',
      'Post-incident review',
    ],
    'Change Management Policy': [
      'Change request process',
      'Change approval workflow',
      'Emergency change procedures',
      'Change documentation',
      'Post-implementation review',
    ],
  },
  ISO27001: {
    'Information Security Policy': [
      'Management direction for information security',
      'Set of policies for information security',
      'Review of the policies',
      'Aligned with business objectives',
    ],
    'Access Control Policy': [
      'Access control policy',
      'Network access control',
      'Operating system access control',
      'Application access control',
      'Mobile computing and teleworking',
    ],
    'Cryptography Policy': [
      'Policy on use of cryptographic controls',
      'Key management',
      'Encryption standards',
    ],
    'Operations Security Policy': [
      'Documented operating procedures',
      'Change management',
      'Capacity management',
      'Separation of environments',
    ],
  },
  HIPAA: {
    'Privacy Policy': [
      'Uses and disclosures of PHI',
      'Individual rights',
      'Administrative requirements',
      'Notice of privacy practices',
    ],
    'Security Policy': [
      'Administrative safeguards',
      'Physical safeguards',
      'Technical safeguards',
      'Policies and procedures',
      'Documentation requirements',
    ],
    'Breach Notification Policy': [
      'Breach definition',
      'Notification procedures',
      'Timing requirements',
      'Documentation requirements',
    ],
  },
  GDPR: {
    'Data Protection Policy': [
      'Lawful basis for processing',
      'Data subject rights',
      'Data retention',
      'International transfers',
      'Privacy by design',
    ],
    'Data Breach Policy': [
      'Breach detection',
      'Notification to supervisory authority',
      'Notification to data subjects',
      'Documentation requirements',
    ],
    'Subject Access Request Policy': [
      'Request handling process',
      'Identity verification',
      'Response timeframes',
      'Fee structure',
    ],
  },
  'PCI-DSS': {
    'Information Security Policy': [
      'Annual review',
      'Risk assessment',
      'Usage policies',
      'Security awareness',
    ],
    'Access Control Policy': [
      'Need to know basis',
      'Role-based access',
      'Unique user IDs',
      'Password requirements',
    ],
    'Network Security Policy': [
      'Firewall configuration',
      'Cardholder data protection',
      'Network segmentation',
      'Wireless security',
    ],
  },
  'NIST-CSF': {
    'Cybersecurity Policy': [
      'Identify - Asset Management',
      'Protect - Access Control',
      'Detect - Security Monitoring',
      'Respond - Incident Response',
      'Recover - Recovery Planning',
    ],
    'Risk Management Policy': [
      'Risk assessment methodology',
      'Risk tolerance levels',
      'Risk treatment options',
      'Risk monitoring',
    ],
  },
};

// Policy content patterns to check for requirements
const requirementPatterns: Record<string, RegExp[]> = {
  'Purpose and scope defined': [/purpose/i, /scope/i, /objective/i],
  'Roles and responsibilities': [/role/i, /responsib/i, /accountab/i],
  'Security objectives': [/security objective/i, /security goal/i],
  'Management commitment': [/management commit/i, /leadership/i, /executive/i],
  'Policy review schedule': [/review/i, /annual/i, /periodic/i],
  'Exception handling process': [/exception/i, /waiver/i, /deviation/i],
  'User access management': [/user access/i, /access management/i, /provisioning/i],
  'Privileged access management': [/privileged/i, /admin/i, /elevated/i],
  'User authentication requirements': [/authentication/i, /password/i, /mfa|multi.?factor/i],
  'Access review process': [/access review/i, /recertification/i, /periodic review/i],
  'Segregation of duties': [/segregation/i, /separation of duties/i, /sod/i],
  'Classification levels defined': [/classification/i, /confidential/i, /public/i, /internal/i],
  'Handling requirements per level': [/handling/i, /protection/i, /safeguard/i],
  'Data retention periods': [/retention/i, /disposal/i, /archive/i],
  'Incident definition': [/incident/i, /event/i, /breach/i],
  'Response procedures': [/response/i, /procedure/i, /playbook/i],
  'Escalation matrix': [/escalat/i, /notif/i, /contact/i],
  'Communication plan': [/communication/i, /stakeholder/i, /notification/i],
  'Change request process': [/change request/i, /rfc/i, /change management/i],
  'Change approval workflow': [/approval/i, /authorize/i, /sign.?off/i],
  'Emergency change procedures': [/emergency/i, /urgent/i, /expedite/i],
};

export async function validatePolicyCompliance(
  params: PolicyValidationParams
): Promise<ValidationResult> {
  const { policyId, policyContent, framework, requirements } = params;
  if (!policyContent?.trim()) {
    throw new Error(
      'Policy content is required; the standalone Compliance MCP server cannot retrieve a policy by ID.'
    );
  }

  const actualPolicyId = policyId || `policy-${Date.now()}`;
  const content = policyContent;

  // Get applicable requirements
  let applicableRequirements: string[] = [];

  if (requirements && requirements.length > 0) {
    applicableRequirements = requirements;
  } else {
    // Get all requirements for the framework
    const frameworkReqs = frameworkRequirements[framework];
    if (frameworkReqs) {
      for (const policyType of Object.keys(frameworkReqs)) {
        applicableRequirements.push(...frameworkReqs[policyType]);
      }
    }
  }

  // Validate each requirement
  const findings: ValidationFinding[] = [];
  const missingElements: string[] = [];
  let totalScore = 0;
  let maxScore = applicableRequirements.length * 100;

  for (const requirement of applicableRequirements) {
    const patterns = requirementPatterns[requirement];
    let status: ValidationFinding['status'] = 'not_met';
    let evidence: string | undefined;

    if (patterns) {
      const matches = patterns.filter((pattern) => pattern.test(content));
      if (matches.length === patterns.length) {
        status = 'met';
        totalScore += 100;
        evidence = `Found matching content for: ${requirement}`;
      } else if (matches.length > 0) {
        status = 'partially_met';
        totalScore += 50;
        evidence = `Partial coverage found for: ${requirement}`;
      } else {
        missingElements.push(requirement);
      }
    } else {
      // No pattern defined, mark as requiring manual review
      status = 'not_applicable';
      maxScore -= 100; // Don't count against score
    }

    findings.push({
      requirement,
      status,
      evidence,
      gap: status === 'not_met' ? `Missing: ${requirement}` : undefined,
      recommendation:
        status === 'not_met'
          ? `Add section addressing: ${requirement}`
          : status === 'partially_met'
            ? `Enhance coverage of: ${requirement}`
            : undefined,
    });
  }

  // Calculate overall score
  const overallScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  // Determine status
  let status: ValidationResult['status'];
  if (overallScore >= 80) {
    status = 'compliant';
  } else if (overallScore >= 50) {
    status = 'partially_compliant';
  } else {
    status = 'non_compliant';
  }

  // Generate recommendations
  const recommendations: string[] = [];

  if (missingElements.length > 0) {
    recommendations.push(
      `Add the following missing elements: ${missingElements.slice(0, 5).join(', ')}${
        missingElements.length > 5 ? ` and ${missingElements.length - 5} more` : ''
      }`
    );
  }

  const partiallyMet = findings.filter((f) => f.status === 'partially_met');
  if (partiallyMet.length > 0) {
    recommendations.push(
      `Enhance coverage for: ${partiallyMet
        .slice(0, 3)
        .map((f) => f.requirement)
        .join(', ')}`
    );
  }

  if (overallScore < 80) {
    recommendations.push('Consider engaging compliance consultant for policy review');
  }

  return {
    policyId: actualPolicyId,
    framework,
    validatedAt: new Date().toISOString(),
    overallScore,
    status,
    findings,
    missingElements,
    recommendations,
  };
}
