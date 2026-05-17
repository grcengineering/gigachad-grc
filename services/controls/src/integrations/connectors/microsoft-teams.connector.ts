import { Injectable, Logger } from '@nestjs/common';

export interface MicrosoftTeamsConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

export interface MicrosoftTeamsSyncResult {
  teams: {
    total: number;
    public: number;
    private: number;
    archived: number;
    items: Array<{
      id: string;
      displayName: string;
      description: string;
      visibility: string;
      // null when memberCount couldn't be fetched (only the first N scanned teams
      // have a real count; the rest stay null instead of fabricating 0).
      memberCount: number | null;
      createdDateTime: string;
    }>;
  };
  users: {
    total: number;
    guests: number;
    licensed: number;
  };
  channels: {
    total: number;
    standard: number;
    private: number;
    shared: number;
  };
  apps: {
    installed: number;
    // org-wide app count comes from teamsApps filtered by distributionMethod.
    // null when that endpoint isn't reachable.
    orgWide: number | null;
  };
  meetings: {
    // null when /communications/onlineMeetings is not accessible
    // (requires application access policy in most tenants).
    scheduledLast30Days: number | null;
  };
  // "anyTeam" semantics: true if at least one scanned team has the feature on.
  // teamsScanned is exposed so the consumer can interpret the boolean correctly.
  security: {
    anyTeamAllowsGuestAccess: boolean;
    anyTeamAllowsExternalSharing: boolean;
    anyTeamAllowsAnonymousJoin: boolean;
    teamsScanned: number;
    // tenant-wide signal from /teamwork/teamsAppSettings; null when unavailable.
    tenantAllowsGlobalAccessToApps: boolean | null;
  };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class MicrosoftTeamsConnector {
  private readonly logger = new Logger(MicrosoftTeamsConnector.name);
  private readonly graphUrl = 'https://graph.microsoft.com/v1.0';

  async testConnection(
    config: MicrosoftTeamsConfig
  ): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.tenantId || !config.clientId || !config.clientSecret) {
      return { success: false, message: 'Tenant ID, Client ID, and Client Secret are required' };
    }

