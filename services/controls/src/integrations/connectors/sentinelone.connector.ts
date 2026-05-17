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
    const errors: string[] = [];
    const headers = { 'Authorization': `ApiToken ${config.apiToken}` };

    const agentsData = await fetch(`${config.consoleUrl}/web/api/v2.1/agents?limit=200`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`agents: ${r.status}`)))
      .catch(e => { errors.push(`agents: ${e.message}`); return { data: [] }; });
    const agents = agentsData.data || [];

    const threatsData = await fetch(`${config.consoleUrl}/web/api/v2.1/threats?limit=200`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`threats: ${r.status}`)))
      .catch(e => { errors.push(`threats: ${e.message}`); return { data: [] }; });
    const threats = threatsData.data || [];

    const appsData = await fetch(`${config.consoleUrl}/web/api/v2.1/applications?limit=200`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`applications: ${r.status}`)))
      .catch(e => { errors.push(`applications: ${e.message}`); return { data: [] }; });
    const apps = appsData.data || [];

    const bySeverity: Record<string, number> = {};
    threats.forEach((t: any) => {
      const sev = t.threatInfo?.confidenceLevel || t.threatInfo?.classification || t.severity || 'unknown';
      bySeverity[sev] = (bySeverity[sev] || 0) + 1;
    });

    return {
      agents: {
        total: agents.length,
        online: agents.filter((a: any) => a.networkStatus === 'connected').length,
        offline: agents.filter((a: any) => a.networkStatus !== 'connected').length,
        infected: agents.filter((a: any) => a.infected).length,
        items: agents.slice(0, 100),
      },
      threats: {
        total: threats.length,
        active: threats.filter((t: any) => t.threatInfo?.incidentStatus === 'unresolved' || t.threatInfo?.mitigationStatus !== 'mitigated').length,
        mitigated: threats.filter((t: any) => t.threatInfo?.mitigationStatus === 'mitigated').length,
        bySeverity,
      },
      applications: {
        total: apps.length,
        vulnerable: apps.filter((a: any) => a.riskLevel === 'high' || a.riskLevel === 'critical' || a.hasVulnerabilities === true).length,
      },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }
}
