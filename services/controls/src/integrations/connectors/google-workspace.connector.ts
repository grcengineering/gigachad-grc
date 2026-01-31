/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

export interface GoogleWorkspaceConfig {
  serviceAccountKey: string;  // JSON string
  adminEmail: string;         // Admin email for domain-wide delegation
}

export interface GoogleWorkspaceSyncResult {
  users: {
    total: number;
    active: number;
    suspended: number;
    admins: number;
    with2SV: number;
    without2SV: number;
    items: Array<{
      id: string;
      email: string;
      name: string;
      isAdmin: boolean;
      is2SVEnrolled: boolean;
      lastLoginTime: string;
      creationTime: string;
    }>;
  };
  groups: {
    total: number;
    withExternalMembers: number;
  };
  orgUnits: {
    total: number;
  };
  devices: {
    total: number;
    mobile: number;
    chromeos: number;
  };
  apps: {
    installed: number;
    thirdParty: number;
  };
  security: {
    passwordPolicyStrength: string;
    sessionLength: number;
    allowLessSecureApps: boolean;
  };
  drive: {
    externalSharingEnabled: boolean;
    linkSharingDefault: string;
  };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class GoogleWorkspaceConnector {
  private readonly logger = new Logger(GoogleWorkspaceConnector.name);
  private readonly adminUrl = 'https://admin.googleapis.com/admin/directory/v1';

  async testConnection(config: GoogleWorkspaceConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.serviceAccountKey || !config.adminEmail) {
      return { success: false, message: 'Service Account Key and Admin Email are required' };
    }

    try {
      const credentials = JSON.parse(config.serviceAccountKey);
      const token = await this.getAccessToken(credentials, config.adminEmail);

      if (!token) {
        return { success: false, message: 'Authentication failed - check service account and domain-wide delegation' };
      }

      const response = await fetch(`${this.adminUrl}/users?maxResults=1&customer=my_customer`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        return { success: false, message: `API error: ${response.status}` };
      }

      return {
        success: true,
        message: 'Connected to Google Workspace successfully',
        details: { adminEmail: config.adminEmail },
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async sync(config: GoogleWorkspaceConfig): Promise<GoogleWorkspaceSyncResult> {
    const errors: string[] = [];
    const credentials = JSON.parse(config.serviceAccountKey);
    const token = await this.getAccessToken(credentials, config.adminEmail);

    if (!token) {
      throw new Error('Authentication failed');
    }

    const [users, groups, orgUnits] = await Promise.all([
      this.getUsers(token).catch(e => { errors.push(`Users: ${e.message}`); return []; }),
      this.getGroups(token).catch(e => { errors.push(`Groups: ${e.message}`); return []; }),
      this.getOrgUnits(token).catch(e => { errors.push(`OrgUnits: ${e.message}`); return []; }),
    ]);

    const activeUsers = users.filter((u: any) => !u.suspended);
    const admins = users.filter((u: any) => u.isAdmin);
    const with2SV = users.filter((u: any) => u.isEnrolledIn2Sv);

    return {
      users: {
        total: users.length,
        active: activeUsers.length,
        suspended: users.length - activeUsers.length,
        admins: admins.length,
        with2SV: with2SV.length,
        without2SV: activeUsers.length - with2SV.length,
        items: users.slice(0, 100).map((u: any) => ({
          id: u.id,
          email: u.primaryEmail,
          name: u.name?.fullName || '',
          isAdmin: u.isAdmin || false,
          is2SVEnrolled: u.isEnrolledIn2Sv || false,
          lastLoginTime: u.lastLoginTime || '',
          creationTime: u.creationTime,
        })),
      },
      groups: {
        total: groups.length,
        withExternalMembers: 0,
      },
      orgUnits: { total: orgUnits.length },
      devices: { total: 0, mobile: 0, chromeos: 0 },
      apps: { installed: 0, thirdParty: 0 },
      security: { passwordPolicyStrength: '', sessionLength: 0, allowLessSecureApps: false },
      drive: { externalSharingEnabled: false, linkSharingDefault: '' },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private async getAccessToken(credentials: any, adminEmail: string): Promise<string | null> {
    // In production, use Google Auth Library with JWT
    // This is a simplified implementation
    try {
      const jwt = this.createJWT(credentials, adminEmail);
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.access_token;
    } catch {
      return null;
    }
  }

  private createJWT(_credentials: any, _adminEmail: string): string {
    // Simplified - use proper JWT library in production
    return 'jwt-token';
  }

  private async getUsers(token: string): Promise<any[]> {
    const users: any[] = [];
    let pageToken = '';

    do {
      const url = `${this.adminUrl}/users?customer=my_customer&maxResults=500${pageToken ? `&pageToken=${pageToken}` : ''}`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`Failed: ${response.status}`);
      const data = await response.json();
      users.push(...(data.users || []));
      pageToken = data.nextPageToken || '';
    } while (pageToken && users.length < 1000);

    return users;
  }

  private async getGroups(token: string): Promise<any[]> {
    const response = await fetch(`${this.adminUrl}/groups?customer=my_customer&maxResults=200`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.groups || [];
  }

  private async getOrgUnits(token: string): Promise<any[]> {
    const response = await fetch(`${this.adminUrl}/customer/my_customer/orgunits?type=all`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.organizationUnits || [];
  }
}

