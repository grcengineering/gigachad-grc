import { requireExplicitDemoMode } from '../demo-mode.js';

interface ReportParams {
  framework: 'SOC2' | 'ISO27001' | 'HIPAA' | 'GDPR' | 'PCI-DSS' | 'NIST-CSF';
  reportType: 'summary' | 'detailed' | 'executive' | 'gap-analysis';
  includeEvidence?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

interface ComplianceReport {
  reportId: string;
  reportType: string;
  framework: string;
  generatedAt: string;
  dateRange: {
    start: string;
    end: string;
  };
  summary: ReportSummary;
  sections: ReportSection[];
  recommendations: string[];
  nextSteps: string[];
}

interface ReportSummary {
  overallScore: number;
  status: 'compliant' | 'partially_compliant' | 'non_compliant';
  totalControls: number;
  implementedControls: number;
  partiallyImplementedControls: number;
  notImplementedControls: number;
  criticalGaps: number;
  highGaps: number;
  mediumGaps: number;
  lowGaps: number;
}

interface ReportSection {
  title: string;
  description?: string;
  score?: number;
  status?: string;
  items: ReportItem[];
}

interface ReportItem {
  id: string;
  name: string;
  status: string;
  score?: number;
  description?: string;
  evidence?: string[];
  gaps?: string[];
  recommendations?: string[];
}

// Framework control structures
const frameworkStructures: Record<string, { domains: string[]; controlsPerDomain: number }> = {
  SOC2: {
    domains: [
      'CC1 - Control Environment',
      'CC2 - Communication & Information',
      'CC3 - Risk Assessment',
      'CC4 - Monitoring Activities',
      'CC5 - Control Activities',
      'CC6 - Logical & Physical Access',
      'CC7 - System Operations',
      'CC8 - Change Management',
      'CC9 - Risk Mitigation',
    ],
    controlsPerDomain: 8,
  },
  ISO27001: {
    domains: [
      'A.5 - Information Security Policies',
      'A.6 - Organization of Information Security',
      'A.7 - Human Resource Security',
      'A.8 - Asset Management',
      'A.9 - Access Control',
      'A.10 - Cryptography',
      'A.11 - Physical Security',
      'A.12 - Operations Security',
      'A.13 - Communications Security',
      'A.14 - System Development',
      'A.15 - Supplier Relationships',
      'A.16 - Incident Management',
      'A.17 - Business Continuity',
      'A.18 - Compliance',
    ],
    controlsPerDomain: 6,
  },
  HIPAA: {
    domains: [
      'Administrative Safeguards',
      'Physical Safeguards',
      'Technical Safeguards',
      'Privacy Rule',
      'Breach Notification',
    ],
    controlsPerDomain: 10,
  },
  GDPR: {
    domains: [
      'Lawfulness & Transparency',
      'Purpose Limitation',
      'Data Minimization',
      'Accuracy',
      'Storage Limitation',
      'Security',
      'Accountability',
      'Data Subject Rights',
    ],
    controlsPerDomain: 5,
  },
  'PCI-DSS': {
    domains: [
      'Build & Maintain Secure Network',
      'Protect Cardholder Data',
      'Maintain Vulnerability Management',
      'Implement Access Controls',
      'Monitor & Test Networks',
      'Information Security Policy',
    ],
    controlsPerDomain: 12,
  },
  'NIST-CSF': {
    domains: ['Identify', 'Protect', 'Detect', 'Respond', 'Recover'],
    controlsPerDomain: 15,
  },
};

export async function generateComplianceReport(params: ReportParams): Promise<ComplianceReport> {
  requireExplicitDemoMode('Compliance report generation');
  const { framework, reportType, includeEvidence = false, dateRange } = params;

  const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date();
  const actualDateRange = dateRange || {
    start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    end: now.toISOString(),
  };

  // Get framework structure
  const structure = frameworkStructures[framework] || {
    domains: ['General'],
    controlsPerDomain: 10,
  };

  // Generate simulated compliance data
  const sections: ReportSection[] = [];
  let totalControls = 0;
  let implementedControls = 0;
  let partiallyImplementedControls = 0;
  let notImplementedControls = 0;
  let criticalGaps = 0;
  let highGaps = 0;
  let mediumGaps = 0;
  let lowGaps = 0;

  for (const domain of structure.domains) {
    const items: ReportItem[] = [];
    let domainScore = 0;

    for (let i = 1; i <= structure.controlsPerDomain; i++) {
      const controlId = `${domain.split(' ')[0]}.${i}`;
      const random = Math.random();
      let status: string;
      let score: number;

      if (random > 0.7) {
        status = 'Implemented';
        score = 100;
        implementedControls++;
      } else if (random > 0.4) {
        status = 'Partially Implemented';
        score = 50 + Math.floor(Math.random() * 30);
        partiallyImplementedControls++;
        if (random < 0.5) mediumGaps++;
        else lowGaps++;
      } else if (random > 0.2) {
        status = 'Not Implemented';
        score = Math.floor(Math.random() * 30);
        notImplementedControls++;
        highGaps++;
      } else {
        status = 'Critical Gap';
        score = 0;
        notImplementedControls++;
        criticalGaps++;
      }

      domainScore += score;
      totalControls++;

      const item: ReportItem = {
        id: controlId,
        name: `Control ${controlId}`,
        status,
        score,
        description: `${framework} control requirement ${controlId}`,
      };

      if (includeEvidence && status === 'Implemented') {
        item.evidence = [
          `Evidence document: ${controlId}-evidence.pdf`,
          `Last test date: ${new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`,
        ];
      }

      if (status !== 'Implemented') {
        item.gaps = [`Gap identified for ${controlId}`];
        item.recommendations = [`Implement control ${controlId} requirements`];
      }

      items.push(item);
    }

    sections.push({
      title: domain,
      description: `${framework} ${domain} controls`,
      score: Math.round(domainScore / structure.controlsPerDomain),
      status:
        domainScore / structure.controlsPerDomain >= 80
          ? 'Compliant'
          : domainScore / structure.controlsPerDomain >= 50
            ? 'Partial'
            : 'Non-Compliant',
      items: reportType === 'summary' ? [] : items,
    });
  }

  // Calculate overall score
  const overallScore = Math.round(
    (implementedControls * 100 + partiallyImplementedControls * 60) / totalControls
  );

  const summary: ReportSummary = {
    overallScore,
    status:
      overallScore >= 80
        ? 'compliant'
        : overallScore >= 50
          ? 'partially_compliant'
          : 'non_compliant',
    totalControls,
    implementedControls,
    partiallyImplementedControls,
    notImplementedControls,
    criticalGaps,
    highGaps,
    mediumGaps,
    lowGaps,
  };

  // Generate recommendations based on findings
  const recommendations: string[] = [];

  if (criticalGaps > 0) {
    recommendations.push(`URGENT: Address ${criticalGaps} critical gap(s) immediately`);
  }
  if (highGaps > 0) {
    recommendations.push(
      `HIGH PRIORITY: Remediate ${highGaps} high-priority gap(s) within 30 days`
    );
  }
  if (mediumGaps > 0) {
    recommendations.push(`MEDIUM: Address ${mediumGaps} medium-priority gap(s) within 60 days`);
  }
  if (lowGaps > 0) {
    recommendations.push(`LOW: Plan remediation for ${lowGaps} low-priority gap(s) within 90 days`);
  }

  // Generate next steps
  const nextSteps: string[] = [];

  if (summary.status === 'non_compliant') {
    nextSteps.push('Engage compliance team for comprehensive remediation planning');
    nextSteps.push('Consider hiring external consultants for framework implementation');
    nextSteps.push('Develop 6-month compliance roadmap');
  } else if (summary.status === 'partially_compliant') {
    nextSteps.push('Focus on closing high-priority gaps');
    nextSteps.push('Implement continuous monitoring for implemented controls');
    nextSteps.push('Schedule quarterly compliance reviews');
  } else {
    nextSteps.push('Maintain current control effectiveness');
    nextSteps.push('Prepare for external audit');
    nextSteps.push('Consider expanding compliance program');
  }

  // Modify sections based on report type
  let finalSections = sections;

  switch (reportType) {
    case 'summary':
      finalSections = sections.map((s) => ({
        ...s,
        items: [], // No detailed items in summary
      }));
      break;
    case 'executive':
      finalSections = [
        {
          title: 'Executive Overview',
          description: `${framework} compliance status as of ${now.toISOString().split('T')[0]}`,
          score: overallScore,
          items: [
            {
              id: 'overview',
              name: 'Compliance Posture',
              status: summary.status.replace('_', ' ').toUpperCase(),
              description: `${implementedControls} of ${totalControls} controls implemented (${Math.round((implementedControls / totalControls) * 100)}%)`,
            },
          ],
        },
        {
          title: 'Risk Summary',
          items: [
            { id: 'critical', name: 'Critical Gaps', status: String(criticalGaps) },
            { id: 'high', name: 'High Priority Gaps', status: String(highGaps) },
            { id: 'medium', name: 'Medium Priority Gaps', status: String(mediumGaps) },
            { id: 'low', name: 'Low Priority Gaps', status: String(lowGaps) },
          ],
        },
      ];
      break;
    case 'gap-analysis':
      finalSections = sections
        .map((s) => ({
          ...s,
          items: s.items.filter((item) => item.status !== 'Implemented'),
        }))
        .filter((s) => s.items.length > 0);
      break;
    // 'detailed' uses all sections as-is
  }

  return {
    reportId,
    reportType,
    framework,
    generatedAt: now.toISOString(),
    dateRange: actualDateRange,
    summary,
    sections: finalSections,
    recommendations,
    nextSteps,
  };
}
