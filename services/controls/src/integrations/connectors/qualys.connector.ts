/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { BaseConnector } from './base-connector';

export interface QualysConfig {
  username: string;
  password: string;
  apiUrl: string;
}

export interface QualysSyncResult {
  vulnerabilities: { total: number; severity5: number; severity4: number; severity3: number; items: any[] };
  assets: { total: number; items: any[] };
  webApps: { total: number; items: any[] };
  compliance: { passed: number; failed: number; items: any[] };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class QualysConnector extends BaseConnector {
  constructor() {
    super('QualysConnector');
  }

  async testConnection(config: QualysConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.username || !config.password || !config.apiUrl) {
      return { success: false, message: 'Username, password, and API URL required' };
    }

    try {
      const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
      this.setHeaders({
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/xml',
        'X-Requested-With': 'GigaChad GRC',
      });
      this.setBaseURL(config.apiUrl);

      const result = await this.get('/api/2.0/fo/user');
      if (result.error) {
        return { success: false, message: result.error };
      }

      return {
        success: true,
        message: `Connected to Qualys at ${config.apiUrl}`,
        details: result.data,
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }

  async sync(config: QualysConfig): Promise<QualysSyncResult> {
    const vulnerabilities: any[] = [];
    const assets: any[] = [];
    const webApps: any[] = [];
    const compliance: any[] = [];
    const errors: string[] = [];

    try {
      const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
      this.setHeaders({
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/xml',
        'X-Requested-With': 'GigaChad GRC',
      });
      this.setBaseURL(config.apiUrl);

      // Fetch vulnerabilities
      const vulnsResult = await this.get('/api/2.0/fo/asset/host/vm/detection/?action=list');
      if (vulnsResult.data) {
        // Parse XML response (simplified - in production use xml2js or similar)
        const vulnData = vulnsResult.data;
        if (Array.isArray(vulnData)) {
          vulnerabilities.push(...vulnData);
        }
      } else if (vulnsResult.error) {
        errors.push(vulnsResult.error);
      }

      // Fetch assets
      const assetsResult = await this.get('/api/2.0/fo/asset/host/?action=list');
      if (assetsResult.data) {
        const assetData = assetsResult.data;
        if (Array.isArray(assetData)) {
          assets.push(...assetData);
        }
      } else if (assetsResult.error) {
        errors.push(assetsResult.error);
      }

      // Fetch web apps
      const webAppsResult = await this.get('/api/2.0/fo/was/webapp/?action=list');
      if (webAppsResult.data) {
        const webAppData = webAppsResult.data;
        if (Array.isArray(webAppData)) {
          webApps.push(...webAppData);
        }
      } else if (webAppsResult.error) {
        errors.push(webAppsResult.error);
      }

      // Fetch compliance
      const complianceResult = await this.get('/api/2.0/fo/compliance/policy/?action=list');
      if (complianceResult.data) {
        const complianceData = complianceResult.data;
        if (Array.isArray(complianceData)) {
          compliance.push(...complianceData);
        }
      } else if (complianceResult.error) {
        errors.push(complianceResult.error);
      }

      const severity5 = vulnerabilities.filter((v: any) => v.severity === '5').length;
      const severity4 = vulnerabilities.filter((v: any) => v.severity === '4').length;
      const severity3 = vulnerabilities.filter((v: any) => v.severity === '3').length;
      const passed = compliance.filter((c: any) => c.status === 'PASSED').length;
      const failed = compliance.filter((c: any) => c.status === 'FAILED').length;

      return {
        vulnerabilities: { total: vulnerabilities.length, severity5, severity4, severity3, items: vulnerabilities },
        assets: { total: assets.length, items: assets },
        webApps: { total: webApps.length, items: webApps },
        compliance: { passed, failed, items: compliance },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        vulnerabilities: { total: 0, severity5: 0, severity4: 0, severity3: 0, items: [] },
        assets: { total: 0, items: [] },
        webApps: { total: 0, items: [] },
        compliance: { passed: 0, failed: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}
