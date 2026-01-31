/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

export interface GitLabConfig {
  baseUrl?: string;  // For self-hosted, defaults to gitlab.com
  accessToken: string;
  groupId?: string;
}

export interface GitLabSyncResult {
  projects: {
    total: number;
    private: number;
    internal: number;
    public: number;
    archived: number;
    items: Array<{
      id: number;
      name: string;
      visibility: string;
      defaultBranch: string;
      lastActivity: string;
      protectedBranches: boolean;
    }>;
  };
  securityScanning: {
    projectsWithSast: number;
    projectsWithDast: number;
    projectsWithDependencyScanning: number;
    projectsWithContainerScanning: number;
    projectsWithSecretDetection: number;
  };
  vulnerabilities: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    items: Array<{
      id: number;
      project: string;
      severity: string;
      name: string;
      state: string;
      scanner: string;
    }>;
  };
  mergeRequests: {
    open: number;
    merged: number;
    avgTimeToMerge: number;
  };
  pipelines: {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
  };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class GitLabConnector {
  private readonly logger = new Logger(GitLabConnector.name);

  async testConnection(config: GitLabConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.accessToken) {
      return { success: false, message: 'Access token is required' };
    }

    try {
      const baseUrl = this.getBaseUrl(config.baseUrl);
      const response = await fetch(`${baseUrl}/api/v4/user`, {
        headers: { 'PRIVATE-TOKEN': config.accessToken },
      });

      if (!response.ok) {
        return { success: false, message: response.status === 401 ? 'Invalid access token' : `API error: ${response.status}` };
      }

      const user = await response.json();
      return {
        success: true,
        message: `Connected to GitLab as ${user.username}`,
        details: { username: user.username, name: user.name, isAdmin: user.is_admin },
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  async sync(config: GitLabConfig): Promise<GitLabSyncResult> {
    const baseUrl = this.getBaseUrl(config.baseUrl);
    const errors: string[] = [];

    const [projects, vulnerabilities] = await Promise.all([
      this.getProjects(baseUrl, config).catch(e => { errors.push(`Projects: ${e.message}`); return []; }),
      this.getVulnerabilities(baseUrl, config).catch(e => { errors.push(`Vulns: ${e.message}`); return []; }),
    ]);

    const privateProjects = projects.filter((p: any) => p.visibility === 'private');
    const publicProjects = projects.filter((p: any) => p.visibility === 'public');

    return {
      projects: {
        total: projects.length,
        private: privateProjects.length,
        internal: projects.filter((p: any) => p.visibility === 'internal').length,
        public: publicProjects.length,
        archived: projects.filter((p: any) => p.archived).length,
        items: projects.slice(0, 50).map((p: any) => ({
          id: p.id,
          name: p.path_with_namespace,
          visibility: p.visibility,
          defaultBranch: p.default_branch,
          lastActivity: p.last_activity_at,
          protectedBranches: true,
        })),
      },
      securityScanning: {
        projectsWithSast: 0,
        projectsWithDast: 0,
        projectsWithDependencyScanning: 0,
        projectsWithContainerScanning: 0,
        projectsWithSecretDetection: 0,
      },
      vulnerabilities: {
        total: vulnerabilities.length,
        critical: vulnerabilities.filter((v: any) => v.severity === 'critical').length,
        high: vulnerabilities.filter((v: any) => v.severity === 'high').length,
        medium: vulnerabilities.filter((v: any) => v.severity === 'medium').length,
        low: vulnerabilities.filter((v: any) => v.severity === 'low').length,
        items: vulnerabilities.slice(0, 100).map((v: any) => ({
          id: v.id,
          project: v.project?.name || '',
          severity: v.severity,
          name: v.name || v.title,
          state: v.state,
          scanner: v.scanner?.name || '',
        })),
      },
      mergeRequests: { open: 0, merged: 0, avgTimeToMerge: 0 },
      pipelines: { total: 0, successful: 0, failed: 0, successRate: 0 },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private getBaseUrl(baseUrl?: string): string {
    return (baseUrl || 'https://gitlab.com').replace(/\/+$/, '');
  }

  private async getProjects(baseUrl: string, config: GitLabConfig): Promise<any[]> {
    const endpoint = config.groupId
      ? `${baseUrl}/api/v4/groups/${config.groupId}/projects`
      : `${baseUrl}/api/v4/projects?membership=true`;
    
    const response = await fetch(`${endpoint}&per_page=100`, {
      headers: { 'PRIVATE-TOKEN': config.accessToken },
    });
    if (!response.ok) throw new Error(`Failed to fetch projects: ${response.status}`);
    return response.json();
  }

  private async getVulnerabilities(baseUrl: string, config: GitLabConfig): Promise<any[]> {
    if (!config.groupId) return [];
    const response = await fetch(`${baseUrl}/api/v4/groups/${config.groupId}/vulnerability_findings?per_page=100`, {
      headers: { 'PRIVATE-TOKEN': config.accessToken },
    });
    if (!response.ok) return [];
    return response.json();
  }
}

