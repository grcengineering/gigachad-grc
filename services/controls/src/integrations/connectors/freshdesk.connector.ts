import { Injectable, Logger } from '@nestjs/common';

export interface FreshdeskConfig { domain: string; apiKey: string; }
export interface FreshdeskSyncResult {
  tickets: { total: number; open: number; pending: number; resolved: number; byPriority: Record<string, number>; items: any[] };
  agents: { total: number };
  groups: { total: number };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class FreshdeskConnector {
  private readonly logger = new Logger(FreshdeskConnector.name);

  async testConnection(config: FreshdeskConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.domain || !config.apiKey) return { success: false, message: 'Domain and API key are required' };
    try {
      const response = await fetch(`https://${config.domain}.freshdesk.com/api/v2/tickets?per_page=1`, { headers: this.buildHeaders(config.apiKey) });
      if (!response.ok) return { success: false, message: `API error: ${response.status}` };
      return { success: true, message: `Connected to Freshdesk: ${config.domain}` };
    } catch (error: any) { return { success: false, message: error.message }; }
  }

  async sync(config: FreshdeskConfig): Promise<FreshdeskSyncResult> {
    const errors: string[] = [];
    const headers = this.buildHeaders(config.apiKey);

    const tickets = await this.getTickets(config).catch(e => { errors.push(`tickets: ${e.message}`); return []; });

    const agents = await fetch(`https://${config.domain}.freshdesk.com/api/v2/agents`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`agents: ${r.status}`)))
      .catch(e => { errors.push(`agents: ${e.message}`); return []; });

    const groups = await fetch(`https://${config.domain}.freshdesk.com/api/v2/groups`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`groups: ${r.status}`)))
      .catch(e => { errors.push(`groups: ${e.message}`); return []; });

    const byPriority: Record<string, number> = {};
    tickets.forEach((t: any) => { byPriority[t.priority] = (byPriority[t.priority] || 0) + 1; });

    return {
      tickets: {
        total: tickets.length,
        open: tickets.filter((t: any) => t.status === 2).length,
        pending: tickets.filter((t: any) => t.status === 3).length,
        resolved: tickets.filter((t: any) => t.status === 4).length,
        byPriority,
        items: tickets.slice(0, 50),
      },
      agents: { total: Array.isArray(agents) ? agents.length : 0 },
      groups: { total: Array.isArray(groups) ? groups.length : 0 },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private buildHeaders(apiKey: string): Record<string, string> {
    const auth = Buffer.from(`${apiKey}:X`).toString('base64');
    return { 'Authorization': `Basic ${auth}` };
  }

  private async getTickets(config: FreshdeskConfig): Promise<any[]> {
    const response = await fetch(`https://${config.domain}.freshdesk.com/api/v2/tickets?per_page=100`, { headers: this.buildHeaders(config.apiKey) });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    return response.json();
  }
}
