/* eslint-disable @typescript-eslint/no-explicit-any */
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
    const response = await fetch(`https://api.bamboohr.com/api/gateway.php/${config.subdomain}/v1/employees/directory`, {
      headers: { 'Authorization': `Basic ${Buffer.from(`${config.apiKey}:x`).toString('base64')}`, 'Accept': 'application/json' }
    });
    const data = response.ok ? await response.json() : { employees: [] };
    const employees = data.employees || [];
    const byDept: Record<string, number> = {};
    employees.forEach((e: any) => { byDept[e.department || 'Unknown'] = (byDept[e.department || 'Unknown'] || 0) + 1; });
    return {
      employees: { total: employees.length, active: employees.filter((e: any) => e.status === 'Active').length, inactive: employees.filter((e: any) => e.status !== 'Active').length, byDepartment: byDept, items: employees.slice(0, 100) },
      timeOff: { pendingRequests: 0 }, collectedAt: new Date().toISOString(), errors: []
    };
  }
}

