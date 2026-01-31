/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

/**
 * Snyk Integration Configuration
 */
export interface SnykConfig {
  apiToken: string;
  organizationId?: string;  // Snyk org ID (optional, will list orgs if not provided)
}

/**
 * Snyk Organization
 */
interface SnykOrg {
  id: string;
  name: string;
  slug: string;
  url: string;
  created: string;
}

/**
 * Snyk Project
 */
interface SnykProject {
  id: string;
  name: string;
  origin: string;          // github, gitlab, etc.
  type: string;            // npm, maven, pip, etc.
  branch?: string;
  targetReference?: string;
  created: string;
  lastTestedDate: string;
  isMonitored: boolean;
  issueCountsBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * Snyk Issue (Vulnerability)
 */
interface SnykIssue {
  id: string;
  issueType: string;
  pkgName: string;
  pkgVersions: string[];
  issueData: {
    id: string;
    title: string;
    severity: string;
    description: string;
    identifiers: {
      CVE?: string[];
      CWE?: string[];
    };
    credit: string[];
    exploitMaturity: string;
    semver: { vulnerable: string[] };
    publicationTime: string;
    isUpgradable: boolean;
    isPatchable: boolean;
  };
  isPatched: boolean;
  isIgnored: boolean;
  fixInfo: {
    isUpgradable: boolean;
    isPatchable: boolean;
    isPinnable: boolean;
    isFixable: boolean;
    isPartiallyFixable: boolean;
    nearestFixedInVersion?: string;
  };
  priority: {
    score: number;
    factors: Array<{ name: string; description: string }>;
  };
}

/**
 * Snyk Sync Result
 */
export interface SnykSyncResult {
  organizations: {
    total: number;
    items: Array<{
      id: string;
      name: string;
      projectCount: number;
    }>;
  };
  projects: {
    total: number;
    monitored: number;
    unmonitored: number;
    byOrigin: Record<string, number>;
    byType: Record<string, number>;
    items: Array<{
      id: string;
      name: string;
      origin: string;
      type: string;
      lastTested: string;
      criticalCount: number;
      highCount: number;
      mediumCount: number;
      lowCount: number;
    }>;
  };
  vulnerabilities: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    fixable: number;
    unfixable: number;
    exploitable: number;
    byPackage: Array<{ package: string; count: number; severity: string }>;
    items: Array<{
      id: string;
      title: string;
      severity: string;
      package: string;
      version: string;
      cve: string;
      exploitMaturity: string;
      isFixable: boolean;
      fixVersion: string;
      project: string;
    }>;
  };
  licenses: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
  codeIssues: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  compliance: {
    projectsWithCritical: number;
    projectsWithHigh: number;
    projectsClean: number;
    averageFixTime: number;
  };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class SnykConnector {
  private readonly logger = new Logger(SnykConnector.name);
  private readonly baseUrl = 'https://api.snyk.io/v1';

  /**
   * Test connection to Snyk
   */
  async testConnection(config: SnykConfig): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!config.apiToken) {
      return { success: false, message: 'API token is required' };
    }

    try {
      // Test by getting orgs
      const response = await fetch(`${this.baseUrl}/orgs`, {
        headers: this.buildHeaders(config.apiToken),
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, message: 'Invalid API token' };
        }
        return { success: false, message: `Snyk API error: ${response.status}` };
      }

      const data = await response.json();
      const orgs = data.orgs || [];

      if (config.organizationId) {
        const org = orgs.find((o: SnykOrg) => o.id === config.organizationId);
        if (!org) {
          return { success: false, message: `Organization ${config.organizationId} not found` };
        }
        return {
          success: true,
          message: `Connected to Snyk organization: ${org.name}`,
          details: { organization: org.name, orgId: org.id },
        };
      }

