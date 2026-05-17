import { Injectable, Logger } from '@nestjs/common';

export interface TenableConfig {
  accessKey: string;
  secretKey: string;
}

export interface TenableSyncResult {
  vulnerabilities: { total: number; critical: number; high: number; medium: number; low: number; items: any[] };
  assets: { total: number; scanned: number };
  scans: { total: number; running: number };
  compliance: { passed: number; failed: number };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class TenableConnector {
  private readonly logger = new Logger(TenableConnector.name);
  private readonly baseUrl = 'https://cloud.tenable.com';

  async testConnection(config: TenableConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.accessKey || !config.secretKey) {
      return { success: false, message: 'Access key and secret key required' };
    }
    try {
      const response = await fetch(`${this.baseUrl}/session`, {
        headers: this.authHeaders(config),
      });
      if (!response.ok) {
        const text = await response.text();
        return { success: false, message: `API error: ${response.status} ${text.slice(0, 200)}` };
      }
      return { success: true, message: 'Connected to Tenable.io' };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  async sync(config: TenableConfig): Promise<TenableSyncResult> {
    if (!config.accessKey || !config.secretKey) {
      throw new Error('Tenable connector requires accessKey and secretKey');
    }

    const errors: string[] = [];
    const headers = this.authHeaders(config);

    const [vulnSummary, assets, scans, compliance] = await Promise.all([
      this.getVulnerabilities(headers).catch(e => {
        errors.push(`Vulnerabilities: ${e.message}`);
        return { total: 0, critical: 0, high: 0, medium: 0, low: 0, items: [] as any[] };
      }),
      this.getAssets(headers).catch(e => {
        errors.push(`Assets: ${e.message}`);
        return { total: 0, scanned: 0 };
      }),
      this.getScans(headers).catch(e => {
        errors.push(`Scans: ${e.message}`);
        return { total: 0, running: 0 };
      }),
      this.getCompliance(headers).catch(e => {
        errors.push(`Compliance: ${e.message}`);
        return { passed: 0, failed: 0 };
      }),
    ]);

    return {
      vulnerabilities: vulnSummary,
      assets,
      scans,
      compliance,
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private authHeaders(config: TenableConfig): Record<string, string> {
    return {
      'X-ApiKeys': `accessKey=${config.accessKey};secretKey=${config.secretKey}`,
      Accept: 'application/json',
    };
  }

  private async authedGet(headers: Record<string, string>, url: string): Promise<any> {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GET ${url} failed: ${response.status} ${text.slice(0, 200)}`);
    }
    return response.json();
  }

  private async getVulnerabilities(headers: Record<string, string>): Promise<TenableSyncResult['vulnerabilities']> {
    const data = await this.authedGet(headers, `${this.baseUrl}/workbenches/vulnerabilities`);
    const vulns: any[] = data.vulnerabilities || [];

    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;
    for (const v of vulns) {
      // Tenable severity: 0=Info, 1=Low, 2=Medium, 3=High, 4=Critical
      const sev = typeof v.severity === 'number' ? v.severity : Number(v.severity);
      const count = typeof v.count === 'number' ? v.count : 1;
      switch (sev) {
        case 4:
          critical += count;
          break;
        case 3:
          high += count;
          break;
        case 2:
          medium += count;
          break;
        case 1:
          low += count;
          break;
        default:
          break;
      }
    }

    const total = critical + high + medium + low;

    return {
      total,
      critical,
      high,
      medium,
      low,
      items: vulns.slice(0, 100),
    };
  }

  private async getAssets(headers: Record<string, string>): Promise<TenableSyncResult['assets']> {
    const data = await this.authedGet(headers, `${this.baseUrl}/workbenches/assets`);
    const assets: any[] = data.assets || [];
    const scanned = assets.filter((a: any) => a.last_seen || a.last_authenticated_scan_date).length;
    return {
      total: assets.length,
      scanned,
    };
  }

  private async getScans(headers: Record<string, string>): Promise<TenableSyncResult['scans']> {
    const data = await this.authedGet(headers, `${this.baseUrl}/scans`);
    const scans: any[] = data.scans || [];
    const running = scans.filter((s: any) =>
      ['running', 'pending', 'resuming', 'publishing'].includes(String(s.status || '').toLowerCase()),
    ).length;
    return {
      total: scans.length,
      running,
    };
  }

  private async getCompliance(headers: Record<string, string>): Promise<TenableSyncResult['compliance']> {
    // /audits/compliance returns aggregated compliance results.
    const data = await this.authedGet(headers, `${this.baseUrl}/audits/compliance`);
    const items: any[] = data.compliance || data.results || [];
    let passed = 0;
    let failed = 0;
    for (const c of items) {
      const status = String(c.status || c.result || '').toLowerCase();
      const count = typeof c.count === 'number' ? c.count : 1;
      if (status === 'passed' || status === 'pass' || status === 'compliant') {
        passed += count;
      } else if (status === 'failed' || status === 'fail' || status === 'non-compliant') {
        failed += count;
      }
    }
    return { passed, failed };
  }
}
