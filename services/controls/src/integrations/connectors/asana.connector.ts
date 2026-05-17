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
    const headers = { 'Authorization': `Bearer ${config.accessToken}` };

    const workspaces = await this.getWorkspaces(config).catch(e => { errors.push(`workspaces: ${e.message}`); return []; });

    const allProjects: any[] = [];
    const allUsers = new Set<string>();
    for (const ws of workspaces) {
      if (allProjects.length >= 1000) break;
      const projects = await fetch(`${this.baseUrl}/projects?workspace=${ws.gid}&limit=100`, { headers })
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`projects (${ws.gid}): ${r.status}`)))
        .catch(e => { errors.push(`projects: ${e.message}`); return { data: [] }; });
      const projectList = projects.data || [];
      allProjects.push(...projectList);

      const users = await fetch(`${this.baseUrl}/users?workspace=${ws.gid}`, { headers })
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`users (${ws.gid}): ${r.status}`)))
        .catch(e => { errors.push(`users: ${e.message}`); return { data: [] }; });
      (users.data || []).forEach((u: any) => allUsers.add(u.gid));
    }

    const allTasks: any[] = [];
    for (const project of allProjects.slice(0, 5)) {
      if (allTasks.length >= 1000) break;
      const tasks = await fetch(`${this.baseUrl}/tasks?project=${project.gid}`, { headers })
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`tasks (${project.gid}): ${r.status}`)))
        .catch(e => { errors.push(`tasks: ${e.message}`); return { data: [] }; });
      const taskList = tasks.data || [];
      allTasks.push(...taskList);
    }

    const now = new Date();
    return {
      workspaces: { total: workspaces.length, items: workspaces.map((w: any) => ({ gid: w.gid, name: w.name })) },
      projects: {
        total: allProjects.length,
        active: allProjects.filter((p: any) => !p.archived).length,
      },
      tasks: {
        total: allTasks.length,
        completed: allTasks.filter((t: any) => t.completed === true).length,
        incomplete: allTasks.filter((t: any) => t.completed === false).length,
        overdue: allTasks.filter((t: any) => !t.completed && t.due_on && new Date(t.due_on) < now).length,
      },
      users: { total: allUsers.size },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private async getWorkspaces(config: AsanaConfig): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/workspaces`, { headers: { 'Authorization': `Bearer ${config.accessToken}` } });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.data || [];
  }
}
