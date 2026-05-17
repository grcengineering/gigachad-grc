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
    // externalSharingEnabled is omitted: it cannot be reliably derived from
    // the Slack public Web API without admin-tier scopes that aren't part of
    // standard bot scopes. We don't claim it to avoid a misleading default.
    publicFileLinks: number;
  };
  security: {
    // null when the workspace's team.info response doesn't include the field
    // (e.g., non-Enterprise plans, or missing admin scope). Per PATTERN.md
    // rule 7 we surface "unknown" rather than a default boolean.
    ssoEnabled: boolean | null;
    sessionDuration: number | null;
    // The team.info `email_domain` field, or null if not exposed.
    emailDomain: string | null;
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

    const [teamInfo, users, channels, apps, files] = await Promise.all([
      this.getTeamInfo(config).catch(e => { errors.push(`Team: ${e.message}`); return null; }),
      this.getUsers(config).catch(e => { errors.push(`Users: ${e.message}`); return []; }),
      this.getChannels(config).catch(e => { errors.push(`Channels: ${e.message}`); return []; }),
      this.getApps(config).catch(e => { errors.push(`Apps: ${e.message}`); return null; }),
      this.getFiles(config).catch(e => { errors.push(`Files: ${e.message}`); return null; }),
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
      apps: {
        installed: apps?.installed ?? 0,
        approved: apps?.approved ?? 0,
        restricted: apps?.restricted ?? 0,
      },
      fileSharing: {
        publicFileLinks: files?.publicFileLinks ?? 0,
      },
      security: {
        // `sso_enabled` is only present on the Enterprise Grid team.info payload.
        // Returning null avoids the misleading default of `false` for plans
        // that simply don't expose the field.
        ssoEnabled:
          typeof teamInfo?.team?.sso_enabled === 'boolean'
            ? teamInfo.team.sso_enabled
            : null,
        sessionDuration:
          typeof teamInfo?.team?.session_duration === 'number'
            ? teamInfo.team.session_duration
            : null,
        emailDomain: teamInfo?.team?.email_domain ?? null,
      },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private async getApps(config: SlackConfig): Promise<{ installed: number; approved: number; restricted: number } | null> {
    // admin.apps.* methods require admin scopes (admin.apps:read). Bots without
    // these scopes get not_allowed_token_type or missing_scope — surface as error.
    const response = await fetch(`${this.baseUrl}/admin.apps.approved.list?limit=100`, {
      headers: this.buildHeaders(config.botToken),
    });
    const approvedData: any = await response.json().catch(() => ({ ok: false }));

    const restrictedResp = await fetch(`${this.baseUrl}/admin.apps.restricted.list?limit=100`, {
      headers: this.buildHeaders(config.botToken),
    });
    const restrictedData: any = await restrictedResp.json().catch(() => ({ ok: false }));

    if (!approvedData.ok && !restrictedData.ok) {
      throw new Error(approvedData.error || restrictedData.error || 'admin.apps.* not authorized');
    }

    const approved = Array.isArray(approvedData.approved_apps) ? approvedData.approved_apps.length : 0;
    const restricted = Array.isArray(restrictedData.restricted_apps) ? restrictedData.restricted_apps.length : 0;
    return {
      installed: approved + restricted,
      approved,
      restricted,
    };
  }

  private async getFiles(config: SlackConfig): Promise<{ publicFileLinks: number } | null> {
    // files.list returns a paginated list. We bucket files whose
    // public_url_shared flag is set. Cap iteration to 5 pages.
    let publicFileLinks = 0;
    let page = 1;
    const maxPages = 5;
    while (page <= maxPages) {
      const response = await fetch(`${this.baseUrl}/files.list?count=1000&page=${page}`, {
        headers: this.buildHeaders(config.botToken),
      });
      const data: any = await response.json();
      if (!data.ok) throw new Error(data.error || 'files.list failed');
      const files = Array.isArray(data.files) ? data.files : [];
      publicFileLinks += files.filter((f: any) => f.public_url_shared === true).length;
      const pages = data.paging?.pages ?? 1;
      if (page >= pages) break;
      page += 1;
    }
    return { publicFileLinks };
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
