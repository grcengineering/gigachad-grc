import { requireExplicitDemoMode } from '../demo-mode.js';
// SOC 2 Trust Service Criteria definitions
const trustServiceCriteria = {
    security: {
        description: 'Information and systems are protected against unauthorized access',
        controlPoints: [
            {
                id: 'CC1.1',
                name: 'COSO Principle 1',
                description: 'Demonstrates commitment to integrity and ethical values',
            },
            {
                id: 'CC1.2',
                name: 'COSO Principle 2',
                description: 'Board exercises oversight responsibility',
            },
            {
                id: 'CC1.3',
                name: 'COSO Principle 3',
                description: 'Management establishes structure, authority, and responsibility',
            },
            {
                id: 'CC1.4',
                name: 'COSO Principle 4',
                description: 'Demonstrates commitment to competence',
            },
            { id: 'CC1.5', name: 'COSO Principle 5', description: 'Enforces accountability' },
            {
                id: 'CC2.1',
                name: 'Information & Communication',
                description: 'Obtains or generates relevant information',
            },
            { id: 'CC2.2', name: 'Internal Communication', description: 'Communicates internally' },
            {
                id: 'CC2.3',
                name: 'External Communication',
                description: 'Communicates with external parties',
            },
            { id: 'CC3.1', name: 'Risk Objectives', description: 'Specifies objectives' },
            { id: 'CC3.2', name: 'Risk Identification', description: 'Identifies and analyzes risk' },
            { id: 'CC3.3', name: 'Fraud Risk', description: 'Considers potential for fraud' },
            { id: 'CC3.4', name: 'Change Analysis', description: 'Identifies and assesses changes' },
            {
                id: 'CC4.1',
                name: 'Monitoring',
                description: 'Selects and develops monitoring activities',
            },
            { id: 'CC4.2', name: 'Evaluation', description: 'Evaluates and communicates deficiencies' },
            {
                id: 'CC5.1',
                name: 'Control Selection',
                description: 'Selects and develops control activities',
            },
            {
                id: 'CC5.2',
                name: 'Technology Controls',
                description: 'Selects and develops technology controls',
            },
            {
                id: 'CC5.3',
                name: 'Policy & Procedures',
                description: 'Deploys through policies and procedures',
            },
            { id: 'CC6.1', name: 'Logical Access', description: 'Implements logical access security' },
            { id: 'CC6.2', name: 'Access Registration', description: 'Manages access credentials' },
            {
                id: 'CC6.3',
                name: 'Access Removal',
                description: 'Removes access when no longer required',
            },
            { id: 'CC6.4', name: 'Access Review', description: 'Reviews access periodically' },
            { id: 'CC6.5', name: 'Physical Access', description: 'Restricts physical access' },
            { id: 'CC6.6', name: 'Boundary Protection', description: 'Manages system boundaries' },
            { id: 'CC6.7', name: 'Transmission Protection', description: 'Protects data transmissions' },
            { id: 'CC6.8', name: 'Malicious Software', description: 'Prevents malicious software' },
            {
                id: 'CC7.1',
                name: 'Infrastructure Management',
                description: 'Manages infrastructure and software',
            },
            { id: 'CC7.2', name: 'System Monitoring', description: 'Detects anomalies' },
            { id: 'CC7.3', name: 'Security Event Evaluation', description: 'Evaluates security events' },
            { id: 'CC7.4', name: 'Incident Response', description: 'Responds to security incidents' },
            { id: 'CC7.5', name: 'Incident Recovery', description: 'Recovers from security incidents' },
            { id: 'CC8.1', name: 'Change Management', description: 'Manages changes' },
            { id: 'CC9.1', name: 'Risk Mitigation', description: 'Identifies and mitigates risk' },
            { id: 'CC9.2', name: 'Vendor Management', description: 'Assesses and manages vendors' },
        ],
    },
    availability: {
        description: 'Information and systems are available for operation and use',
        controlPoints: [
            {
                id: 'A1.1',
                name: 'Capacity Planning',
                description: 'Maintains capacity to meet commitments',
            },
            {
                id: 'A1.2',
                name: 'Environmental Protections',
                description: 'Protects against environmental threats',
            },
            { id: 'A1.3', name: 'Recovery Procedures', description: 'Supports recovery from incidents' },
        ],
    },
    processing_integrity: {
        description: 'System processing is complete, valid, accurate, timely, and authorized',
        controlPoints: [
            { id: 'PI1.1', name: 'Processing Accuracy', description: 'Validates input data' },
            { id: 'PI1.2', name: 'Processing Completeness', description: 'Processes data completely' },
            { id: 'PI1.3', name: 'Processing Timeliness', description: 'Processes data timely' },
            { id: 'PI1.4', name: 'Output Integrity', description: 'Validates output data' },
            { id: 'PI1.5', name: 'Error Handling', description: 'Handles errors appropriately' },
        ],
    },
    confidentiality: {
        description: 'Information designated as confidential is protected',
        controlPoints: [
            {
                id: 'C1.1',
                name: 'Confidential Information Identification',
                description: 'Identifies confidential information',
            },
            {
                id: 'C1.2',
                name: 'Confidential Information Destruction',
                description: 'Destroys confidential information',
            },
        ],
    },
    privacy: {
        description: 'Personal information is collected, used, retained, disclosed, and disposed of properly',
        controlPoints: [
            {
                id: 'P1.1',
                name: 'Privacy Notice',
                description: 'Provides notice about privacy practices',
            },
            {
                id: 'P2.1',
                name: 'Choice and Consent',
                description: 'Describes choices about data collection',
            },
            {
                id: 'P3.1',
                name: 'Data Collection',
                description: 'Collects personal information lawfully',
            },
            { id: 'P3.2', name: 'Data Sources', description: 'Informs about data sources' },
            { id: 'P4.1', name: 'Data Use', description: 'Uses personal information as described' },
            { id: 'P4.2', name: 'Data Retention', description: 'Retains data appropriately' },
            { id: 'P4.3', name: 'Data Disposal', description: 'Disposes of data securely' },
            { id: 'P5.1', name: 'Data Access', description: 'Grants access to data subjects' },
            { id: 'P5.2', name: 'Data Correction', description: 'Allows data correction' },
            {
                id: 'P6.1',
                name: 'Third-Party Disclosure',
                description: 'Manages third-party disclosures',
            },
            { id: 'P6.2', name: 'Disclosure Authorization', description: 'Authorizes disclosures' },
            { id: 'P7.1', name: 'Data Quality', description: 'Maintains data quality' },
            { id: 'P8.1', name: 'Complaints and Disputes', description: 'Handles complaints' },
        ],
    },
};
export async function checkSOC2Controls(params) {
    requireExplicitDemoMode('SOC 2 automated compliance checking');
    const { trustServiceCategories = ['security'], controlPoints: specificControlPoints } = params;
    const categories = [];
    const findings = [];
    let totalScore = 0;
    let totalWeight = 0;
    for (const category of trustServiceCategories) {
        const criteria = trustServiceCriteria[category];
        if (!criteria)
            continue;
        const controlPointResults = [];
        let categoryScore = 0;
        // Filter control points if specific ones are requested
        let controlsToCheck = criteria.controlPoints;
        if (specificControlPoints && specificControlPoints.length > 0) {
            controlsToCheck = criteria.controlPoints.filter((cp) => specificControlPoints.includes(cp.id));
        }
        for (const cp of controlsToCheck) {
            // Simulate control check (in real implementation, this would check actual evidence)
            const random = Math.random();
            let status;
            let score;
            const cpFindings = [];
            if (random > 0.75) {
                status = 'implemented';
                score = 100;
                cpFindings.push('Control fully implemented with documented evidence');
            }
            else if (random > 0.45) {
                status = 'partially_implemented';
                score = 60;
                cpFindings.push('Control partially implemented');
                findings.push({
                    controlPoint: cp.id,
                    severity: 'medium',
                    finding: `${cp.name}: Control is partially implemented`,
                    recommendation: `Complete implementation of ${cp.id} - ${cp.description}`,
                });
            }
            else if (random > 0.2) {
                status = 'not_implemented';
                score = 0;
                cpFindings.push('Control not implemented');
                findings.push({
                    controlPoint: cp.id,
                    severity: 'high',
                    finding: `${cp.name}: Control is not implemented`,
                    recommendation: `Implement ${cp.id} - ${cp.description}`,
                });
            }
            else {
                status = 'not_implemented';
                score = 0;
                cpFindings.push('Critical gap - control not implemented');
                findings.push({
                    controlPoint: cp.id,
                    severity: 'critical',
                    finding: `${cp.name}: Critical gap - control is missing`,
                    recommendation: `URGENT: Implement ${cp.id} - ${cp.description}`,
                });
            }
            categoryScore += score;
            controlPointResults.push({
                id: cp.id,
                name: cp.name,
                status,
                score,
                findings: cpFindings,
            });
        }
        const avgCategoryScore = controlsToCheck.length > 0 ? Math.round(categoryScore / controlsToCheck.length) : 0;
        categories.push({
            category,
            description: criteria.description,
            score: avgCategoryScore,
            status: avgCategoryScore >= 80 ? 'Compliant' : avgCategoryScore >= 50 ? 'Partial' : 'Non-Compliant',
            controlPoints: controlPointResults,
        });
        totalScore += avgCategoryScore;
        totalWeight++;
    }
    const overallScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
    // Generate recommendations
    const recommendations = [];
    const criticalFindings = findings.filter((f) => f.severity === 'critical');
    const highFindings = findings.filter((f) => f.severity === 'high');
    if (criticalFindings.length > 0) {
        recommendations.push(`URGENT: Address ${criticalFindings.length} critical finding(s) immediately`);
    }
    if (highFindings.length > 0) {
        recommendations.push(`HIGH: Remediate ${highFindings.length} high-priority finding(s) within 30 days`);
    }
    if (overallScore < 80) {
        recommendations.push('Engage SOC 2 auditor for readiness assessment');
    }
    if (categories.some((c) => c.score < 50)) {
        recommendations.push('Prioritize categories with score below 50%');
    }
    return {
        framework: 'SOC2',
        checkedAt: new Date().toISOString(),
        categories,
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
//# sourceMappingURL=soc2-checks.js.map