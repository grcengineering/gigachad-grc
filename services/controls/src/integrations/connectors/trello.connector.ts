import { Injectable, Logger } from '@nestjs/common';

export interface TrelloConfig { apiKey: string; token: string; }
export interface TrelloSyncResult {
  boards: { total: number; items: Array<{ id: string; name: string; closed: boolean }> };
  cards: { total: number; open: number; archived: number };
  members: { total: number };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class TrelloConnector {
  private readonly logger = new Logger(TrelloConnector.name);
  private readonly baseUrl = 'https://api.trello.com/1';

  async testConnection(config: TrelloConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey || !config.token) return { success: false, message: 'API key and token are required' };
    try {
      const response = await fetch(`${this.baseUrl}/members/me?key=${config.apiKey}&token=${config.token}`);
      if (!response.ok) return { success: false, message: `API error: ${response.status}` };
      const data = await response.json();
      return { success: true, message: `Connected to Trello as ${data.fullName}` };
    } catch (error: any) { return { success: false, message: error.message }; }
  }

  async sync(config: TrelloConfig): Promise<TrelloSyncResult> {
    const errors: string[] = [];
    const boards = await this.getBoards(config).catch(e => { errors.push(`boards: ${e.message}`); return []; });

    const allCards: any[] = [];
    for (const board of boards.slice(0, 10)) {
      if (allCards.length >= 1000) break;
      const cards = await fetch(`${this.baseUrl}/boards/${board.id}/cards?key=${config.apiKey}&token=${config.token}`)
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`cards (${board.id}): ${r.status}`)))
        .catch(e => { errors.push(`cards: ${e.message}`); return []; });
      if (Array.isArray(cards)) allCards.push(...cards);
    }

    const orgs = await fetch(`${this.baseUrl}/members/me/organizations?key=${config.apiKey}&token=${config.token}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`organizations: ${r.status}`)))
      .catch(e => { errors.push(`organizations: ${e.message}`); return []; });

    const memberIds = new Set<string>();
    for (const org of (Array.isArray(orgs) ? orgs : []).slice(0, 10)) {
      const orgMembers = await fetch(`${this.baseUrl}/organizations/${org.id}/members?key=${config.apiKey}&token=${config.token}`)
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`org members (${org.id}): ${r.status}`)))
        .catch(e => { errors.push(`members: ${e.message}`); return []; });
      if (Array.isArray(orgMembers)) orgMembers.forEach((m: any) => memberIds.add(m.id));
    }

    return {
      boards: { total: boards.length, items: boards.slice(0, 50).map((b: any) => ({ id: b.id, name: b.name, closed: b.closed })) },
      cards: {
        total: allCards.length,
        open: allCards.filter((c: any) => !c.closed).length,
        archived: allCards.filter((c: any) => c.closed).length,
      },
      members: { total: memberIds.size },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private async getBoards(config: TrelloConfig): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/members/me/boards?key=${config.apiKey}&token=${config.token}`);
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    return response.json();
  }
}
