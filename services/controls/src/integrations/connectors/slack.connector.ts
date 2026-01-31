/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

export interface SlackConfig {
  botToken: string;  // xoxb-...
}

export interface SlackSyncResult {
  workspace: {
    name: string;
    domain: string;
    plan: string;
  };
  users: {
    total: number;
    active: number;
    deactivated: number;
    guests: number;
    admins: number;
    owners: number;
    with2FA: number;
    without2FA: number;
    items: Array<{
      id: string;
      name: string;
      email: string;
      isAdmin: boolean;
      isOwner: boolean;
      has2FA: boolean;
      status: string;
    }>;
  };
  channels: {
    total: number;
    public: number;
    private: number;
    archived: number;
    externallyShared: number;
  };
  apps: {
    installed: number;
    approved: number;
    restricted: number;
  };
  fileSharing: {
    externalSharingEnabled: boolean;
    publicFileLinks: number;
  };
  security: {
    ssoEnabled: boolean;
    sessionDuration: number;
    domainRestriction: boolean;
  };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class SlackConnector {
  private readonly logger = new Logger(SlackConnector.name);
  private readonly baseUrl = 'https://slack.com/api';

  async testConnection(config: SlackConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.botToken) {
      return { success: false, message: 'Bot token is required' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth.test`, {
        method: 'POST',
        headers: this.buildHeaders(config.botToken),
      });

      const data = await response.json();
      if (!data.ok) {
        return { success: false, message: data.error || 'Authentication failed' };
      }

      return {
        success: true,
        message: `Connected to Slack workspace: ${data.team}`,
        details: { team: data.team, teamId: data.team_id, user: data.user },
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  async sync(config: SlackConfig): Promise<SlackSyncResult> {
    const errors: string[] = [];

    const [teamInfo, users, channels] = await Promise.all([
      this.getTeamInfo(config).catch(e => { errors.push(`Team: ${e.message}`); return null; }),
      this.getUsers(config).catch(e => { errors.push(`Users: ${e.message}`); return []; }),
      this.getChannels(config).catch(e => { errors.push(`Channels: ${e.message}`); return []; }),
    ]);

    const activeUsers = users.filter((u: any) => !u.deleted);
    const deactivatedUsers = users.filter((u: any) => u.deleted);
    const guestUsers = users.filter((u: any) => u.is_restricted || u.is_ultra_restricted);
    const adminUsers = users.filter((u: any) => u.is_admin);
    const ownerUsers = users.filter((u: any) => u.is_owner);
    const usersWith2FA = users.filter((u: any) => u.has_2fa);

    return {
      workspace: {
        name: teamInfo?.team?.name || '',
        domain: teamInfo?.team?.domain || '',
        plan: teamInfo?.team?.plan || '',
      },
      users: {
        total: users.length,
        active: activeUsers.length,
        deactivated: deactivatedUsers.length,
        guests: guestUsers.length,
        admins: adminUsers.length,
        owners: ownerUsers.length,
        with2FA: usersWith2FA.length,
        without2FA: activeUsers.length - usersWith2FA.length,
        items: activeUsers.slice(0, 100).map((u: any) => ({
          id: u.id,
          name: u.real_name || u.name,
          email: u.profile?.email || '',
          isAdmin: u.is_admin || false,
          isOwner: u.is_owner || false,
          has2FA: u.has_2fa || false,
          status: u.deleted ? 'deactivated' : 'active',
        })),
      },
      channels: {
        total: channels.length,
        public: channels.filter((c: any) => !c.is_private).length,
        private: channels.filter((c: any) => c.is_private).length,
        archived: channels.filter((c: any) => c.is_archived).length,
        externallyShared: channels.filter((c: any) => c.is_ext_shared).length,
      },
      apps: { installed: 0, approved: 0, restricted: 0 },
      fileSharing: { externalSharingEnabled: false, publicFileLinks: 0 },
      security: { ssoEnabled: false, sessionDuration: 0, domainRestriction: false },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private buildHeaders(token: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private async getTeamInfo(config: SlackConfig): Promise<any> {
    const response = await fetch(`${this.baseUrl}/team.info`, {
      method: 'POST',
      headers: this.buildHeaders(config.botToken),
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error);
    return data;
  }

  private async getUsers(config: SlackConfig): Promise<any[]> {
    const users: any[] = [];
    let cursor = '';

    do {
      const response = await fetch(`${this.baseUrl}/users.list?limit=200${cursor ? `&cursor=${cursor}` : ''}`, {
        headers: this.buildHeaders(config.botToken),
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error);
      
      users.push(...(data.members || []));
      cursor = data.response_metadata?.next_cursor || '';
    } while (cursor && users.length < 1000);

    return users;
  }

  private async getChannels(config: SlackConfig): Promise<any[]> {
    const channels: any[] = [];
    let cursor = '';

    do {
      const response = await fetch(`${this.baseUrl}/conversations.list?limit=200&types=public_channel,private_channel${cursor ? `&cursor=${cursor}` : ''}`, {
        headers: this.buildHeaders(config.botToken),
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error);
      
      channels.push(...(data.channels || []));
      cursor = data.response_metadata?.next_cursor || '';
    } while (cursor && channels.length < 1000);

    return channels;
  }
}

