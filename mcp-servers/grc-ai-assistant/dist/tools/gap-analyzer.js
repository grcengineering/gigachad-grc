import { aiClient } from './ai-client.js';
import { useExplicitDemoFallback } from '../demo-mode.js';
// Framework requirement mappings
const frameworkRequirements = {
    SOC2: [
        {
            id: 'CC1.1',
            title: 'Demonstrates commitment to integrity and ethical values',
            critical: true,
        },
        { id: 'CC1.4', title: 'Demonstrates commitment to competence', critical: false },
        { id: 'CC2.1', title: 'Obtains or generates relevant information', critical: false },
        { id: 'CC3.1', title: 'Specifies suitable objectives', critical: false },
        { id: 'CC5.1', title: 'Selects and develops control activities', critical: true },
        { id: 'CC6.1', title: 'Implements logical access security', critical: true },
        { id: 'CC6.2', title: 'Manages access credentials', critical: true },
        { id: 'CC6.6', title: 'Manages system boundaries', critical: true },
        { id: 'CC6.7', title: 'Protects data transmissions', critical: true },
        { id: 'CC7.2', title: 'Detects anomalies', critical: true },
        { id: 'CC7.4', title: 'Responds to security incidents', critical: true },
        { id: 'CC8.1', title: 'Manages changes', critical: true },
        { id: 'CC9.2', title: 'Assesses and manages vendors', critical: false },
    ],
    ISO27001: [
        { id: 'A.5.1', title: 'Policies for information security', critical: true },
        { id: 'A.5.15', title: 'Access control', critical: true },
        { id: 'A.5.17', title: 'Authentication information', critical: true },
        { id: 'A.6.3', title: 'Information security awareness', critical: false },
        { id: 'A.8.2', title: 'Privileged access rights', critical: true },
        { id: 'A.8.7', title: 'Protection against malware', critical: true },
        { id: 'A.8.8', title: 'Management of technical vulnerabilities', critical: true },
        { id: 'A.8.15', title: 'Logging', critical: true },
        { id: 'A.8.20', title: 'Networks security', critical: true },
        { id: 'A.8.24', title: 'Use of cryptography', critical: true },
        { id: 'A.8.32', title: 'Change management', critical: true },
    ],
    HIPAA: [
        { id: '164.308(a)(1)', title: 'Security Management Process', critical: true },
        { id: '164.308(a)(3)', title: 'Workforce Security', critical: true },
        { id: '164.308(a)(5)', title: 'Security Awareness and Training', critical: false },
        { id: '164.308(a)(6)', title: 'Security Incident Procedures', critical: true },
        { id: '164.312(a)(1)', title: 'Access Control', critical: true },
        { id: '164.312(b)', title: 'Audit Controls', critical: true },
        { id: '164.312(e)(1)', title: 'Transmission Security', critical: true },
    ],
};
export async function analyzeComplianceGap(params) {
    const { currentControls, targetFramework, includeRoadmap = true } = params;
    if (!aiClient.isConfigured()) {
        return useExplicitDemoFallback('AI service is not configured', () => generateMockGapAnalysis(currentControls, targetFramework, includeRoadmap));
    }
    const systemPrompt = `You are a compliance gap analysis expert. Analyze the gap between current controls and ${targetFramework} requirements.

Identify:
- Missing controls
- Partially implemented controls
- Documentation gaps
- Prioritized remediation actions

Return comprehensive gap analysis with actionable roadmap.`;
    try {
        const result = await aiClient.completeJSON([
            { role: 'system', content: systemPrompt },
            {
                role: 'user',
                content: `Analyze gaps for ${targetFramework}. Current controls: ${JSON.stringify(currentControls)}`,
            },
        ]);
        return {
            analyzedAt: new Date().toISOString(),
            ...result,
        };
    }
    catch (error) {
        return useExplicitDemoFallback(`AI gap analysis failed: ${error instanceof Error ? error.message : String(error)}`, () => generateMockGapAnalysis(currentControls, targetFramework, includeRoadmap));
    }
}
function generateMockGapAnalysis(currentControls, targetFramework, includeRoadmap) {
    const requirements = frameworkRequirements[targetFramework] || frameworkRequirements['SOC2'];
    const controlTitles = currentControls.map((c) => c.title.toLowerCase());
    const implementedControls = currentControls.filter((c) => c.status === 'implemented');
    const gaps = [];
    const coveredRequirements = [];
    for (const req of requirements) {
        const matchingControls = currentControls.filter((c) => c.title.toLowerCase().includes(req.title.toLowerCase().split(' ')[0]) ||
            controlTitles.some((t) => t.includes(req.id.toLowerCase())));
        if (matchingControls.length === 0) {
            gaps.push({
                requirement: req.id,
                requirementTitle: req.title,
                gapType: 'missing',
                severity: req.critical ? 'critical' : 'high',
                description: `No control currently addresses ${req.title}`,
                currentState: 'Not implemented',
                requiredState: `Control implemented to address ${req.id}`,
                remediationSteps: [
                    `Design control to address ${req.title}`,
                    'Implement technical or administrative control',
                    'Document control procedures',
                    'Test control effectiveness',
                ],
            });
        }
        else {
            const implemented = matchingControls.filter((c) => c.status === 'implemented');
            if (implemented.length === matchingControls.length) {
                coveredRequirements.push({
                    requirement: req.id,
                    requirementTitle: req.title,
                    coveringControls: matchingControls.map((c) => c.id),
                    coverageLevel: 'full',
                });
            }
            else {
                gaps.push({
                    requirement: req.id,
                    requirementTitle: req.title,
                    gapType: 'partial',
                    severity: req.critical ? 'high' : 'medium',
                    description: `Control exists but not fully implemented`,
                    currentState: 'Partially implemented',
                    requiredState: 'Fully implemented with documentation',
                    remediationSteps: [
                        'Complete control implementation',
                        'Document procedures',
                        'Test and validate',
                    ],
                });
            }
        }
    }
    const coveragePercentage = Math.round((coveredRequirements.length / requirements.length) * 100);
    const result = {
        analyzedAt: new Date().toISOString(),
        targetFramework,
        currentState: {
            totalControls: currentControls.length,
            implementedControls: implementedControls.length,
            partialControls: currentControls.filter((c) => c.status === 'partial').length,
            notImplementedControls: currentControls.filter((c) => c.status === 'not_implemented').length,
            coveragePercentage,
        },
        gaps,
        coveredRequirements,
        prioritizedActions: [
            ...gaps
                .filter((g) => g.severity === 'critical')
                .map((g) => `CRITICAL: Address ${g.requirement} - ${g.requirementTitle}`),
            ...gaps
                .filter((g) => g.severity === 'high')
                .slice(0, 3)
                .map((g) => `HIGH: Implement ${g.requirement} - ${g.requirementTitle}`),
        ],
        estimatedEffort: {
            totalWeeks: gaps.length * 2,
            totalCost: `$${gaps.length * 15000} - $${gaps.length * 30000}`,
            resourcesNeeded: ['Security Engineer', 'GRC Analyst', 'Project Manager'],
        },
    };
    if (includeRoadmap) {
        result.roadmap = {
            phases: [
                {
                    phase: 1,
                    name: 'Foundation & Critical Gaps',
                    duration: '4-6 weeks',
                    objectives: ['Address critical compliance gaps', 'Establish baseline controls'],
                    deliverables: ['Critical controls implemented', 'Initial documentation'],
                    requirements: gaps.filter((g) => g.severity === 'critical').map((g) => g.requirement),
                },
                {
                    phase: 2,
                    name: 'Core Controls Implementation',
                    duration: '6-8 weeks',
                    objectives: ['Implement high-priority controls', 'Develop procedures'],
                    deliverables: ['High-priority controls', 'Procedure documentation'],
                    requirements: gaps.filter((g) => g.severity === 'high').map((g) => g.requirement),
                },
                {
                    phase: 3,
                    name: 'Optimization & Documentation',
                    duration: '4-6 weeks',
                    objectives: ['Complete remaining controls', 'Finalize documentation'],
                    deliverables: ['Full control implementation', 'Audit-ready documentation'],
                    requirements: gaps
                        .filter((g) => g.severity === 'medium' || g.severity === 'low')
                        .map((g) => g.requirement),
                },
            ],
            milestones: [
                {
                    name: 'Critical Gaps Closed',
                    targetDate: '+6 weeks',
                    criteria: ['All critical gaps addressed'],
                },
                {
                    name: 'Core Controls Complete',
                    targetDate: '+14 weeks',
                    criteria: ['High-priority controls implemented'],
                },
                {
                    name: 'Audit Ready',
                    targetDate: '+20 weeks',
                    criteria: ['Full coverage achieved', 'Documentation complete'],
                },
            ],
            dependencies: [
                { from: 'Policy Framework', to: 'Control Implementation', type: 'prerequisite' },
                { from: 'Access Control', to: 'Monitoring', type: 'technical' },
            ],
        };
    }
    return result;
}
//# sourceMappingURL=gap-analyzer.js.map