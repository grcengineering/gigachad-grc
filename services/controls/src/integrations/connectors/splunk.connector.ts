/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

export interface SplunkConfig { baseUrl: string; token: string; }
export interface SplunkSyncResult {
  indexes: { total: number; items: any[] };
  savedSearches: { total: number };
  alerts: { total: number; triggered: number };
  users: { total: number };
  collectedAt: string; errors: string[];
}

@Injectable()
export class SplunkConnector {
  private readonly logger = new Logger(SplunkConnector.name);

  async testConnection(config: SplunkConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.baseUrl || !config.token) return { success: false, message: 'Base URL and token required' };
    try {
      const response = await fetch(`${config.baseUrl}/services/server/info?output_mode=json`, { headers: { 'Authorization': `Splunk ${config.token}` } });
      return response.ok ? { success: true, message: 'Connected to Splunk' } : { success: false, message: `API error: ${response.status}` };
    } catch (e: any) { return { success: false, message: e.message }; }
  }

  async sync(config: SplunkConfig): Promise<SplunkSyncResult> {
    const response = await fetch(`${config.baseUrl}/services/data/indexes?output_mode=json`, { headers: { 'Authorization': `Splunk ${config.token}` } });
    const data = response.ok ? await response.json() : { entry: [] };
    return {
      indexes: { total: data.entry?.length || 0, items: (data.entry || []).slice(0, 50).map((i: any) => ({ name: i.name, totalEventCount: i.content?.totalEventCount })) },
      savedSearches: { total: 0 }, alerts: { total: 0, triggered: 0 }, users: { total: 0 },
      collectedAt: new Date().toISOString(), errors: []
    };
  }
}

