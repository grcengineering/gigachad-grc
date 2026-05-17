import { Injectable, Logger } from '@nestjs/common';
import {
  createGoogleServiceAccountJwt,
  exchangeGoogleJwtForAccessToken,
  parseServiceAccountKey,
  GoogleServiceAccountKey,
} from './utils/google-jwt';

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
  collectedAt: string;
  errors: string[];
}

const GOOGLE_WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/admin.directory.user.readonly',
  'https://www.googleapis.com/auth/admin.directory.group.readonly',
  'https://www.googleapis.com/auth/admin.directory.group.member.readonly',
  'https://www.googleapis.com/auth/admin.directory.orgunit.readonly',
  'https://www.googleapis.com/auth/admin.directory.device.chromeos.readonly',
  'https://www.googleapis.com/auth/admin.directory.device.mobile.readonly',
].join(' ');

@Injectable()
export class GoogleWorkspaceConnector {
  private readonly logger = new Logger(GoogleWorkspaceConnector.name);
  private readonly adminUrl = 'https://admin.googleapis.com/admin/directory/v1';

  async testConnection(config: GoogleWorkspaceConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.serviceAccountKey || !config.adminEmail) {
      return { success: false, message: 'Service Account Key and Admin Email are required' };
    }

    let credentials: GoogleServiceAccountKey;
    try {
      credentials = parseServiceAccountKey(config.serviceAccountKey);
    } catch (error: any) {
      return { success: false, message: error.message || 'Invalid service account key' };
    }

    try {
      const token = await this.getAccessToken(credentials, config.adminEmail);

      const response = await fetch(`${this.adminUrl}/users?maxResults=1&customer=my_customer`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const text = await response.text();
        return { success: false, message: `API error: ${response.status} ${text}` };
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
    const credentials = parseServiceAccountKey(config.serviceAccountKey);
    const token = await this.getAccessToken(credentials, config.adminEmail);

    const [users, groups, orgUnits, chromeDevices, mobileDevices] = await Promise.all([
      this.getUsers(token).catch(e => { errors.push(`Users: ${e.message}`); return []; }),
      this.getGroups(token).catch(e => { errors.push(`Groups: ${e.message}`); return []; }),
      this.getOrgUnits(token).catch(e => { errors.push(`OrgUnits: ${e.message}`); return []; }),
      this.getChromeOsDevices(token).catch(e => { errors.push(`ChromeOS: ${e.message}`); return []; }),
      this.getMobileDevices(token).catch(e => { errors.push(`Mobile: ${e.message}`); return []; }),
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
      devices: {
        total: chromeDevices.length + mobileDevices.length,
        mobile: mobileDevices.length,
        chromeos: chromeDevices.length,
      },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private async getAccessToken(credentials: GoogleServiceAccountKey, adminEmail: string): Promise<string> {
    const jwt = createGoogleServiceAccountJwt(credentials, {
      scope: GOOGLE_WORKSPACE_SCOPES,
      subject: adminEmail,
    });
    return exchangeGoogleJwtForAccessToken(jwt, credentials.token_uri);
  }

  private async authedGet(token: string, url: string): Promise<any> {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GET ${url} failed: ${response.status} ${text}`);
    }
    return response.json();
  }

  private async getUsers(token: string): Promise<any[]> {
    const users: any[] = [];
    let pageToken = '';
    let pages = 0;

    do {
      const url = `${this.adminUrl}/users?customer=my_customer&maxResults=500${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
      const data = await this.authedGet(token, url);
      users.push(...(data.users || []));
      pageToken = data.nextPageToken || '';
      pages += 1;
    } while (pageToken && users.length < 5000 && pages < 20);

    return users;
  }

  private async getGroups(token: string): Promise<any[]> {
    const groups: any[] = [];
    let pageToken = '';
    let pages = 0;

    do {
      const url = `${this.adminUrl}/groups?customer=my_customer&maxResults=200${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
      const data = await this.authedGet(token, url);
      groups.push(...(data.groups || []));
      pageToken = data.nextPageToken || '';
      pages += 1;
    } while (pageToken && groups.length < 5000 && pages < 20);

    return groups;
  }

  private async getOrgUnits(token: string): Promise<any[]> {
    const data = await this.authedGet(token, `${this.adminUrl}/customer/my_customer/orgunits?type=all`);
    return data.organizationUnits || [];
  }

  private async getChromeOsDevices(token: string): Promise<any[]> {
    const devices: any[] = [];
    let pageToken = '';
    let pages = 0;

    do {
      const url = `${this.adminUrl}/customer/my_customer/devices/chromeos?maxResults=200${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
      const data = await this.authedGet(token, url);
      devices.push(...(data.chromeosdevices || []));
      pageToken = data.nextPageToken || '';
      pages += 1;
    } while (pageToken && devices.length < 5000 && pages < 25);

    return devices;
  }

  private async getMobileDevices(token: string): Promise<any[]> {
    const devices: any[] = [];
    let pageToken = '';
    let pages = 0;

    do {
      const url = `${this.adminUrl}/customer/my_customer/devices/mobile?maxResults=200${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
      const data = await this.authedGet(token, url);
      devices.push(...(data.mobiledevices || []));
      pageToken = data.nextPageToken || '';
      pages += 1;
    } while (pageToken && devices.length < 5000 && pages < 25);

    return devices;
  }
}
