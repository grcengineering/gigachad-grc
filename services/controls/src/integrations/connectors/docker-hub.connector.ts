import { Injectable, Logger } from '@nestjs/common';

export interface DockerHubConfig {
  username: string;
  accessToken: string;
  organization?: string;
}

export interface DockerHubSyncResult {
  repositories: {
    total: number;
    public: number;
    private: number;
    items: Array<{ name: string; isPrivate: boolean; pullCount: number; lastUpdated: string }>;
  };
  images: { total: number; vulnerableImages: number };
  teams: { total: number };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class DockerHubConnector {
  private readonly logger = new Logger(DockerHubConnector.name);
  private readonly baseUrl = 'https://hub.docker.com/v2';

  async testConnection(config: DockerHubConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.username || !config.accessToken) {
      return { success: false, message: 'Username and access token are required' };
    }
    try {
      const response = await fetch(`${this.baseUrl}/users/${config.username}`, {
        headers: { 'Authorization': `Bearer ${config.accessToken}` },
      });
      if (!response.ok) return { success: false, message: `API error: ${response.status}` };
      return { success: true, message: `Connected to Docker Hub as ${config.username}` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async sync(config: DockerHubConfig): Promise<DockerHubSyncResult> {
    const errors: string[] = [];
    const namespace = config.organization || config.username;
    const repos = await this.getRepositories(namespace, config.accessToken).catch(e => { errors.push(`repositories: ${e.message}`); return []; });

    // images.total = sum of tag counts across first 20 repos
    let imagesTotal = 0;
    const sampleRepos = repos.slice(0, 20);
    await Promise.all(sampleRepos.map(async (r: any) => {
      try {
        const tags = await this.getTags(namespace, r.name, config.accessToken);
        imagesTotal += tags.length;
      } catch (e: any) {
        errors.push(`tags ${r.name}: ${e.message}`);
      }
    }));

    // teams: only fetch if organization is configured; personal accounts have no teams
    let teamsTotal = 0;
    if (config.organization) {
      try {
        teamsTotal = (await this.getTeams(config.organization, config.accessToken)).length;
      } catch (e: any) {
        errors.push(`teams: ${e.message}`);
      }
    }

    return {
      repositories: {
        total: repos.length,
        public: repos.filter((r: any) => !r.is_private).length,
        private: repos.filter((r: any) => r.is_private).length,
        items: repos.slice(0, 50).map((r: any) => ({
          name: r.name, isPrivate: r.is_private, pullCount: r.pull_count, lastUpdated: r.last_updated,
        })),
      },
      images: {
        total: imagesTotal,
        // Docker Scout API requires paid tier
        vulnerableImages: 0,
      },
      teams: { total: teamsTotal },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private async getRepositories(namespace: string, token: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/repositories/${namespace}?page_size=100`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.results || [];
  }

  private async getTags(namespace: string, repo: string, token: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/repositories/${namespace}/${repo}/tags/?page_size=50`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.results || [];
  }

  private async getTeams(organization: string, token: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/orgs/${organization}/groups`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.results || (Array.isArray(data) ? data : []);
  }
}

