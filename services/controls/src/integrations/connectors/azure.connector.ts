import { Injectable, Logger } from '@nestjs/common';

export interface AzureConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  subscriptionId?: string;
}

export interface AzureSyncResult {
  securityCenter: {
    // null when secure score data is unavailable
    secureScore: number | null;
    activeAlerts: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
  };
  policyCompliance: {
    compliantResources: number;
    nonCompliantResources: number;
    // null when no compliance data was available
    compliancePercentage: number | null;
    policies: Array<{ name: string; state: string; compliance: number }>;
  };
  identityProtection: {
    // null when a Microsoft Graph token could not be acquired
    riskyUsers: number | null;
    riskySignIns: number | null;
    riskDetections: number | null;
  };
  resources: {
    total: number;
    byType: Record<string, number>;
    byLocation: Record<string, number>;
  };
  keyVaults: {
    total: number;
    withSoftDelete: number;
    withPurgeProtection: number;
  };
  storageAccounts: {
    total: number;
    withHttpsOnly: number;
    withEncryption: number;
  };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class AzureConnector {
  private readonly logger = new Logger(AzureConnector.name);
  private readonly loginUrl = 'https://login.microsoftonline.com';
  private readonly managementUrl = 'https://management.azure.com';
  private readonly graphUrl = 'https://graph.microsoft.com/v1.0';

  async testConnection(
    config: AzureConfig
  ): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.tenantId || !config.clientId || !config.clientSecret) {
      return { success: false, message: 'Tenant ID, Client ID, and Client Secret are required' };
    }

