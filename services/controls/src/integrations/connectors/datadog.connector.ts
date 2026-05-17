import { Injectable, Logger } from '@nestjs/common';

export interface DatadogConfig { apiKey: string; appKey: string; site?: string; }
export interface DatadogSyncResult {
  monitors: { total: number; ok: number; alert: number; warn: number; noData: number; items: any[] };
  hosts: { total: number; up: number };
  metrics: { total: number };
  logs: { total: number };
  apm: { services: number };
  security: { signals: number; critical: number };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class DatadogConnector {
  private readonly logger = new Logger(DatadogConnector.name);

  async testConnection(config: DatadogConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey || !config.appKey) return { success: false, message: 'API key and App key are required' };
    try {
      const baseUrl = this.getBaseUrl(config.site);
      const response = await fetch(`${baseUrl}/api/v1/validate`, { headers: { 'DD-API-KEY': config.apiKey, 'DD-APPLICATION-KEY': config.appKey } });
      if (!response.ok) return { success: false, message: `API error: ${response.status}` };
      return { success: true, message: 'Connected to Datadog' };
    } catch (error: any) { return { success: false, message: error.message }; }
  }

  async sync(config: DatadogConfig): Promise<DatadogSyncResult> {
    const errors: string[] = [];
    const baseUrl = this.getBaseUrl(config.site);
    const [monitors, hostsData, metricsCount, logsTotal, apmServices, signals] = await Promise.all([
      this.getMonitors(baseUrl, config).catch(e => { errors.push(`monitors: ${e.message}`); return []; }),
      this.getHosts(baseUrl, config).catch(e => { errors.push(`hosts: ${e.message}`); return { total: 0, up: 0 }; }),
      this.getMetricsCount(baseUrl, config).catch(e => { errors.push(`metrics: ${e.message}`); return 0; }),
      this.getLogsTotal(baseUrl, config).catch(e => { errors.push(`logs: ${e.message}`); return 0; }),
      this.getApmServices(baseUrl, config).catch(e => { errors.push(`apm: ${e.message}`); return 0; }),
      this.getSecuritySignals(baseUrl, config).catch(e => { errors.push(`security: ${e.message}`); return { signals: 0, critical: 0 }; }),
    ]);
    return {
      monitors: { total: monitors.length, ok: monitors.filter((m: any) => m.overall_state === 'OK').length, alert: monitors.filter((m: any) => m.overall_state === 'Alert').length, warn: monitors.filter((m: any) => m.overall_state === 'Warn').length, noData: monitors.filter((m: any) => m.overall_state === 'No Data').length, items: monitors.slice(0, 50).map((m: any) => ({ id: m.id, name: m.name, state: m.overall_state, type: m.type })) },
      hosts: hostsData,
      metrics: { total: metricsCount },
      logs: { total: logsTotal },
      apm: { services: apmServices },
      security: signals,
      collectedAt: new Date().toISOString(), errors,
    };
  }

  private getBaseUrl(site?: string): string {
    const sites: Record<string, string> = { us1: 'https://api.datadoghq.com', us3: 'https://api.us3.datadoghq.com', us5: 'https://api.us5.datadoghq.com', eu: 'https://api.datadoghq.eu' };
    return sites[site || 'us1'] || sites.us1;
  }

  private headers(config: DatadogConfig): Record<string, string> {
    return { 'DD-API-KEY': config.apiKey, 'DD-APPLICATION-KEY': config.appKey };
  }

  private async getMonitors(baseUrl: string, config: DatadogConfig): Promise<any[]> {
    const response = await fetch(`${baseUrl}/api/v1/monitor`, { headers: this.headers(config) });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    return response.json();
  }

  private async getHosts(baseUrl: string, config: DatadogConfig): Promise<{ total: number; up: number }> {
    const response = await fetch(`${baseUrl}/api/v1/hosts`, { headers: this.headers(config) });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    const hostList: any[] = data.host_list || [];
    return {
      total: typeof data.total_returned === 'number' ? data.total_returned : hostList.length,
      up: hostList.filter((h: any) => h.up === true).length,
    };
  }

  private async getMetricsCount(baseUrl: string, config: DatadogConfig): Promise<number> {
    const response = await fetch(`${baseUrl}/api/v2/metrics`, { headers: this.headers(config) });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return Array.isArray(data.data) ? data.data.length : 0;
  }

  private async getLogsTotal(baseUrl: string, config: DatadogConfig): Promise<number> {
    const response = await fetch(`${baseUrl}/api/v2/logs/events?filter[query]=*&page[limit]=1`, { headers: this.headers(config) });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.meta?.page?.total_count ?? data.meta?.total_count ?? (Array.isArray(data.data) ? data.data.length : 0);
  }

  private async getApmServices(baseUrl: string, config: DatadogConfig): Promise<number> {
    const response = await fetch(`${baseUrl}/api/v2/service_definitions`, { headers: this.headers(config) });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return Array.isArray(data.data) ? data.data.length : 0;
  }

  private async getSecuritySignals(baseUrl: string, config: DatadogConfig): Promise<{ signals: number; critical: number }> {
    const response = await fetch(`${baseUrl}/api/v2/security_monitoring/signals?filter[from]=now-7d&page[limit]=1000`, { headers: this.headers(config) });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    const signals: any[] = Array.isArray(data.data) ? data.data : [];
    const critical = signals.filter((s: any) => {
      const sev = (s.attributes?.severity || s.attributes?.attributes?.severity || '').toString().toLowerCase();
      return sev === 'critical';
    }).length;
    return { signals: signals.length, critical };
  }
}

