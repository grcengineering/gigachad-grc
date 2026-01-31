/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

export interface NewRelicConfig { apiKey: string; accountId: string; }
export interface NewRelicSyncResult {
  applications: { total: number; reporting: number; notReporting: number; items: any[] };
  alerts: { open: number; critical: number; warning: number };
  synthetics: { monitors: number; failing: number };
  infrastructure: { hosts: number };
  collectedAt: string; errors: string[];
}

@Injectable()
export class NewRelicConnector {
  private readonly logger = new Logger(NewRelicConnector.name);
  private readonly baseUrl = 'https://api.newrelic.com/v2';

  async testConnection(config: NewRelicConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey || !config.accountId) return { success: false, message: 'API key and Account ID required' };
    try {
      const response = await fetch(`${this.baseUrl}/applications.json`, { headers: { 'Api-Key': config.apiKey } });
      return response.ok ? { success: true, message: 'Connected to New Relic' } : { success: false, message: `API error: ${response.status}` };
    } catch (e: any) { return { success: false, message: e.message }; }
  }

  async sync(config: NewRelicConfig): Promise<NewRelicSyncResult> {
    const response = await fetch(`${this.baseUrl}/applications.json`, { headers: { 'Api-Key': config.apiKey } });
    const data = response.ok ? await response.json() : { applications: [] };
    const apps = data.applications || [];
    return {
      applications: { total: apps.length, reporting: apps.filter((a: any) => a.reporting).length, notReporting: apps.filter((a: any) => !a.reporting).length, items: apps.slice(0, 50) },
      alerts: { open: 0, critical: 0, warning: 0 }, synthetics: { monitors: 0, failing: 0 }, infrastructure: { hosts: 0 },
      collectedAt: new Date().toISOString(), errors: []
    };
  }
}

