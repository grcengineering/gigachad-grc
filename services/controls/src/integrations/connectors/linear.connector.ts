/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

export interface LinearConfig { apiKey: string; }
export interface LinearSyncResult {
  teams: { total: number; items: Array<{ id: string; name: string; key: string }> };
  issues: { total: number; backlog: number; inProgress: number; done: number; byPriority: Record<string, number> };
  projects: { total: number; active: number };
  cycles: { total: number; active: number };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class LinearConnector {
  private readonly logger = new Logger(LinearConnector.name);
  private readonly baseUrl = 'https://api.linear.app/graphql';

  async testConnection(config: LinearConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key is required' };
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST', headers: { 'Authorization': config.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ viewer { id name email } }' }),
      });
      if (!response.ok) return { success: false, message: `API error: ${response.status}` };
      const data = await response.json();
      return { success: true, message: `Connected to Linear as ${data.data?.viewer?.name}` };
    } catch (error: any) { return { success: false, message: error.message }; }
  }

  async sync(config: LinearConfig): Promise<LinearSyncResult> {
    const errors: string[] = [];
    const [teams, issues] = await Promise.all([
      this.query(config, '{ teams { nodes { id name key } } }').catch(e => { errors.push(e.message); return { teams: { nodes: [] } }; }),
      this.query(config, '{ issues(first: 250) { nodes { id state { type } priority } } }').catch(e => { errors.push(e.message); return { issues: { nodes: [] } }; }),
    ]);
    const issueNodes = issues.issues?.nodes || [];
    const byPriority: Record<string, number> = {};
    issueNodes.forEach((i: any) => { byPriority[i.priority || 0] = (byPriority[i.priority || 0] || 0) + 1; });
    return {
      teams: { total: teams.teams?.nodes?.length || 0, items: (teams.teams?.nodes || []).map((t: any) => ({ id: t.id, name: t.name, key: t.key })) },
      issues: { total: issueNodes.length, backlog: issueNodes.filter((i: any) => i.state?.type === 'backlog').length, inProgress: issueNodes.filter((i: any) => i.state?.type === 'started').length, done: issueNodes.filter((i: any) => i.state?.type === 'completed').length, byPriority },
      projects: { total: 0, active: 0 }, cycles: { total: 0, active: 0 },
      collectedAt: new Date().toISOString(), errors,
    };
  }

  private async query(config: LinearConfig, query: string): Promise<any> {
    const response = await fetch(this.baseUrl, {
      method: 'POST', headers: { 'Authorization': config.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.data;
  }
}

