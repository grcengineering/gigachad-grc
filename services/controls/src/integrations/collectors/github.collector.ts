import { Injectable, Logger } from '@nestjs/common';
import {
  BaseCollector,
  CollectorConfig,
  CollectionResult,
  CollectedEvidence,
} from './collector.interface';

interface GitHubRepo {
  name: string;
  private: boolean;
  archived: boolean;
  fork: boolean;
  has_issues: boolean;
  has_wiki: boolean;
  default_branch: string;
  visibility: string;
  pushed_at: string;
  owner: { login: string };
}

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
      // Collect repository security settings (also returns the repo list)
      const repoEvidence = await this.collectRepositorySettings(config);
      evidence.push(...repoEvidence.evidence);
      errors.push(...repoEvidence.errors);

      // Collect branch protection rules (uses repo list from above)
      const branchEvidence = await this.collectBranchProtection(config, repoEvidence.repos);
      evidence.push(...branchEvidence.evidence);
      warnings.push(...branchEvidence.warnings);

      // Collect security alerts
      const alertsEvidence = await this.collectSecurityAlerts(config);
      evidence.push(...alertsEvidence.evidence);
      warnings.push(...alertsEvidence.warnings);

      // Collect audit log
      const auditEvidence = await this.collectAuditLog(config);
      evidence.push(...auditEvidence.evidence);
      warnings.push(...auditEvidence.warnings);

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

  private async ghFetch(
    url: string,
    accessToken: string
  ): Promise<{ ok: boolean; status: number; data: any; linkHeader: string | null }> {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    const linkHeader = response.headers.get('link');
    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    return { ok: response.ok, status: response.status, data, linkHeader };
  }

  private parseNextLink(linkHeader: string | null): string | null {
    if (!linkHeader) return null;
    // Format: <https://...>; rel="next", <https://...>; rel="last"
    const parts = linkHeader.split(',');
    for (const part of parts) {
      const match = part.match(/<([^>]+)>;\s*rel="next"/);
      if (match) return match[1];
    }
    return null;
  }

  private async collectRepositorySettings(config: CollectorConfig): Promise<{
    evidence: CollectedEvidence[];
    errors: string[];
    repos: GitHubRepo[];
  }> {
    const evidence: CollectedEvidence[] = [];
    const errors: string[] = [];
    const { accessToken, organization } = config.credentials;
    let repos: GitHubRepo[] = [];

    try {
      // Fetch repositories with Link-header pagination (cap 1000).
      // The previous single-page fetch silently truncated at 100, so org-wide
      // totals were wrong for any non-trivial GitHub org.
      let url: string | null =
        `${this.API_BASE}/orgs/${organization}/repos?per_page=100`;
      let pageCount = 0;
      const MAX_PAGES = 10; // 100 * 10 = 1000 cap

      while (url && repos.length < 1000 && pageCount < MAX_PAGES) {
        const { ok, status, data, linkHeader } = await this.ghFetch(url, accessToken);
        if (!ok) {
          throw new Error(`Failed to fetch repositories: ${status}`);
        }
        if (Array.isArray(data)) {
          repos.push(...data);
        }
        url = this.parseNextLink(linkHeader);
        pageCount++;
      }

      // Probe Advanced Security status for the first 50 repos.
      // GET /repos/{owner}/{repo} returns security_and_analysis with the
      // advanced_security.status field. We cap at 50 to match other
      // per-repo iteration patterns in this collector.
      const securitySampleRepos = repos.slice(0, 50);
      let reposWithSecurityEnabled = 0;
      for (const r of securitySampleRepos) {
        const ownerLogin = r.owner?.login || organization;
        const detailUrl = `${this.API_BASE}/repos/${ownerLogin}/${r.name}`;
        const { ok, data } = await this.ghFetch(detailUrl, accessToken);
        if (!ok || !data) continue;
        if (data.security_and_analysis?.advanced_security?.status === 'enabled') {
          reposWithSecurityEnabled++;
        }
      }

      // Analyze security settings
      const securityAnalysis = {
        totalRepos: repos.length,
        privateRepos: repos.filter((r: any) => r.private).length,
        publicRepos: repos.filter((r: any) => !r.private).length,
        archivedRepos: repos.filter((r: any) => r.archived).length,
        forkedRepos: repos.filter((r: any) => r.fork).length,
        reposWithIssuesDisabled: repos.filter((r: any) => !r.has_issues).length,
        reposWithWikiEnabled: repos.filter((r: any) => r.has_wiki).length,
        // Sampled value, not org-wide — sampleSize lets consumers reason
        // about coverage instead of treating this like a complete count.
        reposWithSecurityEnabled,
        reposWithSecurityEnabledSampleSize: securitySampleRepos.length,
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

    return { evidence, errors, repos };
  }

  private async collectBranchProtection(
    config: CollectorConfig,
    repos: GitHubRepo[]
  ): Promise<{
    evidence: CollectedEvidence[];
    warnings: string[];
  }> {
    const evidence: CollectedEvidence[] = [];
    const warnings: string[] = [];
    const { accessToken, organization } = config.credentials;

    try {
      // Cap at first 50 repos to avoid burning rate-limit budget
      const reposToCheck = repos.slice(0, 50);
      const commonSettings = {
        requirePullRequest: 0,
        requireReviews: 0,
        dismissStaleReviews: 0,
        requireCodeOwners: 0,
        enforceAdmins: 0,
        requireStatusChecks: 0,
        requireLinearHistory: 0,
        // Renamed from allowForcePushes — the count is of repos where force
        // pushes ARE allowed (weaker protection). The previous name read as
        // a positive control, which inverted the security interpretation.
        forcePushAllowed: 0,
      };
      const unprotectedRepositories: string[] = [];
      let protectedCount = 0;

      for (const repo of reposToCheck) {
        if (!repo.default_branch) {
          continue;
        }
        const owner = repo.owner?.login || organization;
        const url = `${this.API_BASE}/repos/${owner}/${repo.name}/branches/${repo.default_branch}/protection`;
        const { ok, status, data } = await this.ghFetch(url, accessToken);

        if (status === 404) {
          unprotectedRepositories.push(repo.name);
          continue;
        }

        if (!ok) {
          warnings.push(`Branch protection fetch for ${repo.name} failed: HTTP ${status}`);
          continue;
        }

        protectedCount++;

        // required_pull_request_reviews block presence => requirePullRequest
        const prReviews = data?.required_pull_request_reviews;
        if (prReviews) {
          commonSettings.requirePullRequest++;
          commonSettings.requireReviews++;
          if (prReviews.dismiss_stale_reviews) commonSettings.dismissStaleReviews++;
          if (prReviews.require_code_owner_reviews) commonSettings.requireCodeOwners++;
        }
        if (data?.enforce_admins?.enabled) commonSettings.enforceAdmins++;
        // GitHub returns an empty required_status_checks object when the
        // toggle is enabled but no contexts/checks are configured — that's
        // not actually enforcing anything. Require at least one entry.
        if (
          (data?.required_status_checks?.contexts?.length || 0) > 0 ||
          (data?.required_status_checks?.checks?.length || 0) > 0
        ) {
          commonSettings.requireStatusChecks++;
        }
        if (data?.required_linear_history?.enabled) commonSettings.requireLinearHistory++;
        // Tracked as forcePushAllowed (weaker protection) so the field
        // name reads consistently with the measured state.
        if (data?.allow_force_pushes?.enabled) commonSettings.forcePushAllowed++;
      }

      const totalRepositories = reposToCheck.length;
      const protectionCoverage = totalRepositories > 0
        ? Math.round((protectedCount / totalRepositories) * 100)
        : 0;

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
          totalRepositories,
          repositoriesWithProtection: protectedCount,
          protectionCoverage,
          commonSettings,
          unprotectedRepositories,
          sampledRepoCount: reposToCheck.length,
          totalRepoCount: repos.length,
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
    const { accessToken, organization } = config.credentials;

    const dependabot = {
      totalAlerts: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      alertsByEcosystem: [] as { ecosystem: string; count: number }[],
      available: false,
    };
    const codeScanning = {
      totalAlerts: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      alertsByTool: [] as { tool: string; count: number }[],
      available: false,
    };
    const secretScanning = {
      alertsFound: 0,
      secretsResolved: 0,
      secretsOpen: 0,
      secretTypes: [] as string[],
      available: false,
    };

    // Dependabot alerts (paginated, cap 1000)
    try {
      const ecosystemCounts = new Map<string, number>();
      let url: string | null =
        `${this.API_BASE}/orgs/${organization}/dependabot/alerts?per_page=100&state=open`;
      let pageCount = 0;
      const MAX_PAGES = 10; // 100 * 10 = 1000 cap

      while (url && dependabot.totalAlerts < 1000 && pageCount < MAX_PAGES) {
        const { ok, status, data, linkHeader }: { ok: boolean; status: number; data: any; linkHeader: string | null } =
          await this.ghFetch(url, accessToken);

        if (status === 404 || status === 403) {
          warnings.push(`Dependabot alerts unavailable (HTTP ${status}); feature may not be enabled for the org`);
          break;
        }
        if (!ok) {
          warnings.push(`Dependabot alerts fetch failed: HTTP ${status}`);
          break;
        }

        dependabot.available = true;
        const alerts = Array.isArray(data) ? data : [];
        for (const alert of alerts) {
          dependabot.totalAlerts++;
          const severity = (alert?.security_advisory?.severity || '').toLowerCase();
          if (severity === 'critical') dependabot.critical++;
          else if (severity === 'high') dependabot.high++;
          else if (severity === 'medium' || severity === 'moderate') dependabot.medium++;
          else if (severity === 'low') dependabot.low++;

          const ecosystem = alert?.dependency?.package?.ecosystem;
          if (ecosystem) {
            ecosystemCounts.set(ecosystem, (ecosystemCounts.get(ecosystem) || 0) + 1);
          }
        }

        url = this.parseNextLink(linkHeader);
        pageCount++;
      }

      dependabot.alertsByEcosystem = Array.from(ecosystemCounts.entries())
        .map(([ecosystem, count]) => ({ ecosystem, count }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      warnings.push(`Dependabot alerts collection had issues: ${error.message}`);
    }

    // Code scanning alerts
    try {
      const toolCounts = new Map<string, number>();
      let url: string | null =
        `${this.API_BASE}/orgs/${organization}/code-scanning/alerts?per_page=100&state=open`;
      let pageCount = 0;
      const MAX_PAGES = 10;

      while (url && codeScanning.totalAlerts < 1000 && pageCount < MAX_PAGES) {
        const { ok, status, data, linkHeader }: { ok: boolean; status: number; data: any; linkHeader: string | null } =
          await this.ghFetch(url, accessToken);

        if (status === 404 || status === 403) {
          warnings.push(`Code scanning alerts unavailable (HTTP ${status}); feature may not be enabled`);
          break;
        }
        if (!ok) {
          warnings.push(`Code scanning alerts fetch failed: HTTP ${status}`);
          break;
        }

        codeScanning.available = true;
        const alerts = Array.isArray(data) ? data : [];
        for (const alert of alerts) {
          codeScanning.totalAlerts++;
          const severity = (alert?.rule?.security_severity_level || '').toLowerCase();
          if (severity === 'critical') codeScanning.critical++;
          else if (severity === 'high') codeScanning.high++;
          else if (severity === 'medium' || severity === 'moderate') codeScanning.medium++;
          else if (severity === 'low') codeScanning.low++;

          const tool = alert?.tool?.name;
          if (tool) {
            toolCounts.set(tool, (toolCounts.get(tool) || 0) + 1);
          }
        }

        url = this.parseNextLink(linkHeader);
        pageCount++;
      }

      codeScanning.alertsByTool = Array.from(toolCounts.entries())
        .map(([tool, count]) => ({ tool, count }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      warnings.push(`Code scanning alerts collection had issues: ${error.message}`);
    }

    // Secret scanning alerts
    try {
      const secretTypeSet = new Set<string>();
      let url: string | null =
        `${this.API_BASE}/orgs/${organization}/secret-scanning/alerts?per_page=100`;
      let pageCount = 0;
      const MAX_PAGES = 10;

      while (url && secretScanning.alertsFound < 1000 && pageCount < MAX_PAGES) {
        const { ok, status, data, linkHeader }: { ok: boolean; status: number; data: any; linkHeader: string | null } =
          await this.ghFetch(url, accessToken);

        if (status === 404 || status === 403) {
          warnings.push(`Secret scanning alerts unavailable (HTTP ${status}); feature may not be enabled`);
          break;
        }
        if (!ok) {
          warnings.push(`Secret scanning alerts fetch failed: HTTP ${status}`);
          break;
        }

        secretScanning.available = true;
        const alerts = Array.isArray(data) ? data : [];
        for (const alert of alerts) {
          secretScanning.alertsFound++;
          const state = (alert?.state || '').toLowerCase();
          if (state === 'resolved') secretScanning.secretsResolved++;
          else if (state === 'open') secretScanning.secretsOpen++;
          const t = alert?.secret_type_display_name || alert?.secret_type;
          if (t) secretTypeSet.add(String(t));
        }

        url = this.parseNextLink(linkHeader);
        pageCount++;
      }

      secretScanning.secretTypes = Array.from(secretTypeSet);
    } catch (error) {
      warnings.push(`Secret scanning alerts collection had issues: ${error.message}`);
    }

    // Emit three separate evidence records so each evidenceType actually
    // matches its data. Previously this was a single record typed as
    // dependabot_alerts but containing all three alert categories, which
    // made downstream queries by type return mixed/wrong data.
    const collectedAt = new Date();
    const baseId = Date.now();

    evidence.push({
      title: 'GitHub Dependabot Alerts Summary',
      description: 'Open Dependabot dependency vulnerability alerts',
      evidenceType: 'dependabot_alerts',
      category: 'vulnerability',
      source: 'github',
      sourceId: `github-dependabot-${baseId}`,
      collectedAt,
      data: { organization, dependabot },
      tags: ['github', 'dependabot', 'vulnerabilities'],
    });

    evidence.push({
      title: 'GitHub Code Scanning Alerts Summary',
      description: 'Open code scanning (CodeQL/SARIF) alerts',
      evidenceType: 'code_scanning_alerts',
      category: 'vulnerability',
      source: 'github',
      sourceId: `github-code-scanning-${baseId}`,
      collectedAt,
      data: { organization, codeScanning },
      tags: ['github', 'code-scanning', 'vulnerabilities'],
    });

    evidence.push({
      title: 'GitHub Secret Scanning Alerts Summary',
      description: 'Secret scanning alerts and resolution status',
      evidenceType: 'secret_scanning',
      category: 'security',
      source: 'github',
      sourceId: `github-secret-scanning-${baseId}`,
      collectedAt,
      data: { organization, secretScanning },
      tags: ['github', 'secret-scanning', 'security'],
    });

    return { evidence, warnings };
  }

  private async collectAuditLog(config: CollectorConfig): Promise<{
    evidence: CollectedEvidence[];
    warnings: string[];
  }> {
    const evidence: CollectedEvidence[] = [];
    const warnings: string[] = [];
    const { accessToken, organization } = config.credentials;

    // Compute 30-days-ago in YYYY-MM-DD
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateStr = thirtyDaysAgo.toISOString().slice(0, 10);
    const phrase = encodeURIComponent(`created:>${dateStr}`);

    const eventCategoryCounts = new Map<string, number>();
    const actionCounts = new Map<string, number>();
    const uniqueActorSet = new Set<string>();
    let totalEvents = 0;
    let auditLogAvailable = false;

    try {
      let url: string | null =
        `${this.API_BASE}/orgs/${organization}/audit-log?per_page=100&phrase=${phrase}`;
      let pageCount = 0;
      const MAX_PAGES = 20; // safety cap

      while (url && pageCount < MAX_PAGES && totalEvents < 5000) {
        const { ok, status, data, linkHeader }: { ok: boolean; status: number; data: any; linkHeader: string | null } =
          await this.ghFetch(url, accessToken);

        if (status === 404 || status === 403) {
          warnings.push(`Audit log requires GitHub Enterprise (HTTP ${status})`);
          break;
        }
        if (!ok) {
          warnings.push(`Audit log fetch failed: HTTP ${status}`);
          break;
        }

        auditLogAvailable = true;
        const events = Array.isArray(data) ? data : [];
        for (const ev of events) {
          totalEvents++;
          const action = ev?.action;
          if (typeof action === 'string' && action.length > 0) {
            actionCounts.set(action, (actionCounts.get(action) || 0) + 1);
            const category = action.split('.')[0];
            eventCategoryCounts.set(category, (eventCategoryCounts.get(category) || 0) + 1);
          }
          const actor = ev?.actor;
          if (actor) uniqueActorSet.add(String(actor));
        }

        url = this.parseNextLink(linkHeader);
        pageCount++;
      }
    } catch (error) {
      warnings.push(`Audit log collection had issues: ${error.message}`);
    }

    const eventCategories = Array.from(eventCategoryCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    const topActions = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

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
        available: auditLogAvailable,
        totalEvents,
        eventCategories,
        topActions,
        uniqueActors: uniqueActorSet.size,
      },
      tags: ['github', 'audit-log', 'logging'],
    });

    return { evidence, warnings };
  }
}
