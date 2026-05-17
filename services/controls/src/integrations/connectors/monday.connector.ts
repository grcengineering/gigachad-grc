import { Injectable, Logger } from '@nestjs/common';

export interface MondayConfig { apiToken: string; }
export interface MondaySyncResult {
  boards: { total: number; items: Array<{ id: string; name: string; state: string }> };
  items: { total: number };
  users: { total: number; active: number };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class MondayConnector {
  private readonly logger = new Logger(MondayConnector.name);
  private readonly baseUrl = 'https://api.monday.com/v2';

  async testConnection(config: MondayConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiToken) return { success: false, message: 'API token is required' };
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST', headers: { 'Authorization': config.apiToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ me { id name email } }' }),
      });
      if (!response.ok) return { success: false, message: `API error: ${response.status}` };
      const data = await response.json();
      return { success: true, message: `Connected to Monday.com as ${data.data?.me?.name}` };
    } catch (error: any) { return { success: false, message: error.message }; }
  }

  async sync(config: MondayConfig): Promise<MondaySyncResult> {
    const errors: string[] = [];
    const boards = await this.getBoardsWithItems(config).catch(e => { errors.push(`boards: ${e.message}`); return []; });

    let totalItems = 0;
    for (const board of boards) {
      const initialItems = board.items_page?.items || [];
      totalItems += initialItems.length;
      let cursor = board.items_page?.cursor;
      while (cursor && totalItems < 5000) {
        const next = await this.fetchNextItemsPage(config, cursor).catch(e => { errors.push(`items: ${e.message}`); return null; });
        if (!next) break;
        totalItems += (next.items || []).length;
        cursor = next.cursor;
      }
    }

    const users = await this.getUsers(config).catch(e => { errors.push(`users: ${e.message}`); return []; });

    return {
      boards: { total: boards.length, items: boards.slice(0, 50).map((b: any) => ({ id: b.id, name: b.name, state: b.state })) },
      items: { total: totalItems },
      users: {
        total: users.length,
        active: users.filter((u: any) => u.enabled === true).length,
      },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private async getBoardsWithItems(config: MondayConfig): Promise<any[]> {
    const response = await fetch(this.baseUrl, {
      method: 'POST', headers: { 'Authorization': config.apiToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ boards(limit: 100) { id name state items_page { cursor items { id } } } }' }),
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    if (data.errors) throw new Error(data.errors[0]?.message || 'GraphQL error');
    return data.data?.boards || [];
  }

  private async fetchNextItemsPage(config: MondayConfig, cursor: string): Promise<{ items: any[]; cursor: string | null } | null> {
    const response = await fetch(this.baseUrl, {
      method: 'POST', headers: { 'Authorization': config.apiToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: `{ next_items_page(cursor: "${cursor}") { cursor items { id } } }` }),
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    if (data.errors) throw new Error(data.errors[0]?.message || 'GraphQL error');
    return data.data?.next_items_page || null;
  }

  private async getUsers(config: MondayConfig): Promise<any[]> {
    const response = await fetch(this.baseUrl, {
      method: 'POST', headers: { 'Authorization': config.apiToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ users { id enabled } }' }),
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    if (data.errors) throw new Error(data.errors[0]?.message || 'GraphQL error');
    return data.data?.users || [];
  }
}
