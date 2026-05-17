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
    // MFA counts are null when the userRegistrationDetails report is
    // unavailable (e.g. license/permission missing). Avoids the false
    // claim that everyone is unenrolled.
    withMfa: number | null;
    withoutMfa: number | null;
    items: Array<{
      id: string;
      displayName: string;
      email: string;
      accountEnabled: boolean;
      userType: string;
      // null when MFA report was unreachable; do not default to false.
      mfaRegistered: boolean | null;
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

    // Track whether MFA fetch succeeded so we can null out the metric on failure
    // rather than fabricating "everyone is unenrolled".
    let mfaFetchSucceeded = true;

    const [users, groups, apps, conditionalAccess, signIns, mfaRegistrations, directoryRoles, privilegedRoleDefinitions] = await Promise.all([
      this.getUsers(token).catch(e => { errors.push(`Users: ${e.message}`); return []; }),
      this.getGroups(token).catch(e => { errors.push(`Groups: ${e.message}`); return []; }),
      this.getApplications(token).catch(e => { errors.push(`Apps: ${e.message}`); return { enterprise: [], registrations: [] }; }),
      this.getConditionalAccessPolicies(token).catch(e => { errors.push(`CA: ${e.message}`); return []; }),
      this.getSignInLogs(token).catch(e => { errors.push(`Sign-ins: ${e.message}`); return []; }),
      this.getMfaRegistrations(token).catch(e => {
        errors.push(`MFA: ${e.message}`);
        mfaFetchSucceeded = false;
        return [] as any[];
      }),
      this.getDirectoryRoles(token).catch(e => { errors.push(`Roles: ${e.message}`); return []; }),
      // Real privileged role definitions live under /roleManagement/directory/roleDefinitions
      // filtered by isPrivileged. directoryRoleTemplates doesn't expose this flag.
      this.getPrivilegedRoleDefinitions(token).catch(e => { errors.push(`PrivilegedRoles: ${e.message}`); return []; }),
    ]);

    const enabledUsers = users.filter((u: any) => u.accountEnabled);
    const guestUsers = users.filter((u: any) => u.userType === 'Guest');

    // MFA registration counts come from /reports/authenticationMethods/userRegistrationDetails.
    // When that report is unreachable, surface null instead of inventing zero / "everyone unenrolled".
    let withMfa: number | null;
    let withoutMfa: number | null;
    if (mfaFetchSucceeded) {
      withMfa = mfaRegistrations.filter((m: any) => m.isMfaRegistered === true).length;
      withoutMfa = mfaRegistrations.filter((m: any) => m.isMfaRegistered === false).length;
    } else {
      withMfa = null;
      withoutMfa = null;
    }
    const mfaByUserId = new Map<string, boolean>(
      mfaRegistrations.map((m: any): [string, boolean] => [
        String(m.id || m.userId || ''),
        m.isMfaRegistered === true,
      ]),
    );

    // Global admin role -> members
    const globalAdminRole = directoryRoles.find(
      (r: any) =>
        r.displayName === 'Global Administrator' ||
        r.roleTemplateId === '62e90394-69f5-4237-9190-012177145e10',
    );
    let globalAdminMembers: any[] = [];
    if (globalAdminRole) {
      globalAdminMembers = await this.getDirectoryRoleMembers(token, globalAdminRole.id).catch(e => {
        errors.push(`GlobalAdmins: ${e.message}`);
        return [];
      });
    }

    // admins = union of members across all active directoryRoles.
    // Iterate in small batches (5 concurrent) to avoid Graph 429 throttling
    // on tenants with many roles. Surface 403s as warnings instead of silent
    // swallow so the caller can audit permission gaps.
    const adminMembers = new Set<string>();
    const ROLE_FANOUT_CONCURRENCY = 5;
    for (let i = 0; i < directoryRoles.length; i += ROLE_FANOUT_CONCURRENCY) {
      const batch = directoryRoles.slice(i, i + ROLE_FANOUT_CONCURRENCY);
      await Promise.all(
        batch.map(async (r: any) => {
          try {
            const members = await this.getDirectoryRoleMembers(token, r.id);
            members.forEach((m: any) => adminMembers.add(m.id));
          } catch (e: any) {
            const msg = e?.message || '';
            // Forbidden errors usually mean missing RoleManagement.Read.* scope.
            // Surface to errors[] so it's visible rather than silently dropped.
            if (msg.includes('403')) {
              errors.push(`RoleMembers(${r.displayName || r.id}): ${msg}`);
            } else {
              errors.push(`RoleMembers(${r.displayName || r.id}): ${msg}`);
            }
          }
        }),
      );
    }

    // privilegedRoles = role definitions where isPrivileged=true (filtered server-side).
    const privilegedRoles = privilegedRoleDefinitions.length;

    // withExpiredCredentials: count app registrations whose passwordCredentials
    // or keyCredentials have an endDateTime < now.
    const now = Date.now();
    const expiredCredApps = (apps.registrations || []).filter((a: any) => {
      const pwCreds = Array.isArray(a.passwordCredentials) ? a.passwordCredentials : [];
      const keyCreds = Array.isArray(a.keyCredentials) ? a.keyCredentials : [];
      const hasExpired = (creds: any[]) => creds.some((c: any) => {
        if (!c.endDateTime) return false;
        return new Date(c.endDateTime).getTime() < now;
      });
      return hasExpired(pwCreds) || hasExpired(keyCreds);
    }).length;

    // fromUnknownLocations: sign-ins where BOTH city and country are missing.
    // OR was over-counting (any sign-in with city-only or country-only was
    // treated as "unknown location" even though location was partially known).
    const fromUnknownLocations = signIns.filter((s: any) => {
      const loc = s.location || {};
      return !loc.city && !loc.countryOrRegion;
    }).length;

    return {
      users: {
        total: users.length,
        enabled: enabledUsers.length,
        disabled: users.length - enabledUsers.length,
        guests: guestUsers.length,
        admins: adminMembers.size,
        withMfa,
        withoutMfa,
        items: users.slice(0, 100).map((u: any) => ({
          id: u.id,
          displayName: u.displayName,
          email: u.mail || u.userPrincipalName,
          accountEnabled: u.accountEnabled,
          userType: u.userType,
          // null when MFA report was unreachable; do not assume false.
          mfaRegistered: mfaFetchSucceeded ? (mfaByUserId.get(u.id) === true) : null,
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
        withExpiredCredentials: expiredCredApps,
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
        // Whitelist real risk levels. The previous "!== 'none'" inadvertently
        // counted 'hidden', null, and 'unknownFutureValue' as risky.
        riskySignIns: signIns.filter((s: any) =>
          ['low', 'medium', 'high'].includes(s.riskLevelDuringSignIn)
        ).length,
        fromUnknownLocations,
      },
      directoryRoles: {
        globalAdmins: globalAdminMembers.length,
        privilegedRoles,
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
    // Graph paginates via @odata.nextLink. Cap to avoid runaway on enormous tenants.
    const USERS_CAP = 10000;
    const results: any[] = [];
    let url: string | null =
      `${this.graphUrl}/users?$top=999&$select=id,displayName,mail,userPrincipalName,accountEnabled,userType,signInActivity`;
    while (url && results.length < USERS_CAP) {
      const response: Response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      const data: any = await response.json();
      results.push(...(data.value || []));
      url = data['@odata.nextLink'] || null;
    }
    return results;
  }

  private async getGroups(token: string): Promise<any[]> {
    const GROUPS_CAP = 10000;
    const results: any[] = [];
    let url: string | null = `${this.graphUrl}/groups?$top=999`;
    while (url && results.length < GROUPS_CAP) {
      const response: Response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch groups');
      const data: any = await response.json();
      results.push(...(data.value || []));
      url = data['@odata.nextLink'] || null;
    }
    return results;
  }

  private async getApplications(token: string): Promise<{ enterprise: any[]; registrations: any[] }> {
    const APP_CAP = 10000;

    const paginate = async (initialUrl: string): Promise<any[]> => {
      const items: any[] = [];
      let url: string | null = initialUrl;
      while (url && items.length < APP_CAP) {
        const response: Response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) return items;
        const data: any = await response.json();
        items.push(...(data.value || []));
        url = data['@odata.nextLink'] || null;
      }
      return items;
    };

    const [enterprise, registrations] = await Promise.all([
      paginate(`${this.graphUrl}/servicePrincipals?$top=999`),
      // Explicitly select credential fields so withExpiredCredentials is computable.
      paginate(
        `${this.graphUrl}/applications?$top=999&$select=id,displayName,passwordCredentials,keyCredentials`,
      ),
    ]);

    return { enterprise, registrations };
  }

  private async getMfaRegistrations(token: string): Promise<any[]> {
    const results: any[] = [];
    let url: string | null =
      `${this.graphUrl}/reports/authenticationMethods/userRegistrationDetails?$top=999`;
    while (url && results.length < 10000) {
      const response: Response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Failed: ${response.status}`);
      const data: any = await response.json();
      results.push(...(data.value || []));
      url = data['@odata.nextLink'] || null;
    }
    return results;
  }

  private async getDirectoryRoles(token: string): Promise<any[]> {
    const response = await fetch(`${this.graphUrl}/directoryRoles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.value || [];
  }

  private async getDirectoryRoleMembers(token: string, roleId: string): Promise<any[]> {
    const response = await fetch(`${this.graphUrl}/directoryRoles/${roleId}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.value || [];
  }

  // Real privileged role definitions live under unifiedRoleDefinitions.
  // directoryRoleTemplate does not expose isPrivileged (the old filter
  // always returned 0).
  private async getPrivilegedRoleDefinitions(token: string): Promise<any[]> {
    const response = await fetch(
      `${this.graphUrl}/roleManagement/directory/roleDefinitions?$filter=isPrivileged eq true`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.value || [];
  }

  private async getConditionalAccessPolicies(token: string): Promise<any[]> {
    const CA_CAP = 1000;
    const results: any[] = [];
    let url: string | null = `${this.graphUrl}/identity/conditionalAccess/policies`;
    while (url && results.length < CA_CAP) {
      const response: Response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return results;
      const data: any = await response.json();
      results.push(...(data.value || []));
      url = data['@odata.nextLink'] || null;
    }
    return results;
  }

  private async getSignInLogs(token: string): Promise<any[]> {
    // Sign-in logs are high volume; cap at 5000 most recent entries to bound
    // memory/runtime while still giving meaningful coverage for risky-sign-in
    // metrics. Without pagination we were silently truncating at 100.
    const SIGNIN_CAP = 5000;
    const results: any[] = [];
    let url: string | null = `${this.graphUrl}/auditLogs/signIns?$top=1000`;
    while (url && results.length < SIGNIN_CAP) {
      const response: Response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return results;
      const data: any = await response.json();
      results.push(...(data.value || []));
      url = data['@odata.nextLink'] || null;
    }
    return results;
  }
}
