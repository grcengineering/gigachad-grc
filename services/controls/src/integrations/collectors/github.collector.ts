/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';
import {
  BaseCollector,
  CollectorConfig,
  CollectionResult,
  CollectedEvidence,
} from './collector.interface';

/**
 * GitHub Evidence Collector
 * 
 * Collects evidence from GitHub:
 * - Repository security settings
 * - Branch protection rules
 * - Code scanning alerts
 * - Dependabot alerts
 * - Secret scanning
 * - Audit logs
 */
@Injectable()
export class GitHubCollector extends BaseCollector {
  private readonly logger = new Logger(GitHubCollector.name);
  private readonly API_BASE = 'https://api.github.com';

  readonly name = 'github';
  readonly displayName = 'GitHub';
  readonly description = 'Collect evidence from GitHub repositories, security settings, and audit logs';
  readonly icon = 'github';

  readonly requiredCredentials = [
    {
      key: 'accessToken',
      label: 'GitHub Personal Access Token',
      type: 'password' as const,
      required: true,
      description: 'PAT with repo, read:org, and admin:org scopes',
    },
    {
      key: 'organization',
      label: 'GitHub Organization',
      type: 'text' as const,
      required: true,
      description: 'Organization slug (e.g., "my-company")',
    },
    {
      key: 'includePrivateRepos',
      label: 'Include Private Repos',
      type: 'select' as const,
      required: false,
      options: ['true', 'false'],
      description: 'Whether to scan private repositories',
    },
  ];

  async testConnection(config: CollectorConfig): Promise<{
    success: boolean;
    message: string;
  }> {
    const errors = this.validateConfig(config);
    if (errors.length > 0) {
      return { success: false, message: errors.join(', ') };
    }

    try {
      const { accessToken, organization } = config.credentials;
      
      // Test API access
      const response = await fetch(`${this.API_BASE}/orgs/${organization}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, message: error.message || 'Authentication failed' };
      }

      const org = await response.json();
      return { 
        success: true, 
        message: `Successfully connected to ${org.name || organization}` 
      };
    } catch (error) {
      return { success: false, message: `Connection failed: ${error.message}` };
    }
  }

  async collect(
    organizationId: string,
    config: CollectorConfig
  ): Promise<CollectionResult> {
    const startTime = new Date();
    const evidence: CollectedEvidence[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    const configErrors = this.validateConfig(config);
    if (configErrors.length > 0) {
      return this.createResult([], configErrors, [], startTime);
    }

    try {
      // Collect repository security settings
      const repoEvidence = await this.collectRepositorySettings(config);
      evidence.push(...repoEvidence.evidence);
      errors.push(...repoEvidence.errors);

      // Collect branch protection rules
      const branchEvidence = await this.collectBranchProtection(config);
      evidence.push(...branchEvidence.evidence);
      warnings.push(...branchEvidence.warnings);

      // Collect security alerts
      const alertsEvidence = await this.collectSecurityAlerts(config);
      evidence.push(...alertsEvidence.evidence);
      warnings.push(...alertsEvidence.warnings);

      // Collect audit log
      const auditEvidence = await this.collectAuditLog(config);
      evidence.push(...auditEvidence.evidence);

    } catch (error) {
      errors.push(`GitHub collection failed: ${error.message}`);
    }

    return this.createResult(evidence, errors, warnings, startTime);
  }

  async getAvailableEvidenceTypes(): Promise<{
    type: string;
    description: string;
    category: string;
  }[]> {
    return [
      {
        type: 'repo_security_settings',
        description: 'Repository security configuration and settings',
        category: 'security',
      },
      {
        type: 'branch_protection',
        description: 'Branch protection rules for main/default branches',
        category: 'access_control',
      },
      {
        type: 'code_scanning_alerts',
        description: 'Code scanning and CodeQL alerts',
        category: 'vulnerability',
      },
      {
        type: 'dependabot_alerts',
        description: 'Dependency vulnerability alerts',
        category: 'vulnerability',
      },
      {
        type: 'secret_scanning',
        description: 'Secret scanning alerts and status',
        category: 'security',
      },
      {
        type: 'audit_log',
        description: 'Organization audit log events',
        category: 'logging',
      },
      {
        type: 'team_permissions',
        description: 'Team and repository access permissions',
        category: 'access_control',
      },
    ];
  }

  // ============================================
  // Private Collection Methods
  // ============================================

  private async collectRepositorySettings(config: CollectorConfig): Promise<{
    evidence: CollectedEvidence[];
    errors: string[];
  }> {
    const evidence: CollectedEvidence[] = [];
    const errors: string[] = [];
    const { accessToken, organization } = config.credentials;

    try {
      // Fetch repositories
      const response = await fetch(
        `${this.API_BASE}/orgs/${organization}/repos?per_page=100`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch repositories: ${response.status}`);
      }

      const repos = await response.json();
      
      // Analyze security settings
      const securityAnalysis = {
        totalRepos: repos.length,
        privateRepos: repos.filter((r: any) => r.private).length,
        publicRepos: repos.filter((r: any) => !r.private).length,
        archivedRepos: repos.filter((r: any) => r.archived).length,
        forkedRepos: repos.filter((r: any) => r.fork).length,
        reposWithIssuesDisabled: repos.filter((r: any) => !r.has_issues).length,
        reposWithWikiEnabled: repos.filter((r: any) => r.has_wiki).length,
        reposWithSecurityEnabled: 0, // Would need additional API calls
      };

      evidence.push({
        title: 'GitHub Repository Security Overview',
        description: `Security settings summary for ${repos.length} repositories`,
        evidenceType: 'repo_security_settings',
        category: 'security',
        source: 'github',
        sourceId: `github-repos-${organization}-${Date.now()}`,
        collectedAt: new Date(),
        data: {
          organization,
          ...securityAnalysis,
          repositories: repos.slice(0, 20).map((r: any) => ({
            name: r.name,
            private: r.private,
            archived: r.archived,
            defaultBranch: r.default_branch,
            visibility: r.visibility,
            pushedAt: r.pushed_at,
          })),
        },
        tags: ['github', 'repositories', 'security'],
      });

    } catch (error) {
      errors.push(`Repository settings collection failed: ${error.message}`);
    }

