import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { safeFetch, SSRFProtectionError } from '@gigachad-grc/shared';

export interface WizConfig {
  clientId: string;
  clientSecret: string;
  apiEndpoint?: string; // e.g., https://api.us1.app.wiz.io
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

  async testConnection(
    config: WizConfig
  ): Promise<{ success: boolean; message: string; details?: any }> {
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
      if (error instanceof BadRequestException) {
        throw error;
      }
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
    const [issues, vulnerabilities, resources, frameworks, entitlements, containers] =
      await Promise.all([
        this.getIssues(endpoint, token).catch((e) => {
          errors.push(`Issues: ${e.message}`);
          return [];
        }),
        this.getVulnerabilities(endpoint, token).catch((e) => {
          errors.push(`Vulns: ${e.message}`);
          return { total: 0, critical: 0, high: 0, exploitable: 0, fixAvailable: 0 };
        }),
        this.getCloudResources(endpoint, token).catch((e) => {
          errors.push(`Resources: ${e.message}`);
          return { total: 0, byProvider: {}, byType: {} };
        }),
        this.getSecurityFrameworks(endpoint, token).catch((e) => {
          errors.push(`Frameworks: ${e.message}`);
          return { compliance: [] };
        }),
        this.getCloudEntitlements(endpoint, token).catch((e) => {
          errors.push(`Entitlements: ${e.message}`);
          return { excessivePermissions: 0, unusedIdentities: 0 };
        }),
        this.getContainers(endpoint, token).catch((e) => {
          errors.push(`Containers: ${e.message}`);
          return { total: 0, vulnerable: 0 };
        }),
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
      securityFrameworks: frameworks,
      cloudEntitlements: entitlements,
      containers,
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private async ssrfFetch(url: string, init?: RequestInit): Promise<Response> {
    try {
      return await safeFetch(url, init);
    } catch (error) {
      if (error instanceof SSRFProtectionError) {
        throw new BadRequestException(`SSRF protection blocked: ${error.message}`);
      }
      throw error;
    }
  }

  private async getAccessToken(config: WizConfig): Promise<string | null> {
    try {
      const authUrl = 'https://auth.app.wiz.io/oauth/token';
      const response = await this.ssrfFetch(authUrl, {
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

  private async graphqlQuery(endpoint: string, token: string, query: string): Promise<any> {
    const response = await this.ssrfFetch(`${endpoint}/graphql`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    if (data.errors && data.errors.length > 0) {
      throw new Error(data.errors[0].message || 'GraphQL error');
    }
    return data.data;
  }

  private async getIssues(endpoint: string, token: string): Promise<any[]> {
    const query = `query { issues(first: 100, filterBy: { status: [OPEN, IN_PROGRESS] }) { nodes { id severity status type createdAt control { name } entity { name type } } } }`;
    const data = await this.graphqlQuery(endpoint, token, query);
    return data?.issues?.nodes || [];
  }

  private async getVulnerabilities(endpoint: string, token: string) {
    const query = `query { vulnerabilityFindings(first: 500) { nodes { id severity hasExploit hasFix } } }`;
    const data = await this.graphqlQuery(endpoint, token, query);
    const nodes: any[] = data?.vulnerabilityFindings?.nodes || [];
    return {
      total: nodes.length,
      critical: nodes.filter((n) => n.severity === 'CRITICAL').length,
      high: nodes.filter((n) => n.severity === 'HIGH').length,
      exploitable: nodes.filter((n) => n.hasExploit).length,
      fixAvailable: nodes.filter((n) => n.hasFix).length,
    };
  }

  private async getCloudResources(endpoint: string, token: string) {
    const query = `query { cloudResources(first: 500) { nodes { id type cloudProvider { name } } } }`;
    const data = await this.graphqlQuery(endpoint, token, query);
    const nodes: any[] = data?.cloudResources?.nodes || [];
    const byProvider: Record<string, number> = {};
    const byType: Record<string, number> = {};
    for (const node of nodes) {
      const provider = node.cloudProvider?.name || 'unknown';
      byProvider[provider] = (byProvider[provider] || 0) + 1;
      const type = node.type || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    }
    return {
      total: nodes.length,
      byProvider,
      byType,
    };
  }

  private async getSecurityFrameworks(endpoint: string, token: string) {
    const query = `query { complianceFrameworks { nodes { name passedControls failedControls } } }`;
    const data = await this.graphqlQuery(endpoint, token, query);
    const nodes: any[] = data?.complianceFrameworks?.nodes || [];
    return {
      compliance: nodes.map((n) => {
        const passed = Number(n.passedControls) || 0;
        const failed = Number(n.failedControls) || 0;
        const total = passed + failed;
        return {
          name: n.name || '',
          score: total > 0 ? (passed / total) * 100 : 0,
          passedControls: passed,
          failedControls: failed,
        };
      }),
    };
  }

  private async getCloudEntitlements(endpoint: string, token: string) {
    const query = `query { cloudEntitlementFindings(first: 100) { nodes { type principal { id type } } } }`;
    const data = await this.graphqlQuery(endpoint, token, query);
    const nodes: any[] = data?.cloudEntitlementFindings?.nodes || [];
    const excessive = nodes.filter(
      (n) => typeof n.type === 'string' && /EXCESSIVE|OVERPERMISSIVE|EXCESS/i.test(n.type)
    ).length;
    const unused = nodes.filter(
      (n) => typeof n.type === 'string' && /UNUSED|INACTIVE/i.test(n.type)
    ).length;
    return {
      excessivePermissions: excessive,
      unusedIdentities: unused,
    };
  }

  private async getContainers(endpoint: string, token: string) {
    // Best-effort: Wiz container API varies by tenant
    const query = `query { graphSearch(query: { type: [CONTAINER] }) { nodes { id vulnerabilities } } }`;
    const data = await this.graphqlQuery(endpoint, token, query);
    const nodes: any[] = data?.graphSearch?.nodes || [];
    return {
      total: nodes.length,
      vulnerable: nodes.filter((n) => {
        const v = n.vulnerabilities;
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === 'number') return v > 0;
        return false;
      }).length,
    };
  }
}
