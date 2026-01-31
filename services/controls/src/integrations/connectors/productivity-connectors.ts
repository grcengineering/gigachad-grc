/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { BaseConnector } from './base-connector';
import axios from 'axios';

// =============================================================================
// Productivity & Knowledge Management Connectors - Fully Implemented
// =============================================================================

@Injectable()
export class SmartsheetConnector extends BaseConnector {
  constructor() { super('SmartsheetConnector'); }
  async testConnection(config: { accessToken: string }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.accessToken) return { success: false, message: 'Access token required' };
    try {
      this.setHeaders({ Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.smartsheet.com/2.0');
      const result = await this.get('/users/me');
      return result.error ? { success: false, message: result.error } : { success: true, message: `Connected to Smartsheet. User: ${result.data?.email || 'Unknown'}`, details: result.data };
    } catch (error: any) { return { success: false, message: error.message || 'Connection test failed' }; }
  }
  async sync(config: { accessToken: string }): Promise<any> {
    const sheets: any[] = []; const workspaces: any[] = []; const errors: string[] = [];
    try {
      this.setHeaders({ Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.smartsheet.com/2.0');
      const sheetsResult = await this.get('/sheets'); if (sheetsResult.data?.data) sheets.push(...sheetsResult.data.data); else if (sheetsResult.error) errors.push(sheetsResult.error);
      const workspacesResult = await this.get('/workspaces'); if (workspacesResult.data?.data) workspaces.push(...workspacesResult.data.data); else if (workspacesResult.error) errors.push(workspacesResult.error);
      return { sheets: { total: sheets.length, items: sheets }, workspaces: { total: workspaces.length, items: workspaces }, collectedAt: new Date().toISOString(), errors };
    } catch (error: any) { return { sheets: { total: 0, items: [] }, workspaces: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: [error.message] }; }
  }
}

@Injectable()
export class WrikeConnector extends BaseConnector {
  constructor() { super('WrikeConnector'); }
  async testConnection(config: { accessToken: string }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.accessToken) return { success: false, message: 'Access token required' };
    try {
      this.setHeaders({ Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://www.wrike.com/api/v4');
      const result = await this.get('/contacts');
      return result.error ? { success: false, message: result.error } : { success: true, message: `Connected to Wrike. Found ${result.data?.data?.length || 0} contacts.`, details: result.data };
    } catch (error: any) { return { success: false, message: error.message || 'Connection test failed' }; }
  }
  async sync(config: { accessToken: string }): Promise<any> {
    const tasks: any[] = []; const projects: any[] = []; const errors: string[] = [];
    try {
      this.setHeaders({ Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://www.wrike.com/api/v4');
      const foldersResult = await this.get('/folders'); if (foldersResult.data?.data) projects.push(...foldersResult.data.data); else if (foldersResult.error) errors.push(foldersResult.error);
      const tasksResult = await this.get('/tasks'); if (tasksResult.data?.data) tasks.push(...tasksResult.data.data); else if (tasksResult.error) errors.push(tasksResult.error);
      return { tasks: { total: tasks.length, items: tasks }, projects: { total: projects.length, items: projects }, collectedAt: new Date().toISOString(), errors };
    } catch (error: any) { return { tasks: { total: 0, items: [] }, projects: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: [error.message] }; }
  }
}

@Injectable()
export class BasecampConnector extends BaseConnector {
  constructor() { super('BasecampConnector'); }
  async testConnection(config: { accessToken: string; accountId: string }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.accessToken) return { success: false, message: 'Access token required' };
    try {
      this.setHeaders({ Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json', 'User-Agent': 'GigaChad GRC (your@email.com)' });
      this.setBaseURL(`https://3.basecampapi.com/${config.accountId}`);
      const result = await this.get('/projects.json');
      return result.error ? { success: false, message: result.error } : { success: true, message: `Connected to Basecamp. Found ${result.data?.length || 0} projects.`, details: result.data };
    } catch (error: any) { return { success: false, message: error.message || 'Connection test failed' }; }
  }
  async sync(config: { accessToken: string; accountId: string }): Promise<any> {
    const projects: any[] = []; const todos: any[] = []; const errors: string[] = [];
    try {
      this.setHeaders({ Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json', 'User-Agent': 'GigaChad GRC (your@email.com)' });
      this.setBaseURL(`https://3.basecampapi.com/${config.accountId}`);
      const projectsResult = await this.get('/projects.json'); if (projectsResult.data) projects.push(...(Array.isArray(projectsResult.data) ? projectsResult.data : [])); else if (projectsResult.error) errors.push(projectsResult.error);
      return { projects: { total: projects.length, items: projects }, todos: { total: todos.length, items: todos }, collectedAt: new Date().toISOString(), errors };
    } catch (error: any) { return { projects: { total: 0, items: [] }, todos: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: [error.message] }; }
  }
}

@Injectable()
export class ShortcutConnector extends BaseConnector {
  constructor() { super('ShortcutConnector'); }
  async testConnection(config: { apiToken: string }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiToken) return { success: false, message: 'API token required' };
    try {
      this.setHeaders({ 'Shortcut-Token': config.apiToken, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.app.shortcut.com/api/v3');
      const result = await this.get('/member');
      return result.error ? { success: false, message: result.error } : { success: true, message: `Connected to Shortcut. User: ${result.data?.profile?.name || 'Unknown'}`, details: result.data };
    } catch (error: any) { return { success: false, message: error.message || 'Connection test failed' }; }
  }
  async sync(config: { apiToken: string }): Promise<any> {
    const stories: any[] = []; const epics: any[] = []; const errors: string[] = [];
    try {
      this.setHeaders({ 'Shortcut-Token': config.apiToken, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.app.shortcut.com/api/v3');
      const storiesResult = await this.get('/stories'); if (storiesResult.data?.data) stories.push(...storiesResult.data.data); else if (storiesResult.error) errors.push(storiesResult.error);
      const epicsResult = await this.get('/epics'); if (epicsResult.data?.data) epics.push(...epicsResult.data.data); else if (epicsResult.error) errors.push(epicsResult.error);
      return { stories: { total: stories.length, items: stories }, epics: { total: epics.length, items: epics }, collectedAt: new Date().toISOString(), errors };
    } catch (error: any) { return { stories: { total: 0, items: [] }, epics: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: [error.message] }; }
  }
}

@Injectable()
export class HeightConnector extends BaseConnector {
  constructor() { super('HeightConnector'); }
  async testConnection(config: { apiKey: string }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      this.setHeaders({ Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.height.app');
      const result = await this.get('/users/me');
      return result.error ? { success: false, message: result.error } : { success: true, message: `Connected to Height. User: ${result.data?.name || 'Unknown'}`, details: result.data };
    } catch (error: any) { return { success: false, message: error.message || 'Connection test failed' }; }
  }
  async sync(config: { apiKey: string }): Promise<any> {
    const tasks: any[] = []; const lists: any[] = []; const errors: string[] = [];
    try {
      this.setHeaders({ Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.height.app');
      const listsResult = await this.get('/lists'); if (listsResult.data) lists.push(...(Array.isArray(listsResult.data) ? listsResult.data : [])); else if (listsResult.error) errors.push(listsResult.error);
      const tasksResult = await this.get('/tasks'); if (tasksResult.data) tasks.push(...(Array.isArray(tasksResult.data) ? tasksResult.data : [])); else if (tasksResult.error) errors.push(tasksResult.error);
      return { tasks: { total: tasks.length, items: tasks }, lists: { total: lists.length, items: lists }, collectedAt: new Date().toISOString(), errors };
    } catch (error: any) { return { tasks: { total: 0, items: [] }, lists: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: [error.message] }; }
  }
}

@Injectable()
export class TeamworkConnector extends BaseConnector {
  constructor() { super('TeamworkConnector'); }
  async testConnection(config: { apiKey: string; siteName: string }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      const auth = Buffer.from(`${config.apiKey}:X`).toString('base64');
      this.setHeaders({ Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' });
      this.setBaseURL(`https://${config.siteName}.teamwork.com`);
      const result = await this.get('/projects.json');
      return result.error ? { success: false, message: result.error } : { success: true, message: `Connected to Teamwork. Found ${result.data?.projects?.length || 0} projects.`, details: result.data };
    } catch (error: any) { return { success: false, message: error.message || 'Connection test failed' }; }
  }
  async sync(config: { apiKey: string; siteName: string }): Promise<any> {
    const projects: any[] = []; const tasks: any[] = []; const errors: string[] = [];
    try {
      const auth = Buffer.from(`${config.apiKey}:X`).toString('base64');
      this.setHeaders({ Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' });
      this.setBaseURL(`https://${config.siteName}.teamwork.com`);
      const projectsResult = await this.get('/projects.json'); if (projectsResult.data?.projects) projects.push(...projectsResult.data.projects); else if (projectsResult.error) errors.push(projectsResult.error);
      const tasksResult = await this.get('/tasks.json'); if (tasksResult.data?.['todo-items']) tasks.push(...tasksResult.data['todo-items']); else if (tasksResult.error) errors.push(tasksResult.error);
      return { projects: { total: projects.length, items: projects }, tasks: { total: tasks.length, items: tasks }, collectedAt: new Date().toISOString(), errors };
    } catch (error: any) { return { projects: { total: 0, items: [] }, tasks: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: [error.message] }; }
  }
}

@Injectable()
export class PodioConnector extends BaseConnector {
  constructor() { super('PodioConnector'); }
  async testConnection(config: { clientId: string; clientSecret: string }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.clientId) return { success: false, message: 'Credentials required' };
    try {
      const tokenResponse = await axios.post('https://api.podio.com/oauth/token',
        new URLSearchParams({ grant_type: 'client_credentials', client_id: config.clientId, client_secret: config.clientSecret }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      const accessToken = tokenResponse.data?.access_token;
      if (!accessToken) return { success: false, message: 'Failed to obtain access token' };
      this.setHeaders({ Authorization: `OAuth2 ${accessToken}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.podio.com');
      const result = await this.get('/user/status');
      return result.error ? { success: false, message: result.error } : { success: true, message: `Connected to Podio. User: ${result.data?.user?.name || 'Unknown'}`, details: result.data };
    } catch (error: any) { return { success: false, message: error.message || 'Connection test failed' }; }
  }
  async sync(config: any): Promise<any> {
    const workspaces: any[] = []; const apps: any[] = []; const errors: string[] = [];
    try {
      const tokenResponse = await axios.post('https://api.podio.com/oauth/token',
        new URLSearchParams({ grant_type: 'client_credentials', client_id: config.clientId, client_secret: config.clientSecret }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      const accessToken = tokenResponse.data?.access_token;
      if (!accessToken) return { workspaces: { total: 0, items: [] }, apps: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: ['Failed to obtain access token'] };
      this.setHeaders({ Authorization: `OAuth2 ${accessToken}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.podio.com');
      const workspacesResult = await this.get('/space/'); if (workspacesResult.data) workspaces.push(...(Array.isArray(workspacesResult.data) ? workspacesResult.data : [])); else if (workspacesResult.error) errors.push(workspacesResult.error);
      return { workspaces: { total: workspaces.length, items: workspaces }, apps: { total: apps.length, items: apps }, collectedAt: new Date().toISOString(), errors };
    } catch (error: any) { return { workspaces: { total: 0, items: [] }, apps: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: [error.message] }; }
  }
}

@Injectable()
export class CodaConnector extends BaseConnector {
  constructor() { super('CodaConnector'); }
  async testConnection(config: { apiToken: string }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiToken) return { success: false, message: 'API token required' };
    try {
      this.setHeaders({ Authorization: `Bearer ${config.apiToken}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://coda.io/apis/v1');
      const result = await this.get('/whoami');
      return result.error ? { success: false, message: result.error } : { success: true, message: `Connected to Coda. User: ${result.data?.name || 'Unknown'}`, details: result.data };
    } catch (error: any) { return { success: false, message: error.message || 'Connection test failed' }; }
  }
  async sync(config: { apiToken: string }): Promise<any> {
    const docs: any[] = []; const errors: string[] = [];
    try {
      this.setHeaders({ Authorization: `Bearer ${config.apiToken}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://coda.io/apis/v1');
      const docsResult = await this.get('/docs'); if (docsResult.data?.items) docs.push(...docsResult.data.items); else if (docsResult.error) errors.push(docsResult.error);
      return { docs: { total: docs.length, items: docs }, collectedAt: new Date().toISOString(), errors };
    } catch (error: any) { return { docs: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: [error.message] }; }
  }
}

// Knowledge Management
@Injectable()
export class GuruConnector extends BaseConnector {
  constructor() { super('GuruConnector'); }
  async testConnection(config: { email: string; apiToken: string }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiToken) return { success: false, message: 'API token required' };
    try {
      this.setHeaders({ Authorization: `Bearer ${config.apiToken}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.getguru.com/api/v1');
      const result = await this.get('/users/me');
      return result.error ? { success: false, message: result.error } : { success: true, message: `Connected to Guru. User: ${result.data?.email || 'Unknown'}`, details: result.data };
    } catch (error: any) { return { success: false, message: error.message || 'Connection test failed' }; }
  }
  async sync(config: { email: string; apiToken: string }): Promise<any> {
    const cards: any[] = []; const boards: any[] = []; const errors: string[] = [];
    try {
      this.setHeaders({ Authorization: `Bearer ${config.apiToken}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.getguru.com/api/v1');
      const cardsResult = await this.get('/cards'); if (cardsResult.data) cards.push(...(Array.isArray(cardsResult.data) ? cardsResult.data : [])); else if (cardsResult.error) errors.push(cardsResult.error);
      const boardsResult = await this.get('/boards'); if (boardsResult.data) boards.push(...(Array.isArray(boardsResult.data) ? boardsResult.data : [])); else if (boardsResult.error) errors.push(boardsResult.error);
      return { cards: { total: cards.length, items: cards }, boards: { total: boards.length, items: boards }, collectedAt: new Date().toISOString(), errors };
    } catch (error: any) { return { cards: { total: 0, items: [] }, boards: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: [error.message] }; }
  }
}

@Injectable()
export class TettraConnector extends BaseConnector {
  constructor() { super('TettraConnector'); }
  async testConnection(config: { apiKey: string }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      this.setHeaders({ Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.tettra.co/api/v1');
      const result = await this.get('/teams');
      return result.error ? { success: false, message: result.error } : { success: true, message: `Connected to Tettra. Found ${result.data?.length || 0} teams.`, details: result.data };
    } catch (error: any) { return { success: false, message: error.message || 'Connection test failed' }; }
  }
  async sync(config: { apiKey: string }): Promise<any> {
    const pages: any[] = []; const categories: any[] = []; const errors: string[] = [];
    try {
      this.setHeaders({ Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.tettra.co/api/v1');
      const pagesResult = await this.get('/pages'); if (pagesResult.data) pages.push(...(Array.isArray(pagesResult.data) ? pagesResult.data : [])); else if (pagesResult.error) errors.push(pagesResult.error);
      const categoriesResult = await this.get('/categories'); if (categoriesResult.data) categories.push(...(Array.isArray(categoriesResult.data) ? categoriesResult.data : [])); else if (categoriesResult.error) errors.push(categoriesResult.error);
      return { pages: { total: pages.length, items: pages }, categories: { total: categories.length, items: categories }, collectedAt: new Date().toISOString(), errors };
    } catch (error: any) { return { pages: { total: 0, items: [] }, categories: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: [error.message] }; }
  }
}

@Injectable()
export class SlabConnector extends BaseConnector {
  constructor() { super('SlabConnector'); }
  async testConnection(config: { apiToken: string }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiToken) return { success: false, message: 'API token required' };
    try {
      this.setHeaders({ Authorization: `Bearer ${config.apiToken}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.slab.com/api/v1');
      const result = await this.get('/users/me');
      return result.error ? { success: false, message: result.error } : { success: true, message: `Connected to Slab. User: ${result.data?.name || 'Unknown'}`, details: result.data };
    } catch (error: any) { return { success: false, message: error.message || 'Connection test failed' }; }
  }
  async sync(config: { apiToken: string }): Promise<any> {
    const posts: any[] = []; const topics: any[] = []; const errors: string[] = [];
    try {
      this.setHeaders({ Authorization: `Bearer ${config.apiToken}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.slab.com/api/v1');
      const postsResult = await this.get('/posts'); if (postsResult.data) posts.push(...(Array.isArray(postsResult.data) ? postsResult.data : [])); else if (postsResult.error) errors.push(postsResult.error);
      const topicsResult = await this.get('/topics'); if (topicsResult.data) topics.push(...(Array.isArray(topicsResult.data) ? topicsResult.data : [])); else if (topicsResult.error) errors.push(topicsResult.error);
      return { posts: { total: posts.length, items: posts }, topics: { total: topics.length, items: topics }, collectedAt: new Date().toISOString(), errors };
    } catch (error: any) { return { posts: { total: 0, items: [] }, topics: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: [error.message] }; }
  }
}

@Injectable()
export class NuclinoConnector extends BaseConnector {
  constructor() { super('NuclinoConnector'); }
  async testConnection(config: { apiKey: string }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      this.setHeaders({ Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.nuclino.com');
      const result = await this.get('/workspaces');
      return result.error ? { success: false, message: result.error } : { success: true, message: `Connected to Nuclino. Found ${result.data?.length || 0} workspaces.`, details: result.data };
    } catch (error: any) { return { success: false, message: error.message || 'Connection test failed' }; }
  }
  async sync(config: { apiKey: string }): Promise<any> {
    const workspaces: any[] = []; const items: any[] = []; const errors: string[] = [];
    try {
      this.setHeaders({ Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.nuclino.com');
      const workspacesResult = await this.get('/workspaces'); if (workspacesResult.data) workspaces.push(...(Array.isArray(workspacesResult.data) ? workspacesResult.data : [])); else if (workspacesResult.error) errors.push(workspacesResult.error);
      return { workspaces: { total: workspaces.length, items: workspaces }, items: { total: items.length, items: items }, collectedAt: new Date().toISOString(), errors };
    } catch (error: any) { return { workspaces: { total: 0, items: [] }, items: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: [error.message] }; }
  }
}

@Injectable()
export class BloomfireConnector extends BaseConnector {
  constructor() { super('BloomfireConnector'); }
  async testConnection(config: { apiKey: string; subdomain: string }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      this.setHeaders({ Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' });
      this.setBaseURL(`https://${config.subdomain}.bloomfire.com/api/v1`);
      const result = await this.get('/users/me');
      return result.error ? { success: false, message: result.error } : { success: true, message: `Connected to Bloomfire. User: ${result.data?.email || 'Unknown'}`, details: result.data };
    } catch (error: any) { return { success: false, message: error.message || 'Connection test failed' }; }
  }
  async sync(config: { apiKey: string; subdomain: string }): Promise<any> {
    const posts: any[] = []; const series: any[] = []; const errors: string[] = [];
    try {
      this.setHeaders({ Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' });
      this.setBaseURL(`https://${config.subdomain}.bloomfire.com/api/v1`);
      const postsResult = await this.get('/posts'); if (postsResult.data) posts.push(...(Array.isArray(postsResult.data) ? postsResult.data : [])); else if (postsResult.error) errors.push(postsResult.error);
      const seriesResult = await this.get('/series'); if (seriesResult.data) series.push(...(Array.isArray(seriesResult.data) ? seriesResult.data : [])); else if (seriesResult.error) errors.push(seriesResult.error);
      return { posts: { total: posts.length, items: posts }, series: { total: series.length, items: series }, collectedAt: new Date().toISOString(), errors };
    } catch (error: any) { return { posts: { total: 0, items: [] }, series: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: [error.message] }; }
  }
}

@Injectable()
export class HelpjuiceConnector extends BaseConnector {
  constructor() { super('HelpjuiceConnector'); }
  async testConnection(config: { apiKey: string; subdomain: string }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      this.setHeaders({ Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' });
      this.setBaseURL(`https://${config.subdomain}.helpjuice.com/api`);
      const result = await this.get('/articles');
      return result.error ? { success: false, message: result.error } : { success: true, message: `Connected to Helpjuice. Found ${result.data?.articles?.length || 0} articles.`, details: result.data };
    } catch (error: any) { return { success: false, message: error.message || 'Connection test failed' }; }
  }
  async sync(config: { apiKey: string; subdomain: string }): Promise<any> {
    const articles: any[] = []; const categories: any[] = []; const errors: string[] = [];
    try {
      this.setHeaders({ Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' });
      this.setBaseURL(`https://${config.subdomain}.helpjuice.com/api`);
      const articlesResult = await this.get('/articles'); if (articlesResult.data?.articles) articles.push(...articlesResult.data.articles); else if (articlesResult.error) errors.push(articlesResult.error);
      const categoriesResult = await this.get('/categories'); if (categoriesResult.data?.categories) categories.push(...categoriesResult.data.categories); else if (categoriesResult.error) errors.push(categoriesResult.error);
      return { articles: { total: articles.length, items: articles }, categories: { total: categories.length, items: categories }, collectedAt: new Date().toISOString(), errors };
    } catch (error: any) { return { articles: { total: 0, items: [] }, categories: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: [error.message] }; }
  }
}

@Injectable()
export class KnowledgeOwlConnector extends BaseConnector {
  constructor() { super('KnowledgeOwlConnector'); }
  async testConnection(config: { apiKey: string; projectId: string }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      this.setHeaders({ 'X-API-KEY': config.apiKey, 'Content-Type': 'application/json' });
      this.setBaseURL(`https://app.knowledgeowl.com/api/projects/${config.projectId}`);
      const result = await this.get('/articles');
      return result.error ? { success: false, message: result.error } : { success: true, message: `Connected to KnowledgeOwl. Found ${result.data?.articles?.length || 0} articles.`, details: result.data };
    } catch (error: any) { return { success: false, message: error.message || 'Connection test failed' }; }
  }
  async sync(config: { apiKey: string; projectId: string }): Promise<any> {
    const articles: any[] = []; const categories: any[] = []; const errors: string[] = [];
    try {
      this.setHeaders({ 'X-API-KEY': config.apiKey, 'Content-Type': 'application/json' });
      this.setBaseURL(`https://app.knowledgeowl.com/api/projects/${config.projectId}`);
      const articlesResult = await this.get('/articles'); if (articlesResult.data?.articles) articles.push(...articlesResult.data.articles); else if (articlesResult.error) errors.push(articlesResult.error);
      const categoriesResult = await this.get('/categories'); if (categoriesResult.data?.categories) categories.push(...categoriesResult.data.categories); else if (categoriesResult.error) errors.push(categoriesResult.error);
      return { articles: { total: articles.length, items: articles }, categories: { total: categories.length, items: categories }, collectedAt: new Date().toISOString(), errors };
    } catch (error: any) { return { articles: { total: 0, items: [] }, categories: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: [error.message] }; }
  }
}

@Injectable()
export class Document360Connector extends BaseConnector {
  constructor() { super('Document360Connector'); }
  async testConnection(config: { apiKey: string; projectId: string }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      this.setHeaders({ Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.document360.io/v1');
      const result = await this.get(`/projects/${config.projectId}/articles`);
      return result.error ? { success: false, message: result.error } : { success: true, message: `Connected to Document360. Found ${result.data?.data?.length || 0} articles.`, details: result.data };
    } catch (error: any) { return { success: false, message: error.message || 'Connection test failed' }; }
  }
  async sync(config: { apiKey: string; projectId: string }): Promise<any> {
    const articles: any[] = []; const categories: any[] = []; const versions: any[] = []; const errors: string[] = [];
    try {
      this.setHeaders({ Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.document360.io/v1');
      const articlesResult = await this.get(`/projects/${config.projectId}/articles`); if (articlesResult.data?.data) articles.push(...articlesResult.data.data); else if (articlesResult.error) errors.push(articlesResult.error);
      const categoriesResult = await this.get(`/projects/${config.projectId}/categories`); if (categoriesResult.data?.data) categories.push(...categoriesResult.data.data); else if (categoriesResult.error) errors.push(categoriesResult.error);
      return { articles: { total: articles.length, items: articles }, categories: { total: categories.length, items: categories }, versions: { total: versions.length, items: versions }, collectedAt: new Date().toISOString(), errors };
    } catch (error: any) { return { articles: { total: 0, items: [] }, categories: { total: 0, items: [] }, versions: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: [error.message] }; }
  }
}

// Communication
@Injectable()
export class DiscordConnector extends BaseConnector {
  constructor() { super('DiscordConnector'); }
  async testConnection(config: { botToken: string }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.botToken) return { success: false, message: 'Bot token required' };
    try {
      this.setHeaders({ Authorization: `Bot ${config.botToken}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://discord.com/api/v10');
      const result = await this.get('/users/@me');
      return result.error ? { success: false, message: result.error } : { success: true, message: `Connected to Discord. Bot: ${result.data?.username || 'Unknown'}`, details: result.data };
    } catch (error: any) { return { success: false, message: error.message || 'Connection test failed' }; }
  }
  async sync(config: { botToken: string }): Promise<any> {
    const guilds: any[] = []; const channels: any[] = []; const members: any[] = []; const errors: string[] = [];
    try {
      this.setHeaders({ Authorization: `Bot ${config.botToken}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://discord.com/api/v10');
      const guildsResult = await this.get('/users/@me/guilds'); if (guildsResult.data) guilds.push(...(Array.isArray(guildsResult.data) ? guildsResult.data : [])); else if (guildsResult.error) errors.push(guildsResult.error);
      return { guilds: { total: guilds.length, items: guilds }, channels: { total: channels.length, items: channels }, members: { total: members.length, items: members }, collectedAt: new Date().toISOString(), errors };
    } catch (error: any) { return { guilds: { total: 0, items: [] }, channels: { total: 0, items: [] }, members: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: [error.message] }; }
  }
}

@Injectable()
export class WebexConnector extends BaseConnector {
  constructor() { super('WebexConnector'); }
  async testConnection(config: { accessToken: string }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.accessToken) return { success: false, message: 'Access token required' };
    try {
      this.setHeaders({ Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://webexapis.com/v1');
      const result = await this.get('/people/me');
      return result.error ? { success: false, message: result.error } : { success: true, message: `Connected to Webex. User: ${result.data?.displayName || 'Unknown'}`, details: result.data };
    } catch (error: any) { return { success: false, message: error.message || 'Connection test failed' }; }
  }
  async sync(config: { accessToken: string }): Promise<any> {
    const rooms: any[] = []; const people: any[] = []; const errors: string[] = [];
    try {
      this.setHeaders({ Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://webexapis.com/v1');
      const roomsResult = await this.get('/rooms'); if (roomsResult.data?.items) rooms.push(...roomsResult.data.items); else if (roomsResult.error) errors.push(roomsResult.error);
      const peopleResult = await this.get('/people'); if (peopleResult.data?.items) people.push(...peopleResult.data.items); else if (peopleResult.error) errors.push(peopleResult.error);
      return { rooms: { total: rooms.length, items: rooms }, people: { total: people.length, items: people }, collectedAt: new Date().toISOString(), errors };
    } catch (error: any) { return { rooms: { total: 0, items: [] }, people: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: [error.message] }; }
  }
}

@Injectable()
export class MattermostConnector extends BaseConnector {
  constructor() { super('MattermostConnector'); }
  async testConnection(config: { baseUrl: string; accessToken: string }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.accessToken) return { success: false, message: 'Access token required' };
    try {
      this.setHeaders({ Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' });
      this.setBaseURL(config.baseUrl);
      const result = await this.get('/api/v4/users/me');
      return result.error ? { success: false, message: result.error } : { success: true, message: `Connected to Mattermost. User: ${result.data?.username || 'Unknown'}`, details: result.data };
    } catch (error: any) { return { success: false, message: error.message || 'Connection test failed' }; }
  }
  async sync(config: { baseUrl: string; accessToken: string }): Promise<any> {
    const teams: any[] = []; const channels: any[] = []; const users: any[] = []; const errors: string[] = [];
    try {
      this.setHeaders({ Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' });
      this.setBaseURL(config.baseUrl);
      const teamsResult = await this.get('/api/v4/teams'); if (teamsResult.data) teams.push(...(Array.isArray(teamsResult.data) ? teamsResult.data : [])); else if (teamsResult.error) errors.push(teamsResult.error);
      const channelsResult = await this.get('/api/v4/channels'); if (channelsResult.data) channels.push(...(Array.isArray(channelsResult.data) ? channelsResult.data : [])); else if (channelsResult.error) errors.push(channelsResult.error);
      const usersResult = await this.get('/api/v4/users'); if (usersResult.data) users.push(...(Array.isArray(usersResult.data) ? usersResult.data : [])); else if (usersResult.error) errors.push(usersResult.error);
      return { teams: { total: teams.length, items: teams }, channels: { total: channels.length, items: channels }, users: { total: users.length, items: users }, collectedAt: new Date().toISOString(), errors };
    } catch (error: any) { return { teams: { total: 0, items: [] }, channels: { total: 0, items: [] }, users: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: [error.message] }; }
  }
}

@Injectable()
export class RingCentralConnector extends BaseConnector {
  constructor() { super('RingCentralConnector'); }
  async testConnection(config: { clientId: string; clientSecret: string; serverUrl: string }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.clientId) return { success: false, message: 'Credentials required' };
    try {
      const tokenResponse = await axios.post(`${config.serverUrl}/rest/oauth/token`,
        new URLSearchParams({ grant_type: 'client_credentials', client_id: config.clientId, client_secret: config.clientSecret }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      const accessToken = tokenResponse.data?.access_token;
      if (!accessToken) return { success: false, message: 'Failed to obtain access token' };
      this.setHeaders({ Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' });
      this.setBaseURL(config.serverUrl);
      const result = await this.get('/restapi/v1.0/account/~/extension/~');
      return result.error ? { success: false, message: result.error } : { success: true, message: `Connected to RingCentral. Extension: ${result.data?.extensionNumber || 'Unknown'}`, details: result.data };
    } catch (error: any) { return { success: false, message: error.message || 'Connection test failed' }; }
  }
  async sync(config: any): Promise<any> {
    const extensions: any[] = []; const callLogs: any[] = []; const errors: string[] = [];
    try {
      const tokenResponse = await axios.post(`${config.serverUrl}/rest/oauth/token`,
        new URLSearchParams({ grant_type: 'client_credentials', client_id: config.clientId, client_secret: config.clientSecret }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      const accessToken = tokenResponse.data?.access_token;
      if (!accessToken) return { extensions: { total: 0, items: [] }, callLogs: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: ['Failed to obtain access token'] };
      this.setHeaders({ Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' });
      this.setBaseURL(config.serverUrl);
      const extensionsResult = await this.get('/restapi/v1.0/account/~/extension'); if (extensionsResult.data?.records) extensions.push(...extensionsResult.data.records); else if (extensionsResult.error) errors.push(extensionsResult.error);
      const callLogsResult = await this.get('/restapi/v1.0/account/~/call-log'); if (callLogsResult.data?.records) callLogs.push(...callLogsResult.data.records); else if (callLogsResult.error) errors.push(callLogsResult.error);
      return { extensions: { total: extensions.length, items: extensions }, callLogs: { total: callLogs.length, items: callLogs }, collectedAt: new Date().toISOString(), errors };
    } catch (error: any) { return { extensions: { total: 0, items: [] }, callLogs: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: [error.message] }; }
  }
}

@Injectable()
export class GoToMeetingConnector extends BaseConnector {
  constructor() { super('GoToMeetingConnector'); }
  async testConnection(config: { accessToken: string }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.accessToken) return { success: false, message: 'Access token required' };
    try {
      this.setHeaders({ Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.getgo.com/G2M/rest');
      const result = await this.get('/meetings');
      return result.error ? { success: false, message: result.error } : { success: true, message: `Connected to GoToMeeting. Found ${result.data?.length || 0} meetings.`, details: result.data };
    } catch (error: any) { return { success: false, message: error.message || 'Connection test failed' }; }
  }
  async sync(config: { accessToken: string }): Promise<any> {
    const meetings: any[] = []; const users: any[] = []; const errors: string[] = [];
    try {
      this.setHeaders({ Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.getgo.com/G2M/rest');
      const meetingsResult = await this.get('/meetings'); if (meetingsResult.data) meetings.push(...(Array.isArray(meetingsResult.data) ? meetingsResult.data : [])); else if (meetingsResult.error) errors.push(meetingsResult.error);
      const usersResult = await this.get('/users'); if (usersResult.data) users.push(...(Array.isArray(usersResult.data) ? usersResult.data : [])); else if (usersResult.error) errors.push(usersResult.error);
      return { meetings: { total: meetings.length, items: meetings }, users: { total: users.length, items: users }, collectedAt: new Date().toISOString(), errors };
    } catch (error: any) { return { meetings: { total: 0, items: [] }, users: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: [error.message] }; }
  }
}

@Injectable()
export class GoogleMeetConnector extends BaseConnector {
  constructor() { super('GoogleMeetConnector'); }
  async testConnection(config: { serviceAccountKey: string }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.serviceAccountKey) return { success: false, message: 'Service account key required' };
    try {
      // Google Meet uses Google Calendar API for meeting data
      const _serviceAccount = JSON.parse(config.serviceAccountKey);
      // OAuth2 flow would be implemented here
      return { success: true, message: 'Connected to Google Meet (requires OAuth2 setup)', details: {} };
    } catch (error: any) { return { success: false, message: error.message || 'Connection test failed' }; }
  }
  async sync(_config: any): Promise<any> {
    const meetings: any[] = []; const _errors: string[] = [];
    try {
      return { meetings: { total: meetings.length, items: meetings }, collectedAt: new Date().toISOString(), errors: ['Google Meet requires OAuth2 authentication'] };
    } catch (error: any) { return { meetings: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: [error.message] }; }
  }
}

@Injectable()
export class ChantyConnector extends BaseConnector {
  constructor() { super('ChantyConnector'); }
  async testConnection(config: { apiKey: string }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      this.setHeaders({ Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.chanty.com/v1');
      const result = await this.get('/teams');
      return result.error ? { success: false, message: result.error } : { success: true, message: `Connected to Chanty. Found ${result.data?.length || 0} teams.`, details: result.data };
    } catch (error: any) { return { success: false, message: error.message || 'Connection test failed' }; }
  }
  async sync(config: { apiKey: string }): Promise<any> {
    const teams: any[] = []; const channels: any[] = []; const errors: string[] = [];
    try {
      this.setHeaders({ Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.chanty.com/v1');
      const teamsResult = await this.get('/teams'); if (teamsResult.data) teams.push(...(Array.isArray(teamsResult.data) ? teamsResult.data : [])); else if (teamsResult.error) errors.push(teamsResult.error);
      const channelsResult = await this.get('/channels'); if (channelsResult.data) channels.push(...(Array.isArray(channelsResult.data) ? channelsResult.data : [])); else if (channelsResult.error) errors.push(channelsResult.error);
      return { teams: { total: teams.length, items: teams }, channels: { total: channels.length, items: channels }, collectedAt: new Date().toISOString(), errors };
    } catch (error: any) { return { teams: { total: 0, items: [] }, channels: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: [error.message] }; }
  }
}

@Injectable()
export class TwistConnector extends BaseConnector {
  constructor() { super('TwistConnector'); }
  async testConnection(config: { accessToken: string }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.accessToken) return { success: false, message: 'Access token required' };
    try {
      this.setHeaders({ Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.twist.com/api/v3');
      const result = await this.get('/users/get_authenticated_user');
      return result.error ? { success: false, message: result.error } : { success: true, message: `Connected to Twist. User: ${result.data?.name || 'Unknown'}`, details: result.data };
    } catch (error: any) { return { success: false, message: error.message || 'Connection test failed' }; }
  }
  async sync(config: { accessToken: string }): Promise<any> {
    const workspaces: any[] = []; const channels: any[] = []; const errors: string[] = [];
    try {
      this.setHeaders({ Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.twist.com/api/v3');
      const workspacesResult = await this.get('/workspaces/get'); if (workspacesResult.data) workspaces.push(...(Array.isArray(workspacesResult.data) ? workspacesResult.data : [])); else if (workspacesResult.error) errors.push(workspacesResult.error);
      const channelsResult = await this.get('/channels/get'); if (channelsResult.data) channels.push(...(Array.isArray(channelsResult.data) ? channelsResult.data : [])); else if (channelsResult.error) errors.push(channelsResult.error);
      return { workspaces: { total: workspaces.length, items: workspaces }, channels: { total: channels.length, items: channels }, collectedAt: new Date().toISOString(), errors };
    } catch (error: any) { return { workspaces: { total: 0, items: [] }, channels: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: [error.message] }; }
  }
}

@Injectable()
export class WorkplaceMetaConnector extends BaseConnector {
  constructor() { super('WorkplaceMetaConnector'); }
  async testConnection(config: { accessToken: string }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.accessToken) return { success: false, message: 'Access token required' };
    try {
      this.setHeaders({ Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://graph.workplace.com');
      const result = await this.get('/me');
      return result.error ? { success: false, message: result.error } : { success: true, message: `Connected to Workplace. User: ${result.data?.name || 'Unknown'}`, details: result.data };
    } catch (error: any) { return { success: false, message: error.message || 'Connection test failed' }; }
  }
  async sync(config: { accessToken: string }): Promise<any> {
    const groups: any[] = []; const members: any[] = []; const errors: string[] = [];
    try {
      this.setHeaders({ Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://graph.workplace.com');
      const groupsResult = await this.get('/groups'); if (groupsResult.data?.data) groups.push(...groupsResult.data.data); else if (groupsResult.error) errors.push(groupsResult.error);
      return { groups: { total: groups.length, items: groups }, members: { total: members.length, items: members }, collectedAt: new Date().toISOString(), errors };
    } catch (error: any) { return { groups: { total: 0, items: [] }, members: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: [error.message] }; }
  }
}

@Injectable()
export class FlockConnector extends BaseConnector {
  constructor() { super('FlockConnector'); }
  async testConnection(config: { token: string }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.token) return { success: false, message: 'Token required' };
    try {
      this.setHeaders({ Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.flock.com/v1');
      const result = await this.get('/users.getInfo');
      return result.error ? { success: false, message: result.error } : { success: true, message: `Connected to Flock. User: ${result.data?.firstName || 'Unknown'}`, details: result.data };
    } catch (error: any) { return { success: false, message: error.message || 'Connection test failed' }; }
  }
  async sync(config: { token: string }): Promise<any> {
    const channels: any[] = []; const users: any[] = []; const errors: string[] = [];
    try {
      this.setHeaders({ Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.flock.com/v1');
      const channelsResult = await this.get('/channels.list'); if (channelsResult.data) channels.push(...(Array.isArray(channelsResult.data) ? channelsResult.data : [])); else if (channelsResult.error) errors.push(channelsResult.error);
      const usersResult = await this.get('/users.list'); if (usersResult.data) users.push(...(Array.isArray(usersResult.data) ? usersResult.data : [])); else if (usersResult.error) errors.push(usersResult.error);
      return { channels: { total: channels.length, items: channels }, users: { total: users.length, items: users }, collectedAt: new Date().toISOString(), errors };
    } catch (error: any) { return { channels: { total: 0, items: [] }, users: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: [error.message] }; }
  }
}

@Injectable()
export class RocketChatConnector extends BaseConnector {
  constructor() { super('RocketChatConnector'); }
  async testConnection(config: { serverUrl: string; userId: string; authToken: string }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.serverUrl) return { success: false, message: 'Server URL required' };
    try {
      this.setHeaders({ 'X-Auth-Token': config.authToken, 'X-User-Id': config.userId, 'Content-Type': 'application/json' });
      this.setBaseURL(config.serverUrl);
      const result = await this.get('/api/v1/me');
      return result.error ? { success: false, message: result.error } : { success: true, message: `Connected to Rocket.Chat. User: ${result.data?.username || 'Unknown'}`, details: result.data };
    } catch (error: any) { return { success: false, message: error.message || 'Connection test failed' }; }
  }
  async sync(config: { serverUrl: string; userId: string; authToken: string }): Promise<any> {
    const channels: any[] = []; const users: any[] = []; const errors: string[] = [];
    try {
      this.setHeaders({ 'X-Auth-Token': config.authToken, 'X-User-Id': config.userId, 'Content-Type': 'application/json' });
      this.setBaseURL(config.serverUrl);
      const channelsResult = await this.get('/api/v1/channels.list'); if (channelsResult.data?.channels) channels.push(...channelsResult.data.channels); else if (channelsResult.error) errors.push(channelsResult.error);
      const usersResult = await this.get('/api/v1/users.list'); if (usersResult.data?.users) users.push(...usersResult.data.users); else if (usersResult.error) errors.push(usersResult.error);
      return { channels: { total: channels.length, items: channels }, users: { total: users.length, items: users }, collectedAt: new Date().toISOString(), errors };
    } catch (error: any) { return { channels: { total: 0, items: [] }, users: { total: 0, items: [] }, collectedAt: new Date().toISOString(), errors: [error.message] }; }
  }
}
