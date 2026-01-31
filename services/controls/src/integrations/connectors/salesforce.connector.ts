/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

export interface SalesforceConfig {
  instanceUrl: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  securityToken?: string;
}

export interface SalesforceSyncResult {
  organization: {
    name: string;
    instanceUrl: string;
    edition: string;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
    byProfile: Record<string, number>;
    withMfa: number;
    items: Array<{
      id: string;
      name: string;
      email: string;
      profile: string;
      isActive: boolean;
      lastLogin: string;
    }>;
  };
  profiles: {
    total: number;
    withApiAccess: number;
    withModifyAll: number;
  };
  permissionSets: {
    total: number;
  };
  securityHealth: {
    passwordPolicies: any;
    sessionSettings: any;
    loginIpRanges: number;
  };
  setupAuditTrail: {
    recentChanges: number;
    items: Array<{
      action: string;
      section: string;
      createdBy: string;
      createdDate: string;
    }>;
  };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class SalesforceConnector {
  private readonly logger = new Logger(SalesforceConnector.name);

  async testConnection(config: SalesforceConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.instanceUrl || !config.clientId || !config.clientSecret || !config.username || !config.password) {
      return { success: false, message: 'Instance URL, Client ID, Client Secret, Username, and Password are required' };
    }

    try {
      const auth = await this.authenticate(config);
      if (!auth) {
        return { success: false, message: 'Authentication failed' };
      }

      return {
        success: true,
        message: `Connected to Salesforce instance`,
        details: { instanceUrl: auth.instance_url },
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  async sync(config: SalesforceConfig): Promise<SalesforceSyncResult> {
    const errors: string[] = [];
    const auth = await this.authenticate(config);

    if (!auth) {
      throw new Error('Authentication failed');
    }

    const [users, profiles, auditTrail] = await Promise.all([
      this.getUsers(auth).catch(e => { errors.push(`Users: ${e.message}`); return []; }),
      this.getProfiles(auth).catch(e => { errors.push(`Profiles: ${e.message}`); return []; }),
      this.getSetupAuditTrail(auth).catch(e => { errors.push(`Audit: ${e.message}`); return []; }),
    ]);

    const activeUsers = users.filter((u: any) => u.IsActive);
    const byProfile: Record<string, number> = {};
    users.forEach((u: any) => {
      const profile = u.Profile?.Name || 'Unknown';
      byProfile[profile] = (byProfile[profile] || 0) + 1;
    });

    return {
      organization: {
        name: '',
        instanceUrl: auth.instance_url,
        edition: '',
      },
      users: {
        total: users.length,
        active: activeUsers.length,
        inactive: users.length - activeUsers.length,
        byProfile,
        withMfa: 0,
        items: users.slice(0, 100).map((u: any) => ({
          id: u.Id,
          name: u.Name,
          email: u.Email,
          profile: u.Profile?.Name || '',
          isActive: u.IsActive,
          lastLogin: u.LastLoginDate || '',
        })),
      },
      profiles: {
        total: profiles.length,
        withApiAccess: profiles.filter((p: any) => p.PermissionsApiEnabled).length,
        withModifyAll: profiles.filter((p: any) => p.PermissionsModifyAllData).length,
      },
      permissionSets: { total: 0 },
      securityHealth: {
        passwordPolicies: null,
        sessionSettings: null,
        loginIpRanges: 0,
      },
      setupAuditTrail: {
        recentChanges: auditTrail.length,
        items: auditTrail.slice(0, 50).map((a: any) => ({
          action: a.Action,
          section: a.Section,
          createdBy: a.CreatedBy?.Name || '',
          createdDate: a.CreatedDate,
        })),
      },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private async authenticate(config: SalesforceConfig): Promise<any> {
    const loginUrl = config.instanceUrl.includes('sandbox') 
      ? 'https://test.salesforce.com/services/oauth2/token'
      : 'https://login.salesforce.com/services/oauth2/token';

    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        username: config.username,
        password: config.password + (config.securityToken || ''),
      }),
    });

    if (!response.ok) return null;
    return response.json();
  }

  private async getUsers(auth: any): Promise<any[]> {
    const response = await fetch(
      `${auth.instance_url}/services/data/v58.0/query?q=SELECT+Id,Name,Email,IsActive,Profile.Name,LastLoginDate+FROM+User`,
      { headers: { Authorization: `Bearer ${auth.access_token}` } }
    );
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.records || [];
  }

  private async getProfiles(auth: any): Promise<any[]> {
    const response = await fetch(
      `${auth.instance_url}/services/data/v58.0/query?q=SELECT+Id,Name,PermissionsApiEnabled,PermissionsModifyAllData+FROM+Profile`,
      { headers: { Authorization: `Bearer ${auth.access_token}` } }
    );
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.records || [];
  }

  private async getSetupAuditTrail(auth: any): Promise<any[]> {
    const response = await fetch(
      `${auth.instance_url}/services/data/v58.0/query?q=SELECT+Id,Action,Section,CreatedBy.Name,CreatedDate+FROM+SetupAuditTrail+ORDER+BY+CreatedDate+DESC+LIMIT+100`,
      { headers: { Authorization: `Bearer ${auth.access_token}` } }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.records || [];
  }
}

