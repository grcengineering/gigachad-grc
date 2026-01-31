/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

export interface CloudflareConfig {
  apiToken: string;
  accountId?: string;
}

export interface CloudflareSyncResult {
  zones: {
    total: number;
    active: number;
    items: Array<{ id: string; name: string; status: string; plan: string }>;
  };
  security: {
    wafEnabled: number;
    sslStrict: number;
    ddosProtected: number;
  };
  dns: { totalRecords: number };
  firewall: { rules: number; accessRules: number };
  certificates: { total: number; expiringSoon: number };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class CloudflareConnector {
  private readonly logger = new Logger(CloudflareConnector.name);
  private readonly baseUrl = 'https://api.cloudflare.com/client/v4';

  async testConnection(config: CloudflareConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiToken) {
      return { success: false, message: 'API token is required' };
    }
    try {
      const response = await fetch(`${this.baseUrl}/user/tokens/verify`, {
        headers: { 'Authorization': `Bearer ${config.apiToken}` },
      });
      if (!response.ok) return { success: false, message: `API error: ${response.status}` };
      const data = await response.json();
      return { success: data.success, message: data.success ? 'Connected to Cloudflare' : 'Token verification failed' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async sync(config: CloudflareConfig): Promise<CloudflareSyncResult> {
    const errors: string[] = [];
    const zones = await this.getZones(config).catch(e => { errors.push(e.message); return []; });
    const activeZones = zones.filter((z: any) => z.status === 'active');
    return {
      zones: {
        total: zones.length,
        active: activeZones.length,
        items: zones.slice(0, 50).map((z: any) => ({ id: z.id, name: z.name, status: z.status, plan: z.plan?.name })),
      },
      security: { wafEnabled: 0, sslStrict: 0, ddosProtected: activeZones.length },
      dns: { totalRecords: 0 },
      firewall: { rules: 0, accessRules: 0 },
      certificates: { total: 0, expiringSoon: 0 },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private async getZones(config: CloudflareConfig): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/zones?per_page=50`, {
      headers: { 'Authorization': `Bearer ${config.apiToken}` },
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.result || [];
  }
}

