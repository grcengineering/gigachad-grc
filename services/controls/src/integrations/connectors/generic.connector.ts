import { Injectable } from '@nestjs/common';
import { BaseConnector } from './base-connector';
import { safeFetch, SSRFProtectionError } from '@gigachad-grc/shared';

/**
 * Generic connector for integrations that follow standard patterns
 * This provides a base implementation that can be extended or used directly
 */

export interface GenericConfig {
  apiKey?: string;
  apiToken?: string;
  accessToken?: string;
  baseUrl?: string;
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
  email?: string;
  [key: string]: any;
}

export interface GenericSyncResult {
  data: any;
  summary: {
    totalItems: number;
    [key: string]: any;
  };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class GenericConnector {
  async testConnection(
    integrationType: string,
    config: GenericConfig,
    testEndpoint?: string,
  ): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiUrl && !config.baseUrl) {
      return { success: false, message: `${integrationType}: apiUrl (or baseUrl) is required` };
    }
    if (!config.apiKey && !config.apiToken && !config.accessToken) {
      return { success: false, message: `${integrationType}: apiKey, apiToken, or accessToken is required` };
    }

    const bearer = (config.apiKey || config.apiToken || config.accessToken) as string;
    const base = (config.apiUrl || config.baseUrl) as string;
    const target = this.joinUrl(base, testEndpoint || '');

