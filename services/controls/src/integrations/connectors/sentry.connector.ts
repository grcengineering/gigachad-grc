/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

export interface SentryConfig { authToken: string; organization: string; }
export interface SentrySyncResult {
  projects: { total: number; items: Array<{ slug: string; platform: string; status: string }> };
  issues: { total: number; unresolved: number; critical: number; high: number };
  events: { total: number; errors: number; transactions: number };
  releases: { total: number; recentReleases: number };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class SentryConnector {
  private readonly logger = new Logger(SentryConnector.name);
  private readonly baseUrl = 'https://sentry.io/api/0';

  async testConnection(config: SentryConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.authToken || !config.organization) return { success: false, message: 'Auth token and organization are required' };
    try {
      const response = await fetch(`${this.baseUrl}/organizations/${config.organization}/`, { headers: { 'Authorization': `Bearer ${config.authToken}` } });
      if (!response.ok) return { success: false, message: `API error: ${response.status}` };
      const data = await response.json();
      return { success: true, message: `Connected to Sentry org: ${data.name}` };
    } catch (error: any) { return { success: false, message: error.message }; }
  }

  async sync(config: SentryConfig): Promise<SentrySyncResult> {
    const errors: string[] = [];
    const projects = await this.getProjects(config).catch(e => { errors.push(e.message); return []; });
    const issues = await this.getIssues(config).catch(e => { errors.push(e.message); return []; });
    return {
      projects: { total: projects.length, items: projects.slice(0, 50).map((p: any) => ({ slug: p.slug, platform: p.platform, status: p.status })) },
      issues: { total: issues.length, unresolved: issues.filter((i: any) => i.status === 'unresolved').length, critical: issues.filter((i: any) => i.level === 'fatal').length, high: issues.filter((i: any) => i.level === 'error').length },
      events: { total: 0, errors: 0, transactions: 0 }, releases: { total: 0, recentReleases: 0 },
      collectedAt: new Date().toISOString(), errors,
    };
  }

  private async getProjects(config: SentryConfig): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/organizations/${config.organization}/projects/`, { headers: { 'Authorization': `Bearer ${config.authToken}` } });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    return response.json();
  }

  private async getIssues(config: SentryConfig): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/organizations/${config.organization}/issues/?query=is:unresolved`, { headers: { 'Authorization': `Bearer ${config.authToken}` } });
    if (!response.ok) return [];
    return response.json();
  }
}

