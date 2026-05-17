import { Injectable, Logger } from '@nestjs/common';

export interface RipplingConfig { apiKey: string; }
export interface RipplingSyncResult {
  employees: { total: number; active: number; items: any[] };
  devices: { total: number; managed: number };
  apps: { total: number };
  collectedAt: string; errors: string[];
}

@Injectable()
export class RipplingConnector {
  private readonly logger = new Logger(RipplingConnector.name);
  private readonly baseUrl = 'https://api.rippling.com';

  async testConnection(config: RipplingConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      const response = await fetch(`${this.baseUrl}/platform/api/employees`, { headers: { 'Authorization': `Bearer ${config.apiKey}` } });
      return response.ok ? { success: true, message: 'Connected to Rippling' } : { success: false, message: `API error: ${response.status}` };
    } catch (e: any) { return { success: false, message: e.message }; }
  }

  async sync(config: RipplingConfig): Promise<RipplingSyncResult> {
    const errors: string[] = [];
    const headers = { 'Authorization': `Bearer ${config.apiKey}` };

    const employees = await fetch(`${this.baseUrl}/platform/api/employees`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`employees: ${r.status}`)))
      .catch(e => { errors.push(`employees: ${e.message}`); return []; });

    const devices = await fetch(`${this.baseUrl}/platform/api/devices`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`devices: ${r.status}`)))
      .catch(e => { errors.push(`devices: ${e.message}`); return []; });

    const apps = await fetch(`${this.baseUrl}/platform/api/apps`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`apps: ${r.status}`)))
      .catch(e => { errors.push(`apps: ${e.message}`); return []; });

    const deviceList = Array.isArray(devices) ? devices : (devices?.results || devices?.data || []);
    const appList = Array.isArray(apps) ? apps : (apps?.results || apps?.data || []);
    const employeeList = Array.isArray(employees) ? employees : (employees?.results || employees?.data || []);

    return {
      employees: {
        total: employeeList.length,
        active: employeeList.filter((e: any) => e.employmentStatus === 'ACTIVE').length,
        items: employeeList.slice(0, 100),
      },
      devices: {
        total: deviceList.length,
        managed: deviceList.filter((d: any) => d.managed === true || d.isManaged === true || d.status === 'managed').length,
      },
      apps: { total: appList.length },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }
}
