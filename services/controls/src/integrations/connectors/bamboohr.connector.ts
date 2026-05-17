import { Injectable, Logger } from '@nestjs/common';

export interface BambooHRConfig { subdomain: string; apiKey: string; }
export interface BambooHRSyncResult {
  employees: { total: number; active: number; inactive: number; byDepartment: Record<string, number>; items: any[] };
  timeOff: { pendingRequests: number };
  collectedAt: string; errors: string[];
}

@Injectable()
export class BambooHRConnector {
  private readonly logger = new Logger(BambooHRConnector.name);

  async testConnection(config: BambooHRConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.subdomain || !config.apiKey) return { success: false, message: 'Subdomain and API key required' };
    try {
      const response = await fetch(`https://api.bamboohr.com/api/gateway.php/${config.subdomain}/v1/employees/directory`, {
        headers: { 'Authorization': `Basic ${Buffer.from(`${config.apiKey}:x`).toString('base64')}`, 'Accept': 'application/json' }
      });
      return response.ok ? { success: true, message: `Connected to BambooHR: ${config.subdomain}` } : { success: false, message: `API error: ${response.status}` };
    } catch (e: any) { return { success: false, message: e.message }; }
  }

  async sync(config: BambooHRConfig): Promise<BambooHRSyncResult> {
    const errors: string[] = [];
    const headers = { 'Authorization': `Basic ${Buffer.from(`${config.apiKey}:x`).toString('base64')}`, 'Accept': 'application/json' };

    const employeesData = await fetch(`https://api.bamboohr.com/api/gateway.php/${config.subdomain}/v1/employees/directory`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`employees: ${r.status}`)))
      .catch(e => { errors.push(`employees: ${e.message}`); return { employees: [] }; });
    const employees = employeesData.employees || [];

    const timeOffData = await fetch(`https://api.bamboohr.com/api/gateway.php/${config.subdomain}/v1/time_off/requests?status=requested`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`timeOff: ${r.status}`)))
      .catch(e => { errors.push(`timeOff: ${e.message}`); return []; });
    const timeOffRequests = Array.isArray(timeOffData) ? timeOffData : (timeOffData?.requests || []);

    const byDept: Record<string, number> = {};
    employees.forEach((e: any) => { byDept[e.department || 'Unknown'] = (byDept[e.department || 'Unknown'] || 0) + 1; });

    return {
      employees: {
        total: employees.length,
        active: employees.filter((e: any) => e.status === 'Active').length,
        inactive: employees.filter((e: any) => e.status !== 'Active').length,
        byDepartment: byDept,
        items: employees.slice(0, 100),
      },
      timeOff: { pendingRequests: timeOffRequests.length },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }
}
