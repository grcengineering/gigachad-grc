/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

export interface PagerDutyConfig {
  apiKey: string;
}

export interface PagerDutySyncResult {
  services: {
    total: number;
    active: number;
    warning: number;
    critical: number;
    maintenance: number;
    items: Array<{
      id: string;
      name: string;
      status: string;
      escalationPolicy: string;
      lastIncident: string;
    }>;
  };
  incidents: {
    total: number;
    triggered: number;
    acknowledged: number;
    resolved: number;
    byPriority: Record<string, number>;
    avgTimeToAcknowledge: number;
    avgTimeToResolve: number;
    items: Array<{
      id: string;
      title: string;
      status: string;
      priority: string;
      service: string;
      createdAt: string;
      resolvedAt: string;
    }>;
  };
  users: {
    total: number;
    onCall: number;
  };
  escalationPolicies: {
    total: number;
  };
  schedules: {
    total: number;
    coverage: number;
  };
  analytics: {
    mttr: number;
    mtta: number;
    incidentsPerDay: number;
  };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class PagerDutyConnector {
  private readonly logger = new Logger(PagerDutyConnector.name);
  private readonly baseUrl = 'https://api.pagerduty.com';

  async testConnection(config: PagerDutyConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) {
      return { success: false, message: 'API key is required' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/users/me`, {
        headers: this.buildHeaders(config.apiKey),
      });

      if (!response.ok) {
        return { success: false, message: response.status === 401 ? 'Invalid API key' : `API error: ${response.status}` };
      }

      const data = await response.json();
      return {
        success: true,
        message: `Connected to PagerDuty as ${data.user?.name}`,
        details: { user: data.user?.name, email: data.user?.email },
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  async sync(config: PagerDutyConfig): Promise<PagerDutySyncResult> {
    const errors: string[] = [];

    const [services, incidents, users, escalationPolicies] = await Promise.all([
      this.getServices(config).catch(e => { errors.push(`Services: ${e.message}`); return []; }),
      this.getIncidents(config).catch(e => { errors.push(`Incidents: ${e.message}`); return []; }),
      this.getUsers(config).catch(e => { errors.push(`Users: ${e.message}`); return []; }),
      this.getEscalationPolicies(config).catch(e => { errors.push(`Policies: ${e.message}`); return []; }),
    ]);

    const byPriority: Record<string, number> = {};
    incidents.forEach((i: any) => {
      const priority = i.priority?.summary || 'No Priority';
      byPriority[priority] = (byPriority[priority] || 0) + 1;
    });

    return {
      services: {
        total: services.length,
        active: services.filter((s: any) => s.status === 'active').length,
        warning: services.filter((s: any) => s.status === 'warning').length,
        critical: services.filter((s: any) => s.status === 'critical').length,
        maintenance: services.filter((s: any) => s.status === 'maintenance').length,
        items: services.slice(0, 50).map((s: any) => ({
          id: s.id,
          name: s.name,
          status: s.status,
          escalationPolicy: s.escalation_policy?.summary || '',
          lastIncident: s.last_incident_timestamp || '',
        })),
      },
      incidents: {
        total: incidents.length,
        triggered: incidents.filter((i: any) => i.status === 'triggered').length,
        acknowledged: incidents.filter((i: any) => i.status === 'acknowledged').length,
        resolved: incidents.filter((i: any) => i.status === 'resolved').length,
        byPriority,
        avgTimeToAcknowledge: 0,
        avgTimeToResolve: 0,
        items: incidents.slice(0, 100).map((i: any) => ({
          id: i.id,
          title: i.title,
          status: i.status,
          priority: i.priority?.summary || 'No Priority',
          service: i.service?.summary || '',
          createdAt: i.created_at,
          resolvedAt: i.resolved_at || '',
        })),
      },
      users: {
        total: users.length,
        onCall: 0,
      },
      escalationPolicies: { total: escalationPolicies.length },
      schedules: { total: 0, coverage: 0 },
      analytics: { mttr: 0, mtta: 0, incidentsPerDay: 0 },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private buildHeaders(apiKey: string): Record<string, string> {
    return {
      'Authorization': `Token token=${apiKey}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private async getServices(config: PagerDutyConfig): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/services?limit=100`, {
      headers: this.buildHeaders(config.apiKey),
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.services || [];
  }

  private async getIncidents(config: PagerDutyConfig): Promise<any[]> {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const response = await fetch(`${this.baseUrl}/incidents?since=${since}&limit=100`, {
      headers: this.buildHeaders(config.apiKey),
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.incidents || [];
  }

  private async getUsers(config: PagerDutyConfig): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/users?limit=100`, {
      headers: this.buildHeaders(config.apiKey),
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.users || [];
  }

  private async getEscalationPolicies(config: PagerDutyConfig): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/escalation_policies?limit=100`, {
      headers: this.buildHeaders(config.apiKey),
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.escalation_policies || [];
  }
}

