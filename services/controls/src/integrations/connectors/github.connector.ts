/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

/**
 * GitHub Integration Configuration
 */
export interface GitHubConfig {
  accessToken: string;    // Personal access token or GitHub App token
  organization?: string;  // Organization name (optional, for org-level data)
}

/**
 * GitHub Repository
 */
interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  default_branch: string;
  visibility: string;
  archived: boolean;
  disabled: boolean;
  security_and_analysis?: {
    secret_scanning?: { status: string };
    secret_scanning_push_protection?: { status: string };
    dependabot_security_updates?: { status: string };
  };
}

/**
 * GitHub Branch Protection
 */
interface BranchProtection {
  url: string;
  required_status_checks?: {
    strict: boolean;
    contexts: string[];
  };
  enforce_admins: { enabled: boolean };
  required_pull_request_reviews?: {
    dismiss_stale_reviews: boolean;
    require_code_owner_reviews: boolean;
    required_approving_review_count: number;
  };
  required_signatures?: { enabled: boolean };
}

/**
 * GitHub Security Alert (Dependabot)
 */
interface SecurityAlert {
  number: number;
  state: string;
  dependency: {
    package: { name: string; ecosystem: string };
    manifest_path: string;
  };
  security_advisory: {
    severity: string;
    summary: string;
    description: string;
    cve_id: string;
  };
  security_vulnerability: {
    severity: string;
    vulnerable_version_range: string;
  };
  created_at: string;
  fixed_at?: string;
}

/**
 * GitHub Code Scanning Alert
 */
interface CodeScanningAlert {
  number: number;
  state: string;
  rule: {
    id: string;
    severity: string;
    description: string;
    security_severity_level: string;
  };
  tool: { name: string; version: string };
  most_recent_instance: {
    ref: string;
    state: string;
    location: { path: string; start_line: number };
  };
  created_at: string;
  fixed_at?: string;
}

/**
 * GitHub Sync Result
 */
