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
    // null indicates Salesforce's User SObject did not expose MFA status to
    // the connector's credentials. Per PATTERN.md rule 7, hardcoding 0 here
    // would be a misleading compliance claim.
    withMfa: number | null;
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
    // Sourced from Tooling API SecuritySettings metadata.
    passwordPolicies: {
      minimumPasswordLength: number | null;
      complexityRequired: string | null;
      expirationDays: number | null;
      maxLoginAttempts: number | null;
    } | null;
    sessionSettings: any;
    // null distinguishes "fetch failed / SObject not exposed" from
    // "tenant truly has zero IP ranges". Per PATTERN.md we must not
    // default unknown security state to 0.
    loginIpRanges: number | null;
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

    const [users, profiles, auditTrail, organization, permissionSets, securitySettings, ipRanges, mfaInfo] = await Promise.all([
      this.getUsers(auth).catch(e => { errors.push(`Users: ${e.message}`); return []; }),
      this.getProfiles(auth).catch(e => { errors.push(`Profiles: ${e.message}`); return []; }),
      this.getSetupAuditTrail(auth).catch(e => { errors.push(`Audit: ${e.message}`); return []; }),
      this.getOrganization(auth).catch(e => { errors.push(`Org: ${e.message}`); return null; }),
      this.getPermissionSets(auth).catch(e => { errors.push(`PermissionSets: ${e.message}`); return []; }),
      this.getSecuritySettings(auth).catch(e => { errors.push(`SecuritySettings: ${e.message}`); return null; }),
      this.getLoginIpRanges(auth).catch(e => { errors.push(`IpRanges: ${e.message}`); return null; }),
      this.getMfaInfo(auth).catch(e => { errors.push(`Mfa: ${e.message}`); return null; }),
    ]);

    const activeUsers = users.filter((u: any) => u.IsActive);
    const byProfile: Record<string, number> = {};
    users.forEach((u: any) => {
      const profile = u.Profile?.Name || 'Unknown';
      byProfile[profile] = (byProfile[profile] || 0) + 1;
    });

    return {
      organization: {
        name: organization?.Name || '',
        instanceUrl: auth.instance_url,
        edition: organization?.OrganizationType || '',
      },
      users: {
        total: users.length,
        active: activeUsers.length,
        inactive: users.length - activeUsers.length,
        byProfile,
        // Salesforce no longer exposes a single boolean MFA field on User.
        // Use TwoFactorMethodsInfo distinct user count when available.
        withMfa: mfaInfo,
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
      permissionSets: { total: permissionSets.length },
      securityHealth: {
        passwordPolicies: securitySettings
          ? {
              minimumPasswordLength: securitySettings.MinimumPasswordLength ?? null,
              complexityRequired: securitySettings.ComplexityRequired ?? null,
              expirationDays: securitySettings.ExpirationDays ?? null,
              maxLoginAttempts: securitySettings.MaxLoginAttempts ?? null,
            }
          : null,
        sessionSettings: null,
        // Pass-through: null if the IP-range query failed. Do NOT collapse
        // to 0 — that conflates unknown with empty allowlist.
        loginIpRanges: ipRanges,
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

  private async getOrganization(auth: any): Promise<any> {
    const response = await fetch(
      `${auth.instance_url}/services/data/v58.0/query?q=SELECT+Id,Name,OrganizationType,InstanceName+FROM+Organization`,
      { headers: { Authorization: `Bearer ${auth.access_token}` } }
    );
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.records?.[0] || null;
  }

  private async getPermissionSets(auth: any): Promise<any[]> {
    const response = await fetch(
      `${auth.instance_url}/services/data/v58.0/query?q=SELECT+Id,Name+FROM+PermissionSet`,
      { headers: { Authorization: `Bearer ${auth.access_token}` } }
    );
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.records || [];
  }

  private async getSecuritySettings(auth: any): Promise<any> {
    // SecuritySettings is metadata, exposed through the Tooling API.
    const response = await fetch(
      `${auth.instance_url}/services/data/v58.0/tooling/query?q=SELECT+MinimumPasswordLength,ComplexityRequired,ExpirationDays,MaxLoginAttempts+FROM+SecuritySettings`,
      { headers: { Authorization: `Bearer ${auth.access_token}` } }
    );
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.records?.[0] || null;
  }

  private async getLoginIpRanges(auth: any): Promise<number | null> {
    // Profile.LoginIpRanges is a child relationship; we count the IpRange
    // entries directly. Returns null when the SObject isn't accessible —
    // the catch in sync() also maps thrown errors to null so consumers
    // can distinguish "unknown" from "zero".
    const response = await fetch(
      `${auth.instance_url}/services/data/v58.0/tooling/query?q=SELECT+Id+FROM+IpRange`,
      { headers: { Authorization: `Bearer ${auth.access_token}` } }
    );
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    if (typeof data.totalSize === 'number') return data.totalSize;
    return Array.isArray(data.records) ? data.records.length : null;
  }

  private async getMfaInfo(auth: any): Promise<number | null> {
    // TwoFactorMethodsInfo holds one record per registered MFA method per user.
    // Count distinct users with at least one registered method.
    const response = await fetch(
      `${auth.instance_url}/services/data/v58.0/query?q=SELECT+UserId+FROM+TwoFactorMethodsInfo`,
      { headers: { Authorization: `Bearer ${auth.access_token}` } }
    );
    if (!response.ok) {
      // SObject not exposed to caller — return null so consumers know MFA was
      // not assessed rather than mistakenly treating zero as "no MFA".
      return null;
    }
    const data = await response.json();
    const records: any[] = data.records || [];
    return new Set(records.map((r: any) => r.UserId)).size;
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
