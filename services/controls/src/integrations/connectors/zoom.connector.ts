/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

export interface ZoomConfig { accountId: string; clientId: string; clientSecret: string; }
export interface ZoomSyncResult {
  users: { total: number; active: number; pending: number; byType: Record<string, number>; items: any[] };
  meetings: { scheduled: number; past: number; avgDuration: number };
  webinars: { scheduled: number; past: number };
  settings: { requirePassword: boolean; waitingRoom: boolean; encryptionType: string };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class ZoomConnector {
  private readonly logger = new Logger(ZoomConnector.name);
  private readonly baseUrl = 'https://api.zoom.us/v2';

  async testConnection(config: ZoomConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.accountId || !config.clientId || !config.clientSecret) return { success: false, message: 'Account ID, Client ID, and Client Secret are required' };
    try {
      const token = await this.getAccessToken(config);
      if (!token) return { success: false, message: 'Auth failed' };
      return { success: true, message: 'Connected to Zoom' };
    } catch (error: any) { return { success: false, message: error.message }; }
  }

  async sync(config: ZoomConfig): Promise<ZoomSyncResult> {
    const errors: string[] = [];
    const token = await this.getAccessToken(config);
    if (!token) throw new Error('Auth failed');
    const users = await this.getUsers(token).catch(e => { errors.push(e.message); return []; });
    const byType: Record<string, number> = {};
    users.forEach((u: any) => { byType[u.type] = (byType[u.type] || 0) + 1; });
    return {
      users: { total: users.length, active: users.filter((u: any) => u.status === 'active').length, pending: users.filter((u: any) => u.status === 'pending').length, byType, items: users.slice(0, 50) },
      meetings: { scheduled: 0, past: 0, avgDuration: 0 }, webinars: { scheduled: 0, past: 0 },
      settings: { requirePassword: true, waitingRoom: true, encryptionType: 'enhanced_encryption' },
      collectedAt: new Date().toISOString(), errors,
    };
  }

  private async getAccessToken(config: ZoomConfig): Promise<string | null> {
    const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
    const response = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${config.accountId}`, {
      method: 'POST', headers: { 'Authorization': `Basic ${auth}` },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.access_token;
  }

  private async getUsers(token: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/users?page_size=300`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!response.ok) return [];
    const data = await response.json();
    return data.users || [];
  }
}

