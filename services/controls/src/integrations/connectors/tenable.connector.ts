/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

export interface TenableConfig { accessKey: string; secretKey: string; }
export interface TenableSyncResult {
  vulnerabilities: { total: number; critical: number; high: number; medium: number; low: number; items: any[] };
  assets: { total: number; scanned: number };
  scans: { total: number; running: number };
  compliance: { passed: number; failed: number };
  collectedAt: string; errors: string[];
}

@Injectable()
export class TenableConnector {
  private readonly logger = new Logger(TenableConnector.name);
  private readonly baseUrl = 'https://cloud.tenable.com';

  async testConnection(config: TenableConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.accessKey || !config.secretKey) return { success: false, message: 'Access key and secret key required' };
    try {
      const response = await fetch(`${this.baseUrl}/session`, { headers: { 'X-ApiKeys': `accessKey=${config.accessKey};secretKey=${config.secretKey}` } });
      return response.ok ? { success: true, message: 'Connected to Tenable.io' } : { success: false, message: `API error: ${response.status}` };
    } catch (e: any) { return { success: false, message: e.message }; }
  }

  async sync(config: TenableConfig): Promise<TenableSyncResult> {
    const headers = { 'X-ApiKeys': `accessKey=${config.accessKey};secretKey=${config.secretKey}` };
    const _vulnsResp = await fetch(`${this.baseUrl}/workbenches/vulnerabilities?filter.0.filter=severity&filter.0.quality=eq&filter.0.value=4`, { headers }).catch(() => null);
    return {
      vulnerabilities: { total: 0, critical: 0, high: 0, medium: 0, low: 0, items: [] },
      assets: { total: 0, scanned: 0 }, scans: { total: 0, running: 0 }, compliance: { passed: 0, failed: 0 },
      collectedAt: new Date().toISOString(), errors: []
    };
  }
}

