/* eslint-disable @typescript-eslint/no-explicit-any */
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
    const response = await fetch(`${this.baseUrl}/platform/api/employees`, { headers: { 'Authorization': `Bearer ${config.apiKey}` } });
    const employees = response.ok ? await response.json() : [];
    return {
      employees: { total: employees.length, active: employees.filter((e: any) => e.employmentStatus === 'ACTIVE').length, items: employees.slice(0, 100) },
      devices: { total: 0, managed: 0 }, apps: { total: 0 }, collectedAt: new Date().toISOString(), errors: []
    };
  }
}

