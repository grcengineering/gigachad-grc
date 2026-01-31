/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

export interface HubSpotConfig {
  accessToken: string;
}

export interface HubSpotSyncResult {
  contacts: { total: number; recentlyCreated: number };
  companies: { total: number };
  deals: { total: number; open: number; won: number; lost: number };
  users: {
    total: number;
    superAdmins: number;
    items: Array<{ id: string; email: string; role: string }>;
  };
  integrations: { total: number; connected: number };
  security: { 
    twoFactorEnforced: boolean;
    ssoEnabled: boolean;
  };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class HubSpotConnector {
  private readonly logger = new Logger(HubSpotConnector.name);
  private readonly baseUrl = 'https://api.hubapi.com';

  async testConnection(config: HubSpotConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.accessToken) {
      return { success: false, message: 'Access token is required' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/account-info/v3/details`, {
        headers: { 'Authorization': `Bearer ${config.accessToken}` },
      });

      if (!response.ok) {
        return { success: false, message: response.status === 401 ? 'Invalid access token' : `API error: ${response.status}` };
      }

      const data = await response.json();
      return {
        success: true,
        message: `Connected to HubSpot portal: ${data.portalId}`,
        details: { portalId: data.portalId, timeZone: data.timeZone },
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async sync(config: HubSpotConfig): Promise<HubSpotSyncResult> {
    const errors: string[] = [];
    const headers = { 'Authorization': `Bearer ${config.accessToken}` };

    const [contacts, companies, deals, users] = await Promise.all([
      this.getContacts(headers).catch(e => { errors.push(`Contacts: ${e.message}`); return { total: 0 }; }),
      this.getCompanies(headers).catch(e => { errors.push(`Companies: ${e.message}`); return { total: 0 }; }),
      this.getDeals(headers).catch(e => { errors.push(`Deals: ${e.message}`); return []; }),
      this.getUsers(headers).catch(e => { errors.push(`Users: ${e.message}`); return []; }),
    ]);

    return {
      contacts: { total: contacts.total, recentlyCreated: 0 },
      companies: { total: companies.total },
      deals: {
        total: deals.length,
        open: deals.filter((d: any) => !d.properties?.hs_is_closed).length,
        won: deals.filter((d: any) => d.properties?.hs_is_closed === 'true' && d.properties?.hs_is_closed_won === 'true').length,
        lost: deals.filter((d: any) => d.properties?.hs_is_closed === 'true' && d.properties?.hs_is_closed_won !== 'true').length,
      },
      users: {
        total: users.length,
        superAdmins: users.filter((u: any) => u.superAdmin).length,
        items: users.slice(0, 50).map((u: any) => ({
          id: u.id,
          email: u.email,
          role: u.superAdmin ? 'Super Admin' : 'User',
        })),
      },
      integrations: { total: 0, connected: 0 },
      security: { twoFactorEnforced: false, ssoEnabled: false },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private async getContacts(headers: Record<string, string>) {
    const response = await fetch(`${this.baseUrl}/crm/v3/objects/contacts?limit=1`, { headers });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return { total: data.total || 0 };
  }

  private async getCompanies(headers: Record<string, string>) {
    const response = await fetch(`${this.baseUrl}/crm/v3/objects/companies?limit=1`, { headers });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return { total: data.total || 0 };
  }

  private async getDeals(headers: Record<string, string>): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/crm/v3/objects/deals?limit=100&properties=hs_is_closed,hs_is_closed_won`, { headers });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.results || [];
  }

  private async getUsers(headers: Record<string, string>): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/settings/v3/users`, { headers });
    if (!response.ok) return [];
    const data = await response.json();
    return data.results || [];
  }
}

