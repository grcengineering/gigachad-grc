/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

export interface WizConfig {
  clientId: string;
  clientSecret: string;
  apiEndpoint?: string;  // e.g., https://api.us1.app.wiz.io
}

export interface WizSyncResult {
  issues: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    informational: number;
    open: number;
    resolved: number;
    items: Array<{
      id: string;
      title: string;
      severity: string;
      status: string;
      type: string;
      resource: string;
      createdAt: string;
    }>;
  };
  vulnerabilities: {
    total: number;
    critical: number;
    high: number;
    exploitable: number;
    fixAvailable: number;
  };
  cloudResources: {
    total: number;
    byProvider: Record<string, number>;
    byType: Record<string, number>;
  };
  securityFrameworks: {
    compliance: Array<{
      name: string;
      score: number;
      passedControls: number;
      failedControls: number;
    }>;
  };
  cloudEntitlements: {
    excessivePermissions: number;
    unusedIdentities: number;
  };
  containers: {
    total: number;
    vulnerable: number;
  };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class WizConnector {
  private readonly logger = new Logger(WizConnector.name);
  private readonly defaultEndpoint = 'https://api.us1.app.wiz.io';

  async testConnection(config: WizConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.clientId || !config.clientSecret) {
      return { success: false, message: 'Client ID and Client Secret are required' };
    }

    try {
      const token = await this.getAccessToken(config);
      if (!token) {
        return { success: false, message: 'Authentication failed' };
      }

      return {
        success: true,
        message: 'Connected to Wiz successfully',
        details: { endpoint: config.apiEndpoint || this.defaultEndpoint },
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async sync(config: WizConfig): Promise<WizSyncResult> {
    const errors: string[] = [];
    const token = await this.getAccessToken(config);

    if (!token) {
      throw new Error('Authentication failed');
    }

    const endpoint = config.apiEndpoint || this.defaultEndpoint;
    const [issues, vulnerabilities, resources] = await Promise.all([
      this.getIssues(endpoint, token).catch(e => { errors.push(`Issues: ${e.message}`); return []; }),
      this.getVulnerabilities(endpoint, token).catch(e => { errors.push(`Vulns: ${e.message}`); return { total: 0, critical: 0, high: 0, exploitable: 0, fixAvailable: 0 }; }),
      this.getCloudResources(endpoint, token).catch(e => { errors.push(`Resources: ${e.message}`); return { total: 0, byProvider: {}, byType: {} }; }),
    ]);

    return {
      issues: {
        total: issues.length,
        critical: issues.filter((i: any) => i.severity === 'CRITICAL').length,
        high: issues.filter((i: any) => i.severity === 'HIGH').length,
        medium: issues.filter((i: any) => i.severity === 'MEDIUM').length,
        low: issues.filter((i: any) => i.severity === 'LOW').length,
        informational: issues.filter((i: any) => i.severity === 'INFORMATIONAL').length,
        open: issues.filter((i: any) => i.status === 'OPEN').length,
        resolved: issues.filter((i: any) => i.status === 'RESOLVED').length,
        items: issues.slice(0, 100).map((i: any) => ({
          id: i.id,
          title: i.control?.name || i.title || '',
          severity: i.severity,
          status: i.status,
          type: i.type,
          resource: i.entity?.name || '',
          createdAt: i.createdAt,
        })),
      },
      vulnerabilities,
      cloudResources: resources,
      securityFrameworks: { compliance: [] },
      cloudEntitlements: { excessivePermissions: 0, unusedIdentities: 0 },
      containers: { total: 0, vulnerable: 0 },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private async getAccessToken(config: WizConfig): Promise<string | null> {
    try {
      const authUrl = 'https://auth.app.wiz.io/oauth/token';
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: config.clientId,
          client_secret: config.clientSecret,
          audience: 'wiz-api',
        }),
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.access_token;
    } catch {
      return null;
    }
  }

  private async getIssues(endpoint: string, token: string): Promise<any[]> {
    const query = `query { issues(first: 100, filterBy: { status: [OPEN, IN_PROGRESS] }) { nodes { id severity status type createdAt control { name } entity { name type } } } }`;
    const response = await fetch(`${endpoint}/graphql`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.data?.issues?.nodes || [];
  }

  private async getVulnerabilities(_endpoint: string, _token: string) {
    // Would use Wiz GraphQL API for vulnerabilities
    return { total: 0, critical: 0, high: 0, exploitable: 0, fixAvailable: 0 };
  }

  private async getCloudResources(_endpoint: string, _token: string) {
    // Would use Wiz GraphQL API for cloud resources
    return { total: 0, byProvider: {}, byType: {} };
  }
}

