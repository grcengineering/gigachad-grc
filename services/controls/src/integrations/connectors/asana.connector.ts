/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

export interface AsanaConfig { accessToken: string; }
export interface AsanaSyncResult {
  workspaces: { total: number; items: Array<{ gid: string; name: string }> };
  projects: { total: number; active: number };
  tasks: { total: number; completed: number; incomplete: number; overdue: number };
  users: { total: number };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class AsanaConnector {
  private readonly logger = new Logger(AsanaConnector.name);
  private readonly baseUrl = 'https://app.asana.com/api/1.0';

  async testConnection(config: AsanaConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.accessToken) return { success: false, message: 'Access token is required' };
    try {
      const response = await fetch(`${this.baseUrl}/users/me`, { headers: { 'Authorization': `Bearer ${config.accessToken}` } });
      if (!response.ok) return { success: false, message: `API error: ${response.status}` };
      const data = await response.json();
      return { success: true, message: `Connected to Asana as ${data.data?.name}` };
    } catch (error: any) { return { success: false, message: error.message }; }
  }

  async sync(config: AsanaConfig): Promise<AsanaSyncResult> {
    const errors: string[] = [];
    const workspaces = await this.getWorkspaces(config).catch(e => { errors.push(e.message); return []; });
    return {
      workspaces: { total: workspaces.length, items: workspaces.map((w: any) => ({ gid: w.gid, name: w.name })) },
      projects: { total: 0, active: 0 }, tasks: { total: 0, completed: 0, incomplete: 0, overdue: 0 }, users: { total: 0 },
      collectedAt: new Date().toISOString(), errors,
    };
  }

  private async getWorkspaces(config: AsanaConfig): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/workspaces`, { headers: { 'Authorization': `Bearer ${config.accessToken}` } });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.data || [];
  }
}

