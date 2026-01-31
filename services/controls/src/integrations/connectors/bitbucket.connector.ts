/* eslint-disable @typescript-eslint/no-explicit-any */
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
    const repos = await this.getRepositories(config).catch(e => { errors.push(e.message); return []; });
    return {
      repositories: {
        total: repos.length,
        private: repos.filter((r: any) => r.is_private).length,
        public: repos.filter((r: any) => !r.is_private).length,
        items: repos.slice(0, 50).map((r: any) => ({
          name: r.full_name, isPrivate: r.is_private, mainBranch: r.mainbranch?.name || 'main', lastUpdated: r.updated_on,
        })),
      },
      pullRequests: { open: 0, merged: 0, declined: 0 },
      pipelines: { total: 0, successful: 0, failed: 0 },
      branchRestrictions: { protected: 0, unprotected: repos.length },
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
}

