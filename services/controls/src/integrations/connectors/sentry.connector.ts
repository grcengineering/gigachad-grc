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
    const [projects, issues, eventsData, releases] = await Promise.all([
      this.getProjects(config).catch(e => { errors.push(`projects: ${e.message}`); return []; }),
      this.getIssues(config).catch(e => { errors.push(`issues: ${e.message}`); return []; }),
      this.getEvents(config).catch(e => { errors.push(`events: ${e.message}`); return { total: 0, errors: 0, transactions: 0 }; }),
      this.getReleases(config).catch(e => { errors.push(`releases: ${e.message}`); return []; }),
    ]);
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentReleases = releases.filter((r: any) => {
      const ts = r.dateCreated ? Date.parse(r.dateCreated) : NaN;
      return !isNaN(ts) && ts >= sevenDaysAgo;
    }).length;
    return {
      projects: { total: projects.length, items: projects.slice(0, 50).map((p: any) => ({ slug: p.slug, platform: p.platform, status: p.status })) },
      issues: { total: issues.length, unresolved: issues.filter((i: any) => i.status === 'unresolved').length, critical: issues.filter((i: any) => i.level === 'fatal').length, high: issues.filter((i: any) => i.level === 'error').length },
      events: eventsData,
      releases: { total: releases.length, recentReleases },
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

  private async getEvents(config: SentryConfig): Promise<{ total: number; errors: number; transactions: number }> {
    const response = await fetch(`${this.baseUrl}/organizations/${config.organization}/events/?statsPeriod=7d`, { headers: { 'Authorization': `Bearer ${config.authToken}` } });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    const events: any[] = Array.isArray(data) ? data : (data.data || []);
    const errCount = events.filter((e: any) => {
      const type = e['event.type'] || e.eventType || e.type;
      return type === 'error' || type === 'default';
    }).length;
    const txCount = events.filter((e: any) => {
      const type = e['event.type'] || e.eventType || e.type;
      return type === 'transaction';
    }).length;
    return { total: events.length, errors: errCount, transactions: txCount };
  }

  private async getReleases(config: SentryConfig): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/organizations/${config.organization}/releases/?per_page=100`, { headers: { 'Authorization': `Bearer ${config.authToken}` } });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    return response.json();
  }
}

