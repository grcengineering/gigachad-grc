/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

export interface SentinelOneConfig { apiToken: string; consoleUrl: string; }
export interface SentinelOneSyncResult {
  agents: { total: number; online: number; offline: number; infected: number; items: any[] };
  threats: { total: number; active: number; mitigated: number; bySeverity: Record<string, number> };
  applications: { total: number; vulnerable: number };
  collectedAt: string; errors: string[];
}

@Injectable()
export class SentinelOneConnector {
  private readonly logger = new Logger(SentinelOneConnector.name);

  async testConnection(config: SentinelOneConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiToken || !config.consoleUrl) return { success: false, message: 'API token and console URL required' };
    try {
      const response = await fetch(`${config.consoleUrl}/web/api/v2.1/system/status`, { headers: { 'Authorization': `ApiToken ${config.apiToken}` } });
      return response.ok ? { success: true, message: 'Connected to SentinelOne' } : { success: false, message: `API error: ${response.status}` };
    } catch (e: any) { return { success: false, message: e.message }; }
  }

  async sync(config: SentinelOneConfig): Promise<SentinelOneSyncResult> {
    const response = await fetch(`${config.consoleUrl}/web/api/v2.1/agents?limit=200`, { headers: { 'Authorization': `ApiToken ${config.apiToken}` } });
    const data = response.ok ? await response.json() : { data: [] };
    const agents = data.data || [];
    return {
      agents: { total: agents.length, online: agents.filter((a: any) => a.networkStatus === 'connected').length, offline: agents.filter((a: any) => a.networkStatus !== 'connected').length, infected: agents.filter((a: any) => a.infected).length, items: agents.slice(0, 100) },
      threats: { total: 0, active: 0, mitigated: 0, bySeverity: {} }, applications: { total: 0, vulnerable: 0 },
      collectedAt: new Date().toISOString(), errors: []
    };
  }
}

