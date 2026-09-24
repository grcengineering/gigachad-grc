import { Octokit } from '@octokit/rest';
export async function collectGitHubEvidence(params) {
    const { organization, repositories: specificRepos, checks = ['branch-protection', 'secrets-scanning', 'dependabot', 'code-scanning'], } = params;
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        throw new Error('GITHUB_TOKEN environment variable not set');
    }
    const octokit = new Octokit({ auth: token });
    const findings = [];
    let compliantCount = 0;
    let nonCompliantCount = 0;
    try {
        // Get organization info
        const { data: org } = await octokit.orgs.get({ org: organization });
        findings.push({
            type: 'organization',
            name: org.login,
            description: org.description,
            twoFactorRequirementEnabled: org.two_factor_requirement_enabled,
            defaultRepositoryPermission: org.default_repository_permission,
            membersCanCreateRepositories: org.members_can_create_repositories,
            membersCanCreatePublicRepositories: org.members_can_create_public_repositories,
        });
        // Get repositories - use unknown[] to handle type differences between get and listForOrg
        let repos;
        if (specificRepos && specificRepos.length > 0) {
            const repoPromises = specificRepos.map((repo) => octokit.repos.get({ owner: organization, repo }).then((r) => r.data));
            repos = await Promise.all(repoPromises);
        }
        else {
            const { data } = await octokit.repos.listForOrg({ org: organization, per_page: 100 });
            repos = data;
        }
        // Check each repository
        for (const repoData of repos) {
            const repo = repoData;
            const repoFindings = {
                name: repo.name,
                fullName: repo.full_name,
                private: repo.private,
                visibility: repo.visibility,
                defaultBranch: repo.default_branch,
                hasIssues: repo.has_issues,
                hasProjects: repo.has_projects,
                hasWiki: repo.has_wiki,
                archived: repo.archived,
                disabled: repo.disabled,
                allowForking: repo.allow_forking,
            };
            let repoCompliant = true;
            // Check branch protection
            if (checks.includes('branch-protection')) {
                try {
                    const { data: protection } = await octokit.repos.getBranchProtection({
                        owner: organization,
                        repo: String(repo.name),
                        branch: String(repo.default_branch || 'main'),
                    });
                    repoFindings.branchProtection = {
                        enabled: true,
                        requirePullRequestReviews: !!protection.required_pull_request_reviews,
                        requiredApprovingReviewCount: protection.required_pull_request_reviews?.required_approving_review_count || 0,
                        dismissStaleReviews: protection.required_pull_request_reviews?.dismiss_stale_reviews || false,
                        requireCodeOwnerReviews: protection.required_pull_request_reviews?.require_code_owner_reviews || false,
                        requireStatusChecks: !!protection.required_status_checks,
                        enforceAdmins: protection.enforce_admins?.enabled || false,
                        requireLinearHistory: protection.required_linear_history?.enabled || false,
                        allowForcePushes: protection.allow_force_pushes?.enabled || false,
                        allowDeletions: protection.allow_deletions?.enabled || false,
                    };
                    // Check if branch protection meets minimum standards
                    if (!protection.required_pull_request_reviews ||
                        (protection.required_pull_request_reviews.required_approving_review_count || 0) < 1 ||
                        protection.allow_force_pushes?.enabled) {
                        repoCompliant = false;
                    }
                }
                catch {
                    repoFindings.branchProtection = {
                        enabled: false,
                        error: 'Branch protection not configured or insufficient permissions',
                    };
                    repoCompliant = false;
                }
            }
            // Check secrets scanning
            if (checks.includes('secrets-scanning')) {
                try {
                    // Note: This requires GitHub Advanced Security
                    const { data: alerts } = await octokit.secretScanning.listAlertsForRepo({
                        owner: organization,
                        repo: String(repo.name),
                        state: 'open',
                    });
                    repoFindings.secretsScanning = {
                        enabled: true,
                        openAlerts: alerts.length,
                    };
                    if (alerts.length > 0) {
                        repoCompliant = false;
                    }
                }
                catch {
                    repoFindings.secretsScanning = {
                        enabled: false,
                        note: 'Secret scanning not available (requires GitHub Advanced Security)',
                    };
                }
            }
            // Check Dependabot
            if (checks.includes('dependabot')) {
                try {
                    const { data: alerts } = await octokit.dependabot.listAlertsForRepo({
                        owner: organization,
                        repo: String(repo.name),
                        state: 'open',
                    });
                    const criticalAlerts = alerts.filter((a) => a.security_vulnerability?.severity === 'critical');
                    const highAlerts = alerts.filter((a) => a.security_vulnerability?.severity === 'high');
                    repoFindings.dependabot = {
                        enabled: true,
                        openAlerts: alerts.length,
                        criticalAlerts: criticalAlerts.length,
                        highAlerts: highAlerts.length,
                    };
                    if (criticalAlerts.length > 0 || highAlerts.length > 5) {
                        repoCompliant = false;
                    }
                }
                catch {
                    repoFindings.dependabot = {
                        enabled: false,
                        note: 'Dependabot alerts not available',
                    };
                }
            }
            // Check code scanning
            if (checks.includes('code-scanning')) {
                try {
                    const { data: alerts } = await octokit.codeScanning.listAlertsForRepo({
                        owner: organization,
                        repo: String(repo.name),
                        state: 'open',
                    });
                    const errorAlerts = alerts.filter((a) => a.rule?.severity === 'error');
                    repoFindings.codeScanning = {
                        enabled: true,
                        openAlerts: alerts.length,
                        errorAlerts: errorAlerts.length,
                    };
                    if (errorAlerts.length > 0) {
                        repoCompliant = false;
                    }
                }
                catch {
                    repoFindings.codeScanning = {
                        enabled: false,
                        note: 'Code scanning not configured or not available',
                    };
                }
            }
            repoFindings.overallCompliant = repoCompliant;
            findings.push({ type: 'repository', ...repoFindings });
            if (repoCompliant) {
                compliantCount++;
            }
            else {
                nonCompliantCount++;
            }
        }
        return {
            service: 'github',
            collectedAt: new Date().toISOString(),
            organization,
            findings,
            summary: {
                totalRepositories: repos.length,
                compliantRepositories: compliantCount,
                nonCompliantRepositories: nonCompliantCount,
            },
        };
    }
    catch (error) {
        return {
            service: 'github',
            collectedAt: new Date().toISOString(),
            organization,
            findings: [{ error: error instanceof Error ? error.message : 'Unknown error' }],
            summary: {
                totalRepositories: 0,
                compliantRepositories: 0,
                nonCompliantRepositories: 0,
            },
        };
    }
}
//# sourceMappingURL=github-evidence.js.map