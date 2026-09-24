import { requireExplicitDemoMode } from '../demo-mode.js';
// Control test definitions
const controlTests = {
    // Access Control Tests
    'AC-001': async () => ({
        findings: [
            {
                type: 'pass',
                criterion: 'User authentication required',
                actual: 'MFA enabled for all users',
                expected: 'MFA enabled',
            },
        ],
        score: 100,
        maxScore: 100,
        status: 'passed',
    }),
    'AC-002': async () => ({
        findings: [
            {
                type: 'pass',
                criterion: 'Role-based access control implemented',
                actual: 'RBAC configured with 5 roles',
                expected: 'RBAC configured',
            },
            {
                type: 'warning',
                criterion: 'Least privilege principle',
                actual: '3 users with excessive permissions',
                expected: 'No excessive permissions',
                details: 'Review permissions for admin, security-admin, super-user',
            },
        ],
        score: 80,
        maxScore: 100,
        status: 'warning',
    }),
    // Encryption Tests
    'ENC-001': async () => ({
        findings: [
            {
                type: 'pass',
                criterion: 'Data encrypted at rest',
                actual: 'AES-256 encryption enabled',
                expected: 'AES-256 or equivalent',
            },
        ],
        score: 100,
        maxScore: 100,
        status: 'passed',
    }),
    'ENC-002': async () => ({
        findings: [
            {
                type: 'pass',
                criterion: 'Data encrypted in transit',
                actual: 'TLS 1.3 configured',
                expected: 'TLS 1.2 or higher',
            },
        ],
        score: 100,
        maxScore: 100,
        status: 'passed',
    }),
    // Logging Tests
    'LOG-001': async () => ({
        findings: [
            {
                type: 'pass',
                criterion: 'Audit logging enabled',
                actual: 'All authentication events logged',
                expected: 'Authentication logging required',
            },
            {
                type: 'pass',
                criterion: 'Log retention',
                actual: '365 days retention configured',
                expected: 'Minimum 90 days',
            },
        ],
        score: 100,
        maxScore: 100,
        status: 'passed',
    }),
    // Backup Tests
    'BKP-001': async () => ({
        findings: [
            {
                type: 'pass',
                criterion: 'Regular backups configured',
                actual: 'Daily incremental, weekly full',
                expected: 'Regular backup schedule',
            },
            {
                type: 'fail',
                criterion: 'Backup testing',
                actual: 'Last restore test: 120 days ago',
                expected: 'Restore test within 90 days',
                details: 'Schedule and execute a backup restore test',
            },
        ],
        score: 50,
        maxScore: 100,
        status: 'failed',
    }),
    // Network Security Tests
    'NET-001': async () => ({
        findings: [
            {
                type: 'pass',
                criterion: 'Firewall configured',
                actual: 'Firewall rules active',
                expected: 'Firewall enabled',
            },
            {
                type: 'warning',
                criterion: 'Firewall rule review',
                actual: 'Last review: 45 days ago',
                expected: 'Review within 30 days',
            },
        ],
        score: 75,
        maxScore: 100,
        status: 'warning',
    }),
    // Vulnerability Management
    'VUL-001': async () => ({
        findings: [
            {
                type: 'pass',
                criterion: 'Vulnerability scanning enabled',
                actual: 'Weekly scans configured',
                expected: 'Regular scanning',
            },
            {
                type: 'warning',
                criterion: 'Critical vulnerabilities',
                actual: '2 critical vulnerabilities pending',
                expected: '0 critical vulnerabilities',
                details: 'CVE-2024-0001, CVE-2024-0002 require remediation',
            },
        ],
        score: 60,
        maxScore: 100,
        status: 'warning',
    }),
    // Incident Response
    'IR-001': async () => ({
        findings: [
            {
                type: 'pass',
                criterion: 'Incident response plan exists',
                actual: 'Plan documented and approved',
                expected: 'Documented IR plan',
            },
            {
                type: 'pass',
                criterion: 'IR team defined',
                actual: '5 team members assigned',
                expected: 'IR team assigned',
            },
        ],
        score: 100,
        maxScore: 100,
        status: 'passed',
    }),
    // Change Management
    'CHG-001': async () => ({
        findings: [
            {
                type: 'pass',
                criterion: 'Change management process',
                actual: 'CAB approval required for changes',
                expected: 'Formal change process',
            },
            {
                type: 'info',
                criterion: 'Emergency changes',
                actual: '2 emergency changes in last 30 days',
                expected: 'Track emergency changes',
            },
        ],
        score: 90,
        maxScore: 100,
        status: 'passed',
    }),
};
export async function runControlTest(params) {
    requireExplicitDemoMode('Automated control testing');
    const { controlId, controlType, testConfiguration } = params;
    const startTime = Date.now();
    const testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    try {
        // Check if we have a specific test for this control
        const testFn = controlTests[controlId];
        let testResult;
        if (testFn) {
            testResult = await testFn(testConfiguration);
        }
        else {
            // Generate a generic test based on control type
            testResult = await runGenericTest(controlId, controlType, testConfiguration);
        }
        const duration = Date.now() - startTime;
        return {
            controlId,
            testId,
            status: testResult.status || 'error',
            score: testResult.score || 0,
            maxScore: testResult.maxScore || 100,
            testedAt: new Date().toISOString(),
            duration,
            findings: testResult.findings || [],
            evidence: [
                {
                    type: 'automated_test',
                    source: 'grc-compliance-server',
                    collectedAt: new Date().toISOString(),
                    reference: testId,
                },
            ],
            recommendations: generateRecommendations(testResult.findings || []),
        };
    }
    catch (error) {
        return {
            controlId,
            testId,
            status: 'error',
            score: 0,
            maxScore: 100,
            testedAt: new Date().toISOString(),
            duration: Date.now() - startTime,
            findings: [
                {
                    type: 'fail',
                    criterion: 'Test execution',
                    actual: error instanceof Error ? error.message : 'Unknown error',
                    expected: 'Test completes successfully',
                },
            ],
            evidence: [],
            recommendations: ['Investigate test failure and retry'],
        };
    }
}
async function runGenericTest(controlId, controlType, config) {
    // Simulate generic test based on control type
    const findings = [];
    let score = 0;
    const maxScore = 100;
    switch (controlType) {
        case 'technical':
            findings.push({
                type: 'info',
                criterion: 'Technical control assessment',
                actual: `Control ${controlId} requires manual verification`,
                expected: 'Automated test available',
                details: 'Configure automated testing for this control',
            });
            score = 50;
            break;
        case 'administrative':
            findings.push({
                type: 'info',
                criterion: 'Administrative control assessment',
                actual: 'Policy document exists',
                expected: 'Documented policy',
            });
            if (config?.criteria) {
                for (const criterion of config.criteria) {
                    findings.push({
                        type: 'info',
                        criterion,
                        actual: 'Requires manual review',
                        expected: criterion,
                    });
                }
            }
            score = 70;
            break;
        case 'physical':
            findings.push({
                type: 'info',
                criterion: 'Physical control assessment',
                actual: `Control ${controlId} requires on-site verification`,
                expected: 'Physical inspection',
                details: 'Schedule physical security audit',
            });
            score = 30;
            break;
    }
    return {
        findings,
        score,
        maxScore,
        status: score >= 80 ? 'passed' : score >= 50 ? 'warning' : 'failed',
    };
}
function generateRecommendations(findings) {
    const recommendations = [];
    for (const finding of findings) {
        if (finding.type === 'fail') {
            recommendations.push(`Address: ${finding.criterion} - ${finding.details || finding.actual}`);
        }
        else if (finding.type === 'warning') {
            recommendations.push(`Review: ${finding.criterion} - ${finding.details || finding.actual}`);
        }
    }
    return recommendations;
}
export async function runBatchControlTests(params) {
    const { controlIds, parallel = false, stopOnFailure = false } = params;
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startedAt = new Date().toISOString();
    const results = [];
    let passed = 0;
    let failed = 0;
    let warnings = 0;
    let errors = 0;
    if (parallel) {
        // Run tests in parallel
        const testPromises = controlIds.map((controlId) => runControlTest({ controlId, controlType: 'technical' }));
        const testResults = await Promise.all(testPromises);
        results.push(...testResults);
    }
    else {
        // Run tests sequentially
        for (const controlId of controlIds) {
            const result = await runControlTest({ controlId, controlType: 'technical' });
            results.push(result);
            if (stopOnFailure && result.status === 'failed') {
                break;
            }
        }
    }
    // Calculate summary
    for (const result of results) {
        switch (result.status) {
            case 'passed':
                passed++;
                break;
            case 'failed':
                failed++;
                break;
            case 'warning':
                warnings++;
                break;
            case 'error':
                errors++;
                break;
        }
    }
    return {
        batchId,
        startedAt,
        completedAt: new Date().toISOString(),
        totalTests: results.length,
        passed,
        failed,
        warnings,
        errors,
        results,
    };
}
//# sourceMappingURL=control-tester.js.map