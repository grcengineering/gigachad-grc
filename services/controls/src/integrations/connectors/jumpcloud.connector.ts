import { Injectable, Logger } from '@nestjs/common';

export interface JumpCloudConfig { apiKey: string; }
export interface JumpCloudSyncResult {
  users: { total: number; active: number; suspended: number; withMfa: number; items: any[] };
  systems: { total: number; active: number; byOs: Record<string, number> };
  groups: { total: number; userGroups: number; systemGroups: number };
  policies: { total: number };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class JumpCloudConnector {
  private readonly logger = new Logger(JumpCloudConnector.name);
  private readonly baseUrl = 'https://console.jumpcloud.com/api';

  async testConnection(config: JumpCloudConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key is required' };
    try {
      const response = await fetch(`${this.baseUrl}/organizations`, { headers: { 'x-api-key': config.apiKey } });
      if (!response.ok) return { success: false, message: `API error: ${response.status}` };
      return { success: true, message: 'Connected to JumpCloud' };
    } catch (error: any) { return { success: false, message: error.message }; }
  }

  async sync(config: JumpCloudConfig): Promise<JumpCloudSyncResult> {
    const errors: string[] = [];
    const [users, systems, groups, policies] = await Promise.all([
      this.getUsers(config.apiKey).catch(e => { errors.push(`users: ${e.message}`); return []; }),
      this.getSystems(config.apiKey).catch(e => { errors.push(`systems: ${e.message}`); return []; }),
      this.getGroups(config.apiKey).catch(e => { errors.push(`groups: ${e.message}`); return []; }),
      this.getPolicies(config.apiKey).catch(e => { errors.push(`policies: ${e.message}`); return []; }),
    ]);
    const byOs: Record<string, number> = {};
    systems.forEach((s: any) => { byOs[s.os] = (byOs[s.os] || 0) + 1; });
    const userGroups = groups.filter((g: any) => g.type === 'user_group').length;
    const systemGroups = groups.filter((g: any) => g.type === 'system_group').length;
    return {
      users: { total: users.length, active: users.filter((u: any) => !u.suspended).length, suspended: users.filter((u: any) => u.suspended).length, withMfa: users.filter((u: any) => u.mfa?.configured).length, items: users.slice(0, 50) },
      systems: { total: systems.length, active: systems.filter((s: any) => s.active).length, byOs },
      groups: { total: groups.length, userGroups, systemGroups },
      policies: { total: policies.length },
      collectedAt: new Date().toISOString(), errors,
    };
  }

  private async getUsers(apiKey: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/systemusers?limit=500`, { headers: { 'x-api-key': apiKey } });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.results || [];
  }

  private async getSystems(apiKey: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/systems?limit=500`, { headers: { 'x-api-key': apiKey } });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.results || [];
  }

  private async getGroups(apiKey: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/v2/groups?limit=500`, { headers: { 'x-api-key': apiKey } });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : (data.results || []);
  }

  private async getPolicies(apiKey: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/v2/policies?limit=500`, { headers: { 'x-api-key': apiKey } });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : (data.results || []);
  }
}

