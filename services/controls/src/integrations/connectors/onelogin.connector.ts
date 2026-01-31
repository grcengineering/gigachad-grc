/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

export interface OneLoginConfig { clientId: string; clientSecret: string; subdomain: string; }
export interface OneLoginSyncResult {
  users: { total: number; active: number; locked: number; withMfa: number; items: any[] };
  apps: { total: number };
  roles: { total: number };
  events: { total: number; failedLogins: number };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class OneLoginConnector {
  private readonly logger = new Logger(OneLoginConnector.name);

  async testConnection(config: OneLoginConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.clientId || !config.clientSecret || !config.subdomain) {
      return { success: false, message: 'Client ID, Client Secret, and Subdomain are required' };
    }
    try {
      const token = await this.getAccessToken(config);
      return token ? { success: true, message: 'Connected to OneLogin' } : { success: false, message: 'Auth failed' };
    } catch (error: any) { return { success: false, message: error.message }; }
  }

  async sync(config: OneLoginConfig): Promise<OneLoginSyncResult> {
    const token = await this.getAccessToken(config);
    if (!token) throw new Error('Auth failed');
    const users = await this.getUsers(config.subdomain, token).catch(() => []);
    return {
      users: { total: users.length, active: users.filter((u: any) => u.status === 1).length, locked: users.filter((u: any) => u.status === 3).length, withMfa: 0, items: users.slice(0, 50) },
      apps: { total: 0 }, roles: { total: 0 }, events: { total: 0, failedLogins: 0 },
      collectedAt: new Date().toISOString(), errors: [],
    };
  }

  private async getAccessToken(config: OneLoginConfig): Promise<string | null> {
    const response = await fetch(`https://${config.subdomain}.onelogin.com/auth/oauth2/v2/token`, {
      method: 'POST', headers: { 'Authorization': `client_id:${config.clientId}, client_secret:${config.clientSecret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'client_credentials' }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.access_token;
  }

  private async getUsers(subdomain: string, token: string): Promise<any[]> {
    const response = await fetch(`https://${subdomain}.onelogin.com/api/2/users`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!response.ok) return [];
    const data = await response.json();
    return data || [];
  }
}

