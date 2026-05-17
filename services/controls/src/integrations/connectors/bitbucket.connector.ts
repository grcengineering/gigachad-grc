import { Injectable, Logger } from '@nestjs/common';

export interface BitbucketConfig {
  workspace: string;
  username: string;
  appPassword: string;
}

export interface BitbucketSyncResult {
  repositories: {
    total: number;
    private: number;
    public: number;
    items: Array<{ name: string; isPrivate: boolean; mainBranch: string; lastUpdated: string }>;
  };
  pullRequests: { open: number; merged: number; declined: number };
  pipelines: { total: number; successful: number; failed: number };
  branchRestrictions: { protected: number; unprotected: number };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class BitbucketConnector {
  private readonly logger = new Logger(BitbucketConnector.name);
  private readonly baseUrl = 'https://api.bitbucket.org/2.0';

  async testConnection(config: BitbucketConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.workspace || !config.username || !config.appPassword) {
      return { success: false, message: 'Workspace, username, and app password are required' };
    }
    try {
      const response = await fetch(`${this.baseUrl}/workspaces/${config.workspace}`, {
        headers: this.buildHeaders(config),
      });
      if (!response.ok) return { success: false, message: `API error: ${response.status}` };
      const data = await response.json();
      return { success: true, message: `Connected to Bitbucket workspace: ${data.name}`, details: { workspace: data.name } };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async sync(config: BitbucketConfig): Promise<BitbucketSyncResult> {
    const errors: string[] = [];
    const repos = await this.getRepositories(config).catch(e => { errors.push(`repositories: ${e.message}`); return []; });
    const sampleRepos = repos.slice(0, 20);

    let prOpen = 0;
    let prMerged = 0;
    let prDeclined = 0;
    let pipelinesTotal = 0;
    let pipelinesSuccessful = 0;
    let pipelinesFailed = 0;
    let reposProtected = 0;

    await Promise.all(sampleRepos.map(async (r: any) => {
      const slug = r.slug || r.name;
      const workspace = config.workspace;
      await Promise.all([
        this.getPullRequests(workspace, slug, 'OPEN', config)
          .then(items => { prOpen += items.length; })
          .catch(e => { errors.push(`pr-open ${slug}: ${e.message}`); }),
        this.getPullRequests(workspace, slug, 'MERGED', config)
          .then(items => { prMerged += items.length; })
          .catch(e => { errors.push(`pr-merged ${slug}: ${e.message}`); }),
        this.getPullRequests(workspace, slug, 'DECLINED', config)
          .then(items => { prDeclined += items.length; })
          .catch(e => { errors.push(`pr-declined ${slug}: ${e.message}`); }),
        this.getPipelines(workspace, slug, config)
          .then(items => {
            pipelinesTotal += items.length;
            items.forEach((p: any) => {
              const result = (p.state?.result?.name || p.state?.name || '').toString().toUpperCase();
              if (result === 'SUCCESSFUL') pipelinesSuccessful++;
              else if (result === 'FAILED' || result === 'ERROR') pipelinesFailed++;
            });
          })
          .catch(e => { errors.push(`pipelines ${slug}: ${e.message}`); }),
        this.getBranchRestrictions(workspace, slug, config)
          .then(items => { if (items.length > 0) reposProtected++; })
          .catch(e => { errors.push(`branch-restrictions ${slug}: ${e.message}`); }),
      ]);
    }));

    return {
      repositories: {
        total: repos.length,
        private: repos.filter((r: any) => r.is_private).length,
        public: repos.filter((r: any) => !r.is_private).length,
        items: repos.slice(0, 50).map((r: any) => ({
          name: r.full_name, isPrivate: r.is_private, mainBranch: r.mainbranch?.name || 'main', lastUpdated: r.updated_on,
        })),
      },
      pullRequests: { open: prOpen, merged: prMerged, declined: prDeclined },
      pipelines: { total: pipelinesTotal, successful: pipelinesSuccessful, failed: pipelinesFailed },
      // Only the repos we sampled and confirmed have restrictions count as protected.
      // 'unprotected' is derived from the sampled set, not from the total repo count.
      branchRestrictions: { protected: reposProtected, unprotected: Math.max(0, sampleRepos.length - reposProtected) },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private buildHeaders(config: BitbucketConfig): Record<string, string> {
    const auth = Buffer.from(`${config.username}:${config.appPassword}`).toString('base64');
    return { 'Authorization': `Basic ${auth}` };
  }

  private async getRepositories(config: BitbucketConfig): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/repositories/${config.workspace}?pagelen=100`, { headers: this.buildHeaders(config) });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.values || [];
  }

  private async getPullRequests(workspace: string, slug: string, state: 'OPEN' | 'MERGED' | 'DECLINED', config: BitbucketConfig): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/repositories/${workspace}/${slug}/pullrequests?state=${state}&pagelen=100`, { headers: this.buildHeaders(config) });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.values || [];
  }

  private async getPipelines(workspace: string, slug: string, config: BitbucketConfig): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/repositories/${workspace}/${slug}/pipelines/?pagelen=50`, { headers: this.buildHeaders(config) });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.values || [];
  }

  private async getBranchRestrictions(workspace: string, slug: string, config: BitbucketConfig): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/repositories/${workspace}/${slug}/branch-restrictions`, { headers: this.buildHeaders(config) });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.values || [];
  }
}

