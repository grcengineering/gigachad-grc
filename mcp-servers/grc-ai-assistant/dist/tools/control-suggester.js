import { aiClient } from './ai-client.js';
import { useExplicitDemoFallback } from '../demo-mode.js';
export async function suggestControls(params) {
    const { risk, frameworks = [], maxSuggestions = 5 } = params;
    if (!aiClient.isConfigured()) {
        return useExplicitDemoFallback('AI service is not configured', () => generateMockSuggestions(risk, frameworks, maxSuggestions));
    }
    const systemPrompt = `You are a GRC expert specializing in control design and implementation.
Suggest appropriate controls to mitigate the provided risk.

For each control, consider:
- Control type (preventive, detective, corrective, compensating)
- Implementation feasibility
- Alignment with compliance frameworks: ${frameworks.join(', ') || 'SOC 2, ISO 27001'}
- Cost-effectiveness

Return JSON with structure:
{
  "suggestions": [{
    "controlId": string,
    "title": string,
    "description": string,
    "type": "preventive" | "detective" | "corrective" | "compensating",
    "category": string,
    "implementation": { "steps": [string], "estimatedEffort": string, "estimatedCost": string, "prerequisites": [string] },
    "effectiveness": { "likelihoodReduction": number (1-5), "impactReduction": number (1-5), "overallEffectiveness": string },
    "frameworkMappings": [{ "framework": string, "requirement": string }],
    "priority": "critical" | "high" | "medium" | "low",
    "rationale": string
  }],
  "quickWins": [string],
  "longTermStrategies": [string]
}`;
    try {
        const result = await aiClient.completeJSON([
            { role: 'system', content: systemPrompt },
            {
                role: 'user',
                content: `Suggest up to ${maxSuggestions} controls for this risk:\nTitle: ${risk.title}\nDescription: ${risk.description}\nCategory: ${risk.category || 'General'}\nCurrent Likelihood: ${risk.currentLikelihood || 'Unknown'}\nCurrent Impact: ${risk.currentImpact || 'Unknown'}`,
            },
        ]);
        return {
            riskTitle: risk.title,
            analyzedAt: new Date().toISOString(),
            ...result,
        };
    }
    catch (error) {
        return useExplicitDemoFallback(`AI control suggestion failed: ${error instanceof Error ? error.message : String(error)}`, () => generateMockSuggestions(risk, frameworks, maxSuggestions));
    }
}
function generateMockSuggestions(risk, frameworks, maxSuggestions) {
    const mockControls = [
        {
            controlId: 'CTRL-001',
            title: 'Access Control Policy Implementation',
            description: 'Implement role-based access control (RBAC) to restrict access to sensitive resources',
            type: 'preventive',
            category: 'Access Management',
            implementation: {
                steps: [
                    'Define roles and permissions',
                    'Implement RBAC system',
                    'Configure access rules',
                    'Test and validate',
                ],
                estimatedEffort: '2-4 weeks',
                estimatedCost: '$5,000 - $15,000',
                prerequisites: ['Identity management system', 'Documented access requirements'],
            },
            effectiveness: {
                likelihoodReduction: 2,
                impactReduction: 1,
                overallEffectiveness: 'High',
            },
            frameworkMappings: [
                { framework: 'SOC 2', requirement: 'CC6.1' },
                { framework: 'ISO 27001', requirement: 'A.9.1.1' },
            ],
            priority: 'high',
            rationale: 'Access control is fundamental to reducing unauthorized access risks',
        },
        {
            controlId: 'CTRL-002',
            title: 'Security Monitoring and Logging',
            description: 'Implement comprehensive logging and monitoring for security events',
            type: 'detective',
            category: 'Monitoring',
            implementation: {
                steps: [
                    'Deploy SIEM solution',
                    'Configure log collection',
                    'Set up alerts',
                    'Establish response procedures',
                ],
                estimatedEffort: '4-8 weeks',
                estimatedCost: '$20,000 - $50,000',
                prerequisites: ['Log aggregation infrastructure', 'Alert response team'],
            },
            effectiveness: {
                likelihoodReduction: 1,
                impactReduction: 2,
                overallEffectiveness: 'High',
            },
            frameworkMappings: [
                { framework: 'SOC 2', requirement: 'CC7.2' },
                { framework: 'ISO 27001', requirement: 'A.12.4.1' },
            ],
            priority: 'high',
            rationale: 'Early detection reduces the impact of security incidents',
        },
        {
            controlId: 'CTRL-003',
            title: 'Incident Response Plan',
            description: 'Develop and test incident response procedures',
            type: 'corrective',
            category: 'Incident Management',
            implementation: {
                steps: ['Draft IR plan', 'Form IR team', 'Conduct tabletop exercises', 'Refine procedures'],
                estimatedEffort: '2-3 weeks',
                estimatedCost: '$2,000 - $8,000',
                prerequisites: ['Executive sponsorship', 'Documented contact information'],
            },
            effectiveness: {
                likelihoodReduction: 0,
                impactReduction: 3,
                overallEffectiveness: 'Medium',
            },
            frameworkMappings: [
                { framework: 'SOC 2', requirement: 'CC7.4' },
                { framework: 'ISO 27001', requirement: 'A.16.1.5' },
            ],
            priority: 'medium',
            rationale: 'Proper incident response minimizes damage from security events',
        },
        {
            controlId: 'CTRL-004',
            title: 'Security Awareness Training',
            description: 'Implement ongoing security awareness program for all employees',
            type: 'preventive',
            category: 'Human Resources',
            implementation: {
                steps: [
                    'Select training platform',
                    'Develop content',
                    'Roll out training',
                    'Track completion',
                ],
                estimatedEffort: '3-4 weeks',
                estimatedCost: '$3,000 - $10,000',
                prerequisites: ['HR support', 'Training budget'],
            },
            effectiveness: {
                likelihoodReduction: 2,
                impactReduction: 1,
                overallEffectiveness: 'Medium',
            },
            frameworkMappings: [
                { framework: 'SOC 2', requirement: 'CC1.4' },
                { framework: 'ISO 27001', requirement: 'A.7.2.2' },
            ],
            priority: 'medium',
            rationale: 'Human error is a major factor in security incidents',
        },
        {
            controlId: 'CTRL-005',
            title: 'Data Encryption',
            description: 'Encrypt sensitive data at rest and in transit',
            type: 'preventive',
            category: 'Data Protection',
            implementation: {
                steps: [
                    'Identify sensitive data',
                    'Select encryption standards',
                    'Implement encryption',
                    'Manage keys',
                ],
                estimatedEffort: '4-6 weeks',
                estimatedCost: '$10,000 - $30,000',
                prerequisites: ['Data classification', 'Key management infrastructure'],
            },
            effectiveness: {
                likelihoodReduction: 1,
                impactReduction: 3,
                overallEffectiveness: 'High',
            },
            frameworkMappings: [
                { framework: 'SOC 2', requirement: 'CC6.7' },
                { framework: 'ISO 27001', requirement: 'A.10.1.1' },
            ],
            priority: 'high',
            rationale: 'Encryption protects data even if other controls fail',
        },
    ];
    return {
        riskTitle: risk.title,
        analyzedAt: new Date().toISOString(),
        suggestions: mockControls.slice(0, maxSuggestions),
        quickWins: [
            'Enable MFA for all user accounts',
            'Review and revoke unnecessary access permissions',
            'Update security policies and communicate to staff',
        ],
        longTermStrategies: [
            'Implement zero trust architecture',
            'Establish continuous compliance monitoring',
            'Develop security champions program',
        ],
    };
}
//# sourceMappingURL=control-suggester.js.map