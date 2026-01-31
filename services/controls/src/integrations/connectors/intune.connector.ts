/* eslint-disable @typescript-eslint/no-explicit-any */
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
    nonCompliant: number;
    byPlatform: Record<string, number>;
    byOwnership: Record<string, number>;
    managed: number;
    enrolled: number;
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
    items: Array<{ id: string; name: string; platforms: string[] }>;
  };
  configurationPolicies: {
    total: number;
    deployed: number;
  };
  apps: {
    total: number;
    required: number;
    available: number;
    uninstall: number;
  };
  security: {
    devicesWithoutEncryption: number;
    devicesWithoutPasscode: number;
    jailbrokenDevices: number;
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

    const [devices, compliancePolicies, apps] = await Promise.all([
      this.getManagedDevices(token).catch(e => { errors.push(`Devices: ${e.message}`); return []; }),
      this.getCompliancePolicies(token).catch(e => { errors.push(`Policies: ${e.message}`); return []; }),
      this.getApps(token).catch(e => { errors.push(`Apps: ${e.message}`); return []; }),
    ]);

    const byPlatform: Record<string, number> = {};
    const byOwnership: Record<string, number> = {};
    devices.forEach((d: any) => {
      byPlatform[d.operatingSystem] = (byPlatform[d.operatingSystem] || 0) + 1;
      byOwnership[d.ownerType] = (byOwnership[d.ownerType] || 0) + 1;
    });

    const compliantDevices = devices.filter((d: any) => d.complianceState === 'compliant');
    const encryptedDevices = devices.filter((d: any) => d.isEncrypted);

    return {
      devices: {
        total: devices.length,
        compliant: compliantDevices.length,
        nonCompliant: devices.length - compliantDevices.length,
        byPlatform,
        byOwnership,
        managed: devices.filter((d: any) => d.managementState === 'managed').length,
        enrolled: devices.length,
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
        items: compliancePolicies.slice(0, 20).map((p: any) => ({
          id: p.id,
          name: p.displayName,
          platforms: [p['@odata.type']?.replace('#microsoft.graph.', '') || ''],
        })),
      },
      configurationPolicies: { total: 0, deployed: 0 },
      apps: {
        total: apps.length,
        required: apps.filter((a: any) => a.installStateByDevice?.required > 0).length,
        available: apps.filter((a: any) => a.installStateByDevice?.available > 0).length,
        uninstall: 0,
      },
      security: {
        devicesWithoutEncryption: devices.length - encryptedDevices.length,
        devicesWithoutPasscode: devices.filter((d: any) => !d.isSupervised && !d.deviceEnrollmentType?.includes('mdm')).length,
        jailbrokenDevices: devices.filter((d: any) => d.jailBroken === 'True').length,
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
    const response = await fetch(`${this.graphUrl}/deviceManagement/managedDevices?$top=999`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.value || [];
  }

  private async getCompliancePolicies(token: string): Promise<any[]> {
    const response = await fetch(`${this.graphUrl}/deviceManagement/deviceCompliancePolicies?$expand=assignments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.value || [];
  }

  private async getApps(token: string): Promise<any[]> {
    const response = await fetch(`${this.graphUrl}/deviceAppManagement/mobileApps?$top=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.value || [];
  }
}

