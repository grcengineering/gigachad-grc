import { requireExplicitDemoMode } from '../demo-mode.js';
// HIPAA Requirements by Rule Type
const hipaaRequirements = {
    security: {
        description: 'HIPAA Security Rule - Administrative, Physical, and Technical Safeguards',
        requirements: [
            // Administrative Safeguards (45 CFR 164.308)
            { id: '164.308(a)(1)', name: 'Security Management Process', safeguard: 'administrative' },
            {
                id: '164.308(a)(2)',
                name: 'Assigned Security Responsibility',
                safeguard: 'administrative',
            },
            { id: '164.308(a)(3)', name: 'Workforce Security', safeguard: 'administrative' },
            { id: '164.308(a)(4)', name: 'Information Access Management', safeguard: 'administrative' },
            { id: '164.308(a)(5)', name: 'Security Awareness and Training', safeguard: 'administrative' },
            { id: '164.308(a)(6)', name: 'Security Incident Procedures', safeguard: 'administrative' },
            { id: '164.308(a)(7)', name: 'Contingency Plan', safeguard: 'administrative' },
            { id: '164.308(a)(8)', name: 'Evaluation', safeguard: 'administrative' },
            { id: '164.308(b)(1)', name: 'Business Associate Contracts', safeguard: 'administrative' },
            // Physical Safeguards (45 CFR 164.310)
            { id: '164.310(a)(1)', name: 'Facility Access Controls', safeguard: 'physical' },
            { id: '164.310(b)', name: 'Workstation Use', safeguard: 'physical' },
            { id: '164.310(c)', name: 'Workstation Security', safeguard: 'physical' },
            { id: '164.310(d)(1)', name: 'Device and Media Controls', safeguard: 'physical' },
            // Technical Safeguards (45 CFR 164.312)
            { id: '164.312(a)(1)', name: 'Access Control', safeguard: 'technical' },
            { id: '164.312(b)', name: 'Audit Controls', safeguard: 'technical' },
            { id: '164.312(c)(1)', name: 'Integrity', safeguard: 'technical' },
            { id: '164.312(d)', name: 'Person or Entity Authentication', safeguard: 'technical' },
            { id: '164.312(e)(1)', name: 'Transmission Security', safeguard: 'technical' },
        ],
    },
    privacy: {
        description: 'HIPAA Privacy Rule - Use and Disclosure of PHI',
        requirements: [
            { id: '164.502', name: 'Uses and Disclosures of PHI' },
            { id: '164.504', name: 'Uses and Disclosures: Organizational Requirements' },
            { id: '164.506', name: 'Uses and Disclosures for Treatment, Payment, Healthcare Operations' },
            { id: '164.508', name: 'Uses and Disclosures Requiring Authorization' },
            { id: '164.510', name: 'Uses and Disclosures Requiring Opportunity to Agree or Object' },
            { id: '164.512', name: 'Uses and Disclosures for Which Authorization Not Required' },
            { id: '164.514', name: 'Other Requirements Relating to Uses and Disclosures' },
            { id: '164.520', name: 'Notice of Privacy Practices' },
            { id: '164.522', name: 'Rights to Request Privacy Protection' },
            { id: '164.524', name: 'Access of Individuals to PHI' },
            { id: '164.526', name: 'Amendment of PHI' },
            { id: '164.528', name: 'Accounting of Disclosures' },
            { id: '164.530', name: 'Administrative Requirements' },
        ],
    },
    breach_notification: {
        description: 'HIPAA Breach Notification Rule',
        requirements: [
            { id: '164.400', name: 'Definitions' },
            { id: '164.402', name: 'Definitions (Breach)' },
            { id: '164.404', name: 'Notification to Individuals' },
            { id: '164.406', name: 'Notification to the Media' },
            { id: '164.408', name: 'Notification to the Secretary' },
            { id: '164.410', name: 'Notification by Business Associate' },
            { id: '164.412', name: 'Law Enforcement Delay' },
            { id: '164.414', name: 'Administrative Requirements and Burden of Proof' },
        ],
    },
};
export async function checkHIPAAControls(params) {
    requireExplicitDemoMode('HIPAA automated compliance checking');
    const { ruleTypes = ['security', 'privacy', 'breach_notification'], safeguards } = params;
    const ruleResults = [];
    const findings = [];
    let totalScore = 0;
    let totalWeight = 0;
    for (const ruleType of ruleTypes) {
        const rule = hipaaRequirements[ruleType];
        if (!rule)
            continue;
        const requirementResults = [];
        let ruleScore = 0;
        // Filter by safeguard type if specified (only applies to security rule)
        let requirementsToCheck = rule.requirements;
        if (safeguards && safeguards.length > 0 && ruleType === 'security') {
            requirementsToCheck = rule.requirements.filter((r) => r.safeguard &&
                safeguards.includes(r.safeguard));
        }
        for (const requirement of requirementsToCheck) {
            // Simulate requirement check
            const random = Math.random();
            let status;
            let score;
            const reqFindings = [];
            if (random > 0.7) {
                status = 'implemented';
                score = 100;
                reqFindings.push('Requirement implemented with documented evidence');
            }
            else if (random > 0.4) {
                status = 'partially_implemented';
                score = 55;
                reqFindings.push('Requirement partially addressed');
                findings.push({
                    requirement: requirement.id,
                    severity: 'medium',
                    finding: `${requirement.name}: Requirement partially met`,
                    recommendation: `Complete implementation of ${requirement.id}`,
                });
            }
            else if (random > 0.15) {
                status = 'not_implemented';
                score = 0;
                reqFindings.push('Requirement not implemented');
                findings.push({
                    requirement: requirement.id,
                    severity: 'high',
                    finding: `${requirement.name}: Requirement not met`,
                    recommendation: `Implement ${requirement.id} - ${requirement.name}`,
                });
            }
            else {
                status = 'not_implemented';
                score = 0;
                reqFindings.push('Critical: PHI at risk');
                findings.push({
                    requirement: requirement.id,
                    severity: 'critical',
                    finding: `${requirement.name}: Critical gap - PHI may be at risk`,
                    recommendation: `URGENT: Implement ${requirement.id} immediately`,
                });
            }
            ruleScore += score;
            requirementResults.push({
                id: requirement.id,
                name: requirement.name,
                status,
                score,
                findings: reqFindings,
            });
        }
        const avgRuleScore = requirementsToCheck.length > 0 ? Math.round(ruleScore / requirementsToCheck.length) : 0;
        ruleResults.push({
            rule: ruleType,
            description: rule.description,
            score: avgRuleScore,
            status: avgRuleScore >= 80 ? 'Compliant' : avgRuleScore >= 50 ? 'Partial' : 'Non-Compliant',
            requirements: requirementResults,
        });
        totalScore += avgRuleScore;
        totalWeight++;
    }
    const overallScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
    // Generate recommendations
    const recommendations = [];
    const criticalFindings = findings.filter((f) => f.severity === 'critical');
    const highFindings = findings.filter((f) => f.severity === 'high');
    if (criticalFindings.length > 0) {
        recommendations.push(`URGENT: Address ${criticalFindings.length} critical finding(s) - PHI at risk`);
    }
    if (highFindings.length > 0) {
        recommendations.push(`HIGH: Remediate ${highFindings.length} high-priority finding(s) within 30 days`);
    }
    if (overallScore < 80) {
        recommendations.push('Conduct comprehensive HIPAA risk assessment');
        recommendations.push('Consider engaging HIPAA compliance consultant');
    }
    const securityRule = ruleResults.find((r) => r.rule === 'security');
    if (securityRule && securityRule.score < 70) {
        recommendations.push('Prioritize Security Rule compliance - focus on technical safeguards');
    }
    return {
        framework: 'HIPAA',
        checkedAt: new Date().toISOString(),
        rules: ruleResults,
        overallScore,
        status: overallScore >= 80
            ? 'compliant'
            : overallScore >= 50
                ? 'partially_compliant'
                : 'non_compliant',
        findings,
        recommendations,
    };
}
//# sourceMappingURL=hipaa-checks.js.map