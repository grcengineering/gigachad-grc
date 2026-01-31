/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { BaseConnector } from './base-connector';

export interface LaceworkConfig {
  accountName: string;
  accessKeyId: string;
  secretKey: string;
}

export interface LaceworkSyncResult {
  alerts: { total: number; critical: number; high: number; medium: number; low: number; items: any[] };
  compliance: { reports: number; violations: number; items: any[] };
  vulnerabilities: { hosts: number; containers: number; items: any[] };
  cloudAccounts: { total: number; items: any[] };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class LaceworkConnector extends BaseConnector {
  constructor() {
    super('LaceworkConnector');
  }

  async testConnection(config: LaceworkConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.accountName || !config.accessKeyId || !config.secretKey) {
      return { success: false, message: 'Account name, access key, and secret key required' };
    }

    try {
      // Lacework uses API key authentication
      this.setHeaders({
        'LW-API-KEY': config.accessKeyId,
        'LW-API-SECRET': config.secretKey,
        'Content-Type': 'application/json',
      });
      this.setBaseURL(`https://${config.accountName}.lacework.net/api/v2`);

      const result = await this.get('/UserProfile');
      if (result.error) {
        return { success: false, message: result.error };
      }

      return {
        success: true,
        message: `Connected to Lacework account: ${config.accountName}. User: ${result.data?.data?.[0]?.username || 'Unknown'}`,
        details: result.data,
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }

  async sync(config: LaceworkConfig): Promise<LaceworkSyncResult> {
    const alerts: any[] = [];
    const compliance: any[] = [];
    const vulnerabilities: any[] = [];
    const cloudAccounts: any[] = [];
    const errors: string[] = [];

    try {
      this.setHeaders({
        'LW-API-KEY': config.accessKeyId,
        'LW-API-SECRET': config.secretKey,
        'Content-Type': 'application/json',
      });
      this.setBaseURL(`https://${config.accountName}.lacework.net/api/v2`);

      // Fetch alerts
      const alertsResult = await this.post('/Alerts/GetAlerts', {
        timeRange: {
          startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date().toISOString(),
        },
      });
      if (alertsResult.data?.data) {
        alerts.push(...alertsResult.data.data);
      } else if (alertsResult.error) {
        errors.push(alertsResult.error);
      }

      // Fetch compliance reports
      const complianceResult = await this.get('/Compliance');
      if (complianceResult.data?.data) {
        compliance.push(...complianceResult.data.data);
      } else if (complianceResult.error) {
        errors.push(complianceResult.error);
      }

      // Fetch vulnerabilities
      const vulnsResult = await this.post('/Vulnerabilities/Hosts/search', {
        timeRange: {
          startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date().toISOString(),
        },
      });
      if (vulnsResult.data?.data) {
        vulnerabilities.push(...vulnsResult.data.data);
      } else if (vulnsResult.error) {
        errors.push(vulnsResult.error);
      }

      // Fetch cloud accounts
      const accountsResult = await this.get('/CloudAccounts');
      if (accountsResult.data?.data) {
        cloudAccounts.push(...accountsResult.data.data);
      } else if (accountsResult.error) {
        errors.push(accountsResult.error);
      }

      const critical = alerts.filter((a: any) => a.severity === 'Critical').length;
      const high = alerts.filter((a: any) => a.severity === 'High').length;
      const medium = alerts.filter((a: any) => a.severity === 'Medium').length;
      const low = alerts.filter((a: any) => a.severity === 'Low').length;
      const violations = compliance.reduce((sum: number, c: any) => sum + (c.violations || 0), 0);
      const hosts = vulnerabilities.filter((v: any) => v.type === 'host').length;
      const containers = vulnerabilities.filter((v: any) => v.type === 'container').length;

      return {
        alerts: { total: alerts.length, critical, high, medium, low, items: alerts },
        compliance: { reports: compliance.length, violations, items: compliance },
        vulnerabilities: { hosts, containers, items: vulnerabilities },
        cloudAccounts: { total: cloudAccounts.length, items: cloudAccounts },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        alerts: { total: 0, critical: 0, high: 0, medium: 0, low: 0, items: [] },
        compliance: { reports: 0, violations: 0, items: [] },
        vulnerabilities: { hosts: 0, containers: 0, items: [] },
        cloudAccounts: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}
