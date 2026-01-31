/* eslint-disable @typescript-eslint/no-explicit-any */
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
    const boards = await this.getBoards(config).catch(e => { errors.push(e.message); return []; });
    return {
      boards: { total: boards.length, items: boards.slice(0, 50).map((b: any) => ({ id: b.id, name: b.name, closed: b.closed })) },
      cards: { total: 0, open: 0, archived: 0 }, members: { total: 0 },
      collectedAt: new Date().toISOString(), errors,
    };
  }

  private async getBoards(config: TrelloConfig): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/members/me/boards?key=${config.apiKey}&token=${config.token}`);
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    return response.json();
  }
}

