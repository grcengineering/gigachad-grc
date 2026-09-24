import { requireExplicitDemoMode } from '../demo-mode.js';
// ISO 27001:2022 Annex A Controls
const annexAControls = {
    'A.5': {
        description: 'Organizational controls',
        controls: [
            { id: 'A.5.1', name: 'Policies for information security' },
            { id: 'A.5.2', name: 'Information security roles and responsibilities' },
            { id: 'A.5.3', name: 'Segregation of duties' },
            { id: 'A.5.4', name: 'Management responsibilities' },
            { id: 'A.5.5', name: 'Contact with authorities' },
            { id: 'A.5.6', name: 'Contact with special interest groups' },
            { id: 'A.5.7', name: 'Threat intelligence' },
            { id: 'A.5.8', name: 'Information security in project management' },
            { id: 'A.5.9', name: 'Inventory of information and other associated assets' },
            { id: 'A.5.10', name: 'Acceptable use of information and other associated assets' },
            { id: 'A.5.11', name: 'Return of assets' },
            { id: 'A.5.12', name: 'Classification of information' },
            { id: 'A.5.13', name: 'Labelling of information' },
            { id: 'A.5.14', name: 'Information transfer' },
            { id: 'A.5.15', name: 'Access control' },
            { id: 'A.5.16', name: 'Identity management' },
            { id: 'A.5.17', name: 'Authentication information' },
            { id: 'A.5.18', name: 'Access rights' },
            { id: 'A.5.19', name: 'Information security in supplier relationships' },
            { id: 'A.5.20', name: 'Addressing information security within supplier agreements' },
            { id: 'A.5.21', name: 'Managing information security in the ICT supply chain' },
            { id: 'A.5.22', name: 'Monitoring, review and change management of supplier services' },
            { id: 'A.5.23', name: 'Information security for use of cloud services' },
            { id: 'A.5.24', name: 'Information security incident management planning and preparation' },
            { id: 'A.5.25', name: 'Assessment and decision on information security events' },
            { id: 'A.5.26', name: 'Response to information security incidents' },
            { id: 'A.5.27', name: 'Learning from information security incidents' },
            { id: 'A.5.28', name: 'Collection of evidence' },
            { id: 'A.5.29', name: 'Information security during disruption' },
            { id: 'A.5.30', name: 'ICT readiness for business continuity' },
            { id: 'A.5.31', name: 'Legal, statutory, regulatory and contractual requirements' },
            { id: 'A.5.32', name: 'Intellectual property rights' },
            { id: 'A.5.33', name: 'Protection of records' },
            { id: 'A.5.34', name: 'Privacy and protection of PII' },
            { id: 'A.5.35', name: 'Independent review of information security' },
            {
                id: 'A.5.36',
                name: 'Compliance with policies, rules and standards for information security',
            },
            { id: 'A.5.37', name: 'Documented operating procedures' },
        ],
    },
    'A.6': {
        description: 'People controls',
        controls: [
            { id: 'A.6.1', name: 'Screening' },
            { id: 'A.6.2', name: 'Terms and conditions of employment' },
            { id: 'A.6.3', name: 'Information security awareness, education and training' },
            { id: 'A.6.4', name: 'Disciplinary process' },
            { id: 'A.6.5', name: 'Responsibilities after termination or change of employment' },
            { id: 'A.6.6', name: 'Confidentiality or non-disclosure agreements' },
            { id: 'A.6.7', name: 'Remote working' },
            { id: 'A.6.8', name: 'Information security event reporting' },
        ],
    },
    'A.7': {
        description: 'Physical controls',
        controls: [
            { id: 'A.7.1', name: 'Physical security perimeters' },
            { id: 'A.7.2', name: 'Physical entry' },
            { id: 'A.7.3', name: 'Securing offices, rooms and facilities' },
            { id: 'A.7.4', name: 'Physical security monitoring' },
            { id: 'A.7.5', name: 'Protecting against physical and environmental threats' },
            { id: 'A.7.6', name: 'Working in secure areas' },
            { id: 'A.7.7', name: 'Clear desk and clear screen' },
            { id: 'A.7.8', name: 'Equipment siting and protection' },
            { id: 'A.7.9', name: 'Security of assets off-premises' },
            { id: 'A.7.10', name: 'Storage media' },
            { id: 'A.7.11', name: 'Supporting utilities' },
            { id: 'A.7.12', name: 'Cabling security' },
            { id: 'A.7.13', name: 'Equipment maintenance' },
            { id: 'A.7.14', name: 'Secure disposal or re-use of equipment' },
        ],
    },
    'A.8': {
        description: 'Technological controls',
        controls: [
            { id: 'A.8.1', name: 'User endpoint devices' },
            { id: 'A.8.2', name: 'Privileged access rights' },
            { id: 'A.8.3', name: 'Information access restriction' },
            { id: 'A.8.4', name: 'Access to source code' },
            { id: 'A.8.5', name: 'Secure authentication' },
            { id: 'A.8.6', name: 'Capacity management' },
            { id: 'A.8.7', name: 'Protection against malware' },
            { id: 'A.8.8', name: 'Management of technical vulnerabilities' },
            { id: 'A.8.9', name: 'Configuration management' },
            { id: 'A.8.10', name: 'Information deletion' },
            { id: 'A.8.11', name: 'Data masking' },
            { id: 'A.8.12', name: 'Data leakage prevention' },
            { id: 'A.8.13', name: 'Information backup' },
            { id: 'A.8.14', name: 'Redundancy of information processing facilities' },
            { id: 'A.8.15', name: 'Logging' },
            { id: 'A.8.16', name: 'Monitoring activities' },
            { id: 'A.8.17', name: 'Clock synchronization' },
            { id: 'A.8.18', name: 'Use of privileged utility programs' },
            { id: 'A.8.19', name: 'Installation of software on operational systems' },
            { id: 'A.8.20', name: 'Networks security' },
            { id: 'A.8.21', name: 'Security of network services' },
            { id: 'A.8.22', name: 'Segregation of networks' },
            { id: 'A.8.23', name: 'Web filtering' },
            { id: 'A.8.24', name: 'Use of cryptography' },
            { id: 'A.8.25', name: 'Secure development life cycle' },
            { id: 'A.8.26', name: 'Application security requirements' },
            { id: 'A.8.27', name: 'Secure system architecture and engineering principles' },
            { id: 'A.8.28', name: 'Secure coding' },
            { id: 'A.8.29', name: 'Security testing in development and acceptance' },
            { id: 'A.8.30', name: 'Outsourced development' },
            { id: 'A.8.31', name: 'Separation of development, test and production environments' },
            { id: 'A.8.32', name: 'Change management' },
            { id: 'A.8.33', name: 'Test information' },
            { id: 'A.8.34', name: 'Protection of information systems during audit testing' },
        ],
    },
};
export async function checkISO27001Controls(params) {
    requireExplicitDemoMode('ISO 27001 automated compliance checking');
    const { annexAControls: specificControls, domains: specificDomains } = params;
    const domainResults = [];
    const findings = [];
    let totalScore = 0;
    let totalWeight = 0;
    // Determine which domains to check
    let domainsToCheck = Object.keys(annexAControls);
    if (specificDomains && specificDomains.length > 0) {
        domainsToCheck = domainsToCheck.filter((d) => specificDomains.some((sd) => d.includes(sd) || sd.includes(d)));
    }
    for (const domainKey of domainsToCheck) {
        const domain = annexAControls[domainKey];
        if (!domain)
            continue;
        const controlResults = [];
        let domainScore = 0;
        // Filter controls if specific ones are requested
        let controlsToCheck = domain.controls;
        if (specificControls && specificControls.length > 0) {
            controlsToCheck = domain.controls.filter((c) => specificControls.includes(c.id));
        }
        for (const control of controlsToCheck) {
            // Simulate control check
            const random = Math.random();
            let status;
            let score;
            const controlFindings = [];
            if (random > 0.7) {
                status = 'implemented';
                score = 100;
                controlFindings.push('Control implemented with documented evidence');
            }
            else if (random > 0.4) {
                status = 'partially_implemented';
                score = 55;
                controlFindings.push('Control partially implemented');
                findings.push({
                    control: control.id,
                    severity: 'medium',
                    finding: `${control.name}: Control partially implemented`,
                    recommendation: `Complete implementation of ${control.id}`,
                });
            }
            else if (random > 0.15) {
                status = 'not_implemented';
                score = 0;
                controlFindings.push('Control not implemented');
                findings.push({
                    control: control.id,
                    severity: 'high',
                    finding: `${control.name}: Control not implemented`,
                    recommendation: `Implement ${control.id} - ${control.name}`,
                });
            }
            else {
                status = 'not_applicable';
                score = 100; // N/A controls don't count against score
                controlFindings.push('Control not applicable to organization');
            }
            domainScore += score;
            controlResults.push({
                id: control.id,
                name: control.name,
                status,
                score,
                findings: controlFindings,
            });
        }
        const avgDomainScore = controlsToCheck.length > 0 ? Math.round(domainScore / controlsToCheck.length) : 0;
        domainResults.push({
            domain: domainKey,
            description: domain.description,
            score: avgDomainScore,
            status: avgDomainScore >= 80 ? 'Compliant' : avgDomainScore >= 50 ? 'Partial' : 'Non-Compliant',
            controls: controlResults,
        });
        totalScore += avgDomainScore;
        totalWeight++;
    }
    const overallScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
    // Generate recommendations
    const recommendations = [];
    const highFindings = findings.filter((f) => f.severity === 'high' || f.severity === 'critical');
    if (highFindings.length > 0) {
        recommendations.push(`Address ${highFindings.length} high-priority finding(s) before certification audit`);
    }
    if (overallScore < 80) {
        recommendations.push('Engage ISO 27001 consultant for implementation guidance');
    }
    const lowScoreDomains = domainResults.filter((d) => d.score < 50);
    if (lowScoreDomains.length > 0) {
        recommendations.push(`Focus on improving: ${lowScoreDomains.map((d) => d.domain).join(', ')}`);
    }
    return {
        framework: 'ISO27001',
        checkedAt: new Date().toISOString(),
        domains: domainResults,
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
//# sourceMappingURL=iso27001-checks.js.map