    try {
      const token = await this.getAccessToken(config, 'https://management.azure.com/.default');
      if (!token) {
        return { success: false, message: 'Failed to authenticate with Azure' };
      }

      return {
        success: true,
        message: 'Connected to Azure successfully',
        details: { tenantId: config.tenantId },
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  async sync(config: AzureConfig): Promise<AzureSyncResult> {
    const errors: string[] = [];
    const mgmtToken = await this.getAccessToken(config, 'https://management.azure.com/.default');

    if (!mgmtToken) {
      throw new Error('Failed to authenticate with Azure');
    }

    // Try to get a Microsoft Graph token; if that fails, identityProtection
    // fields are returned as null instead of fabricated zeros (PATTERN rule 7/8).
    const graphToken = await this.getAccessToken(
      config,
      'https://graph.microsoft.com/.default'
    ).catch(() => null);

    if (!config.subscriptionId) {
      errors.push('subscriptionId required for resource/policy/security/keyvault/storage data');
    }

    // Collect data from Azure APIs in parallel
    const [securityCenter, policyCompliance, resources, identityProtection, keyVaults, storageAccounts] =
      await Promise.all([
        this.getSecurityCenterData(mgmtToken, config.subscriptionId).catch((e) => {
          errors.push(`Security Center: ${e.message}`);
          return {
            secureScore: null,
            activeAlerts: 0,
            highSeverity: 0,
            mediumSeverity: 0,
            lowSeverity: 0,
          };
        }),
        this.getPolicyCompliance(mgmtToken, config.subscriptionId).catch((e) => {
          errors.push(`Policy: ${e.message}`);
          return {
            compliantResources: 0,
            nonCompliantResources: 0,
            compliancePercentage: null,
            policies: [],
          };
        }),
        this.getResources(mgmtToken, config.subscriptionId).catch((e) => {
          errors.push(`Resources: ${e.message}`);
          return { total: 0, byType: {}, byLocation: {} };
        }),
        this.getIdentityProtection(graphToken).catch((e) => {
          errors.push(`Identity Protection: ${e.message}`);
          return { riskyUsers: null, riskySignIns: null, riskDetections: null };
        }),
        this.getKeyVaults(mgmtToken, config.subscriptionId).catch((e) => {
          errors.push(`Key Vaults: ${e.message}`);
          return { total: 0, withSoftDelete: 0, withPurgeProtection: 0 };
        }),
        this.getStorageAccounts(mgmtToken, config.subscriptionId).catch((e) => {
          errors.push(`Storage Accounts: ${e.message}`);
          return { total: 0, withHttpsOnly: 0, withEncryption: 0 };
        }),
      ]);

    return {
      securityCenter,
      policyCompliance,
      identityProtection,
      resources,
      keyVaults,
      storageAccounts,
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private async getAccessToken(config: AzureConfig, scope: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.loginUrl}/${config.tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          scope,
          grant_type: 'client_credentials',
        }),
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.access_token;
    } catch {
      return null;
    }
  }

  private async getSecurityCenterData(token: string, subscriptionId?: string) {
    if (!subscriptionId) {
      return {
        secureScore: null as number | null,
        activeAlerts: 0,
        highSeverity: 0,
        mediumSeverity: 0,
        lowSeverity: 0,
      };
    }

    const [scoreResp, alertsResp] = await Promise.all([
      fetch(
        `${this.managementUrl}/subscriptions/${subscriptionId}/providers/Microsoft.Security/secureScores/ascScore?api-version=2020-01-01`,
        { headers: { Authorization: `Bearer ${token}` } }
      ),
      fetch(
        `${this.managementUrl}/subscriptions/${subscriptionId}/providers/Microsoft.Security/alerts?api-version=2022-01-01`,
        { headers: { Authorization: `Bearer ${token}` } }
      ),
    ]);

    // Compute secureScore as a percentage with one decimal. Return null when
    // current/max are missing or invalid rather than fabricating zero or the max.
    let secureScore: number | null = null;
    if (scoreResp.ok) {
      const scoreData = await scoreResp.json();
      const current = scoreData?.properties?.score?.current;
      const max = scoreData?.properties?.score?.max;
      secureScore =
        typeof current === 'number' && typeof max === 'number' && max > 0
          ? Math.round((current / max) * 1000) / 10
          : null;
    }

    let activeAlerts = 0;
    let highSeverity = 0;
    let mediumSeverity = 0;
    let lowSeverity = 0;
    if (alertsResp.ok) {
      const alertsData = await alertsResp.json();
      const alerts: any[] = alertsData.value || [];
      const active = alerts.filter((a) => {
        const status = (a.properties?.status || '').toLowerCase();
        return status === 'active' || status === 'new' || status === 'inprogress';
      });
      activeAlerts = active.length;
      highSeverity = active.filter(
        (a) => (a.properties?.severity || '').toLowerCase() === 'high'
      ).length;
      mediumSeverity = active.filter(
        (a) => (a.properties?.severity || '').toLowerCase() === 'medium'
      ).length;
      lowSeverity = active.filter(
        (a) => (a.properties?.severity || '').toLowerCase() === 'low'
      ).length;
    } else if (alertsResp.status !== 404) {
      throw new Error(`alerts: ${alertsResp.status}`);
    }

    return {
      secureScore,
      activeAlerts,
      highSeverity,
      mediumSeverity,
      lowSeverity,
    };
  }

  private async getPolicyCompliance(token: string, subscriptionId?: string) {
    if (!subscriptionId) {
      return {
        compliantResources: 0,
        nonCompliantResources: 0,
        compliancePercentage: null as number | null,
        policies: [],
      };
    }
    const response = await fetch(
      `${this.managementUrl}/subscriptions/${subscriptionId}/providers/Microsoft.PolicyInsights/policyStates/latest/summarize?api-version=2019-10-01`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      }
    );
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    const summary = data.value?.[0]?.results || {};
    const nonCompliant = summary.nonCompliantResources || 0;
    const totalResources =
      summary.resourceDetails?.reduce((sum: number, r: any) => sum + (r.count || 0), 0) || 0;
    const compliant = Math.max(0, totalResources - nonCompliant);
    const totalForPct = compliant + nonCompliant;
    // Return null when no data is available rather than fabricating 0%.
    const compliancePercentage: number | null =
      totalForPct > 0 ? (compliant / totalForPct) * 100 : null;

    const policyAssignments: any[] = data.value?.[0]?.policyAssignments || [];
    const policies = policyAssignments.slice(0, 50).map((p) => {
      const nc = p.results?.nonCompliantResources || 0;
      const totalP =
        p.results?.resourceDetails?.reduce((s: number, r: any) => s + (r.count || 0), 0) || 0;
      const cp = Math.max(0, totalP - nc);
      const cpct = totalP > 0 ? (cp / totalP) * 100 : 0;
      return {
        name: p.policyAssignmentId?.split('/').pop() || '',
        state: nc > 0 ? 'NonCompliant' : 'Compliant',
        compliance: cpct,
      };
    });

    return {
      compliantResources: compliant,
      nonCompliantResources: nonCompliant,
      compliancePercentage,
      policies,
    };
  }