    try {
      const token = await this.getAccessToken(config);
      if (!token) {
        return { success: false, message: 'Failed to authenticate' };
      }

      const response = await fetch(`${this.graphUrl}/teams?$top=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        return { success: false, message: `API error: ${response.status}` };
      }

      return {
        success: true,
        message: 'Connected to Microsoft Teams successfully',
        details: { tenantId: config.tenantId },
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  async sync(config: MicrosoftTeamsConfig): Promise<MicrosoftTeamsSyncResult> {
    const errors: string[] = [];
    const token = await this.getAccessToken(config);

    if (!token) {
      throw new Error('Failed to authenticate');
    }

    const [teams, users, meetingsResult, teamsAppSettings, orgWideAppsCount] = await Promise.all([
      this.getTeams(token).catch((e) => {
        errors.push(`Teams: ${e.message}`);
        return [] as any[];
      }),
      this.getUsers(token).catch((e) => {
        errors.push(`Users: ${e.message}`);
        return [] as any[];
      }),
      // null result indicates the endpoint was unreachable (403/404 likely
      // due to missing application access policy). Don't fabricate 0.
      this.getMeetingsLast30Days(token).catch((e) => {
        errors.push(`Meetings: ${e.message}`);
        return { count: null as number | null };
      }),
      this.getTeamsAppSettings(token).catch((e) => {
        errors.push(`TeamsAppSettings: ${e.message}`);
        return null;
      }),
      this.getOrgWideAppsCount(token).catch((e) => {
        errors.push(`OrgWideApps: ${e.message}`);
        return null as number | null;
      }),
    ]);

    // For per-team data, cap at 20 teams to bound runtime.
    const teamsToScan = teams.slice(0, 20);
    // Track which team IDs were scanned for memberCount enrichment.
    const memberCountById = new Map<string, number | null>();

    let channelsStandard = 0;
    let channelsPrivate = 0;
    let channelsShared = 0;
    let appsInstalledTotal = 0;
    let guestAccessAny = false;
    let externalSharingAny = false;
    let anonymousJoinAny = false;

    for (const team of teamsToScan) {
      const teamId = team.id;
      const [channels, apps, settings, memberCount] = await Promise.all([
        this.getTeamChannels(token, teamId).catch((e) => {
          errors.push(`Channels(${team.displayName || teamId}): ${e.message}`);
          return [] as any[];
        }),
        this.getTeamInstalledApps(token, teamId).catch((e) => {
          errors.push(`Apps(${team.displayName || teamId}): ${e.message}`);
          return [] as any[];
        }),
        this.getTeamSettings(token, teamId).catch((e) => {
          errors.push(`TeamSettings(${team.displayName || teamId}): ${e.message}`);
          return null;
        }),
        this.getTeamMemberCount(token, teamId).catch((e) => {
          errors.push(`MemberCount(${team.displayName || teamId}): ${e.message}`);
          return null as number | null;
        }),
      ]);

      memberCountById.set(teamId, memberCount);

      for (const c of channels) {
        const mt = (c.membershipType || 'standard').toLowerCase();
        if (mt === 'private') channelsPrivate++;
        else if (mt === 'shared') channelsShared++;
        else channelsStandard++;
      }
      appsInstalledTotal += apps.length;

      if (settings) {
        if (settings.guestSettings?.allowGuestAccess) guestAccessAny = true;
        if (settings.messagingSettings?.allowExternalSharing) externalSharingAny = true;
        if (settings.meetingSettings?.allowAnonymousUsersToJoinMeeting) anonymousJoinAny = true;
      }
    }

    // Tenant-wide signal from /teamwork/teamsAppSettings: presents the global
    // posture for app installation. null when unavailable.
    const tenantAllowsGlobalAccessToApps: boolean | null = teamsAppSettings
      ? teamsAppSettings.allowGlobalAccessToAppsAcrossOrg === true
      : null;

    return {
      teams: {
        total: teams.length,
        public: teams.filter((t: any) => t.visibility === 'Public').length,
        private: teams.filter((t: any) => t.visibility === 'Private').length,
        archived: teams.filter((t: any) => t.isArchived).length,
        items: teams.slice(0, 50).map((t: any) => ({
          id: t.id,
          displayName: t.displayName,
          description: t.description || '',
          visibility: t.visibility,
          memberCount: memberCountById.has(t.id) ? memberCountById.get(t.id)! : null,
          createdDateTime: t.createdDateTime,
        })),
      },
      users: {
        total: users.length,
        guests: users.filter((u: any) => u.userType === 'Guest').length,
        licensed: users.filter(
          (u: any) => Array.isArray(u.assignedLicenses) && u.assignedLicenses.length > 0
        ).length,
      },
      channels: {
        total: channelsStandard + channelsPrivate + channelsShared,
        standard: channelsStandard,
        private: channelsPrivate,
        shared: channelsShared,
      },
      apps: {
        installed: appsInstalledTotal,
        orgWide: orgWideAppsCount,
      },
      meetings: {
        scheduledLast30Days: meetingsResult.count,
      },
      security: {
        anyTeamAllowsGuestAccess: guestAccessAny,
        anyTeamAllowsExternalSharing: externalSharingAny,
        anyTeamAllowsAnonymousJoin: anonymousJoinAny,
        teamsScanned: teamsToScan.length,
        tenantAllowsGlobalAccessToApps,
      },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private async getAccessToken(config: MicrosoftTeamsConfig): Promise<string | null> {
    try {
      const response = await fetch(
        `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            scope: 'https://graph.microsoft.com/.default',
            grant_type: 'client_credentials',
          }),
        }
      );
      if (!response.ok) return null;
      const data = await response.json();
      return data.access_token;
    } catch {
      return null;
    }
  }

  private async getTeams(token: string): Promise<any[]> {
    const TEAMS_CAP = 5000;
    const results: any[] = [];
    let url: string | null = `${this.graphUrl}/groups?$filter=resourceProvisioningOptions/Any(x:x eq 'Team')&$top=999`;
    while (url && results.length < TEAMS_CAP) {
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

  private async getUsers(token: string): Promise<any[]> {
    const USERS_CAP = 10000;
    const results: any[] = [];
    let url: string | null = `${this.graphUrl}/users?$top=999&$select=id,displayName,userType,assignedLicenses`;
    while (url && results.length < USERS_CAP) {
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

  // /teams/{id}/members/$count returns a plain integer in the body.
  // ConsistencyLevel=eventual is required for $count requests.
  private async getTeamMemberCount(token: string, teamId: string): Promise<number | null> {
    const response = await fetch(`${this.graphUrl}/teams/${teamId}/members/$count`, {
      headers: { Authorization: `Bearer ${token}`, ConsistencyLevel: 'eventual' },
    });
    if (!response.ok) return null;
    const text = await response.text();
    const n = parseInt(text, 10);
    return Number.isFinite(n) ? n : null;
  }

  // Count of org-wide distributed Teams apps in the tenant's app catalog.
  private async getOrgWideAppsCount(token: string): Promise<number | null> {
    const response = await fetch(
      `${this.graphUrl}/appCatalogs/teamsApps?$filter=distributionMethod eq 'organization'`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) return null;
    const data: any = await response.json();
    return (data.value || []).length;
  }

  private async getTeamChannels(token: string, teamId: string): Promise<any[]> {
    const response = await fetch(`${this.graphUrl}/teams/${teamId}/channels?$expand=tabs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.value || [];
  }

  private async getTeamInstalledApps(token: string, teamId: string): Promise<any[]> {
    const response = await fetch(`${this.graphUrl}/teams/${teamId}/installedApps`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.value || [];
  }

  private async getTeamSettings(token: string, teamId: string): Promise<any | null> {
    // The /teams/{id}/settings endpoint does NOT exist in Graph; the team
    // resource itself carries guestSettings/messagingSettings/meetingSettings.
    // Go directly to /teams/{id} to save a round-trip.
    const teamResponse = await fetch(`${this.graphUrl}/teams/${teamId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!teamResponse.ok) throw new Error(`Failed: ${teamResponse.status}`);
    return teamResponse.json();
  }

  private async getTeamsAppSettings(token: string): Promise<any | null> {
    const response = await fetch(`${this.graphUrl}/teamwork/teamsAppSettings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      // Endpoint may not be available on every tenant
      return null;
    }
    return response.json();
  }

  private async getMeetingsLast30Days(token: string): Promise<{ count: number | null }> {
    // /communications/onlineMeetings without a user scope requires an
    // application access policy. 403/404 are expected on most tenants;
    // surface them as null instead of throwing or returning 0 so downstream
    // consumers know the data isn't available.
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const response = await fetch(
      `${this.graphUrl}/communications/onlineMeetings?$filter=startDateTime ge ${thirtyDaysAgo}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (response.status === 403 || response.status === 404) {
      // Likely missing application access policy. Don't fabricate a count.
      return { count: null };
    }
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return { count: (data.value || []).length };
  }
}
