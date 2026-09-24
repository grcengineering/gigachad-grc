import { aiClient } from './ai-client.js';
import { useExplicitDemoFallback } from '../demo-mode.js';
export async function prioritizeRemediation(params) {
    const { findings, constraints, prioritizationStrategy = 'balanced' } = params;
    if (!aiClient.isConfigured()) {
        return useExplicitDemoFallback('AI service is not configured', () => generateMockPrioritization(findings, constraints, prioritizationStrategy));
    }
    const systemPrompt = `You are a GRC remediation planning expert. Prioritize the provided findings based on the ${prioritizationStrategy} strategy.

Consider:
- Risk severity and business impact
- Implementation effort and dependencies
- Resource constraints: ${JSON.stringify(constraints || {})}
- Quick wins vs long-term improvements

Return JSON with prioritized findings organized into phases.`;
    try {
        const result = await aiClient.completeJSON([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Prioritize these findings: ${JSON.stringify(findings)}` },
        ]);
        return {
            prioritizedAt: new Date().toISOString(),
            ...result,
        };
    }
    catch (error) {
        return useExplicitDemoFallback(`AI remediation prioritization failed: ${error instanceof Error ? error.message : String(error)}`, () => generateMockPrioritization(findings, constraints, prioritizationStrategy));
    }
}
function generateMockPrioritization(findings, constraints, strategy) {
    const severityWeights = {
        critical: 10,
        high: 7,
        medium: 4,
        low: 2,
    };
    const effortWeights = {
        low: { weeks: 1, cost: 2000 },
        medium: { weeks: 3, cost: 10000 },
        high: { weeks: 6, cost: 30000 },
        very_high: { weeks: 12, cost: 75000 },
    };
    // Score and prioritize findings
    const prioritizedFindings = findings.map((finding, index) => {
        const severity = finding.severity?.toLowerCase() || 'medium';
        const effort = finding.estimatedEffort?.toLowerCase() || 'medium';
        const riskScore = severityWeights[severity] || 4;
        const effortScore = effort === 'low' ? 1 : effort === 'medium' ? 3 : effort === 'high' ? 5 : 7;
        // Value score based on strategy
        let valueScore;
        switch (strategy) {
            case 'risk_based':
                valueScore = riskScore * 2;
                break;
            case 'quick_wins':
                valueScore = (riskScore / effortScore) * 5;
                break;
            case 'compliance_deadline':
                valueScore = riskScore + (10 - index);
                break;
            default:
                valueScore = riskScore * 1.5 + 5 / effortScore;
        }
        const effortConfig = effortWeights[effort] || effortWeights.medium;
        return {
            id: finding.id,
            title: finding.title,
            priority: 0,
            priorityLabel: 'Medium',
            riskScore,
            effortScore,
            valueScore,
            recommendedPhase: 1,
            estimatedWeeks: effortConfig.weeks,
            estimatedCost: effortConfig.cost,
            rationale: `${severity} severity finding with ${effort} effort. ${strategy === 'risk_based' ? 'Prioritized by risk impact.' : strategy === 'quick_wins' ? 'Prioritized for quick resolution.' : 'Balanced prioritization applied.'}`,
            dependencies: [],
        };
    });
    // Sort by value score and assign priorities
    prioritizedFindings.sort((a, b) => b.valueScore - a.valueScore);
    prioritizedFindings.forEach((f, i) => {
        f.priority = i + 1;
        f.priorityLabel = i < 2 ? 'Critical' : i < 5 ? 'High' : i < 10 ? 'Medium' : 'Low';
        f.recommendedPhase = Math.ceil((i + 1) / 3);
    });
    // Organize into phases
    const maxPhases = constraints?.timeframeWeeks ? Math.ceil(constraints.timeframeWeeks / 4) : 3;
    const phases = [];
    for (let phase = 1; phase <= maxPhases; phase++) {
        const phaseFindings = prioritizedFindings.filter((f) => f.recommendedPhase === phase);
        if (phaseFindings.length === 0 && phase > 1)
            continue;
        phases.push({
            phase,
            name: phase === 1
                ? 'Critical & Quick Wins'
                : phase === 2
                    ? 'High Priority Items'
                    : 'Remaining Items',
            duration: `Weeks ${(phase - 1) * 4 + 1}-${phase * 4}`,
            findings: phaseFindings,
            milestones: [
                `Complete ${phaseFindings.length} remediation items`,
                `Validate controls effectiveness`,
                `Update compliance documentation`,
            ],
        });
    }
    // Calculate summary
    const totalEstimatedCost = prioritizedFindings.reduce((sum, f) => sum + f.estimatedCost, 0);
    const totalEstimatedWeeks = Math.max(...prioritizedFindings.map((f) => f.recommendedPhase * 4));
    return {
        prioritizedAt: new Date().toISOString(),
        strategy,
        totalFindings: findings.length,
        phases,
        summary: {
            totalEstimatedCost,
            totalEstimatedWeeks,
            criticalFindings: prioritizedFindings.filter((f) => f.priorityLabel === 'Critical').length,
            highFindings: prioritizedFindings.filter((f) => f.priorityLabel === 'High').length,
            mediumFindings: prioritizedFindings.filter((f) => f.priorityLabel === 'Medium').length,
            lowFindings: prioritizedFindings.filter((f) => f.priorityLabel === 'Low').length,
        },
        recommendations: [
            'Address critical findings immediately to reduce risk exposure',
            'Allocate dedicated resources for Phase 1 remediation',
            'Establish regular progress reviews with stakeholders',
            'Document all remediation activities for audit trail',
        ],
        resourceRequirements: [
            { resource: 'Security Engineer', quantity: 2, notes: 'For technical implementation' },
            { resource: 'GRC Analyst', quantity: 1, notes: 'For documentation and validation' },
            { resource: 'Project Manager', quantity: 1, notes: 'For coordination and tracking' },
        ],
    };
}
//# sourceMappingURL=remediation-prioritizer.js.map