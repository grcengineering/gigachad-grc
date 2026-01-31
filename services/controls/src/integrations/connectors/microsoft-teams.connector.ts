/* eslint-disable @typescript-eslint/no-explicit-any */
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
      memberCount: number;
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
    orgWide: number;
  };
  meetings: {
    scheduledLast30Days: number;
    avgDuration: number;
  };
  security: {
    guestAccessEnabled: boolean;
    externalSharingEnabled: boolean;
    anonymousJoinEnabled: boolean;
  };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class MicrosoftTeamsConnector {
  private readonly logger = new Logger(MicrosoftTeamsConnector.name);
  private readonly graphUrl = 'https://graph.microsoft.com/v1.0';

  async testConnection(config: MicrosoftTeamsConfig): Promise<{ success: boolean; message: string; details?: any }> {
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

    const teams = await this.getTeams(token).catch(e => { errors.push(`Teams: ${e.message}`); return []; });

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
          memberCount: 0,
          createdDateTime: t.createdDateTime,
        })),
      },
      users: { total: 0, guests: 0, licensed: 0 },
      channels: { total: 0, standard: 0, private: 0, shared: 0 },
      apps: { installed: 0, orgWide: 0 },
      meetings: { scheduledLast30Days: 0, avgDuration: 0 },
      security: { guestAccessEnabled: false, externalSharingEnabled: false, anonymousJoinEnabled: false },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private async getAccessToken(config: MicrosoftTeamsConfig): Promise<string | null> {
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

  private async getTeams(token: string): Promise<any[]> {
    const response = await fetch(`${this.graphUrl}/groups?$filter=resourceProvisioningOptions/Any(x:x eq 'Team')&$top=999`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.value || [];
  }
}

