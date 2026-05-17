import { Injectable, Logger } from '@nestjs/common';

export interface IntuneConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

export interface IntuneSyncResult {
  devices: {
    total: number;
    compliant: number;
    // Strictly "noncompliant" devices. Was previously total-compliant which
    // also rolled up unknown/inGracePeriod/conflict/error states as if
    // they were failures.
    nonCompliant: number;
    // Devices whose compliance state is 'unknown' (not yet evaluated, no
    // recent check-in, etc.). Reported separately for honest accounting.
    unknownCompliance: number;
    byPlatform: Record<string, number>;
    byOwnership: Record<string, number>;
    managed: number;
    // Recently-enrolled count: devices whose enrolledDateTime is within
    // the last 30 days. Replaces the meaningless `total === enrolled` value.
    recentlyEnrolled: number;
    items: Array<{
      id: string;
      deviceName: string;
      platform: string;
      osVersion: string;
      complianceState: string;
      lastSyncDateTime: string;
      enrolledDateTime: string;
      isEncrypted: boolean;
    }>;
  };
  compliancePolicies: {
    total: number;
    assigned: number;
    // `policyType` is the odata type token (e.g. 'iosCompliancePolicy').
    // Previously misnamed as `platforms`.
    items: Array<{ id: string; name: string; policyType: string }>;
  };
  configurationPolicies: {
    total: number;
    deployed: number;
  };
  apps: {
    total: number;
  };
  security: {
    devicesWithoutEncryption: number;
    // iOS-only jailbreak detection. Android security-patch staleness is a
    // different signal and is not included here.
    iosJailbrokenDevices: number;
  };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class IntuneConnector {
  private readonly logger = new Logger(IntuneConnector.name);
  private readonly graphUrl = 'https://graph.microsoft.com/v1.0';

  async testConnection(config: IntuneConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.tenantId || !config.clientId || !config.clientSecret) {
      return { success: false, message: 'Tenant ID, Client ID, and Client Secret are required' };
    }

    try {
      const token = await this.getAccessToken(config);
      if (!token) {
        return { success: false, message: 'Authentication failed' };
      }

      const response = await fetch(`${this.graphUrl}/deviceManagement`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        return { success: false, message: `API error: ${response.status}` };
      }

      return {
        success: true,
        message: 'Connected to Microsoft Intune successfully',
        details: { tenantId: config.tenantId },
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async sync(config: IntuneConfig): Promise<IntuneSyncResult> {
    const errors: string[] = [];
    const token = await this.getAccessToken(config);

    if (!token) {
      throw new Error('Authentication failed');
    }

    const [devices, compliancePolicies, apps, configurationPolicies] = await Promise.all([
      this.getManagedDevices(token).catch(e => { errors.push(`Devices: ${e.message}`); return []; }),
      this.getCompliancePolicies(token).catch(e => { errors.push(`Policies: ${e.message}`); return []; }),
      this.getApps(token).catch(e => { errors.push(`Apps: ${e.message}`); return []; }),
      this.getConfigurationPolicies(token).catch(e => { errors.push(`ConfigPolicies: ${e.message}`); return []; }),
    ]);

    // Bucket platform/ownership with explicit 'unknown' fallback. The previous
    // code produced literal 'undefined' keys when the underlying field was
    // missing on a device record.
    const byPlatform: Record<string, number> = {};
    const byOwnership: Record<string, number> = {};
    devices.forEach((d: any) => {
      const platform = d.operatingSystem || 'unknown';
      byPlatform[platform] = (byPlatform[platform] || 0) + 1;
      const ownership = d.ownerType || 'unknown';
      byOwnership[ownership] = (byOwnership[ownership] || 0) + 1;
    });

    // Explicit filters rather than total-minus-compliant. complianceState
    // can be 'compliant', 'noncompliant', 'unknown', 'inGracePeriod',
    // 'conflict', 'error', or 'configManager'.
    const compliantDevices = devices.filter((d: any) => d.complianceState === 'compliant');
    const nonCompliant = devices.filter((d: any) => d.complianceState === 'noncompliant').length;
    const unknownCompliance = devices.filter((d: any) => d.complianceState === 'unknown').length;
    const encryptedDevices = devices.filter((d: any) => d.isEncrypted);

    // Recently-enrolled = enrolledDateTime within the last 30 days.
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentlyEnrolled = devices.filter((d: any) => {
      if (!d.enrolledDateTime) return false;
      const t = new Date(d.enrolledDateTime).getTime();
      return Number.isFinite(t) && t >= thirtyDaysAgo;
    }).length;

    return {
      devices: {
        total: devices.length,
        compliant: compliantDevices.length,
        nonCompliant,
        unknownCompliance,
        byPlatform,
        byOwnership,
        managed: devices.filter((d: any) => d.managementState === 'managed').length,
        recentlyEnrolled,
        items: devices.slice(0, 100).map((d: any) => ({
          id: d.id,
          deviceName: d.deviceName,
          platform: d.operatingSystem,
          osVersion: d.osVersion,
          complianceState: d.complianceState,
          lastSyncDateTime: d.lastSyncDateTime,
          enrolledDateTime: d.enrolledDateTime,
          isEncrypted: d.isEncrypted || false,
        })),
      },
      compliancePolicies: {
        total: compliancePolicies.length,
        assigned: compliancePolicies.filter((p: any) => p.assignments?.length > 0).length,
        // policyType is the odata type token (e.g. 'iosCompliancePolicy').
        // The previous field name 'platforms' was misleading because the
        // value is a policy class, not a platform list.
        items: compliancePolicies.slice(0, 20).map((p: any) => ({
          id: p.id,
          name: p.displayName,
          policyType: p['@odata.type']?.replace('#microsoft.graph.', '') || '',
        })),
      },
      configurationPolicies: {
        total: configurationPolicies.length,
        deployed: configurationPolicies.filter((p: any) => Array.isArray(p.assignments) && p.assignments.length > 0).length,
      },
      apps: {
        total: apps.length,
      },
      security: {
        devicesWithoutEncryption: devices.length - encryptedDevices.length,
        // jailBroken is iOS-only. Renamed to make the cross-platform
        // implication explicit. Android equivalent (security patch age)
        // is intentionally out of scope here.
        iosJailbrokenDevices: devices.filter((d: any) => d.jailBroken === 'True').length,
      },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private async getAccessToken(config: IntuneConfig): Promise<string | null> {
    try {
      const response = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          scope: 'https://graph.microsoft.com/.default',
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

  private async getManagedDevices(token: string): Promise<any[]> {
    const DEVICES_CAP = 10000;
    const results: any[] = [];
    let url: string | null = `${this.graphUrl}/deviceManagement/managedDevices?$top=999`;
    while (url && results.length < DEVICES_CAP) {
      const response: Response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`Failed: ${response.status}`);
      const data: any = await response.json();
      results.push(...(data.value || []));
      url = data['@odata.nextLink'] || null;
    }
    return results;
  }

  private async getCompliancePolicies(token: string): Promise<any[]> {
    const POLICIES_CAP = 5000;
    const results: any[] = [];
    let url: string | null = `${this.graphUrl}/deviceManagement/deviceCompliancePolicies?$expand=assignments`;
    while (url && results.length < POLICIES_CAP) {
      const response: Response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`Failed: ${response.status}`);
      const data: any = await response.json();
      results.push(...(data.value || []));
      url = data['@odata.nextLink'] || null;
    }
    return results;
  }

  private async getApps(token: string): Promise<any[]> {
    const APPS_CAP = 5000;
    const results: any[] = [];
    let url: string | null = `${this.graphUrl}/deviceAppManagement/mobileApps?$top=100`;
    while (url && results.length < APPS_CAP) {
      const response: Response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) return results;
      const data: any = await response.json();
      results.push(...(data.value || []));
      url = data['@odata.nextLink'] || null;
    }
    return results;
  }

  private async getConfigurationPolicies(token: string): Promise<any[]> {
    // Settings catalog configuration policies (Endpoint Manager).
    const CONFIG_CAP = 5000;
    const results: any[] = [];
    let url: string | null =
      `${this.graphUrl}/deviceManagement/configurationPolicies?$expand=assignments&$top=500`;
    while (url && results.length < CONFIG_CAP) {
      const response: Response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`Failed: ${response.status}`);
      const data: any = await response.json();
      results.push(...(data.value || []));
      url = data['@odata.nextLink'] || null;
    }
    return results;
  }
}
