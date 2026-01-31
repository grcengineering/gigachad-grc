/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { BaseConnector } from './base-connector';
import crypto from 'crypto';

export interface DuoConfig {
  integrationKey: string;
  secretKey: string;
  apiHostname: string;
}

export interface DuoSyncResult {
  users: { total: number; active: number; bypass: number; disabled: number; items: any[] };
  phones: { total: number; items: any[] };
  tokens: { total: number; items: any[] };
  authLogs: { total: number; successful: number; denied: number; items: any[] };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class DuoConnector extends BaseConnector {
  constructor() {
    super('DuoConnector');
  }

  private signRequest(method: string, host: string, path: string, params: Record<string, string>, secretKey: string): string {
    const now = new Date().toUTCString();
    const canonical = [now, method.toUpperCase(), host.toLowerCase(), path, this.canonicalizeParams(params)].join('\n');
    const hmac = crypto.createHmac('sha1', secretKey);
    hmac.update(canonical);
    return Buffer.from(`${now}:${hmac.digest('hex')}`).toString('base64');
  }

  private canonicalizeParams(params: Record<string, string>): string {
    return Object.keys(params)
      .sort()
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
  }

  async testConnection(config: DuoConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.integrationKey || !config.secretKey || !config.apiHostname) {
      return { success: false, message: 'Integration Key, Secret Key, and API Hostname are required' };
    }

    try {
      const path = '/admin/v1/users';
      const params: Record<string, string> = {};
      const auth = this.signRequest('GET', config.apiHostname, path, params, config.secretKey);
      
      this.setHeaders({
        Authorization: `Basic ${Buffer.from(`${config.integrationKey}:${auth}`).toString('base64')}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL(`https://${config.apiHostname}`);

      const result = await this.get(path);
      if (result.error) {
        return { success: false, message: result.error };
      }

      return {
        success: true,
        message: `Connected to Duo API at ${config.apiHostname}. Found ${result.data?.response?.length || 0} users.`,
        details: result.data,
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }

  async sync(config: DuoConfig): Promise<DuoSyncResult> {
    const users: any[] = [];
    const phones: any[] = [];
    const tokens: any[] = [];
    const authLogs: any[] = [];
    const errors: string[] = [];

    try {
      const path = '/admin/v1/users';
      const params: Record<string, string> = {};
      const auth = this.signRequest('GET', config.apiHostname, path, params, config.secretKey);

      this.setHeaders({
        Authorization: `Basic ${Buffer.from(`${config.integrationKey}:${auth}`).toString('base64')}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL(`https://${config.apiHostname}`);

      const usersResult = await this.get('/admin/v1/users');
      if (usersResult.data?.response) {
        users.push(...usersResult.data.response);
      } else if (usersResult.error) {
        errors.push(usersResult.error);
      }

      const phonesResult = await this.get('/admin/v1/phones');
      if (phonesResult.data?.response) {
        phones.push(...phonesResult.data.response);
      } else if (phonesResult.error) {
        errors.push(phonesResult.error);
      }

      const tokensResult = await this.get('/admin/v1/tokens');
      if (tokensResult.data?.response) {
        tokens.push(...tokensResult.data.response);
      } else if (tokensResult.error) {
        errors.push(tokensResult.error);
      }

      const authLogsResult = await this.get('/admin/v1/logs/authentication');
      if (authLogsResult.data?.response) {
        authLogs.push(...authLogsResult.data.response);
      } else if (authLogsResult.error) {
        errors.push(authLogsResult.error);
      }

      const active = users.filter((u: any) => u.status === 'active').length;
      const bypass = users.filter((u: any) => u.bypass_enabled === true).length;
      const disabled = users.filter((u: any) => u.status === 'disabled').length;
      const successful = authLogs.filter((l: any) => l.result === 'SUCCESS').length;
      const denied = authLogs.filter((l: any) => l.result === 'DENY').length;

      return {
        users: { total: users.length, active, bypass, disabled, items: users },
        phones: { total: phones.length, items: phones },
        tokens: { total: tokens.length, items: tokens },
        authLogs: { total: authLogs.length, successful, denied, items: authLogs },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        users: { total: 0, active: 0, bypass: 0, disabled: 0, items: [] },
        phones: { total: 0, items: [] },
        tokens: { total: 0, items: [] },
        authLogs: { total: 0, successful: 0, denied: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}
