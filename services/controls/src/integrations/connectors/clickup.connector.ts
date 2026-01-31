/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

export interface ClickUpConfig { apiToken: string; }
export interface ClickUpSyncResult {
  workspaces: { total: number; items: Array<{ id: string; name: string }> };
  spaces: { total: number };
  tasks: { total: number; open: number; closed: number };
  users: { total: number };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class ClickUpConnector {
  private readonly logger = new Logger(ClickUpConnector.name);
  private readonly baseUrl = 'https://api.clickup.com/api/v2';

  async testConnection(config: ClickUpConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiToken) return { success: false, message: 'API token is required' };
    try {
      const response = await fetch(`${this.baseUrl}/user`, { headers: { 'Authorization': config.apiToken } });
      if (!response.ok) return { success: false, message: `API error: ${response.status}` };
      const data = await response.json();
      return { success: true, message: `Connected to ClickUp as ${data.user?.username}` };
    } catch (error: any) { return { success: false, message: error.message }; }
  }

  async sync(config: ClickUpConfig): Promise<ClickUpSyncResult> {
    const errors: string[] = [];
    const teams = await this.getTeams(config).catch(e => { errors.push(e.message); return []; });
    return {
      workspaces: { total: teams.length, items: teams.map((t: any) => ({ id: t.id, name: t.name })) },
      spaces: { total: 0 }, tasks: { total: 0, open: 0, closed: 0 }, users: { total: 0 },
      collectedAt: new Date().toISOString(), errors,
    };
  }

  private async getTeams(config: ClickUpConfig): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/team`, { headers: { 'Authorization': config.apiToken } });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.teams || [];
  }
}