export interface GitHubSyncResult {
  repositories: {
    total: number;
    private: number;
    public: number;
    archived: number;
    withSecretScanning: number;
    withDependabot: number;
    items: Array<{
      name: string;
      visibility: string;
      defaultBranch: string;
      lastPush: string;
      branchProtection: boolean;
      secretScanning: boolean;
      dependabotAlerts: boolean;
    }>;
  };
  branchProtection: {
    protected: number;
    unprotected: number;
    requiresPR: number;
    requiresApprovals: number;
    requiresSignedCommits: number;
  };
  securityAlerts: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    open: number;
    fixed: number;
    items: Array<{
      repo: string;
      package: string;
      severity: string;
      summary: string;
      state: string;
      cveId: string;
      createdAt: string;
    }>;
  };
  codeScanningAlerts: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    items: Array<{
      repo: string;
      rule: string;
      severity: string;
      tool: string;
      path: string;
      state: string;
    }>;
  };
  secretScanningAlerts: {
    total: number;
    open: number;
    resolved: number;
  };
  actions: {
    workflowRuns: number;
    successRate: number;
    failedRuns: number;
  };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class GitHubConnector {
  private readonly logger = new Logger(GitHubConnector.name);
  private readonly baseUrl = 'https://api.github.com';

  /**
   * Test connection to GitHub
   */
  async testConnection(config: GitHubConfig): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!config.accessToken) {
      return { success: false, message: 'Access token is required' };
    }

    try {
      // Test by getting authenticated user
      const userResponse = await fetch(`${this.baseUrl}/user`, {
        headers: this.buildHeaders(config.accessToken),
      });

      if (!userResponse.ok) {
        if (userResponse.status === 401) {
          return { success: false, message: 'Invalid access token' };
        }
        return { success: false, message: `GitHub API error: ${userResponse.status}` };
      }

      const user = await userResponse.json();

      // If org is specified, verify access
      if (config.organization) {
        const orgResponse = await fetch(`${this.baseUrl}/orgs/${config.organization}`, {
          headers: this.buildHeaders(config.accessToken),
        });

        if (!orgResponse.ok) {
          return { 
            success: false, 
            message: `Cannot access organization '${config.organization}'. Check token permissions.` 
          };
        }

        const org = await orgResponse.json();
        return {
          success: true,
          message: `Connected to GitHub organization: ${org.name || org.login}`,
          details: {
            organization: org.login,
            orgName: org.name,
            repoCount: org.public_repos + (org.total_private_repos || 0),
            authenticatedAs: user.login,
          },
        };
      }

      return {
        success: true,
        message: `Connected to GitHub as ${user.login}`,
        details: {
          username: user.login,
          name: user.name,
          email: user.email,
        },
      };
    } catch (error: any) {
      this.logger.error('GitHub connection test failed', error);
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  /**
   * Full sync - collect security evidence from GitHub
   */
  async sync(config: GitHubConfig): Promise<GitHubSyncResult> {
    const errors: string[] = [];

    this.logger.log('Starting GitHub sync...');

    // Get repositories
    const repos = await this.getRepositories(config).catch(e => {
      errors.push(`Repositories: ${e.message}`);
      return [] as GitHubRepo[];
    });

    // Get branch protection for each repo
    const reposWithProtection = await this.checkBranchProtection(config, repos).catch(e => {
      errors.push(`Branch protection: ${e.message}`);
      return repos.map(r => ({ ...r, branchProtection: null }));
    });

    // Get security alerts (Dependabot)
    const securityAlerts = await this.getSecurityAlerts(config, repos).catch(e => {
      errors.push(`Security alerts: ${e.message}`);
      return [] as Array<SecurityAlert & { repo: string }>;
    });

    // Get code scanning alerts
    const codeScanningAlerts = await this.getCodeScanningAlerts(config, repos).catch(e => {
      errors.push(`Code scanning: ${e.message}`);
      return [] as Array<CodeScanningAlert & { repo: string }>;
    });

    // Get secret scanning alerts count
    const secretScanningStats = await this.getSecretScanningStats(config, repos).catch(e => {
      errors.push(`Secret scanning: ${e.message}`);
      return { total: 0, open: 0, resolved: 0 };
    });

    // Get workflow runs stats
    const actionsStats = await this.getActionsStats(config, repos.slice(0, 10)).catch(e => {
      errors.push(`Actions: ${e.message}`);
      return { workflowRuns: 0, successRate: 0, failedRuns: 0 };
    });

    // Process data
    const protectedRepos = reposWithProtection.filter(r => r.branchProtection);
    const criticalAlerts = securityAlerts.filter(a => a.security_advisory?.severity === 'critical');
    const highAlerts = securityAlerts.filter(a => a.security_advisory?.severity === 'high');

    this.logger.log(`GitHub sync complete: ${repos.length} repos, ${securityAlerts.length} alerts`);

    return {
      repositories: {
        total: repos.length,
        private: repos.filter(r => r.private).length,
        public: repos.filter(r => !r.private).length,
        archived: repos.filter(r => r.archived).length,
        withSecretScanning: repos.filter(r => r.security_and_analysis?.secret_scanning?.status === 'enabled').length,
        withDependabot: repos.filter(r => r.security_and_analysis?.dependabot_security_updates?.status === 'enabled').length,
        items: reposWithProtection.slice(0, 50).map(r => ({
          name: r.full_name,
          visibility: r.visibility || (r.private ? 'private' : 'public'),
          defaultBranch: r.default_branch,
          lastPush: r.pushed_at,
          branchProtection: !!r.branchProtection,
          secretScanning: r.security_and_analysis?.secret_scanning?.status === 'enabled',
          dependabotAlerts: r.security_and_analysis?.dependabot_security_updates?.status === 'enabled',
        })),
      },
      branchProtection: {
        protected: protectedRepos.length,
        unprotected: repos.length - protectedRepos.length,
        requiresPR: protectedRepos.filter(r => r.branchProtection?.required_pull_request_reviews).length,
        requiresApprovals: protectedRepos.filter(r => 
          (r.branchProtection?.required_pull_request_reviews?.required_approving_review_count || 0) > 0
        ).length,
        requiresSignedCommits: protectedRepos.filter(r => r.branchProtection?.required_signatures?.enabled).length,
      },
      securityAlerts: {
        total: securityAlerts.length,
        critical: criticalAlerts.length,
        high: highAlerts.length,
        medium: securityAlerts.filter(a => a.security_advisory?.severity === 'medium').length,
        low: securityAlerts.filter(a => a.security_advisory?.severity === 'low').length,
        open: securityAlerts.filter(a => a.state === 'open').length,
        fixed: securityAlerts.filter(a => a.state === 'fixed').length,
        items: securityAlerts.slice(0, 100).map(a => ({
          repo: a.repo,
          package: a.dependency?.package?.name || 'Unknown',
          severity: a.security_advisory?.severity || 'unknown',
          summary: a.security_advisory?.summary || '',
          state: a.state,
          cveId: a.security_advisory?.cve_id || '',
          createdAt: a.created_at,
        })),
      },
      codeScanningAlerts: {
        total: codeScanningAlerts.length,
        critical: codeScanningAlerts.filter(a => a.rule?.security_severity_level === 'critical').length,
        high: codeScanningAlerts.filter(a => a.rule?.security_severity_level === 'high').length,
        medium: codeScanningAlerts.filter(a => a.rule?.security_severity_level === 'medium').length,
        low: codeScanningAlerts.filter(a => a.rule?.security_severity_level === 'low').length,
        items: codeScanningAlerts.slice(0, 50).map(a => ({
          repo: a.repo,
          rule: a.rule?.id || '',
          severity: a.rule?.security_severity_level || a.rule?.severity || 'unknown',
          tool: a.tool?.name || '',
          path: a.most_recent_instance?.location?.path || '',
          state: a.state,
        })),
      },
      secretScanningAlerts: secretScanningStats,
      actions: actionsStats,
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  /**
   * Get repositories
   */
  private async getRepositories(config: GitHubConfig): Promise<GitHubRepo[]> {
    const repos: GitHubRepo[] = [];
    let page = 1;
    const perPage = 100;

    const endpoint = config.organization
      ? `${this.baseUrl}/orgs/${config.organization}/repos`
      : `${this.baseUrl}/user/repos`;

    while (repos.length < 500) {
      const response = await fetch(
        `${endpoint}?per_page=${perPage}&page=${page}&sort=updated`,
        { headers: this.buildHeaders(config.accessToken) },
      );

      if (!response.ok) break;

      const data = await response.json();
      if (data.length === 0) break;

      repos.push(...data);
      page++;

      if (data.length < perPage) break;
    }

    return repos;
  }

  /**
   * Check branch protection for repositories
   */
  private async checkBranchProtection(
    config: GitHubConfig,
    repos: GitHubRepo[],
  ): Promise<Array<GitHubRepo & { branchProtection: BranchProtection | null }>> {
    return Promise.all(
      repos.slice(0, 50).map(async (repo) => {
        try {
          const response = await fetch(
            `${this.baseUrl}/repos/${repo.full_name}/branches/${repo.default_branch}/protection`,
            { headers: this.buildHeaders(config.accessToken) },
          );

          if (!response.ok) {
            return { ...repo, branchProtection: null };
          }

          const protection = await response.json();
          return { ...repo, branchProtection: protection };
        } catch {
          return { ...repo, branchProtection: null };
        }
      })
    );
  }

  /**
   * Get Dependabot security alerts
   */
  private async getSecurityAlerts(
    config: GitHubConfig,
    repos: GitHubRepo[],
  ): Promise<Array<SecurityAlert & { repo: string }>> {
    const alerts: Array<SecurityAlert & { repo: string }> = [];

    for (const repo of repos.slice(0, 20)) {
      try {
        const response = await fetch(
          `${this.baseUrl}/repos/${repo.full_name}/dependabot/alerts?state=open&per_page=50`,
          { headers: this.buildHeaders(config.accessToken) },
        );

        if (response.ok) {
          const data = await response.json();
          alerts.push(...data.map((a: SecurityAlert) => ({ ...a, repo: repo.full_name })));
        }
      } catch {
        // Skip repos without access
      }
    }

    return alerts;
  }

  /**
   * Get code scanning alerts
   */
  private async getCodeScanningAlerts(
    config: GitHubConfig,
    repos: GitHubRepo[],
  ): Promise<Array<CodeScanningAlert & { repo: string }>> {
    const alerts: Array<CodeScanningAlert & { repo: string }> = [];

    for (const repo of repos.slice(0, 20)) {
      try {
        const response = await fetch(
          `${this.baseUrl}/repos/${repo.full_name}/code-scanning/alerts?state=open&per_page=50`,
          { headers: this.buildHeaders(config.accessToken) },
        );

        if (response.ok) {
          const data = await response.json();
          alerts.push(...data.map((a: CodeScanningAlert) => ({ ...a, repo: repo.full_name })));
        }
      } catch {
        // Skip repos without code scanning
      }
    }

    return alerts;
  }

  /**
   * Get secret scanning alert statistics
   */
  private async getSecretScanningStats(
    config: GitHubConfig,
    repos: GitHubRepo[],
  ): Promise<{ total: number; open: number; resolved: number }> {
    let total = 0;
    let open = 0;
    let resolved = 0;

    for (const repo of repos.slice(0, 20)) {
      try {
        const response = await fetch(
          `${this.baseUrl}/repos/${repo.full_name}/secret-scanning/alerts?per_page=100`,
          { headers: this.buildHeaders(config.accessToken) },
        );

        if (response.ok) {
          const data = await response.json();
          total += data.length;
          open += data.filter((a: any) => a.state === 'open').length;
          resolved += data.filter((a: any) => a.state === 'resolved').length;
        }
      } catch {
        // Skip repos without access
      }
    }

    return { total, open, resolved };
  }

  /**
   * Get GitHub Actions statistics
   */
  private async getActionsStats(
    config: GitHubConfig,
    repos: GitHubRepo[],
  ): Promise<{ workflowRuns: number; successRate: number; failedRuns: number }> {
    let totalRuns = 0;
    let successfulRuns = 0;
    let failedRuns = 0;

    for (const repo of repos) {
      try {
        const response = await fetch(
          `${this.baseUrl}/repos/${repo.full_name}/actions/runs?per_page=100`,
          { headers: this.buildHeaders(config.accessToken) },
        );

        if (response.ok) {
          const data = await response.json();
          const runs = data.workflow_runs || [];
          totalRuns += runs.length;
          successfulRuns += runs.filter((r: any) => r.conclusion === 'success').length;
          failedRuns += runs.filter((r: any) => r.conclusion === 'failure').length;
        }
      } catch {
        // Skip repos without actions
      }
    }

    return {
      workflowRuns: totalRuns,
      successRate: totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0,
      failedRuns,
    };
  }

  /**
   * Build headers for GitHub API requests
   */
  private buildHeaders(accessToken: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }
}

