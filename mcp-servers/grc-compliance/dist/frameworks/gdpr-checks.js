import { requireExplicitDemoMode } from '../demo-mode.js';
// GDPR Articles organized by Chapter
const gdprArticles = {
    'Chapter II': {
        title: 'Principles',
        articles: [
            { id: 'Article 5', name: 'Principles relating to processing of personal data' },
            { id: 'Article 6', name: 'Lawfulness of processing' },
            { id: 'Article 7', name: 'Conditions for consent' },
            { id: 'Article 8', name: 'Conditions applicable to childs consent' },
            { id: 'Article 9', name: 'Processing of special categories of personal data' },
            { id: 'Article 10', name: 'Processing of personal data relating to criminal convictions' },
            { id: 'Article 11', name: 'Processing which does not require identification' },
        ],
    },
    'Chapter III': {
        title: 'Rights of the Data Subject',
        articles: [
            { id: 'Article 12', name: 'Transparent information, communication and modalities' },
            { id: 'Article 13', name: 'Information to be provided where personal data collected' },
            { id: 'Article 14', name: 'Information where personal data not obtained from data subject' },
            { id: 'Article 15', name: 'Right of access by the data subject' },
            { id: 'Article 16', name: 'Right to rectification' },
            { id: 'Article 17', name: 'Right to erasure (right to be forgotten)' },
            { id: 'Article 18', name: 'Right to restriction of processing' },
            { id: 'Article 19', name: 'Notification obligation regarding rectification or erasure' },
            { id: 'Article 20', name: 'Right to data portability' },
            { id: 'Article 21', name: 'Right to object' },
            { id: 'Article 22', name: 'Automated individual decision-making, including profiling' },
            { id: 'Article 23', name: 'Restrictions' },
        ],
    },
    'Chapter IV': {
        title: 'Controller and Processor',
        articles: [
            { id: 'Article 24', name: 'Responsibility of the controller' },
            { id: 'Article 25', name: 'Data protection by design and by default' },
            { id: 'Article 26', name: 'Joint controllers' },
            { id: 'Article 27', name: 'Representatives of controllers not established in the Union' },
            { id: 'Article 28', name: 'Processor' },
            { id: 'Article 29', name: 'Processing under authority of controller or processor' },
            { id: 'Article 30', name: 'Records of processing activities' },
            { id: 'Article 31', name: 'Cooperation with the supervisory authority' },
            { id: 'Article 32', name: 'Security of processing' },
            { id: 'Article 33', name: 'Notification of personal data breach to supervisory authority' },
            { id: 'Article 34', name: 'Communication of personal data breach to data subject' },
            { id: 'Article 35', name: 'Data protection impact assessment' },
            { id: 'Article 36', name: 'Prior consultation' },
            { id: 'Article 37', name: 'Designation of the data protection officer' },
            { id: 'Article 38', name: 'Position of the data protection officer' },
            { id: 'Article 39', name: 'Tasks of the data protection officer' },
            { id: 'Article 40', name: 'Codes of conduct' },
            { id: 'Article 41', name: 'Monitoring of approved codes of conduct' },
            { id: 'Article 42', name: 'Certification' },
            { id: 'Article 43', name: 'Certification bodies' },
        ],
    },
    'Chapter V': {
        title: 'Transfers of Personal Data to Third Countries',
        articles: [
            { id: 'Article 44', name: 'General principle for transfers' },
            { id: 'Article 45', name: 'Transfers on the basis of an adequacy decision' },
            { id: 'Article 46', name: 'Transfers subject to appropriate safeguards' },
            { id: 'Article 47', name: 'Binding corporate rules' },
            { id: 'Article 48', name: 'Transfers not authorised by Union law' },
            { id: 'Article 49', name: 'Derogations for specific situations' },
        ],
    },
};
export async function checkGDPRControls(params) {
    requireExplicitDemoMode('GDPR automated compliance checking');
    const { articles: specificArticles, dataProcessingActivities } = params;
    const chapterResults = [];
    const findings = [];
    let totalScore = 0;
    let totalWeight = 0;
    for (const [chapterKey, chapter] of Object.entries(gdprArticles)) {
        const articleResults = [];
        let chapterScore = 0;
        // Filter articles if specific ones are requested
        let articlesToCheck = chapter.articles;
        if (specificArticles && specificArticles.length > 0) {
            articlesToCheck = chapter.articles.filter((a) => specificArticles.some((sa) => a.id.includes(sa) || sa.includes(a.id)));
        }
        for (const article of articlesToCheck) {
            // Simulate article compliance check
            const random = Math.random();
            let status;
            let score;
            const articleFindings = [];
            if (random > 0.65) {
                status = 'implemented';
                score = 100;
                articleFindings.push('Article requirements fully implemented');
            }
            else if (random > 0.35) {
                status = 'partially_implemented';
                score = 50;
                articleFindings.push('Article requirements partially addressed');
                findings.push({
                    article: article.id,
                    severity: 'medium',
                    finding: `${article.name}: Requirements partially met`,
                    recommendation: `Complete implementation of ${article.id}`,
                    potentialFine: 'Up to €10 million or 2% of annual turnover',
                });
            }
            else if (random > 0.1) {
                status = 'not_implemented';
                score = 0;
                articleFindings.push('Article requirements not implemented');
                findings.push({
                    article: article.id,
                    severity: 'high',
                    finding: `${article.name}: Requirements not met`,
                    recommendation: `Implement ${article.id} requirements`,
                    potentialFine: 'Up to €20 million or 4% of annual turnover',
                });
            }
            else {
                status = 'not_implemented';
                score = 0;
                articleFindings.push('Critical: Data subject rights at risk');
                findings.push({
                    article: article.id,
                    severity: 'critical',
                    finding: `${article.name}: Critical gap - data subject rights at risk`,
                    recommendation: `URGENT: Implement ${article.id} immediately`,
                    potentialFine: 'Up to €20 million or 4% of annual turnover',
                });
            }
            chapterScore += score;
            articleResults.push({
                id: article.id,
                name: article.name,
                status,
                score,
                findings: articleFindings,
            });
        }
        const avgChapterScore = articlesToCheck.length > 0 ? Math.round(chapterScore / articlesToCheck.length) : 0;
        chapterResults.push({
            chapter: chapterKey,
            title: chapter.title,
            score: avgChapterScore,
            status: avgChapterScore >= 80 ? 'Compliant' : avgChapterScore >= 50 ? 'Partial' : 'Non-Compliant',
            articles: articleResults,
        });
        totalScore += avgChapterScore;
        totalWeight++;
    }
    // Check data processing activities if provided
    if (dataProcessingActivities && dataProcessingActivities.length > 0) {
        const activityResults = [];
        let activityScore = 0;
        for (const activity of dataProcessingActivities) {
            // Simulate processing activity assessment
            const random = Math.random();
            let status;
            let score;
            if (random > 0.6) {
                status = 'implemented';
                score = 100;
            }
            else if (random > 0.3) {
                status = 'partially_implemented';
                score = 50;
                findings.push({
                    article: 'Article 30',
                    severity: 'medium',
                    finding: `Processing activity "${activity}" not fully documented`,
                    recommendation: 'Complete records of processing activities',
                });
            }
            else {
                status = 'not_implemented';
                score = 0;
                findings.push({
                    article: 'Article 6',
                    severity: 'high',
                    finding: `Processing activity "${activity}" may lack lawful basis`,
                    recommendation: 'Document lawful basis for processing',
                    potentialFine: 'Up to €20 million or 4% of annual turnover',
                });
            }
            activityScore += score;
            activityResults.push({
                id: `Activity: ${activity}`,
                name: activity,
                status,
                score,
                findings: [],
            });
        }
        chapterResults.push({
            chapter: 'Processing Activities',
            title: 'Data Processing Activities Assessment',
            score: Math.round(activityScore / dataProcessingActivities.length),
            status: activityScore / dataProcessingActivities.length >= 80 ? 'Compliant' : 'Partial',
            articles: activityResults,
        });
    }
    const overallScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
    // Generate recommendations
    const recommendations = [];
    const criticalFindings = findings.filter((f) => f.severity === 'critical');
    const highFindings = findings.filter((f) => f.severity === 'high');
    if (criticalFindings.length > 0) {
        recommendations.push(`URGENT: Address ${criticalFindings.length} critical finding(s) - significant fine risk`);
    }
    if (highFindings.length > 0) {
        recommendations.push(`HIGH: Remediate ${highFindings.length} high-priority finding(s) within 30 days`);
    }
    // Specific recommendations based on chapter scores
    const chapter3 = chapterResults.find((c) => c.chapter === 'Chapter III');
    if (chapter3 && chapter3.score < 70) {
        recommendations.push('Prioritize data subject rights implementation');
    }
    const chapter4 = chapterResults.find((c) => c.chapter === 'Chapter IV');
    if (chapter4 && chapter4.score < 70) {
        recommendations.push('Review controller/processor obligations');
    }
    const chapter5 = chapterResults.find((c) => c.chapter === 'Chapter V');
    if (chapter5 && chapter5.score < 70) {
        recommendations.push('Review international data transfer mechanisms');
    }
    if (overallScore < 80) {
        recommendations.push('Consider appointing or consulting with a DPO');
        recommendations.push('Conduct Data Protection Impact Assessment (DPIA) for high-risk processing');
    }
    return {
        framework: 'GDPR',
        checkedAt: new Date().toISOString(),
        chapters: chapterResults,
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
//# sourceMappingURL=gdpr-checks.js.map