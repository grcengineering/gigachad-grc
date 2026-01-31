/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

export interface ZendeskConfig {
  subdomain: string;
  email: string;
  apiToken: string;
}

export interface ZendeskSyncResult {
  tickets: {
    total: number;
    open: number;
    pending: number;
    solved: number;
    byPriority: Record<string, number>;
    avgResolutionTime: number;
    items: Array<{
      id: number;
      subject: string;
      status: string;
      priority: string;
      assignee: string;
      createdAt: string;
    }>;
  };
  users: {
    total: number;
    agents: number;
    admins: number;
    endUsers: number;
  };
  groups: { total: number };
  satisfaction: {
    score: number;
    responses: number;
  };
  sla: {
    achieved: number;
    breached: number;
    achievementRate: number;
  };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class ZendeskConnector {
  private readonly logger = new Logger(ZendeskConnector.name);

  async testConnection(config: ZendeskConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.subdomain || !config.email || !config.apiToken) {
      return { success: false, message: 'Subdomain, email, and API token are required' };
    }

    try {
      const response = await fetch(`https://${config.subdomain}.zendesk.com/api/v2/users/me.json`, {
        headers: this.buildHeaders(config),
      });

      if (!response.ok) {
        return { success: false, message: response.status === 401 ? 'Invalid credentials' : `API error: ${response.status}` };
      }

      const data = await response.json();
      return {
        success: true,
        message: `Connected to Zendesk as ${data.user?.name}`,
        details: { user: data.user?.name, role: data.user?.role },
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async sync(config: ZendeskConfig): Promise<ZendeskSyncResult> {
    const errors: string[] = [];
    const baseUrl = `https://${config.subdomain}.zendesk.com/api/v2`;

    const [tickets, users, groups] = await Promise.all([
      this.getTickets(baseUrl, config).catch(e => { errors.push(`Tickets: ${e.message}`); return []; }),
      this.getUsers(baseUrl, config).catch(e => { errors.push(`Users: ${e.message}`); return []; }),
      this.getGroups(baseUrl, config).catch(e => { errors.push(`Groups: ${e.message}`); return []; }),
    ]);

    const byPriority: Record<string, number> = {};
    tickets.forEach((t: any) => {
      const priority = t.priority || 'normal';
      byPriority[priority] = (byPriority[priority] || 0) + 1;
    });

    return {
      tickets: {
        total: tickets.length,
        open: tickets.filter((t: any) => t.status === 'open').length,
        pending: tickets.filter((t: any) => t.status === 'pending').length,
        solved: tickets.filter((t: any) => t.status === 'solved').length,
        byPriority,
        avgResolutionTime: 0,
        items: tickets.slice(0, 100).map((t: any) => ({
          id: t.id,
          subject: t.subject,
          status: t.status,
          priority: t.priority || 'normal',
          assignee: '',
          createdAt: t.created_at,
        })),
      },
      users: {
        total: users.length,
        agents: users.filter((u: any) => u.role === 'agent').length,
        admins: users.filter((u: any) => u.role === 'admin').length,
        endUsers: users.filter((u: any) => u.role === 'end-user').length,
      },
      groups: { total: groups.length },
      satisfaction: { score: 0, responses: 0 },
      sla: { achieved: 0, breached: 0, achievementRate: 0 },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private buildHeaders(config: ZendeskConfig): Record<string, string> {
    const auth = Buffer.from(`${config.email}/token:${config.apiToken}`).toString('base64');
    return { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' };
  }

  private async getTickets(baseUrl: string, config: ZendeskConfig): Promise<any[]> {
    const response = await fetch(`${baseUrl}/tickets.json?per_page=100`, { headers: this.buildHeaders(config) });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.tickets || [];
  }

  private async getUsers(baseUrl: string, config: ZendeskConfig): Promise<any[]> {
    const response = await fetch(`${baseUrl}/users.json?per_page=100`, { headers: this.buildHeaders(config) });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.users || [];
  }

  private async getGroups(baseUrl: string, config: ZendeskConfig): Promise<any[]> {
    const response = await fetch(`${baseUrl}/groups.json`, { headers: this.buildHeaders(config) });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.groups || [];
  }
}

