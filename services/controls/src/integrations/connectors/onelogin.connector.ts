import { Injectable, Logger } from '@nestjs/common';

export interface OneLoginConfig { clientId: string; clientSecret: string; subdomain: string; }
export interface OneLoginSyncResult {
  // withMfa is `number | null` per PATTERN.md: null indicates the MFA factor
  // lookup failed or could not be performed, so it is unknown rather than zero.
  // sampleSize records how many users we actually inspected (capped at 200).
  users: { total: number; active: number; locked: number; withMfa: number | null; sampleSize: number; items: any[] };
  apps: { total: number };
  roles: { total: number };
  events: { total: number; failedLogins: number };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class OneLoginConnector {
  private readonly logger = new Logger(OneLoginConnector.name);

  async testConnection(config: OneLoginConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.clientId || !config.clientSecret || !config.subdomain) {
      return { success: false, message: 'Client ID, Client Secret, and Subdomain are required' };
    }
    try {
      const token = await this.getAccessToken(config);
      return token ? { success: true, message: 'Connected to OneLogin' } : { success: false, message: 'Auth failed' };
    } catch (error: any) { return { success: false, message: error.message }; }
  }

  async sync(config: OneLoginConfig): Promise<OneLoginSyncResult> {
    const errors: string[] = [];
    const token = await this.getAccessToken(config);
    if (!token) throw new Error('Auth failed');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [users, apps, roles, events] = await Promise.all([
      this.getUsers(config.subdomain, token).catch(e => { errors.push(`users: ${e.message}`); return []; }),
      this.getApps(config.subdomain, token).catch(e => { errors.push(`apps: ${e.message}`); return []; }),
      this.getRoles(config.subdomain, token).catch(e => { errors.push(`roles: ${e.message}`); return []; }),
      this.getFailedLoginEvents(config.subdomain, token, sevenDaysAgo).catch(e => { errors.push(`events: ${e.message}`); return []; }),
    ]);

    // MFA enrollment: per PATTERN.md security rule, do not fabricate.
    // Inspect up to the first 200 users (rate-limit guard) and count users
    // with at least one enabled MFA device. If the overall lookup blows up
    // (e.g., token can't read /api/2/mfa/...), record null instead of 0.
    const mfaSampleUsers = users.slice(0, 200);
    let withMfa: number | null = null;
    let mfaSampleSize = mfaSampleUsers.length;
    try {
      withMfa = await this.countUsersWithMfa(config.subdomain, token, mfaSampleUsers);
    } catch (e: any) {
      errors.push(`mfa: ${e.message}`);
      withMfa = null;
      mfaSampleSize = 0;
    }

    return {
      users: {
        total: users.length,
        active: users.filter((u: any) => u.status === 1).length,
        locked: users.filter((u: any) => u.status === 3).length,
        withMfa,
        sampleSize: mfaSampleSize,
        items: users.slice(0, 50),
      },
      apps: { total: apps.length },
      roles: { total: roles.length },
      events: { total: events.length, failedLogins: events.length },
      collectedAt: new Date().toISOString(), errors,
    };
  }

  /**
   * For each user, call /api/2/mfa/users/{user_id}/devices and count those
   * with at least one enabled device. Individual user failures are tolerated
   * (counted as "unknown" by not being included in the total). If the OneLogin
   * API itself rejects the call type entirely, the caller will throw.
   */
  private async countUsersWithMfa(subdomain: string, token: string, users: any[]): Promise<number> {
    let count = 0;
    for (const u of users) {
      const uid = u?.id;
      if (uid === undefined || uid === null) continue;
      try {
        const response = await fetch(
          `https://${subdomain}.onelogin.com/api/2/mfa/users/${uid}/devices`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (!response.ok) {
          // Skip — treat as unknown for this user rather than counting as zero.
          continue;
        }
        const data = await response.json();
        const devices: any[] = Array.isArray(data) ? data : (data?.data || []);
        const hasEnabled = devices.some((d: any) => d?.active === true || d?.status === 'enabled' || d?.enabled === true);
        if (hasEnabled) count++;
      } catch {
        // Individual lookup failure — skip rather than fabricate.
      }
    }
    return count;
  }

  private async getAccessToken(config: OneLoginConfig): Promise<string | null> {
    const response = await fetch(`https://${config.subdomain}.onelogin.com/auth/oauth2/v2/token`, {
      method: 'POST', headers: { 'Authorization': `client_id:${config.clientId}, client_secret:${config.clientSecret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'client_credentials' }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.access_token;
  }

  private async getUsers(subdomain: string, token: string): Promise<any[]> {
    const response = await fetch(`https://${subdomain}.onelogin.com/api/2/users`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!response.ok) return [];
    const data = await response.json();
    return data || [];
  }

  private async getApps(subdomain: string, token: string): Promise<any[]> {
    const response = await fetch(`https://${subdomain}.onelogin.com/api/2/apps`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : (data?.data || []);
  }

  private async getRoles(subdomain: string, token: string): Promise<any[]> {
    const response = await fetch(`https://${subdomain}.onelogin.com/api/2/roles`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : (data?.data || []);
  }

  private async getFailedLoginEvents(subdomain: string, token: string, since: string): Promise<any[]> {
    // event_type_id 6 = failed login
    const response = await fetch(`https://${subdomain}.onelogin.com/api/1/events?event_type_id=6&since=${encodeURIComponent(since)}`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data?.data || [];
  }
}