  private async getResources(token: string, subscriptionId?: string) {
    if (!subscriptionId) {
      return { total: 0, byType: {}, byLocation: {} };
    }
    const byType: Record<string, number> = {};
    const byLocation: Record<string, number> = {};
    let total = 0;
    let url: string | null = `${this.managementUrl}/subscriptions/${subscriptionId}/resources?api-version=2021-04-01&$top=1000`;

    // Cap iterations to avoid runaway pagination
    let iterations = 0;
    while (url && iterations < 10) {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`Failed: ${response.status}`);
      const data = await response.json();
      const items: any[] = data.value || [];
      for (const item of items) {
        total++;
        const t = item.type || 'unknown';
        byType[t] = (byType[t] || 0) + 1;
        const loc = item.location || 'unknown';
        byLocation[loc] = (byLocation[loc] || 0) + 1;
      }
      url = data.nextLink || null;
      iterations++;
    }

    return { total, byType, byLocation };
  }

  private async getIdentityProtection(graphToken: string | null) {
    if (!graphToken) {
      return { riskyUsers: null, riskySignIns: null, riskDetections: null };
    }
    const headers = { Authorization: `Bearer ${graphToken}` };
    const [riskyUsersResp, riskySignInsResp, riskDetectionsResp] = await Promise.all([
      fetch(`${this.graphUrl}/identityProtection/riskyUsers`, { headers }),
      fetch(`${this.graphUrl}/identityProtection/riskDetections?$filter=activity eq 'signin'`, {
        headers,
      }),
      fetch(`${this.graphUrl}/identityProtection/riskDetections`, { headers }),
    ]);

    const safeCount = async (resp: Response): Promise<number | null> => {
      if (!resp.ok) return null;
      const data = await resp.json();
      return (data.value || []).length;
    };

    return {
      riskyUsers: await safeCount(riskyUsersResp),
      riskySignIns: await safeCount(riskySignInsResp),
      riskDetections: await safeCount(riskDetectionsResp),
    };
  }

  private async getKeyVaults(token: string, subscriptionId?: string) {
    if (!subscriptionId) {
      return { total: 0, withSoftDelete: 0, withPurgeProtection: 0 };
    }
    // ARM list responses paginate via nextLink. Cap to avoid runaway iteration.
    const vaults: any[] = [];
    let url: string | null = `${this.managementUrl}/subscriptions/${subscriptionId}/providers/Microsoft.KeyVault/vaults?api-version=2022-07-01`;
    let iterations = 0;
    while (url && iterations < 10) {
      const response: Response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Failed: ${response.status}`);
      const data: any = await response.json();
      vaults.push(...(data.value || []));
      url = data.nextLink || null;
      iterations++;
    }
    return {
      total: vaults.length,
      withSoftDelete: vaults.filter((v) => v.properties?.enableSoftDelete).length,
      withPurgeProtection: vaults.filter((v) => v.properties?.enablePurgeProtection).length,
    };
  }

  private async getStorageAccounts(token: string, subscriptionId?: string) {
    if (!subscriptionId) {
      return { total: 0, withHttpsOnly: 0, withEncryption: 0 };
    }
    // ARM list responses paginate via nextLink. Cap to avoid runaway iteration.
    const accounts: any[] = [];
    let url: string | null = `${this.managementUrl}/subscriptions/${subscriptionId}/providers/Microsoft.Storage/storageAccounts?api-version=2022-09-01`;
    let iterations = 0;
    while (url && iterations < 10) {
      const response: Response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Failed: ${response.status}`);
      const data: any = await response.json();
      accounts.push(...(data.value || []));
      url = data.nextLink || null;
      iterations++;
    }
    return {
      total: accounts.length,
      withHttpsOnly: accounts.filter((a) => a.properties?.supportsHttpsTrafficOnly).length,
      withEncryption: accounts.filter((a) => a.properties?.encryption?.services?.blob?.enabled)
        .length,
    };
  }
}
