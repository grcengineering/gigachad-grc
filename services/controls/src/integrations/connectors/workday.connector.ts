import { Injectable, Logger } from '@nestjs/common';

export interface WorkdayConfig {
  /** Base host for the tenant, e.g. https://wd5-impl-services1.workday.com */
  tenantUrl: string;
  /** Tenant name path segment used in OAuth/RaaS URLs, e.g. acme_dpt1 */
  tenantName: string;
  /** RaaS report URL (returns JSON or XML). Required for sync. */
  reportUrl?: string;
  /** Integration user used for RaaS basic auth and/or OAuth resource owner password. */
  username?: string;
  password?: string;
  /** OAuth client credentials (preferred if configured). */
  clientId?: string;
  clientSecret?: string;
}

export interface WorkdaySyncResult {
  workers: { total: number; active: number; terminated: number; byType: Record<string, number>; items: any[] };
  organizations: { total: number };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class WorkdayConnector {
  private readonly logger = new Logger(WorkdayConnector.name);

  async testConnection(config: WorkdayConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.tenantUrl || !config.tenantName) {
      return { success: false, message: 'tenantUrl and tenantName are required' };
    }

    // Prefer OAuth client credentials when provided.
    if (config.clientId && config.clientSecret) {
      try {
        const token = await this.fetchOAuthToken(config);
        return {
          success: true,
          message: `Connected to Workday tenant: ${config.tenantName}`,
          details: { tenantName: config.tenantName, authMode: 'oauth_client_credentials', tokenLength: token.length },
        };
      } catch (error: any) {
        return { success: false, message: error.message || 'Workday OAuth token request failed' };
      }
    }

    // Otherwise verify RaaS basic auth by HEADing the report URL.
    if (config.reportUrl && config.username && config.password) {
      try {
        const response = await fetch(config.reportUrl, {
          method: 'GET',
          headers: { Authorization: this.basicAuthHeader(config.username, config.password) },
        });
        if (!response.ok) {
          const text = await response.text();
          return { success: false, message: `Workday RaaS error: ${response.status} ${text.slice(0, 200)}` };
        }
        return {
          success: true,
          message: `Connected to Workday RaaS report for tenant: ${config.tenantName}`,
          details: { tenantName: config.tenantName, authMode: 'raas_basic', reportUrl: config.reportUrl },
        };
      } catch (error: any) {
        return { success: false, message: error.message || 'Workday RaaS request failed' };
      }
    }

    return {
      success: false,
      message: 'Workday connector requires either OAuth (clientId/clientSecret) or RaaS (reportUrl + username/password) configuration',
    };
  }

  async sync(config: WorkdayConfig): Promise<WorkdaySyncResult> {
    if (!config.tenantUrl || !config.tenantName) {
      throw new Error('Workday connector requires tenantUrl and tenantName');
    }
    if (!config.reportUrl) {
      throw new Error('Workday RaaS requires `reportUrl` in config');
    }
    if (!config.username || !config.password) {
      throw new Error('Workday RaaS requires `username` and `password` in config');
    }

    const errors: string[] = [];
    const url = config.reportUrl.includes('format=')
      ? config.reportUrl
      : `${config.reportUrl}${config.reportUrl.includes('?') ? '&' : '?'}format=json`;

    const response = await fetch(url, {
      headers: { Authorization: this.basicAuthHeader(config.username, config.password) },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Workday RaaS report fetch failed: ${response.status} ${text.slice(0, 200)}`);
    }

    let payload: any;
    try {
      payload = await response.json();
    } catch (error: any) {
      throw new Error(`Workday RaaS response was not JSON. Ensure the report supports format=json. Error: ${error.message}`);
    }

    const workerRows = this.extractWorkerRows(payload);
    let active = 0;
    let terminated = 0;
    const byType: Record<string, number> = {};
    for (const row of workerRows) {
      const status = String(row.workerStatus || row.Worker_Status || row.status || '').toLowerCase();
      if (status.includes('terminated') || status.includes('inactive')) terminated += 1;
      else active += 1;
      const type = row.workerType || row.Worker_Type || row.employeeType || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    }

    return {
      workers: {
        total: workerRows.length,
        active,
        terminated,
        byType,
        items: workerRows.slice(0, 100),
      },
      // Org count is only meaningful if the RaaS report includes org rows.
      // We infer from a distinct set of supervisoryOrganization/orgRef fields, otherwise 0.
      organizations: { total: this.countDistinctOrganizations(workerRows) },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private async fetchOAuthToken(config: WorkdayConfig): Promise<string> {
    const tokenUrl = `${config.tenantUrl.replace(/\/$/, '')}/ccx/oauth2/${encodeURIComponent(config.tenantName)}/v1/token`;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
    });
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: this.basicAuthHeader(config.clientId!, config.clientSecret!),
      },
      body,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Workday OAuth token request failed: ${response.status} ${text.slice(0, 200)}`);
    }
    const data = (await response.json()) as { access_token?: string };
    if (!data.access_token) {
      throw new Error('Workday OAuth response missing access_token');
    }
    return data.access_token;
  }

  private basicAuthHeader(username: string, password: string): string {
    return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  }

  private extractWorkerRows(payload: any): any[] {
    // RaaS JSON shape: { Report_Entry: [...] } most commonly.
    if (Array.isArray(payload?.Report_Entry)) return payload.Report_Entry;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload)) return payload;
    return [];
  }

  private countDistinctOrganizations(workerRows: any[]): number {
    const set = new Set<string>();
    for (const row of workerRows) {
      const org =
        row.supervisoryOrganization ||
        row.Supervisory_Organization ||
        row.organization ||
        row.Organization;
      if (org) set.add(typeof org === 'string' ? org : JSON.stringify(org));
    }
    return set.size;
  }
}
