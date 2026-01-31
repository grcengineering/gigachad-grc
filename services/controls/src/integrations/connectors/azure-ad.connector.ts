/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

export interface AzureADConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

export interface AzureADSyncResult {
  users: {
    total: number;
    enabled: number;
    disabled: number;
    guests: number;
    admins: number;
    withMfa: number;
    withoutMfa: number;
    items: Array<{
      id: string;
      displayName: string;
      email: string;
      accountEnabled: boolean;
      userType: string;
      mfaRegistered: boolean;
      lastSignIn: string;
    }>;
  };
  groups: {
    total: number;
    securityGroups: number;
    microsoft365Groups: number;
    dynamicGroups: number;
  };
  applications: {
    total: number;
    enterpriseApps: number;
    appRegistrations: number;
    withExpiredCredentials: number;
  };
  conditionalAccess: {
    policies: number;
    enabled: number;
    reportOnly: number;
    mfaRequired: number;
  };
  signInLogs: {
    total: number;
    successful: number;
    failed: number;
    riskySignIns: number;
    fromUnknownLocations: number;
  };
  directoryRoles: {
    globalAdmins: number;
    privilegedRoles: number;
  };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class AzureADConnector {
  private readonly logger = new Logger(AzureADConnector.name);
  private readonly graphUrl = 'https://graph.microsoft.com/v1.0';

  async testConnection(config: AzureADConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.tenantId || !config.clientId || !config.clientSecret) {
      return { success: false, message: 'Tenant ID, Client ID, and Client Secret are required' };
    }

    try {
      const token = await this.getAccessToken(config);
      if (!token) {
        return { success: false, message: 'Failed to authenticate with Azure AD' };
      }

      const orgResponse = await fetch(`${this.graphUrl}/organization`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!orgResponse.ok) {
        return { success: false, message: 'Failed to access Azure AD organization' };
      }

      const org = await orgResponse.json();
      return {
        success: true,
        message: `Connected to Azure AD: ${org.value?.[0]?.displayName || config.tenantId}`,
        details: { tenantId: config.tenantId, organization: org.value?.[0]?.displayName },
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  async sync(config: AzureADConfig): Promise<AzureADSyncResult> {
    const errors: string[] = [];
    const token = await this.getAccessToken(config);

    if (!token) {
      throw new Error('Failed to authenticate with Azure AD');
    }

    const [users, groups, apps, conditionalAccess, signIns] = await Promise.all([
      this.getUsers(token).catch(e => { errors.push(`Users: ${e.message}`); return []; }),
      this.getGroups(token).catch(e => { errors.push(`Groups: ${e.message}`); return []; }),
      this.getApplications(token).catch(e => { errors.push(`Apps: ${e.message}`); return { enterprise: [], registrations: [] }; }),
      this.getConditionalAccessPolicies(token).catch(e => { errors.push(`CA: ${e.message}`); return []; }),
      this.getSignInLogs(token).catch(e => { errors.push(`Sign-ins: ${e.message}`); return []; }),
    ]);

    const enabledUsers = users.filter((u: any) => u.accountEnabled);
    const guestUsers = users.filter((u: any) => u.userType === 'Guest');

    return {
      users: {
        total: users.length,
        enabled: enabledUsers.length,
        disabled: users.length - enabledUsers.length,
        guests: guestUsers.length,
        admins: 0,
        withMfa: 0,
        withoutMfa: 0,
        items: users.slice(0, 100).map((u: any) => ({
          id: u.id,
          displayName: u.displayName,
          email: u.mail || u.userPrincipalName,
          accountEnabled: u.accountEnabled,
          userType: u.userType,
          mfaRegistered: false,
          lastSignIn: u.signInActivity?.lastSignInDateTime || '',
        })),
      },
      groups: {
        total: groups.length,
        securityGroups: groups.filter((g: any) => g.securityEnabled).length,
        microsoft365Groups: groups.filter((g: any) => g.groupTypes?.includes('Unified')).length,
        dynamicGroups: groups.filter((g: any) => g.membershipRule).length,
      },
      applications: {
        total: apps.enterprise?.length + apps.registrations?.length || 0,
        enterpriseApps: apps.enterprise?.length || 0,
        appRegistrations: apps.registrations?.length || 0,
        withExpiredCredentials: 0,
      },
      conditionalAccess: {
        policies: conditionalAccess.length,
        enabled: conditionalAccess.filter((p: any) => p.state === 'enabled').length,
        reportOnly: conditionalAccess.filter((p: any) => p.state === 'enabledForReportingButNotEnforced').length,
        mfaRequired: conditionalAccess.filter((p: any) => 
          p.grantControls?.builtInControls?.includes('mfa')
        ).length,
      },
      signInLogs: {
        total: signIns.length,
        successful: signIns.filter((s: any) => s.status?.errorCode === 0).length,
        failed: signIns.filter((s: any) => s.status?.errorCode !== 0).length,
        riskySignIns: signIns.filter((s: any) => s.riskLevelDuringSignIn !== 'none').length,
        fromUnknownLocations: 0,
      },
      directoryRoles: {
        globalAdmins: 0,
        privilegedRoles: 0,
      },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private async getAccessToken(config: AzureADConfig): Promise<string | null> {
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

  private async getUsers(token: string): Promise<any[]> {
    const response = await fetch(`${this.graphUrl}/users?$top=999&$select=id,displayName,mail,userPrincipalName,accountEnabled,userType,signInActivity`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to fetch users');
    const data = await response.json();
    return data.value || [];
  }

  private async getGroups(token: string): Promise<any[]> {
    const response = await fetch(`${this.graphUrl}/groups?$top=999`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to fetch groups');
    const data = await response.json();
    return data.value || [];
  }

  private async getApplications(token: string): Promise<{ enterprise: any[]; registrations: any[] }> {
    const [enterpriseResp, registrationsResp] = await Promise.all([
      fetch(`${this.graphUrl}/servicePrincipals?$top=999`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${this.graphUrl}/applications?$top=999`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    return {
      enterprise: enterpriseResp.ok ? (await enterpriseResp.json()).value || [] : [],
      registrations: registrationsResp.ok ? (await registrationsResp.json()).value || [] : [],
    };
  }

  private async getConditionalAccessPolicies(token: string): Promise<any[]> {
    const response = await fetch(`${this.graphUrl}/identity/conditionalAccess/policies`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.value || [];
  }

  private async getSignInLogs(token: string): Promise<any[]> {
    const response = await fetch(`${this.graphUrl}/auditLogs/signIns?$top=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.value || [];
  }
}

