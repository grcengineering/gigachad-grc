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
    const errors: string[] = [];
    const headers = { 'Authorization': `Splunk ${config.token}` };

    const indexesData = await fetch(`${config.baseUrl}/services/data/indexes?output_mode=json`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`indexes: ${r.status}`)))
      .catch(e => { errors.push(`indexes: ${e.message}`); return { entry: [] }; });

    const savedSearchesData = await fetch(`${config.baseUrl}/services/saved/searches?output_mode=json`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`savedSearches: ${r.status}`)))
      .catch(e => { errors.push(`savedSearches: ${e.message}`); return { entry: [] }; });

    const alertsData = await fetch(`${config.baseUrl}/services/saved/searches?output_mode=json&search=alert.track=1`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`alerts: ${r.status}`)))
      .catch(e => { errors.push(`alerts: ${e.message}`); return { entry: [] }; });

    const usersData = await fetch(`${config.baseUrl}/services/authentication/users?output_mode=json`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`users: ${r.status}`)))
      .catch(e => { errors.push(`users: ${e.message}`); return { entry: [] }; });

    const alertEntries = alertsData.entry || [];

    return {
      indexes: {
        total: indexesData.entry?.length || 0,
        items: (indexesData.entry || []).slice(0, 50).map((i: any) => ({ name: i.name, totalEventCount: i.content?.totalEventCount })),
      },
      savedSearches: { total: savedSearchesData.entry?.length || 0 },
      alerts: {
        total: alertEntries.length,
        triggered: alertEntries.filter((a: any) => (a.content?.triggered_alert_count || 0) > 0).length,
      },
      users: { total: usersData.entry?.length || 0 },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }
}
