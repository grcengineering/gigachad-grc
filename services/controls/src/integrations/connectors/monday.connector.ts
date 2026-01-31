/* eslint-disable @typescript-eslint/no-explicit-any */
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
    const boards = await this.getBoards(config).catch(e => { errors.push(e.message); return []; });
    return {
      boards: { total: boards.length, items: boards.slice(0, 50).map((b: any) => ({ id: b.id, name: b.name, state: b.state })) },
      items: { total: 0 }, users: { total: 0, active: 0 },
      collectedAt: new Date().toISOString(), errors,
    };
  }

  private async getBoards(config: MondayConfig): Promise<any[]> {
    const response = await fetch(this.baseUrl, {
      method: 'POST', headers: { 'Authorization': config.apiToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ boards(limit: 100) { id name state } }' }),
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.data?.boards || [];
  }
}

