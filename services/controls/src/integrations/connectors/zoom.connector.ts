import { Injectable, Logger } from '@nestjs/common';

export interface ZoomConfig { accountId: string; clientId: string; clientSecret: string; }
export interface ZoomSyncResult {
  users: { total: number; active: number; pending: number; byType: Record<string, number>; items: any[] };
  meetings: { scheduled: number; past: number; avgDuration: number };
  webinars: { scheduled: number; past: number };
  settings: { requirePassword: boolean | null; waitingRoom: boolean | null; encryptionType: string };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class ZoomConnector {
  private readonly logger = new Logger(ZoomConnector.name);
  private readonly baseUrl = 'https://api.zoom.us/v2';

  async testConnection(config: ZoomConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.accountId || !config.clientId || !config.clientSecret) return { success: false, message: 'Account ID, Client ID, and Client Secret are required' };
    try {
      const token = await this.getAccessToken(config);
      if (!token) return { success: false, message: 'Auth failed' };
      return { success: true, message: 'Connected to Zoom' };
    } catch (error: any) { return { success: false, message: error.message }; }
  }

  async sync(config: ZoomConfig): Promise<ZoomSyncResult> {
    const errors: string[] = [];
    const token = await this.getAccessToken(config);
    if (!token) throw new Error('Auth failed');
    const users = await this.getUsers(token).catch(e => { errors.push(`users: ${e.message}`); return []; });
    const byType: Record<string, number> = {};
    users.forEach((u: any) => { byType[u.type] = (byType[u.type] || 0) + 1; });

    // Loop over first 50 users for meetings/webinars
    const sampleUsers = users.slice(0, 50);
    let scheduledMeetings = 0;
    let pastMeetings = 0;
    let scheduledWebinars = 0;
    let pastWebinars = 0;
    let totalDuration = 0;
    let durationCount = 0;

    await Promise.all(sampleUsers.map(async (u: any) => {
      const userId = u.id;
      await Promise.all([
        this.getUserMeetings(token, userId, 'scheduled')
          .then(meetings => {
            scheduledMeetings += meetings.length;
            meetings.forEach((m: any) => {
              if (typeof m.duration === 'number') { totalDuration += m.duration; durationCount++; }
            });
          })
          .catch(e => { errors.push(`meetings(scheduled) ${userId}: ${e.message}`); }),
        this.getUserMeetings(token, userId, 'previous_meetings')
          .then(meetings => {
            pastMeetings += meetings.length;
            meetings.forEach((m: any) => {
              if (typeof m.duration === 'number') { totalDuration += m.duration; durationCount++; }
            });
          })
          .catch(e => { errors.push(`meetings(past) ${userId}: ${e.message}`); }),
        this.getUserWebinars(token, userId, 'upcoming')
          .then(items => { scheduledWebinars += items.length; })
          .catch(e => { errors.push(`webinars(upcoming) ${userId}: ${e.message}`); }),
        this.getUserWebinars(token, userId, 'past')
          .then(items => { pastWebinars += items.length; })
          .catch(e => { errors.push(`webinars(past) ${userId}: ${e.message}`); }),
      ]);
    }));

    // Account owner settings — try the first user (typically owner), fall back to 'me'.
    let settings: { requirePassword: boolean | null; waitingRoom: boolean | null; encryptionType: string } = { requirePassword: null, waitingRoom: null, encryptionType: 'unknown' };
    const ownerCandidate = users.find((u: any) => u.role_name === 'Owner') || users[0];
    const ownerId = ownerCandidate?.id || 'me';
    try {
      const fetched = await this.getUserSettings(token, ownerId);
      settings = fetched;
    } catch (e: any) {
      errors.push(`settings: ${e.message}`);
    }

    const avgDuration = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;

    return {
      users: { total: users.length, active: users.filter((u: any) => u.status === 'active').length, pending: users.filter((u: any) => u.status === 'pending').length, byType, items: users.slice(0, 50) },
      meetings: { scheduled: scheduledMeetings, past: pastMeetings, avgDuration },
      webinars: { scheduled: scheduledWebinars, past: pastWebinars },
      settings,
      collectedAt: new Date().toISOString(), errors,
    };
  }

  private async getAccessToken(config: ZoomConfig): Promise<string | null> {
    const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
    const response = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${config.accountId}`, {
      method: 'POST', headers: { 'Authorization': `Basic ${auth}` },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.access_token;
  }

  private async getUsers(token: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/users?page_size=300`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!response.ok) return [];
    const data = await response.json();
    return data.users || [];
  }

  private async getUserMeetings(token: string, userId: string, type: 'scheduled' | 'previous_meetings'): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/users/${userId}/meetings?type=${type}&page_size=100`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.meetings || [];
  }

  private async getUserWebinars(token: string, userId: string, type: 'upcoming' | 'past'): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/users/${userId}/webinars?type=${type}&page_size=100`, { headers: { 'Authorization': `Bearer ${token}` } });
    // Webinar endpoint returns 400 for users without webinar license — treat as zero items rather than error
    if (response.status === 400) return [];
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.webinars || [];
  }

  private async getUserSettings(token: string, userId: string): Promise<{ requirePassword: boolean | null; waitingRoom: boolean | null; encryptionType: string }> {
    const response = await fetch(`${this.baseUrl}/users/${userId}/settings`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data: any = await response.json();
    const sched = data.schedule_meeting || {};
    const inMtg = data.in_meeting || {};
    // require_password_for_scheduling_new_meetings is the modern field; older accounts expose require_password_for_all_meetings
    const requirePassword: boolean | null =
      typeof sched.require_password_for_scheduling_new_meetings === 'boolean' ? sched.require_password_for_scheduling_new_meetings :
      typeof sched.require_password_for_all_meetings === 'boolean' ? sched.require_password_for_all_meetings :
      typeof sched.require_password === 'boolean' ? sched.require_password :
      null;
    const waitingRoom: boolean | null =
      typeof inMtg.waiting_room === 'boolean' ? inMtg.waiting_room :
      typeof sched.waiting_room === 'boolean' ? sched.waiting_room :
      null;
    // encryption_type values: 'enhanced_encryption' or 'e2ee'
    const encryptionType: string = inMtg.encryption_type || sched.encryption_type || 'unknown';
    return { requirePassword, waitingRoom, encryptionType };
  }
}