      return {
        success: true,
        message: `Connected to Snyk. Found ${orgs.length} organization(s).`,
        details: {
          organizations: orgs.map((o: SnykOrg) => ({ id: o.id, name: o.name })),
        },
      };
    } catch (error: any) {
      this.logger.error('Snyk connection test failed', error);
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  /**
   * Full sync - collect security scanning evidence from Snyk
   */
  async sync(config: SnykConfig): Promise<SnykSyncResult> {
    const errors: string[] = [];

    this.logger.log('Starting Snyk sync...');

    // Get organizations
    const orgs = await this.getOrganizations(config).catch(e => {
      errors.push(`Organizations: ${e.message}`);
      return [] as SnykOrg[];
    });

    // Filter to specific org if configured
    const targetOrgs = config.organizationId 
      ? orgs.filter(o => o.id === config.organizationId)
      : orgs;

    // Get projects for each org
    const allProjects: SnykProject[] = [];
    for (const org of targetOrgs) {
      const projects = await this.getProjects(config, org.id).catch(e => {
        errors.push(`Projects for ${org.name}: ${e.message}`);
        return [] as SnykProject[];
      });
      allProjects.push(...projects);
    }

    // Get issues for projects (sample of first 20)
    const allIssues: Array<SnykIssue & { projectName: string }> = [];
    for (const project of allProjects.slice(0, 20)) {
      const issues = await this.getProjectIssues(config, project).catch(e => {
        errors.push(`Issues for ${project.name}: ${e.message}`);
        return [] as SnykIssue[];
      });
      allIssues.push(...issues.map(i => ({ ...i, projectName: project.name })));
    }

    // Process projects
    const byOrigin: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let totalCritical = 0;
    let totalHigh = 0;
    let totalMedium = 0;
    let totalLow = 0;

    for (const project of allProjects) {
      byOrigin[project.origin] = (byOrigin[project.origin] || 0) + 1;
      byType[project.type] = (byType[project.type] || 0) + 1;
      
      totalCritical += project.issueCountsBySeverity?.critical || 0;
      totalHigh += project.issueCountsBySeverity?.high || 0;
      totalMedium += project.issueCountsBySeverity?.medium || 0;
      totalLow += project.issueCountsBySeverity?.low || 0;
    }

    // Process issues
    const fixableIssues = allIssues.filter(i => i.fixInfo?.isFixable);
    const exploitableIssues = allIssues.filter(i => 
      i.issueData?.exploitMaturity === 'mature' || 
      i.issueData?.exploitMaturity === 'proof-of-concept'
    );

    // Group by package
    const packageCounts: Record<string, { count: number; severity: string }> = {};
    for (const issue of allIssues) {
      const pkg = issue.pkgName;
      if (!packageCounts[pkg]) {
        packageCounts[pkg] = { count: 0, severity: 'low' };
      }
      packageCounts[pkg].count++;
      // Keep highest severity
      const severityOrder = ['critical', 'high', 'medium', 'low'];
      if (severityOrder.indexOf(issue.issueData?.severity) < severityOrder.indexOf(packageCounts[pkg].severity)) {
        packageCounts[pkg].severity = issue.issueData?.severity;
      }
    }

    const byPackage = Object.entries(packageCounts)
      .map(([pkg, data]) => ({ package: pkg, count: data.count, severity: data.severity }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Compliance stats
    const projectsWithCritical = allProjects.filter(p => (p.issueCountsBySeverity?.critical || 0) > 0).length;
    const projectsWithHigh = allProjects.filter(p => (p.issueCountsBySeverity?.high || 0) > 0).length;
    const projectsClean = allProjects.filter(p => 
      (p.issueCountsBySeverity?.critical || 0) === 0 &&
      (p.issueCountsBySeverity?.high || 0) === 0 &&
      (p.issueCountsBySeverity?.medium || 0) === 0 &&
      (p.issueCountsBySeverity?.low || 0) === 0
    ).length;

    this.logger.log(`Snyk sync complete: ${allProjects.length} projects, ${allIssues.length} issues sampled`);

    return {
      organizations: {
        total: orgs.length,
        items: targetOrgs.map(o => ({
          id: o.id,
          name: o.name,
          projectCount: allProjects.filter(_p => true).length, // Would need org ID on project
        })),
      },
      projects: {
        total: allProjects.length,
        monitored: allProjects.filter(p => p.isMonitored).length,
        unmonitored: allProjects.filter(p => !p.isMonitored).length,
        byOrigin,
        byType,
        items: allProjects.slice(0, 50).map(p => ({
          id: p.id,
          name: p.name,
          origin: p.origin,
          type: p.type,
          lastTested: p.lastTestedDate,
          criticalCount: p.issueCountsBySeverity?.critical || 0,
          highCount: p.issueCountsBySeverity?.high || 0,
          mediumCount: p.issueCountsBySeverity?.medium || 0,
          lowCount: p.issueCountsBySeverity?.low || 0,
        })),
      },
      vulnerabilities: {
        total: totalCritical + totalHigh + totalMedium + totalLow,
        critical: totalCritical,
        high: totalHigh,
        medium: totalMedium,
        low: totalLow,
        fixable: fixableIssues.length,
        unfixable: allIssues.length - fixableIssues.length,
        exploitable: exploitableIssues.length,
        byPackage,
        items: allIssues.slice(0, 100).map(i => ({
          id: i.id,
          title: i.issueData?.title || '',
          severity: i.issueData?.severity || 'unknown',
          package: i.pkgName,
          version: i.pkgVersions?.[0] || '',
          cve: i.issueData?.identifiers?.CVE?.[0] || '',
          exploitMaturity: i.issueData?.exploitMaturity || '',
          isFixable: i.fixInfo?.isFixable || false,
          fixVersion: i.fixInfo?.nearestFixedInVersion || '',
          project: i.projectName,
        })),
      },
      licenses: {
        total: 0, // Would need separate API call
        high: 0,
        medium: 0,
        low: 0,
      },
      codeIssues: {
        total: 0, // Would need Snyk Code API
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      compliance: {
        projectsWithCritical,
        projectsWithHigh,
        projectsClean,
        averageFixTime: 0, // Would need historical data
      },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  /**
   * Get organizations
   */
  private async getOrganizations(config: SnykConfig): Promise<SnykOrg[]> {
    const response = await fetch(`${this.baseUrl}/orgs`, {
      headers: this.buildHeaders(config.apiToken),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch organizations: ${response.status}`);
    }

    const data = await response.json();
    return data.orgs || [];
  }

  /**
   * Get projects for an organization
   */
  private async getProjects(config: SnykConfig, orgId: string): Promise<SnykProject[]> {
    const response = await fetch(`${this.baseUrl}/org/${orgId}/projects`, {
      headers: this.buildHeaders(config.apiToken),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.status}`);
    }

    const data = await response.json();
    return data.projects || [];
  }

  /**
   * Get issues for a project
   */
  private async getProjectIssues(config: SnykConfig, project: SnykProject): Promise<SnykIssue[]> {
    // Extract org ID from project (would need to track this)
    // For now, use the configured org ID
    const orgId = config.organizationId;
    if (!orgId) {
      return [];
    }

    const response = await fetch(
      `${this.baseUrl}/org/${orgId}/project/${project.id}/aggregated-issues`,
      {
        method: 'POST',
        headers: this.buildHeaders(config.apiToken),
        body: JSON.stringify({
          includeDescription: true,
          includeIntroducedThrough: false,
        }),
      },
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.issues || [];
  }

  /**
   * Build headers for Snyk API requests
   */
  private buildHeaders(apiToken: string): Record<string, string> {
    return {
      'Authorization': `token ${apiToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }
}

