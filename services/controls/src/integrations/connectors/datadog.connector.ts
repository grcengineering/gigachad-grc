/* eslint-disable @typescript-eslint/no-explicit-any */
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
    const monitors = await this.getMonitors(baseUrl, config).catch(e => { errors.push(e.message); return []; });
    return {
      monitors: { total: monitors.length, ok: monitors.filter((m: any) => m.overall_state === 'OK').length, alert: monitors.filter((m: any) => m.overall_state === 'Alert').length, warn: monitors.filter((m: any) => m.overall_state === 'Warn').length, noData: monitors.filter((m: any) => m.overall_state === 'No Data').length, items: monitors.slice(0, 50).map((m: any) => ({ id: m.id, name: m.name, state: m.overall_state, type: m.type })) },
      hosts: { total: 0, up: 0 }, metrics: { total: 0 }, logs: { total: 0 },
      apm: { services: 0 }, security: { signals: 0, critical: 0 },
      collectedAt: new Date().toISOString(), errors,
    };
  }

  private getBaseUrl(site?: string): string {
    const sites: Record<string, string> = { us1: 'https://api.datadoghq.com', us3: 'https://api.us3.datadoghq.com', us5: 'https://api.us5.datadoghq.com', eu: 'https://api.datadoghq.eu' };
    return sites[site || 'us1'] || sites.us1;
  }

  private async getMonitors(baseUrl: string, config: DatadogConfig): Promise<any[]> {
    const response = await fetch(`${baseUrl}/api/v1/monitor`, { headers: { 'DD-API-KEY': config.apiKey, 'DD-APPLICATION-KEY': config.appKey } });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    return response.json();
  }
}

