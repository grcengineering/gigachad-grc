import { aiClient } from './ai-client.js';
import { useExplicitDemoFallback } from '../demo-mode.js';
export async function analyzeRisk(params) {
    const { riskDescription, context, includeQuantitative } = params;
    const riskId = `risk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    if (!aiClient.isConfigured()) {
        return useExplicitDemoFallback('AI service is not configured', () => generateMockAnalysis(riskId, riskDescription, includeQuantitative));
    }
    const systemPrompt = `You are an expert GRC (Governance, Risk, and Compliance) analyst. 
Analyze the provided risk and return a comprehensive assessment in JSON format.

Consider:
- Risk likelihood on a 1-5 scale (1=Rare, 2=Unlikely, 3=Possible, 4=Likely, 5=Almost Certain)
- Risk impact on a 1-5 scale (1=Negligible, 2=Minor, 3=Moderate, 4=Major, 5=Catastrophic)
- Risk score = Likelihood x Impact (1-25 scale)
- Risk level: Low (1-5), Medium (6-10), High (11-15), Critical (16-25)

${context?.industry ? `Industry: ${context.industry}` : ''}
${context?.organizationSize ? `Organization Size: ${context.organizationSize}` : ''}
${context?.frameworks?.length ? `Compliance Frameworks: ${context.frameworks.join(', ')}` : ''}
${context?.existingControls?.length ? `Existing Controls: ${context.existingControls.join(', ')}` : ''}

Return JSON with this structure:
{
  "qualitativeAnalysis": {
    "inherentRisk": { "likelihood": string, "likelihoodScore": number, "impact": string, "impactScore": number, "riskLevel": string, "riskScore": number },
    "residualRisk": { "likelihood": string, "likelihoodScore": number, "impact": string, "impactScore": number, "riskLevel": string, "riskScore": number },
    "riskCategory": string,
    "riskOwnerSuggestion": string
  },
  ${includeQuantitative ? `"quantitativeAnalysis": { "annualizedLossExpectancy": number, "singleLossExpectancy": number, "annualRateOfOccurrence": number, "assetValue": number, "exposureFactor": number, "costOfControls": number, "riskReductionBenefit": number },` : ''}
  "mitigationStrategies": [{ "strategy": string, "type": string, "effectiveness": string, "estimatedCost": string, "implementation": [string], "timeline": string }],
  "relatedRisks": [string],
  "complianceImpact": [{ "framework": string, "affectedControls": [string], "impact": string }],
  "rationale": string
}`;
    const userPrompt = `Analyze this risk: "${riskDescription}"`;
    try {
        const analysis = await aiClient.completeJSON([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ]);
        return {
            riskId,
            analyzedAt: new Date().toISOString(),
            ...analysis,
        };
    }
    catch (error) {
        return useExplicitDemoFallback(`AI risk analysis failed: ${error instanceof Error ? error.message : String(error)}`, () => generateMockAnalysis(riskId, riskDescription, includeQuantitative));
    }
}
function generateMockAnalysis(riskId, riskDescription, includeQuantitative) {
    // Generate deterministic but varied scores based on description
    const descHash = riskDescription
        .split('')
        .reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
    const likelihood = Math.abs(descHash % 5) + 1;
    const impact = Math.abs((descHash >> 3) % 5) + 1;
    const inherentScore = likelihood * impact;
    const likelihoodLabels = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
    const impactLabels = ['Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic'];
    const getRiskLevel = (score) => {
        if (score <= 5)
            return 'Low';
        if (score <= 10)
            return 'Medium';
        if (score <= 15)
            return 'High';
        return 'Critical';
    };
    const residualLikelihood = Math.max(1, likelihood - 1);
    const residualImpact = Math.max(1, impact - 1);
    const residualScore = residualLikelihood * residualImpact;
    const result = {
        riskId,
        analyzedAt: new Date().toISOString(),
        qualitativeAnalysis: {
            inherentRisk: {
                likelihood: likelihoodLabels[likelihood - 1],
                likelihoodScore: likelihood,
                impact: impactLabels[impact - 1],
                impactScore: impact,
                riskLevel: getRiskLevel(inherentScore),
                riskScore: inherentScore,
            },
            residualRisk: {
                likelihood: likelihoodLabels[residualLikelihood - 1],
                likelihoodScore: residualLikelihood,
                impact: impactLabels[residualImpact - 1],
                impactScore: residualImpact,
                riskLevel: getRiskLevel(residualScore),
                riskScore: residualScore,
            },
            riskCategory: 'Operational',
            riskOwnerSuggestion: 'Information Security Manager',
        },
        mitigationStrategies: [
            {
                strategy: 'Implement technical controls',
                type: 'mitigate',
                effectiveness: 'High',
                estimatedCost: '$10,000 - $50,000',
                implementation: [
                    'Deploy security monitoring',
                    'Implement access controls',
                    'Configure audit logging',
                ],
                timeline: '3-6 months',
            },
            {
                strategy: 'Transfer risk through insurance',
                type: 'transfer',
                effectiveness: 'Medium',
                estimatedCost: '$5,000 - $20,000 annually',
                implementation: ['Evaluate cyber insurance options', 'Document risk transfer strategy'],
                timeline: '1-2 months',
            },
        ],
        relatedRisks: ['Data breach', 'Compliance violation', 'Business continuity disruption'],
        complianceImpact: [
            {
                framework: 'SOC 2',
                affectedControls: ['CC6.1', 'CC6.6', 'CC7.2'],
                impact: 'High - Direct impact on security and availability criteria',
            },
            {
                framework: 'ISO 27001',
                affectedControls: ['A.8.2', 'A.12.4', 'A.16.1'],
                impact: 'Medium - Affects technical and operational controls',
            },
        ],
        rationale: `This risk analysis is based on the description provided. The inherent risk score of ${inherentScore} (${getRiskLevel(inherentScore)}) reflects the potential impact before controls. With appropriate mitigation strategies, the residual risk can be reduced to ${residualScore} (${getRiskLevel(residualScore)}).`,
    };
    if (includeQuantitative) {
        const assetValue = 1000000;
        const exposureFactor = 0.3;
        const aro = likelihood / 5;
        const sle = assetValue * exposureFactor;
        const ale = sle * aro;
        result.quantitativeAnalysis = {
            annualizedLossExpectancy: Math.round(ale),
            singleLossExpectancy: Math.round(sle),
            annualRateOfOccurrence: Math.round(aro * 100) / 100,
            assetValue,
            exposureFactor,
            costOfControls: Math.round(ale * 0.3),
            riskReductionBenefit: Math.round(ale * 0.7),
        };
    }
    return result;
}
//# sourceMappingURL=risk-analyzer.js.map