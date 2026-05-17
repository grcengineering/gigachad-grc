import { Injectable, Logger } from '@nestjs/common';

export interface GitLabConfig {
  baseUrl?: string; // For self-hosted, defaults to gitlab.com
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

  async testConnection(
    config: GitLabConfig
  ): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.accessToken) {
      return { success: false, message: 'Access token is required' };
    }

    try {
      const baseUrl = this.getBaseUrl(config.baseUrl);
      const response = await fetch(`${baseUrl}/api/v4/user`, {
        headers: { 'PRIVATE-TOKEN': config.accessToken },
      });

      if (!response.ok) {
        return {
          success: false,
          message:
            response.status === 401 ? 'Invalid access token' : `API error: ${response.status}`,
        };
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

    const [projects, vulnerabilities, openMRs, mergedMRs] = await Promise.all([
      this.getProjects(baseUrl, config).catch((e) => {
        errors.push(`Projects: ${e.message}`);
        return [];
      }),
      this.getVulnerabilities(baseUrl, config).catch((e) => {
        errors.push(`Vulns: ${e.message}`);
        return [];
      }),
      this.getMergeRequests(baseUrl, config, 'opened').catch((e) => {
        errors.push(`OpenMRs: ${e.message}`);
        return [];
      }),
      this.getMergeRequests(baseUrl, config, 'merged').catch((e) => {
        errors.push(`MergedMRs: ${e.message}`);
        return [];
      }),
    ]);

    // For per-project queries, cap at 20 projects to bound the work
    const projectsToScan: any[] = projects.slice(0, 20);

    // Fetch jobs, pipelines, protected branches per project
    const scannerSets = {
      sast: new Set<number>(),
      dast: new Set<number>(),
      dependency_scanning: new Set<number>(),
      container_scanning: new Set<number>(),
      secret_detection: new Set<number>(),
    };
    let pipelinesTotal = 0;
    let pipelinesSuccessful = 0;
    let pipelinesFailed = 0;
    const protectedByProject: Record<number, boolean> = {};

    for (const project of projectsToScan) {
      const projectId = project.id;
      const defaultBranch = project.default_branch;

      const [jobs, pipelines, protectedBranches] = await Promise.all([
        this.getProjectJobs(baseUrl, config, projectId).catch((e) => {
          errors.push(`Jobs(${project.path_with_namespace}): ${e.message}`);
          return [] as any[];
        }),
        this.getProjectPipelines(baseUrl, config, projectId).catch((e) => {
          errors.push(`Pipelines(${project.path_with_namespace}): ${e.message}`);
          return [] as any[];
        }),
        this.getProtectedBranches(baseUrl, config, projectId).catch((e) => {
          errors.push(`ProtectedBranches(${project.path_with_namespace}): ${e.message}`);
          return [] as any[];
        }),
      ]);

      // Job name patterns -> scanner type
      for (const job of jobs) {
        const name: string = (job.name || '').toLowerCase();
        if (/sast/.test(name)) scannerSets.sast.add(projectId);
        if (/dast/.test(name)) scannerSets.dast.add(projectId);
        if (/dependency[_-]?scanning/.test(name)) scannerSets.dependency_scanning.add(projectId);
        if (/container[_-]?scanning/.test(name)) scannerSets.container_scanning.add(projectId);
        if (/secret[_-]?detection/.test(name)) scannerSets.secret_detection.add(projectId);
      }

      for (const p of pipelines) {
        pipelinesTotal++;
        if (p.status === 'success') pipelinesSuccessful++;
        else if (p.status === 'failed') pipelinesFailed++;
      }

      protectedByProject[projectId] =
        !!defaultBranch && protectedBranches.some((b: any) => b.name === defaultBranch);
    }

    // Merge request stats
    const mergedWithDates = mergedMRs.filter((m: any) => m.created_at && m.merged_at);
    let avgTimeToMerge = 0;
    if (mergedWithDates.length > 0) {
      const totalMs = mergedWithDates.reduce((sum: number, m: any) => {
        return sum + (new Date(m.merged_at).getTime() - new Date(m.created_at).getTime());
      }, 0);
      // ms -> hours
      avgTimeToMerge = totalMs / mergedWithDates.length / (1000 * 60 * 60);
    }

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
          protectedBranches: protectedByProject[p.id] ?? false,
        })),
      },
      securityScanning: {
        projectsWithSast: scannerSets.sast.size,
        projectsWithDast: scannerSets.dast.size,
        projectsWithDependencyScanning: scannerSets.dependency_scanning.size,
        projectsWithContainerScanning: scannerSets.container_scanning.size,
        projectsWithSecretDetection: scannerSets.secret_detection.size,
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
      mergeRequests: {
        open: openMRs.length,
        merged: mergedMRs.length,
        avgTimeToMerge,
      },
      pipelines: {
        total: pipelinesTotal,
        successful: pipelinesSuccessful,
        failed: pipelinesFailed,
        successRate: pipelinesTotal > 0 ? (pipelinesSuccessful / pipelinesTotal) * 100 : 0,
      },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private getBaseUrl(baseUrl?: string): string {
    return (baseUrl || 'https://gitlab.com').replace(/\/+$/, '');
  }

  private async getProjects(baseUrl: string, config: GitLabConfig): Promise<any[]> {
    const endpoint = config.groupId
      ? `${baseUrl}/api/v4/groups/${config.groupId}/projects?per_page=100`
      : `${baseUrl}/api/v4/projects?membership=true&per_page=100`;

    const response = await fetch(endpoint, {
      headers: { 'PRIVATE-TOKEN': config.accessToken },
    });
    if (!response.ok) throw new Error(`Failed to fetch projects: ${response.status}`);
    return response.json();
  }

  private async getVulnerabilities(baseUrl: string, config: GitLabConfig): Promise<any[]> {
    if (!config.groupId) return [];
    const response = await fetch(
      `${baseUrl}/api/v4/groups/${config.groupId}/vulnerability_findings?per_page=100`,
      {
        headers: { 'PRIVATE-TOKEN': config.accessToken },
      }
    );
    if (!response.ok) return [];
    return response.json();
  }

  private async getProjectJobs(
    baseUrl: string,
    config: GitLabConfig,
    projectId: number
  ): Promise<any[]> {
    const response = await fetch(
      `${baseUrl}/api/v4/projects/${projectId}/jobs?scope=success&per_page=100`,
      { headers: { 'PRIVATE-TOKEN': config.accessToken } }
    );
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    return response.json();
  }

  private async getProjectPipelines(
    baseUrl: string,
    config: GitLabConfig,
    projectId: number
  ): Promise<any[]> {
    const response = await fetch(`${baseUrl}/api/v4/projects/${projectId}/pipelines?per_page=100`, {
      headers: { 'PRIVATE-TOKEN': config.accessToken },
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    return response.json();
  }

  private async getProtectedBranches(
    baseUrl: string,
    config: GitLabConfig,
    projectId: number
  ): Promise<any[]> {
    const response = await fetch(`${baseUrl}/api/v4/projects/${projectId}/protected_branches`, {
      headers: { 'PRIVATE-TOKEN': config.accessToken },
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    return response.json();
  }

  private async getMergeRequests(
    baseUrl: string,
    config: GitLabConfig,
    state: 'opened' | 'merged'
  ): Promise<any[]> {
    const url = config.groupId
      ? `${baseUrl}/api/v4/groups/${config.groupId}/merge_requests?state=${state}&per_page=100`
      : `${baseUrl}/api/v4/merge_requests?state=${state}&scope=all&per_page=100`;
    const response = await fetch(url, {
      headers: { 'PRIVATE-TOKEN': config.accessToken },
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    return response.json();
  }
}
