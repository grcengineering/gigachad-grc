import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { safeFetch, SSRFProtectionError } from '@gigachad-grc/shared';

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
    policies: number;
  };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class ZendeskConnector {
  private readonly logger = new Logger(ZendeskConnector.name);

  async testConnection(
    config: ZendeskConfig
  ): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.subdomain || !config.email || !config.apiToken) {
      return { success: false, message: 'Subdomain, email, and API token are required' };
    }

    try {
      const response = await this.ssrfFetch(
        `https://${config.subdomain}.zendesk.com/api/v2/users/me.json`,
        { headers: this.buildHeaders(config) }
      );

      if (!response.ok) {
        return {
          success: false,
          message:
            response.status === 401 ? 'Invalid credentials' : `API error: ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        message: `Connected to Zendesk as ${data.user?.name}`,
        details: { user: data.user?.name, role: data.user?.role },
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      return { success: false, message: error.message };
    }
  }

  async sync(config: ZendeskConfig): Promise<ZendeskSyncResult> {
    const errors: string[] = [];
    const baseUrl = `https://${config.subdomain}.zendesk.com/api/v2`;

    const [tickets, users, groups, satisfactionRatings, slaPolicies, ticketsWithMetrics] =
      await Promise.all([
        this.getTickets(baseUrl, config).catch((e) => {
          errors.push(`Tickets: ${e.message}`);
          return [] as any[];
        }),
        this.getUsers(baseUrl, config).catch((e) => {
          errors.push(`Users: ${e.message}`);
          return [] as any[];
        }),
        this.getGroups(baseUrl, config).catch((e) => {
          errors.push(`Groups: ${e.message}`);
          return [] as any[];
        }),
        this.getSatisfactionRatings(baseUrl, config).catch((e) => {
          errors.push(`Satisfaction: ${e.message}`);
          return [] as any[];
        }),
        this.getSlaPolicies(baseUrl, config).catch((e) => {
          errors.push(`SLA Policies: ${e.message}`);
          return [] as any[];
        }),
        this.getTicketsWithMetricSets(baseUrl, config).catch((e) => {
          errors.push(`SLA metrics: ${e.message}`);
          return [] as any[];
        }),
      ]);

    const byPriority: Record<string, number> = {};
    tickets.forEach((t: any) => {
      const priority = t.priority || 'normal';
      byPriority[priority] = (byPriority[priority] || 0) + 1;
    });

    // Average resolution time (hours) from tickets with both created_at and solved_at
    const solvedWithTimes = tickets.filter(
      (t: any) => t.created_at && (t.solved_at || (t.status === 'solved' && t.updated_at))
    );
    let avgResolutionTime = 0;
    if (solvedWithTimes.length > 0) {
      const totalMs = solvedWithTimes.reduce((sum: number, t: any) => {
        const solved = t.solved_at || t.updated_at;
        return sum + (new Date(solved).getTime() - new Date(t.created_at).getTime());
      }, 0);
      avgResolutionTime = totalMs / solvedWithTimes.length / (1000 * 60 * 60);
    }

    // Satisfaction score - average over "good" rating fraction
    let satisfactionScore = 0;
    const ratedResponses = satisfactionRatings.filter(
      (r: any) => r.score === 'good' || r.score === 'bad'
    );
    if (ratedResponses.length > 0) {
      const good = ratedResponses.filter((r: any) => r.score === 'good').length;
      satisfactionScore = (good / ratedResponses.length) * 100;
    }

    // SLA achieved/breached aggregation from incremental tickets metric_sets
    let slaAchieved = 0;
    let slaBreached = 0;
    for (const t of ticketsWithMetrics) {
      const ms = t.metric_set;
      if (!ms) continue;
      const policyMetrics = ms.sla_policy_metrics || ms.policy_metrics || [];
      if (Array.isArray(policyMetrics)) {
        for (const pm of policyMetrics) {
          if (pm.breach_at && !pm.stage) {
            slaBreached++;
          } else if (pm.breach_at) {
            // legacy: breach_at present means it has a target. If stage === 'achieved' or no breach occurred
            if (pm.stage === 'achieved' || pm.in_business_hours === true) {
              slaAchieved++;
            }
          }
        }
      }
    }
    const totalSlaEvents = slaAchieved + slaBreached;

    return {
      tickets: {
        total: tickets.length,
        open: tickets.filter((t: any) => t.status === 'open').length,
        pending: tickets.filter((t: any) => t.status === 'pending').length,
        solved: tickets.filter((t: any) => t.status === 'solved').length,
        byPriority,
        avgResolutionTime,
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
      satisfaction: {
        score: satisfactionScore,
        responses: ratedResponses.length,
      },
      sla: {
        achieved: slaAchieved,
        breached: slaBreached,
        achievementRate: totalSlaEvents > 0 ? (slaAchieved / totalSlaEvents) * 100 : 0,
        policies: slaPolicies.length,
      },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private async ssrfFetch(url: string, init?: RequestInit): Promise<Response> {
    try {
      return await safeFetch(url, init);
    } catch (error) {
      if (error instanceof SSRFProtectionError) {
        throw new BadRequestException(`SSRF protection blocked: ${error.message}`);
      }
      throw error;
    }
  }

  private buildHeaders(config: ZendeskConfig): Record<string, string> {
    const auth = Buffer.from(`${config.email}/token:${config.apiToken}`).toString('base64');
    return { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' };
  }

  private async getTickets(baseUrl: string, config: ZendeskConfig): Promise<any[]> {
    const response = await this.ssrfFetch(`${baseUrl}/tickets.json?per_page=100`, {
      headers: this.buildHeaders(config),
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.tickets || [];
  }

  private async getUsers(baseUrl: string, config: ZendeskConfig): Promise<any[]> {
    const response = await this.ssrfFetch(`${baseUrl}/users.json?per_page=100`, {
      headers: this.buildHeaders(config),
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.users || [];
  }

  private async getGroups(baseUrl: string, config: ZendeskConfig): Promise<any[]> {
    const response = await this.ssrfFetch(`${baseUrl}/groups.json`, {
      headers: this.buildHeaders(config),
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.groups || [];
  }

  private async getSatisfactionRatings(baseUrl: string, config: ZendeskConfig): Promise<any[]> {
    const response = await this.ssrfFetch(`${baseUrl}/satisfaction_ratings?per_page=100`, {
      headers: this.buildHeaders(config),
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.satisfaction_ratings || [];
  }

  private async getSlaPolicies(baseUrl: string, config: ZendeskConfig): Promise<any[]> {
    const response = await this.ssrfFetch(`${baseUrl}/slas/policies.json`, {
      headers: this.buildHeaders(config),
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.sla_policies || [];
  }

  private async getTicketsWithMetricSets(baseUrl: string, config: ZendeskConfig): Promise<any[]> {
    // Cap to first page (1000 tickets) to bound work
    const response = await this.ssrfFetch(
      `${baseUrl}/incremental/tickets.json?include=metric_sets&start_time=0`,
      { headers: this.buildHeaders(config) }
    );
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    const tickets = data.tickets || [];
    const metricSets: any[] = data.metric_sets || [];
    const byId = new Map<number, any>();
    for (const m of metricSets) {
      if (m.ticket_id != null) byId.set(m.ticket_id, m);
    }
    return tickets.map((t: any) => ({
      ...t,
      metric_set: byId.get(t.id) || null,
    }));
  }
}
