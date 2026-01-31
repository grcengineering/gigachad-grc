/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

export interface ServiceNowConfig {
  instanceUrl: string;  // e.g., https://company.service-now.com
  username: string;
  password: string;
}

export interface ServiceNowSyncResult {
  incidents: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    byPriority: Record<string, number>;
    avgResolutionTime: number;
    items: Array<{
      number: string;
      shortDescription: string;
      priority: string;
      state: string;
      assignedTo: string;
      openedAt: string;
      resolvedAt: string;
    }>;
  };
  changes: {
    total: number;
    scheduled: number;
    inProgress: number;
    completed: number;
    failed: number;
    emergency: number;
  };
  problems: {
    total: number;
    open: number;
    rootCauseIdentified: number;
  };
  cmdb: {
    totalCIs: number;
    servers: number;
    applications: number;
    databases: number;
  };
  securityIncidents: {
    total: number;
    open: number;
    critical: number;
    high: number;
  };
  vulnerabilities: {
    total: number;
    open: number;
    critical: number;
    high: number;
  };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class ServiceNowConnector {
  private readonly logger = new Logger(ServiceNowConnector.name);

  async testConnection(config: ServiceNowConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.instanceUrl || !config.username || !config.password) {
      return { success: false, message: 'Instance URL, username, and password are required' };
    }

    try {
      const baseUrl = config.instanceUrl.replace(/\/+$/, '');
      const response = await fetch(`${baseUrl}/api/now/table/sys_user?sysparm_limit=1`, {
        headers: this.buildHeaders(config),
      });

      if (!response.ok) {
        return { success: false, message: response.status === 401 ? 'Invalid credentials' : `API error: ${response.status}` };
      }

      return {
        success: true,
        message: `Connected to ServiceNow instance`,
        details: { instance: baseUrl },
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  async sync(config: ServiceNowConfig): Promise<ServiceNowSyncResult> {
    const baseUrl = config.instanceUrl.replace(/\/+$/, '');
    const errors: string[] = [];

    const [incidents, changes, problems, cmdb] = await Promise.all([
      this.getIncidents(baseUrl, config).catch(e => { errors.push(`Incidents: ${e.message}`); return []; }),
      this.getChanges(baseUrl, config).catch(e => { errors.push(`Changes: ${e.message}`); return []; }),
      this.getProblems(baseUrl, config).catch(e => { errors.push(`Problems: ${e.message}`); return []; }),
      this.getCMDBItems(baseUrl, config).catch(e => { errors.push(`CMDB: ${e.message}`); return { totalCIs: 0, servers: 0, applications: 0, databases: 0 }; }),
    ]);

    const openIncidents = incidents.filter((i: any) => ['1', '2', '3'].includes(i.state));
    const byPriority: Record<string, number> = {};
    incidents.forEach((i: any) => {
      const priority = i.priority || 'Unknown';
      byPriority[priority] = (byPriority[priority] || 0) + 1;
    });

    return {
      incidents: {
        total: incidents.length,
        open: openIncidents.length,
        inProgress: incidents.filter((i: any) => i.state === '2').length,
        resolved: incidents.filter((i: any) => i.state === '6').length,
        closed: incidents.filter((i: any) => i.state === '7').length,
        byPriority,
        avgResolutionTime: 0,
        items: incidents.slice(0, 50).map((i: any) => ({
          number: i.number,
          shortDescription: i.short_description,
          priority: i.priority,
          state: i.state,
          assignedTo: i.assigned_to?.display_value || 'Unassigned',
          openedAt: i.opened_at,
          resolvedAt: i.resolved_at || '',
        })),
      },
      changes: {
        total: changes.length,
        scheduled: changes.filter((c: any) => c.state === '-4').length,
        inProgress: changes.filter((c: any) => c.state === '-1').length,
        completed: changes.filter((c: any) => c.state === '3').length,
        failed: changes.filter((c: any) => c.state === '4').length,
        emergency: changes.filter((c: any) => c.type === 'emergency').length,
      },
      problems: {
        total: problems.length,
        open: problems.filter((p: any) => ['1', '2'].includes(p.state)).length,
        rootCauseIdentified: problems.filter((p: any) => p.cause_ci).length,
      },
      cmdb,
      securityIncidents: { total: 0, open: 0, critical: 0, high: 0 },
      vulnerabilities: { total: 0, open: 0, critical: 0, high: 0 },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private buildHeaders(config: ServiceNowConfig): Record<string, string> {
    const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private async getIncidents(baseUrl: string, config: ServiceNowConfig): Promise<any[]> {
    const response = await fetch(
      `${baseUrl}/api/now/table/incident?sysparm_limit=500&sysparm_query=opened_at>=javascript:gs.daysAgoStart(30)`,
      { headers: this.buildHeaders(config) }
    );
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.result || [];
  }

  private async getChanges(baseUrl: string, config: ServiceNowConfig): Promise<any[]> {
    const response = await fetch(
      `${baseUrl}/api/now/table/change_request?sysparm_limit=500`,
      { headers: this.buildHeaders(config) }
    );
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.result || [];
  }

  private async getProblems(baseUrl: string, config: ServiceNowConfig): Promise<any[]> {
    const response = await fetch(
      `${baseUrl}/api/now/table/problem?sysparm_limit=200`,
      { headers: this.buildHeaders(config) }
    );
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.result || [];
  }

  private async getCMDBItems(baseUrl: string, config: ServiceNowConfig) {
    const [serversResp, appsResp, dbsResp] = await Promise.all([
      fetch(`${baseUrl}/api/now/table/cmdb_ci_server?sysparm_limit=1&sysparm_fields=sys_id`, { headers: this.buildHeaders(config) }),
      fetch(`${baseUrl}/api/now/table/cmdb_ci_appl?sysparm_limit=1&sysparm_fields=sys_id`, { headers: this.buildHeaders(config) }),
      fetch(`${baseUrl}/api/now/table/cmdb_ci_database?sysparm_limit=1&sysparm_fields=sys_id`, { headers: this.buildHeaders(config) }),
    ]);

    return {
      totalCIs: 0,
      servers: serversResp.ok ? parseInt(serversResp.headers.get('X-Total-Count') || '0') : 0,
      applications: appsResp.ok ? parseInt(appsResp.headers.get('X-Total-Count') || '0') : 0,
      databases: dbsResp.ok ? parseInt(dbsResp.headers.get('X-Total-Count') || '0') : 0,
    };
  }
}

