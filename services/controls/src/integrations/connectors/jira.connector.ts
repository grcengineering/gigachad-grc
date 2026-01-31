/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

/**
 * Jira Integration Configuration
 */
export interface JiraConfig {
  domain: string;       // e.g., "company.atlassian.net"
  email: string;        // Atlassian account email
  apiToken: string;     // API token from Atlassian
  projectKeys?: string[]; // Optional: specific projects to sync
}

/**
 * Jira Issue
 */
interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description: string;
    issuetype: { name: string; id: string };
    status: { name: string; id: string };
    priority: { name: string; id: string };
    assignee?: { displayName: string; emailAddress: string };
    reporter: { displayName: string; emailAddress: string };
    created: string;
    updated: string;
    resolutiondate?: string;
    duedate?: string;
    labels: string[];
    project: { key: string; name: string };
    components: Array<{ name: string }>;
    customfield_10000?: any; // Epic Link or other custom fields
  };
}

/**
 * Jira Project
 */
interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
  simplified: boolean;
  style: string;
  isPrivate: boolean;
  lead: { displayName: string };
}

/**
 * Jira Sync Result
 */
export interface JiraSyncResult {
  projects: {
    total: number;
    items: Array<{
      key: string;
      name: string;
      lead: string;
      issueCount: number;
    }>;
  };
  issues: {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    openIssues: number;
    closedIssues: number;
    overdueIssues: number;
    securityRelated: number;
    complianceRelated: number;
  };
  securityIssues: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    items: Array<{
      key: string;
      summary: string;
      priority: string;
      status: string;
      assignee: string;
      created: string;
      dueDate: string;
    }>;
  };
  slaMetrics: {
    avgResolutionTime: number;  // in days
    onTimeResolution: number;   // percentage
    openOverdue: number;
  };
  recentActivity: {
    issuesCreatedLast7Days: number;
    issuesResolvedLast7Days: number;
    issuesUpdatedLast24Hours: number;
  };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class JiraConnector {
  private readonly logger = new Logger(JiraConnector.name);

  /**
   * Test connection to Jira
   */
  async testConnection(config: JiraConfig): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!config.domain || !config.email || !config.apiToken) {
      return { success: false, message: 'Domain, email, and API token are required' };
    }

    try {
      const baseUrl = this.getBaseUrl(config.domain);
      
      // Test by getting myself
      const response = await fetch(`${baseUrl}/rest/api/3/myself`, {
        headers: this.buildHeaders(config.email, config.apiToken),
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, message: 'Invalid credentials' };
        }
        const error = await response.text();
        return { success: false, message: `API error: ${response.status} - ${error.substring(0, 100)}` };
      }

      const user = await response.json();

      // Get project count
      const projectsResponse = await fetch(`${baseUrl}/rest/api/3/project?maxResults=1`, {
        headers: this.buildHeaders(config.email, config.apiToken),
      });
      
      let projectCount = 0;
      if (projectsResponse.ok) {
        const projects = await projectsResponse.json();
        projectCount = Array.isArray(projects) ? projects.length : 0;
      }

      return {
        success: true,
        message: `Connected to Jira as ${user.displayName}`,
        details: {
          user: user.displayName,
          email: user.emailAddress,
          accountId: user.accountId,
          projectCount,
        },
      };
    } catch (error: any) {
      this.logger.error('Jira connection test failed', error);
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  /**
   * Full sync - collect IT operations evidence from Jira
   */
  async sync(config: JiraConfig): Promise<JiraSyncResult> {
    const baseUrl = this.getBaseUrl(config.domain);
    const errors: string[] = [];

    this.logger.log('Starting Jira sync...');

    // Get projects
    const projects = await this.getProjects(baseUrl, config).catch(e => {
      errors.push(`Projects: ${e.message}`);
      return [] as JiraProject[];
    });

    // Get all issues
    const allIssues = await this.getIssues(baseUrl, config, config.projectKeys).catch(e => {
      errors.push(`Issues: ${e.message}`);
      return [] as JiraIssue[];
    });

    // Get security/compliance related issues
    const securityIssues = await this.getSecurityIssues(baseUrl, config).catch(e => {
      errors.push(`Security issues: ${e.message}`);
      return [] as JiraIssue[];
    });

    // Process issues
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let openIssues = 0;
    let closedIssues = 0;
    let overdueIssues = 0;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let issuesCreatedLast7Days = 0;
    let issuesResolvedLast7Days = 0;
    let issuesUpdatedLast24Hours = 0;
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    let onTimeCount = 0;

    for (const issue of allIssues) {
      // Count by type
      const typeName = issue.fields.issuetype?.name || 'Unknown';
      byType[typeName] = (byType[typeName] || 0) + 1;

      // Count by status
      const statusName = issue.fields.status?.name || 'Unknown';
      byStatus[statusName] = (byStatus[statusName] || 0) + 1;

      // Count by priority
      const priorityName = issue.fields.priority?.name || 'None';
      byPriority[priorityName] = (byPriority[priorityName] || 0) + 1;

      // Open/closed
      const statusCategory = statusName.toLowerCase();
      if (statusCategory.includes('done') || statusCategory.includes('closed') || statusCategory.includes('resolved')) {
        closedIssues++;
      } else {
        openIssues++;
      }

      // Overdue
      if (issue.fields.duedate) {
        const dueDate = new Date(issue.fields.duedate);
        if (dueDate < now && !statusCategory.includes('done') && !statusCategory.includes('closed')) {
          overdueIssues++;
        }
      }

      // Recent activity
      const created = new Date(issue.fields.created);
      const updated = new Date(issue.fields.updated);
      
      if (created > sevenDaysAgo) {
        issuesCreatedLast7Days++;
      }
      if (updated > oneDayAgo) {
        issuesUpdatedLast24Hours++;
      }
      if (issue.fields.resolutiondate) {
        const resolved = new Date(issue.fields.resolutiondate);
        if (resolved > sevenDaysAgo) {
          issuesResolvedLast7Days++;
        }

        // Resolution time
        const resolutionDays = (resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        totalResolutionTime += resolutionDays;
        resolvedCount++;

        // On-time (if due date exists)
        if (issue.fields.duedate) {
          const dueDate = new Date(issue.fields.duedate);
          if (resolved <= dueDate) {
            onTimeCount++;
          }
        } else {
          onTimeCount++; // No due date = on time
        }
      }
    }

    // Count security/compliance issues
    const securityKeywords = ['security', 'vulnerability', 'cve', 'pentest', 'audit'];
    const complianceKeywords = ['compliance', 'soc2', 'iso', 'gdpr', 'hipaa', 'pci'];
    
    const securityRelated = allIssues.filter(i => {
      const text = `${i.fields.summary} ${i.fields.description || ''} ${i.fields.labels?.join(' ') || ''}`.toLowerCase();
      return securityKeywords.some(k => text.includes(k));
    }).length;

    const complianceRelated = allIssues.filter(i => {
      const text = `${i.fields.summary} ${i.fields.description || ''} ${i.fields.labels?.join(' ') || ''}`.toLowerCase();
      return complianceKeywords.some(k => text.includes(k));
    }).length;

    // Process security issues by priority
    const criticalSecurity = securityIssues.filter(i => 
      i.fields.priority?.name?.toLowerCase().includes('critical') || 
      i.fields.priority?.name?.toLowerCase().includes('highest')
    );
    const highSecurity = securityIssues.filter(i => 
      i.fields.priority?.name?.toLowerCase().includes('high')
    );
    const mediumSecurity = securityIssues.filter(i => 
      i.fields.priority?.name?.toLowerCase().includes('medium')
    );
    const lowSecurity = securityIssues.filter(i => 
      i.fields.priority?.name?.toLowerCase().includes('low') ||
      i.fields.priority?.name?.toLowerCase().includes('lowest')
    );

    this.logger.log(`Jira sync complete: ${projects.length} projects, ${allIssues.length} issues`);

    return {
      projects: {
        total: projects.length,
        items: projects.slice(0, 20).map(p => ({
          key: p.key,
          name: p.name,
          lead: p.lead?.displayName || 'Unassigned',
          issueCount: allIssues.filter(i => i.fields.project?.key === p.key).length,
        })),
      },
      issues: {
        total: allIssues.length,
        byType,
        byStatus,
        byPriority,
        openIssues,
        closedIssues,
        overdueIssues,
        securityRelated,
        complianceRelated,
      },
      securityIssues: {
        total: securityIssues.length,
        critical: criticalSecurity.length,
        high: highSecurity.length,
        medium: mediumSecurity.length,
        low: lowSecurity.length,
        items: securityIssues.slice(0, 50).map(i => ({
          key: i.key,
          summary: i.fields.summary,
          priority: i.fields.priority?.name || 'None',
          status: i.fields.status?.name || 'Unknown',
          assignee: i.fields.assignee?.displayName || 'Unassigned',
          created: i.fields.created,
          dueDate: i.fields.duedate || '',
        })),
      },
      slaMetrics: {
        avgResolutionTime: resolvedCount > 0 ? Math.round(totalResolutionTime / resolvedCount * 10) / 10 : 0,
        onTimeResolution: resolvedCount > 0 ? Math.round((onTimeCount / resolvedCount) * 100) : 0,
        openOverdue: overdueIssues,
      },
      recentActivity: {
        issuesCreatedLast7Days,
        issuesResolvedLast7Days,
        issuesUpdatedLast24Hours,
      },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  /**
   * Get all projects
   */
  private async getProjects(baseUrl: string, config: JiraConfig): Promise<JiraProject[]> {
    const response = await fetch(`${baseUrl}/rest/api/3/project?expand=lead`, {
      headers: this.buildHeaders(config.email, config.apiToken),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get issues with JQL query
   */
  private async getIssues(
    baseUrl: string, 
    config: JiraConfig,
    projectKeys?: string[],
  ): Promise<JiraIssue[]> {
    const issues: JiraIssue[] = [];
    let startAt = 0;
    const maxResults = 100;

    // Build JQL
    let jql = 'ORDER BY updated DESC';
    if (projectKeys && projectKeys.length > 0) {
      jql = `project IN (${projectKeys.join(',')}) ${jql}`;
    }

    while (issues.length < 1000) {
      const response = await fetch(
        `${baseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&startAt=${startAt}&maxResults=${maxResults}&fields=summary,description,issuetype,status,priority,assignee,reporter,created,updated,resolutiondate,duedate,labels,project,components`,
        { headers: this.buildHeaders(config.email, config.apiToken) },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch issues: ${response.status}`);
      }

      const data = await response.json();
      issues.push(...(data.issues || []));

      if (data.issues.length < maxResults || issues.length >= data.total) {
        break;
      }

      startAt += maxResults;
    }

    return issues;
  }

  /**
   * Get security-related issues
   */
  private async getSecurityIssues(baseUrl: string, config: JiraConfig): Promise<JiraIssue[]> {
    // Search for issues with security-related labels or summary
    const jql = `(labels IN (security, vulnerability, cve, pentest, audit) OR summary ~ "security" OR summary ~ "vulnerability" OR summary ~ "CVE") AND resolution = Unresolved ORDER BY priority DESC, created DESC`;

    const response = await fetch(
      `${baseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=100&fields=summary,description,issuetype,status,priority,assignee,reporter,created,updated,duedate,labels,project`,
      { headers: this.buildHeaders(config.email, config.apiToken) },
    );

    if (!response.ok) {
      // Not a critical error - security issues might not exist
      return [];
    }

    const data = await response.json();
    return data.issues || [];
  }

  /**
   * Build base URL
   */
  private getBaseUrl(domain: string): string {
    let url = domain.trim();
    if (!url.startsWith('https://')) {
      url = 'https://' + url;
    }
    return url.replace(/\/+$/, '');
  }

  /**
   * Build headers with Basic auth
   */
  private buildHeaders(email: string, apiToken: string): Record<string, string> {
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }
}

