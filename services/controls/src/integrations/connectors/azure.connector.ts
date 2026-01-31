/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

export interface AzureConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  subscriptionId?: string;
}

export interface AzureSyncResult {
  securityCenter: {
    secureScore: number;
    recommendations: number;
    activeAlerts: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
  };
  policyCompliance: {
    compliantResources: number;
    nonCompliantResources: number;
    compliancePercentage: number;
    policies: Array<{ name: string; state: string; compliance: number }>;
  };
  identityProtection: {
    riskyUsers: number;
    riskySignIns: number;
    riskDetections: number;
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

  async testConnection(config: AzureConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.tenantId || !config.clientId || !config.clientSecret) {
      return { success: false, message: 'Tenant ID, Client ID, and Client Secret are required' };
    }

    try {
      const token = await this.getAccessToken(config);
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
    const token = await this.getAccessToken(config);
    
    if (!token) {
      throw new Error('Failed to authenticate with Azure');
    }

    // Collect data from Azure APIs
    const [securityCenter, policyCompliance, resources] = await Promise.all([
      this.getSecurityCenterData(token, config.subscriptionId).catch(e => {
        errors.push(`Security Center: ${e.message}`);
        return { secureScore: 0, recommendations: 0, activeAlerts: 0, highSeverity: 0, mediumSeverity: 0, lowSeverity: 0 };
      }),
      this.getPolicyCompliance(token, config.subscriptionId).catch(e => {
        errors.push(`Policy: ${e.message}`);
        return { compliantResources: 0, nonCompliantResources: 0, compliancePercentage: 0, policies: [] };
      }),
      this.getResources(token, config.subscriptionId).catch(e => {
        errors.push(`Resources: ${e.message}`);
        return { total: 0, byType: {}, byLocation: {} };
      }),
    ]);

    return {
      securityCenter,
      policyCompliance,
      identityProtection: { riskyUsers: 0, riskySignIns: 0, riskDetections: 0 },
      resources,
      keyVaults: { total: 0, withSoftDelete: 0, withPurgeProtection: 0 },
      storageAccounts: { total: 0, withHttpsOnly: 0, withEncryption: 0 },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private async getAccessToken(config: AzureConfig): Promise<string | null> {
    try {
      const response = await fetch(`${this.loginUrl}/${config.tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          scope: 'https://management.azure.com/.default',
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

  private async getSecurityCenterData(_token: string, _subscriptionId?: string) {
    // Simulated - would call Azure Security Center API
    return { secureScore: 0, recommendations: 0, activeAlerts: 0, highSeverity: 0, mediumSeverity: 0, lowSeverity: 0 };
  }

  private async getPolicyCompliance(_token: string, _subscriptionId?: string) {
    return { compliantResources: 0, nonCompliantResources: 0, compliancePercentage: 0, policies: [] };
  }

  private async getResources(_token: string, _subscriptionId?: string) {
    return { total: 0, byType: {}, byLocation: {} };
  }
}

