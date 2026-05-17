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
    const headers = { 'Authorization': config.apiToken };

    const teams = await this.getTeams(config).catch(e => { errors.push(`teams: ${e.message}`); return []; });

    const userIds = new Set<string>();
    teams.forEach((t: any) => {
      (t.members || []).forEach((m: any) => {
        const userId = m.user?.id || m.id;
        if (userId !== undefined && userId !== null) userIds.add(String(userId));
      });
    });

    let totalSpaces = 0;
    for (const team of teams) {
      const spacesData = await fetch(`${this.baseUrl}/team/${team.id}/space?archived=false`, { headers })
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`spaces (${team.id}): ${r.status}`)))
        .catch(e => { errors.push(`spaces: ${e.message}`); return { spaces: [] }; });
      totalSpaces += (spacesData.spaces || []).length;
    }

    const allTasks: any[] = [];
    for (const team of teams.slice(0, 5)) {
      if (allTasks.length >= 1000) break;
      const tasksData = await fetch(`${this.baseUrl}/team/${team.id}/task?include_closed=true`, { headers })
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`tasks (${team.id}): ${r.status}`)))
        .catch(e => { errors.push(`tasks: ${e.message}`); return { tasks: [] }; });
      const taskList = tasksData.tasks || [];
      allTasks.push(...taskList);
    }

    return {
      workspaces: { total: teams.length, items: teams.map((t: any) => ({ id: t.id, name: t.name })) },
      spaces: { total: totalSpaces },
      tasks: {
        total: allTasks.length,
        open: allTasks.filter((t: any) => {
          const statusType = t.status?.type;
          return statusType !== 'closed' && statusType !== 'done';
        }).length,
        closed: allTasks.filter((t: any) => {
          const statusType = t.status?.type;
          return statusType === 'closed' || statusType === 'done';
        }).length,
      },
      users: { total: userIds.size },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private async getTeams(config: ClickUpConfig): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/team`, { headers: { 'Authorization': config.apiToken } });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.teams || [];
  }
}
