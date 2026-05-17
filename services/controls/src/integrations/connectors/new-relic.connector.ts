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
    const errors: string[] = [];
    const headers = { 'Api-Key': config.apiKey };

    const appsData = await fetch(`${this.baseUrl}/applications.json`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`applications: ${r.status}`)))
      .catch(e => { errors.push(`applications: ${e.message}`); return { applications: [] }; });
    const apps = appsData.applications || [];

    const alertsData = await fetch(`${this.baseUrl}/alerts_events.json`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`alerts: ${r.status}`)))
      .catch(e => { errors.push(`alerts: ${e.message}`); return { recent_events: [] }; });
    const alertEvents = alertsData.recent_events || alertsData.alerts_events || [];

    const syntheticsData = await fetch(`${this.baseUrl}/synthetics/monitors.json`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`synthetics: ${r.status}`)))
      .catch(e => { errors.push(`synthetics: ${e.message}`); return { monitors: [] }; });
    const monitors = syntheticsData.monitors || [];

    const infraData = await fetch(`${this.baseUrl}/infrastructure_hosts.json`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`infrastructure: ${r.status}`)))
      .catch(e => { errors.push(`infrastructure: ${e.message}`); return { hosts: [] }; });
    const hosts = infraData.hosts || infraData.infrastructure_hosts || [];

    const openEvents = alertEvents.filter((a: any) => {
      const status = (a.event_type || a.priority || a.status || '').toString().toLowerCase();
      return status !== 'closed' && status !== 'resolved';
    });

    return {
      applications: {
        total: apps.length,
        reporting: apps.filter((a: any) => a.reporting).length,
        notReporting: apps.filter((a: any) => !a.reporting).length,
        items: apps.slice(0, 50),
      },
      alerts: {
        open: openEvents.length,
        critical: alertEvents.filter((a: any) => (a.priority || '').toString().toLowerCase() === 'critical').length,
        warning: alertEvents.filter((a: any) => (a.priority || '').toString().toLowerCase() === 'warning').length,
      },
      synthetics: {
        monitors: monitors.length,
        failing: monitors.filter((m: any) => m.status === 'FAILING' || m.status === 'MUTED' || m.status === 'DISABLED').length,
      },
      infrastructure: { hosts: hosts.length },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }
}
