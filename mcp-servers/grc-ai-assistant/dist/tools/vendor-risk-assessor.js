import { aiClient } from './ai-client.js';
import { useExplicitDemoFallback } from '../demo-mode.js';
export async function assessVendorRisk(params) {
    const { vendor, assessmentData, riskAppetite = 'medium' } = params;
    if (!aiClient.isConfigured()) {
        return useExplicitDemoFallback('AI service is not configured', () => generateMockAssessment(vendor, assessmentData, riskAppetite, 'Explicit MCP demo mode'));
    }
    const systemPrompt = `You are a third-party risk management expert. Assess the risk of engaging with the specified vendor.

Consider:
- Data access and sensitivity
- Security certifications and practices
- Service criticality
- Organization risk appetite: ${riskAppetite}

Provide comprehensive risk assessment with actionable recommendations.`;
    try {
        const result = await aiClient.completeJSON([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Assess vendor: ${JSON.stringify({ vendor, assessmentData })}` },
        ]);
        return {
            assessedAt: new Date().toISOString(),
            ...result,
            isMockMode: false,
        };
    }
    catch (error) {
        const reason = `AI vendor assessment failed: ${error instanceof Error ? error.message : String(error)}`;
        return useExplicitDemoFallback(reason, () => generateMockAssessment(vendor, assessmentData, riskAppetite, reason));
    }
}
function generateMockAssessment(vendor, assessmentData, riskAppetite, mockReason = 'AI service not available') {
    // Calculate risk factors
    const hasSecurityCerts = assessmentData?.certifications?.some((c) => ['SOC 2', 'ISO 27001', 'SOC2', 'ISO27001'].includes(c));
    const hasDataAccess = (vendor.dataAccess?.length || 0) > 0;
    const hasPreviousIncidents = (assessmentData?.previousIncidents?.length || 0) > 0;
    const isCriticalService = ['cloud', 'infrastructure', 'payment', 'identity'].some((s) => vendor.services?.some((vs) => vs.toLowerCase().includes(s)));
    // Calculate risk score (0-100, higher = more risk)
    let riskScore = 30; // Base score
    if (!hasSecurityCerts)
        riskScore += 25;
    if (hasDataAccess)
        riskScore += 15;
    if (hasPreviousIncidents)
        riskScore += 20;
    if (isCriticalService)
        riskScore += 10;
    // Adjust for risk appetite
    const riskThresholds = {
        low: { critical: 50, high: 35, medium: 20 },
        medium: { critical: 65, high: 45, medium: 30 },
        high: { critical: 80, high: 60, medium: 40 },
    };
    const thresholds = riskThresholds[riskAppetite];
    let riskTier;
    let recommendation;
    if (riskScore >= thresholds.critical) {
        riskTier = 'critical';
        recommendation = 'reject';
    }
    else if (riskScore >= thresholds.high) {
        riskTier = 'high';
        recommendation = 'further_review';
    }
    else if (riskScore >= thresholds.medium) {
        riskTier = 'medium';
        recommendation = 'approve_with_conditions';
    }
    else {
        riskTier = 'low';
        recommendation = 'approve';
    }
    const riskCategories = [
        {
            category: 'Security Posture',
            score: hasSecurityCerts ? 25 : 70,
            findings: hasSecurityCerts
                ? [`[DEMO] Vendor holds: ${assessmentData?.certifications?.join(', ')}`]
                : ['[DEMO] No recognized security certifications'],
            concerns: hasSecurityCerts ? [] : ['[DEMO] Lack of third-party security validation'],
        },
        {
            category: 'Data Handling',
            score: hasDataAccess ? 60 : 20,
            findings: vendor.dataAccess?.map((d) => `[DEMO] Access to: ${d}`) || [
                '[DEMO] No data access required',
            ],
            concerns: hasDataAccess ? ['[DEMO] Vendor will have access to sensitive data'] : [],
        },
        {
            category: 'Operational Risk',
            score: isCriticalService ? 55 : 30,
            findings: [`[DEMO] Services: ${vendor.services?.join(', ') || 'Not specified'}`],
            concerns: isCriticalService ? ['[DEMO] Critical service dependency'] : [],
        },
        {
            category: 'Historical Performance',
            score: hasPreviousIncidents ? 80 : 20,
            findings: hasPreviousIncidents
                ? (assessmentData?.previousIncidents || []).map((i) => `[DEMO] ${i}`)
                : ['[DEMO] No known security incidents'],
            concerns: hasPreviousIncidents ? ['[DEMO] Previous security incidents on record'] : [],
        },
    ];
    return {
        assessedAt: new Date().toISOString(),
        vendorName: vendor.name,
        overallRiskScore: riskScore,
        riskTier,
        recommendation,
        riskCategories,
        strengthsAndWeaknesses: {
            strengths: [
                ...(hasSecurityCerts ? ['Industry-recognized security certifications'] : []),
                ...(!hasPreviousIncidents ? ['Clean security track record'] : []),
                ...(vendor.category ? [`Established ${vendor.category} vendor`] : []),
            ],
            weaknesses: [
                ...(!hasSecurityCerts ? ['No security certifications'] : []),
                ...(hasPreviousIncidents ? ['History of security incidents'] : []),
                ...(hasDataAccess ? ['Access to sensitive data required'] : []),
            ],
        },
        requiredControls: [
            {
                control: 'Data Processing Agreement',
                priority: hasDataAccess ? 'required' : 'recommended',
                rationale: 'Ensure data protection obligations are contractually defined',
            },
            {
                control: 'Security Assessment',
                priority: !hasSecurityCerts ? 'required' : 'recommended',
                rationale: 'Validate vendor security controls',
            },
            {
                control: 'Incident Notification Clause',
                priority: 'required',
                rationale: 'Ensure timely notification of security incidents',
            },
            {
                control: 'Right to Audit',
                priority: riskTier === 'high' || riskTier === 'critical' ? 'required' : 'recommended',
                rationale: 'Enable verification of security controls',
            },
        ],
        contractualRequirements: [
            'Compliance with applicable data protection regulations',
            'Security incident notification within 24 hours',
            'Annual security assessment or certification',
            'Subcontractor approval requirements',
            hasDataAccess ? 'Data encryption requirements (at rest and in transit)' : '',
            isCriticalService ? 'Business continuity and disaster recovery requirements' : '',
        ].filter(Boolean),
        monitoringRequirements: [
            {
                activity: 'Security certification validation',
                frequency: 'Annual',
                responsible: 'Vendor Management',
            },
            {
                activity: 'Security questionnaire review',
                frequency: riskTier === 'critical' ? 'Quarterly' : riskTier === 'high' ? 'Semi-annual' : 'Annual',
                responsible: 'Security Team',
            },
            {
                activity: 'Performance review',
                frequency: 'Quarterly',
                responsible: 'Business Owner',
            },
            {
                activity: 'Contract compliance review',
                frequency: 'Annual',
                responsible: 'Legal/Compliance',
            },
        ],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isMockMode: true,
        mockModeReason: mockReason,
    };
}
//# sourceMappingURL=vendor-risk-assessor.js.map