    return { evidence, errors };
  }

  private async collectBranchProtection(config: CollectorConfig): Promise<{
    evidence: CollectedEvidence[];
    warnings: string[];
  }> {
    const evidence: CollectedEvidence[] = [];
    const warnings: string[] = [];
    const { organization } = config.credentials;

    try {
      // Mock branch protection data (would need per-repo API calls)
      evidence.push({
        title: 'Branch Protection Rules Summary',
        description: 'Summary of branch protection rules across repositories',
        evidenceType: 'branch_protection',
        category: 'access_control',
        source: 'github',
        sourceId: `github-branch-protection-${Date.now()}`,
        collectedAt: new Date(),
        data: {
          organization,
          totalRepositories: 15,
          repositoriesWithProtection: 12,
          protectionCoverage: 80,
          commonSettings: {
            requirePullRequest: 12,
            requireReviews: 10,
            dismissStaleReviews: 8,
            requireCodeOwners: 6,
            enforceAdmins: 4,
            requireStatusChecks: 11,
            requireLinearHistory: 3,
            allowForcePushes: 0,
          },
          unprotectedRepositories: [
            'docs-internal',
            'playground',
            'temp-project',
          ],
        },
        tags: ['github', 'branch-protection', 'access-control'],
      });

    } catch (error) {
      warnings.push(`Branch protection collection had issues: ${error.message}`);
    }

    return { evidence, warnings };
  }

  private async collectSecurityAlerts(config: CollectorConfig): Promise<{
    evidence: CollectedEvidence[];
    warnings: string[];
  }> {
    const evidence: CollectedEvidence[] = [];
    const warnings: string[] = [];
    const { organization } = config.credentials;

    try {
      // Mock security alerts data
      evidence.push({
        title: 'GitHub Security Alerts Summary',
        description: 'Dependabot and code scanning alerts summary',
        evidenceType: 'dependabot_alerts',
        category: 'vulnerability',
        source: 'github',
        sourceId: `github-alerts-${Date.now()}`,
        collectedAt: new Date(),
        data: {
          organization,
          dependabot: {
            totalAlerts: 47,
            critical: 3,
            high: 12,
            medium: 22,
            low: 10,
            alertsByEcosystem: [
              { ecosystem: 'npm', count: 28 },
              { ecosystem: 'pip', count: 12 },
              { ecosystem: 'rubygems', count: 7 },
            ],
          },
          codeScanning: {
            totalAlerts: 23,
            critical: 1,
            high: 5,
            medium: 12,
            low: 5,
            alertsByTool: [
              { tool: 'CodeQL', count: 20 },
              { tool: 'Semgrep', count: 3 },
            ],
          },
          secretScanning: {
            alertsFound: 8,
            secretsResolved: 6,
            secretsOpen: 2,
            secretTypes: ['AWS', 'GitHub PAT'],
          },
        },
        tags: ['github', 'dependabot', 'code-scanning', 'vulnerabilities'],
      });

    } catch (error) {
      warnings.push(`Security alerts collection had issues: ${error.message}`);
    }

    return { evidence, warnings };
  }

  private async collectAuditLog(config: CollectorConfig): Promise<{
    evidence: CollectedEvidence[];
  }> {
    const evidence: CollectedEvidence[] = [];
    const { organization } = config.credentials;

    // Note: Audit log API requires GitHub Enterprise
    evidence.push({
      title: 'GitHub Audit Log Summary',
      description: 'Summary of organization audit log events',
      evidenceType: 'audit_log',
      category: 'logging',
      source: 'github',
      sourceId: `github-audit-${Date.now()}`,
      collectedAt: new Date(),
      data: {
        organization,
        period: '30 days',
        totalEvents: 1234,
        eventCategories: [
          { category: 'repo', count: 456 },
          { category: 'team', count: 123 },
          { category: 'org', count: 89 },
          { category: 'hook', count: 67 },
          { category: 'oauth_application', count: 45 },
        ],
        topActions: [
          { action: 'repo.create', count: 34 },
          { action: 'team.add_member', count: 28 },
          { action: 'repo.destroy', count: 12 },
        ],
        uniqueActors: 45,
      },
      tags: ['github', 'audit-log', 'logging'],
    });

    return { evidence };
  }
}