    try {
      // safeFetch blocks SSRF targets (internal IPs, link-local, metadata
      // endpoints) — required because the baseUrl is operator-configured.
      const response = await safeFetch(target, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${bearer}`,
          Accept: 'application/json',
        },
      });
      if (response.status >= 200 && response.status < 300) {
        return {
          success: true,
          message: `Connected to ${integrationType} at ${target}`,
          details: { status: response.status },
        };
      }
      const body = await response.text().catch(() => '');
      return {
        success: false,
        message: `${integrationType} API returned ${response.status}: ${body.slice(0, 200)}`,
      };
    } catch (error: any) {
      if (error instanceof SSRFProtectionError) {
        return { success: false, message: `SSRF protection blocked request: ${error.message}` };
      }
      return { success: false, message: error.message || `${integrationType} connection failed` };
    }
  }

  async sync(
    integrationType: string,
    config: GenericConfig,
    endpoints: Array<{ name: string; path: string }>,
  ): Promise<GenericSyncResult> {
    const errors: string[] = [];

    if (!config.apiUrl && !config.baseUrl) {
      errors.push(`${integrationType}: apiUrl (or baseUrl) is required`);
    }
    if (!config.apiKey && !config.apiToken && !config.accessToken) {
      errors.push(`${integrationType}: apiKey, apiToken, or accessToken is required`);
    }
    if (!endpoints || endpoints.length === 0) {
      errors.push(`${integrationType}: at least one endpoint is required for sync`);
    }
    if (errors.length > 0) {
      return { data: {}, summary: { totalItems: 0 }, collectedAt: new Date().toISOString(), errors };
    }

    const bearer = (config.apiKey || config.apiToken || config.accessToken) as string;
    const base = (config.apiUrl || config.baseUrl) as string;
    const data: Record<string, any> = {};
    let totalItems = 0;

    for (const endpoint of endpoints) {
      const url = this.joinUrl(base, endpoint.path);
      try {
        // safeFetch blocks SSRF — see comment in testConnection above.
        const response = await safeFetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${bearer}`,
            Accept: 'application/json',
          },
        });
        if (response.status < 200 || response.status >= 300) {
          errors.push(`${endpoint.name}: HTTP ${response.status}`);
          continue;
        }
        const body = await response.json().catch(() => null);
        data[endpoint.name] = body;
        if (Array.isArray(body)) {
          totalItems += body.length;
        } else if (body && typeof body === 'object') {
          const arrayField = Object.values(body).find((v) => Array.isArray(v));
          if (Array.isArray(arrayField)) totalItems += arrayField.length;
          else totalItems += 1;
        }
      } catch (error: any) {
        if (error instanceof SSRFProtectionError) {
          errors.push(`${endpoint.name}: SSRF protection blocked request: ${error.message}`);
        } else {
          errors.push(`${endpoint.name}: ${error.message || 'request failed'}`);
        }
      }
    }

    return {
      data,
      summary: { totalItems },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private joinUrl(base: string, path: string): string {
    if (!path) return base;
    if (/^https?:\/\//i.test(path)) return path;
    return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }
}

// Standalone connectors that extend BaseConnector

@Injectable()
export class NotionConnector extends BaseConnector {
  constructor() {
    super('NotionConnector');
  }
  async testConnection(
    config: GenericConfig
  ): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiToken) return { success: false, message: 'API token required' };
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.notion.com/v1');
      const result = await this.get<any>('/users/me');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Notion. User: ${result.data?.name || 'Unknown'}`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: any): Promise<any> {
    const pages: any[] = [];
    const databases: any[] = [];
    const users: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.notion.com/v1');
      const pagesResult = await this.post<any>('/search', {
        filter: { property: 'object', value: 'page' },
      });
      if (pagesResult.data?.results) pages.push(...pagesResult.data.results);
      else if (pagesResult.error) errors.push(pagesResult.error);
      const databasesResult = await this.post<any>('/search', {
        filter: { property: 'object', value: 'database' },
      });
      if (databasesResult.data?.results) databases.push(...databasesResult.data.results);
      else if (databasesResult.error) errors.push(databasesResult.error);
      const usersResult = await this.get<any>('/users');
      if (usersResult.data?.results) users.push(...usersResult.data.results);
      else if (usersResult.error) errors.push(usersResult.error);
      return {
        data: { pages, databases, users },
        summary: { totalItems: pages.length + databases.length + users.length },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        data: {},
        summary: { totalItems: 0 },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class AirtableConnector extends BaseConnector {
  constructor() {
    super('AirtableConnector');
  }
  async testConnection(
    config: GenericConfig
  ): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiToken) return { success: false, message: 'API token required' };
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.airtable.com/v0');
      const result = await this.get<any>('/meta/whoami');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Airtable. User: ${result.data?.id || 'Unknown'}`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: any): Promise<any> {
    const bases: any[] = [];
    const tables: any[] = [];
    const records: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.airtable.com/v0');
      const basesResult = await this.get<any>('/meta/bases');
      if (basesResult.data?.bases) bases.push(...basesResult.data.bases);
      else if (basesResult.error) errors.push(basesResult.error);
      for (const base of bases.slice(0, 5)) {
        const tablesResult = await this.get<any>(`/meta/bases/${base.id}/tables`);
        if (tablesResult.data?.tables) tables.push(...tablesResult.data.tables);
        else if (tablesResult.error) errors.push(tablesResult.error);
      }
      return {
        data: { bases, tables, records },
        summary: { totalItems: bases.length + tables.length + records.length },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        data: {},
        summary: { totalItems: 0 },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class BoxConnector extends BaseConnector {
  constructor() {
    super('BoxConnector');
  }
  async testConnection(
    config: GenericConfig
  ): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.accessToken) return { success: false, message: 'Access token required' };
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.box.com/2.0');
      const result = await this.get<any>('/users/me');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Box. User: ${result.data?.name || 'Unknown'}`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: any): Promise<any> {
    const files: any[] = [];
    const folders: any[] = [];
    const users: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.box.com/2.0');
      const filesResult = await this.get<any>('/files');
      if (filesResult.data?.entries) files.push(...filesResult.data.entries);
      else if (filesResult.error) errors.push(filesResult.error);
      const foldersResult = await this.get<any>('/folders/0/items');
      if (foldersResult.data?.entries) folders.push(...foldersResult.data.entries);
      else if (foldersResult.error) errors.push(foldersResult.error);
      const usersResult = await this.get<any>('/users');
      if (usersResult.data?.entries) users.push(...usersResult.data.entries);
      else if (usersResult.error) errors.push(usersResult.error);
      return {
        data: { files, folders, users },
        summary: { totalItems: files.length + folders.length + users.length },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        data: {},
        summary: { totalItems: 0 },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class DropboxConnector extends BaseConnector {
  constructor() {
    super('DropboxConnector');
  }
  async testConnection(
    config: GenericConfig
  ): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.accessToken) return { success: false, message: 'Access token required' };
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.dropboxapi.com/2');
      const result = await this.post<any>('/users/get_current_account', {});
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Dropbox. User: ${result.data?.name?.display_name || 'Unknown'}`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: any): Promise<any> {
    const files: any[] = [];
    const folders: any[] = [];
    const sharedLinks: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.dropboxapi.com/2');
      const listResult = await this.post<any>('/files/list_folder', { path: '' });
      if (listResult.data?.entries) {
        files.push(...listResult.data.entries.filter((e: any) => e['.tag'] === 'file'));
        folders.push(...listResult.data.entries.filter((e: any) => e['.tag'] === 'folder'));
      } else if (listResult.error) errors.push(listResult.error);
      const sharedResult = await this.post<any>('/sharing/list_shared_links', {});
      if (sharedResult.data?.links) sharedLinks.push(...sharedResult.data.links);
      else if (sharedResult.error) errors.push(sharedResult.error);
      return {
        data: { files, folders, sharedLinks },
        summary: { totalItems: files.length + folders.length + sharedLinks.length },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        data: {},
        summary: { totalItems: 0 },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class ConfluenceConnector extends BaseConnector {
  constructor() {
    super('ConfluenceConnector');
  }
  async testConnection(
    config: GenericConfig
  ): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiToken || !config.email)
      return { success: false, message: 'API token and email required' };
    try {
      const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
      this.setHeaders({ Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' });
      this.setBaseURL(`https://${config.baseUrl || 'your-domain'}.atlassian.net/wiki/rest/api`);
      const result = await this.get<any>('/user/current');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Confluence. User: ${result.data?.displayName || 'Unknown'}`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: any): Promise<any> {
    const spaces: any[] = [];
    const pages: any[] = [];
    const errors: string[] = [];
    try {
      const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
      this.setHeaders({ Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' });
      this.setBaseURL(`https://${config.baseUrl || 'your-domain'}.atlassian.net/wiki/rest/api`);
      const spacesResult = await this.get<any>('/space');
      if (spacesResult.data?.results) spaces.push(...spacesResult.data.results);
      else if (spacesResult.error) errors.push(spacesResult.error);
      for (const space of spaces.slice(0, 5)) {
        const pagesResult = await this.get<any>(`/content?spaceKey=${space.key}&limit=100`);
        if (pagesResult.data?.results) pages.push(...pagesResult.data.results);
        else if (pagesResult.error) errors.push(pagesResult.error);
      }
      return {
        data: { spaces, pages },
        summary: { totalItems: spaces.length + pages.length },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        data: {},
        summary: { totalItems: 0 },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class IntercomConnector extends BaseConnector {
  constructor() {
    super('IntercomConnector');
  }
  async testConnection(
    config: GenericConfig
  ): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.accessToken) return { success: false, message: 'Access token required' };
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
        'Intercom-Version': '2.10',
      });
      this.setBaseURL('https://api.intercom.io');
      const result = await this.get<any>('/me');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Intercom. App: ${result.data?.app?.name || 'Unknown'}`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: any): Promise<any> {
    const contacts: any[] = [];
    const conversations: any[] = [];
    const companies: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
        'Intercom-Version': '2.10',
      });
      this.setBaseURL('https://api.intercom.io');
      const contactsResult = await this.get<any>('/contacts');
      if (contactsResult.data?.contacts) contacts.push(...contactsResult.data.contacts);
      else if (contactsResult.error) errors.push(contactsResult.error);
      const conversationsResult = await this.get<any>('/conversations');
      if (conversationsResult.data?.conversations)
        conversations.push(...conversationsResult.data.conversations);
      else if (conversationsResult.error) errors.push(conversationsResult.error);
      const companiesResult = await this.get<any>('/companies');
      if (companiesResult.data?.companies) companies.push(...companiesResult.data.companies);
      else if (companiesResult.error) errors.push(companiesResult.error);
      return {
        data: { contacts, conversations, companies },
        summary: { totalItems: contacts.length + conversations.length + companies.length },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        data: {},
        summary: { totalItems: 0 },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class StripeConnectorGeneric extends BaseConnector {
  constructor() {
    super('StripeConnectorGeneric');
  }
  async testConnection(
    config: GenericConfig
  ): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      });
      this.setBaseURL('https://api.stripe.com/v1');
      const result = await this.get<any>('/account');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Stripe. Account: ${result.data?.display_name || result.data?.id || 'Unknown'}`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: any): Promise<any> {
    const customers: any[] = [];
    const charges: any[] = [];
    const subscriptions: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      });
      this.setBaseURL('https://api.stripe.com/v1');
      const customersResult = await this.get<any>('/customers?limit=100');
      if (customersResult.data?.data) customers.push(...customersResult.data.data);
      else if (customersResult.error) errors.push(customersResult.error);
      const chargesResult = await this.get<any>('/charges?limit=100');
      if (chargesResult.data?.data) charges.push(...chargesResult.data.data);
      else if (chargesResult.error) errors.push(chargesResult.error);
      const subscriptionsResult = await this.get<any>('/subscriptions?limit=100');
      if (subscriptionsResult.data?.data) subscriptions.push(...subscriptionsResult.data.data);
      else if (subscriptionsResult.error) errors.push(subscriptionsResult.error);
      return {
        data: { customers, charges, subscriptions },
        summary: { totalItems: customers.length + charges.length + subscriptions.length },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        data: {},
        summary: { totalItems: 0 },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}
