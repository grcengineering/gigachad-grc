/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { BaseConnector } from './base-connector';
import axios from 'axios';

// =============================================================================
// HR & People Management Connectors - Fully Implemented
// =============================================================================

@Injectable()
export class GustoConnector extends BaseConnector {
  constructor() {
    super('GustoConnector');
  }

  async testConnection(config: { apiKey: string; companyId?: string }): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!config.apiKey) {
      return { success: false, message: 'API key is required' };
    }

    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.gusto.com');

      const result = await this.get('/v1/companies');
      if (result.error) {
        return { success: false, message: result.error };
      }

      return {
        success: true,
        message: `Connected to Gusto. Found ${result.data?.length || 0} companies.`,
        details: result.data,
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }

  async sync(config: { apiKey: string; companyId?: string }): Promise<any> {
    this.setHeaders({
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    });
    this.setBaseURL('https://api.gusto.com');

    const employees: any[] = [];
    const payroll: any[] = [];
    const errors: string[] = [];

    try {
      // Get companies if companyId not provided
      let companyIds = config.companyId ? [config.companyId] : [];
      if (!config.companyId) {
        const companiesResult = await this.get('/v1/companies');
        if (companiesResult.data) {
          companyIds = companiesResult.data.map((c: any) => c.id);
        }
      }

      // Fetch employees for each company
      for (const companyId of companyIds) {
        const employeesResult = await this.get(`/v1/companies/${companyId}/employees`);
        if (employeesResult.data) {
          employees.push(...(Array.isArray(employeesResult.data) ? employeesResult.data : []));
        } else if (employeesResult.error) {
          errors.push(`Failed to fetch employees for company ${companyId}: ${employeesResult.error}`);
        }

        // Fetch payroll runs
        const payrollResult = await this.get(`/v1/companies/${companyId}/payrolls`);
        if (payrollResult.data) {
          payroll.push(...(Array.isArray(payrollResult.data) ? payrollResult.data : []));
        }
      }

      return {
        employees: { total: employees.length, items: employees },
        payroll: { total: payroll.length, items: payroll },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        employees: { total: 0, items: [] },
        payroll: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class ADPConnector extends BaseConnector {
  constructor() {
    super('ADPConnector');
  }

  async testConnection(config: { clientId: string; clientSecret: string; baseUrl?: string }): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!config.clientId || !config.clientSecret) {
      return { success: false, message: 'Client ID and Client Secret are required' };
    }

    try {
      // ADP uses OAuth2 - get access token first
      const tokenUrl = config.baseUrl || 'https://api.adp.com';
      const tokenResponse = await axios.post(
        `${tokenUrl}/auth/oauth/v2/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      if (tokenResponse.data?.access_token) {
        return {
          success: true,
          message: 'Successfully authenticated with ADP',
          details: { tokenExpiresIn: tokenResponse.data.expires_in },
        };
      }

      return { success: false, message: 'Failed to obtain access token' };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.error_description || error.message || 'Connection test failed',
      };
    }
  }

  async sync(config: { clientId: string; clientSecret: string; baseUrl?: string }): Promise<any> {
    const workers: any[] = [];
    const errors: string[] = [];

    try {
      const baseUrl = config.baseUrl || 'https://api.adp.com';
      
      // Get access token
      const tokenResponse = await axios.post(
        `${baseUrl}/auth/oauth/v2/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      const accessToken = tokenResponse.data?.access_token;
      if (!accessToken) {
        return {
          workers: { total: 0, items: [] },
          collectedAt: new Date().toISOString(),
          errors: ['Failed to obtain access token'],
        };
      }

      // Fetch workers
      this.setHeaders({
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL(baseUrl);

      const workersResult = await this.get('/hr/v2/workers');
      if (workersResult.data) {
        const workerData = workersResult.data.workers || workersResult.data;
        workers.push(...(Array.isArray(workerData) ? workerData : [workerData]));
      } else if (workersResult.error) {
        errors.push(workersResult.error);
      }

      return {
        workers: { total: workers.length, items: workers },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        workers: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class PaychexConnector extends BaseConnector {
  constructor() {
    super('PaychexConnector');
  }

  async testConnection(config: { apiKey: string; baseUrl?: string }): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!config.apiKey) {
      return { success: false, message: 'API key is required' };
    }

    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL(config.baseUrl || 'https://api.paychex.com');

      const result = await this.get('/companies');
      if (result.error) {
        return { success: false, message: result.error };
      }

      return {
        success: true,
        message: `Connected to Paychex. Found ${result.data?.content?.length || 0} companies.`,
        details: result.data,
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }

  async sync(config: { apiKey: string; baseUrl?: string; companyId?: string }): Promise<any> {
    this.setHeaders({
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    });
    this.setBaseURL(config.baseUrl || 'https://api.paychex.com');

    const employees: any[] = [];
    const payroll: any[] = [];
    const errors: string[] = [];

    try {
      // Get companies if companyId not provided
      let companyIds = config.companyId ? [config.companyId] : [];
      if (!config.companyId) {
        const companiesResult = await this.get('/companies');
        if (companiesResult.data?.content) {
          companyIds = companiesResult.data.content.map((c: any) => c.companyId);
        }
      }

      // Fetch employees and payroll for each company
      for (const companyId of companyIds) {
        const employeesResult = await this.get(`/companies/${companyId}/workers`);
        if (employeesResult.data?.content) {
          employees.push(...employeesResult.data.content);
        } else if (employeesResult.error) {
          errors.push(`Failed to fetch employees: ${employeesResult.error}`);
        }

        const payrollResult = await this.get(`/companies/${companyId}/payperiods`);
        if (payrollResult.data?.content) {
          payroll.push(...payrollResult.data.content);
        }
      }

      return {
        employees: { total: employees.length, items: employees },
        payroll: { total: payroll.length, items: payroll },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        employees: { total: 0, items: [] },
        payroll: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class TriNetConnector extends BaseConnector {
  constructor() {
    super('TriNetConnector');
  }

  async testConnection(config: { apiKey: string; environment?: string }): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!config.apiKey) {
      return { success: false, message: 'API key is required' };
    }

    try {
      const baseUrl = config.environment === 'sandbox' 
        ? 'https://api-sandbox.trinet.com' 
        : 'https://api.trinet.com';

      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL(baseUrl);

      const result = await this.get('/v1/companies');
      if (result.error) {
        return { success: false, message: result.error };
      }

      return {
        success: true,
        message: `Connected to TriNet. Found ${result.data?.length || 0} companies.`,
        details: result.data,
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }

  async sync(config: { apiKey: string; environment?: string; companyId?: string }): Promise<any> {
    const baseUrl = config.environment === 'sandbox' 
      ? 'https://api-sandbox.trinet.com' 
      : 'https://api.trinet.com';

    this.setHeaders({
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    });
    this.setBaseURL(baseUrl);

    const employees: any[] = [];
    const errors: string[] = [];

    try {
      const companyId = config.companyId || 'default';
      const employeesResult = await this.get(`/v1/companies/${companyId}/employees`);
      
      if (employeesResult.data) {
        const employeeData = Array.isArray(employeesResult.data) 
          ? employeesResult.data 
          : employeesResult.data.employees || [];
        employees.push(...employeeData);
      } else if (employeesResult.error) {
        errors.push(employeesResult.error);
      }

      return {
        employees: { total: employees.length, items: employees },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        employees: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class NamelyConnector extends BaseConnector {
  constructor() {
    super('NamelyConnector');
  }

  async testConnection(config: { apiKey: string; subdomain: string }): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!config.apiKey || !config.subdomain) {
      return { success: false, message: 'API key and subdomain are required' };
    }

    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL(`https://${config.subdomain}.namely.com/api/v1`);

      const result = await this.get('/profiles');
      if (result.error) {
        return { success: false, message: result.error };
      }

      return {
        success: true,
        message: `Connected to Namely. Found ${result.data?.profiles?.length || 0} profiles.`,
        details: result.data,
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }

  async sync(config: { apiKey: string; subdomain: string }): Promise<any> {
    this.setHeaders({
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    });
    this.setBaseURL(`https://${config.subdomain}.namely.com/api/v1`);

    const profiles: any[] = [];
    const errors: string[] = [];

    try {
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const result = await this.get(`/profiles?page=${page}&per_page=50`);
        if (result.data?.profiles) {
          profiles.push(...result.data.profiles);
          hasMore = result.data.profiles.length === 50;
          page++;
        } else if (result.error) {
          errors.push(result.error);
          hasMore = false;
        } else {
          hasMore = false;
        }
      }

      return {
        profiles: { total: profiles.length, items: profiles },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        profiles: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class PersonioConnector extends BaseConnector {
  constructor() {
    super('PersonioConnector');
  }

  async testConnection(config: { clientId: string; clientSecret: string; baseUrl?: string }): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!config.clientId || !config.clientSecret) {
      return { success: false, message: 'Client ID and Client Secret are required' };
    }

    try {
      const baseUrl = config.baseUrl || 'https://api.personio.de';
      
      // Get OAuth token
      const tokenResponse = await axios.post(
        `${baseUrl}/v1/auth`,
        {
          client_id: config.clientId,
          client_secret: config.clientSecret,
        },
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (tokenResponse.data?.data?.token) {
        return {
          success: true,
          message: 'Successfully authenticated with Personio',
          details: { tokenExpiresIn: tokenResponse.data.data.expires_in },
        };
      }

      return { success: false, message: 'Failed to obtain access token' };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.error?.message || error.message || 'Connection test failed',
      };
    }
  }

  async sync(config: { clientId: string; clientSecret: string; baseUrl?: string }): Promise<any> {
    const employees: any[] = [];
    const errors: string[] = [];

    try {
      const baseUrl = config.baseUrl || 'https://api.personio.de';
      
      // Get access token
      const tokenResponse = await axios.post(
        `${baseUrl}/v1/auth`,
        {
          client_id: config.clientId,
          client_secret: config.clientSecret,
        },
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );

      const accessToken = tokenResponse.data?.data?.token;
      if (!accessToken) {
        return {
          employees: { total: 0, items: [] },
          collectedAt: new Date().toISOString(),
          errors: ['Failed to obtain access token'],
        };
      }

      this.setHeaders({
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL(baseUrl);

      const employeesResult = await this.get('/v1/company/employees');
      if (employeesResult.data?.data) {
        const employeeData = Array.isArray(employeesResult.data.data) 
          ? employeesResult.data.data 
          : [];
        employees.push(...employeeData);
      } else if (employeesResult.error) {
        errors.push(employeesResult.error);
      }

      return {
        employees: { total: employees.length, items: employees },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        employees: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class FactorialConnector extends BaseConnector {
  constructor() {
    super('FactorialConnector');
  }

  async testConnection(config: { apiKey: string }): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!config.apiKey) {
      return { success: false, message: 'API key is required' };
    }

    try {
      this.setHeaders({
        'X-API-KEY': config.apiKey,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.factorialhr.com');

      const result = await this.get('/employees');
      if (result.error) {
        return { success: false, message: result.error };
      }

      return {
        success: true,
        message: `Connected to Factorial. Found ${result.data?.length || 0} employees.`,
        details: result.data,
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }

  async sync(config: { apiKey: string }): Promise<any> {
    this.setHeaders({
      'X-API-KEY': config.apiKey,
      'Content-Type': 'application/json',
    });
    this.setBaseURL('https://api.factorialhr.com');

    const employees: any[] = [];
    const errors: string[] = [];

    try {
      const employeesResult = await this.get('/employees');
      if (employeesResult.data) {
        employees.push(...(Array.isArray(employeesResult.data) ? employeesResult.data : []));
      } else if (employeesResult.error) {
        errors.push(employeesResult.error);
      }

      return {
        employees: { total: employees.length, items: employees },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        employees: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class CharlieHRConnector extends BaseConnector {
  constructor() {
    super('CharlieHRConnector');
  }

  async testConnection(config: { apiKey: string }): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!config.apiKey) {
      return { success: false, message: 'API key is required' };
    }

    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.charliehr.com');

      const result = await this.get('/employees');
      if (result.error) {
        return { success: false, message: result.error };
      }

      return {
        success: true,
        message: `Connected to CharlieHR. Found ${result.data?.length || 0} employees.`,
        details: result.data,
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }

  async sync(config: { apiKey: string }): Promise<any> {
    this.setHeaders({
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    });
    this.setBaseURL('https://api.charliehr.com');

    const employees: any[] = [];
    const errors: string[] = [];

    try {
      const employeesResult = await this.get('/employees');
      if (employeesResult.data) {
        employees.push(...(Array.isArray(employeesResult.data) ? employeesResult.data : []));
      } else if (employeesResult.error) {
        errors.push(employeesResult.error);
      }

      return {
        employees: { total: employees.length, items: employees },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        employees: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class ZenefitsConnector extends BaseConnector {
  constructor() {
    super('ZenefitsConnector');
  }

  async testConnection(config: { apiKey: string }): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!config.apiKey) {
      return { success: false, message: 'API key is required' };
    }

    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.zenefits.com');

      const result = await this.get('/core/people');
      if (result.error) {
        return { success: false, message: result.error };
      }

      return {
        success: true,
        message: `Connected to Zenefits. Found ${result.data?.data?.length || 0} people.`,
        details: result.data,
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }

  async sync(config: { apiKey: string }): Promise<any> {
    this.setHeaders({
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    });
    this.setBaseURL('https://api.zenefits.com');

    const people: any[] = [];
    const errors: string[] = [];

    try {
      let url = '/core/people';
      let hasMore = true;

      while (hasMore) {
        const result = await this.get(url);
        if (result.data?.data) {
          people.push(...result.data.data);
          url = result.data.next;
          hasMore = !!url;
        } else if (result.error) {
          errors.push(result.error);
          hasMore = false;
        } else {
          hasMore = false;
        }
      }

      return {
        people: { total: people.length, items: people },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        people: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class UKGConnector extends BaseConnector {
  constructor() {
    super('UKGConnector');
  }

  async testConnection(config: { apiKey: string; companyId: string; baseUrl?: string }): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!config.apiKey || !config.companyId) {
      return { success: false, message: 'API key and Company ID are required' };
    }

    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL(config.baseUrl || 'https://api.ukg.com');

      const result = await this.get(`/personnel/v1/companies/${config.companyId}`);
      if (result.error) {
        return { success: false, message: result.error };
      }

      return {
        success: true,
        message: 'Successfully connected to UKG',
        details: result.data,
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }

  async sync(config: { apiKey: string; companyId: string; baseUrl?: string }): Promise<any> {
    this.setHeaders({
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    });
    this.setBaseURL(config.baseUrl || 'https://api.ukg.com');

    const employees: any[] = [];
    const errors: string[] = [];

    try {
      const employeesResult = await this.get(`/personnel/v1/companies/${config.companyId}/employees`);
      if (employeesResult.data) {
        const employeeData = Array.isArray(employeesResult.data) 
          ? employeesResult.data 
          : employeesResult.data.employees || [];
        employees.push(...employeeData);
      } else if (employeesResult.error) {
        errors.push(employeesResult.error);
      }

      return {
        employees: { total: employees.length, items: employees },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        employees: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class SAPSuccessFactorsConnector extends BaseConnector {
  constructor() {
    super('SAPSuccessFactorsConnector');
  }

  async testConnection(config: { apiKey: string; companyId: string; baseUrl?: string }): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!config.apiKey || !config.companyId) {
      return { success: false, message: 'API key and Company ID are required' };
    }

    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL(config.baseUrl || 'https://api.successfactors.eu');

      const result = await this.get('/odata/v2/User');
      if (result.error) {
        return { success: false, message: result.error };
      }

      return {
        success: true,
        message: `Connected to SAP SuccessFactors. Found ${result.data?.d?.results?.length || 0} users.`,
        details: result.data,
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }

  async sync(config: { apiKey: string; companyId: string; baseUrl?: string }): Promise<any> {
    this.setHeaders({
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    });
    this.setBaseURL(config.baseUrl || 'https://api.successfactors.eu');

    const users: any[] = [];
    const errors: string[] = [];

    try {
      let url = '/odata/v2/User';
      let hasMore = true;

      while (hasMore) {
        const result = await this.get(url);
        if (result.data?.d?.results) {
          users.push(...result.data.d.results);
          url = result.data.d.__next;
          hasMore = !!url;
        } else if (result.error) {
          errors.push(result.error);
          hasMore = false;
        } else {
          hasMore = false;
        }
      }

      return {
        users: { total: users.length, items: users },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        users: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class OracleHCMConnector extends BaseConnector {
  constructor() {
    super('OracleHCMConnector');
  }

  async testConnection(config: { username: string; password: string; baseUrl: string }): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!config.username || !config.password || !config.baseUrl) {
      return { success: false, message: 'Username, password, and base URL are required' };
    }

    try {
      // Oracle HCM uses basic auth
      const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
      this.setHeaders({
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL(config.baseUrl);

      const result = await this.get('/hcmRestApi/resources/11.13.18.05/workers');
      if (result.error) {
        return { success: false, message: result.error };
      }

      return {
        success: true,
        message: `Connected to Oracle HCM. Found ${result.data?.items?.length || 0} workers.`,
        details: result.data,
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }

  async sync(config: { username: string; password: string; baseUrl: string }): Promise<any> {
    const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    this.setHeaders({
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    });
    this.setBaseURL(config.baseUrl);

    const workers: any[] = [];
    const errors: string[] = [];

    try {
      let url = '/hcmRestApi/resources/11.13.18.05/workers';
      let hasMore = true;

      while (hasMore) {
        const result = await this.get(url);
        if (result.data?.items) {
          workers.push(...result.data.items);
          url = result.data.links?.find((l: any) => l.rel === 'next')?.href;
          hasMore = !!url;
        } else if (result.error) {
          errors.push(result.error);
          hasMore = false;
        } else {
          hasMore = false;
        }
      }

      return {
        workers: { total: workers.length, items: workers },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        workers: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

// =============================================================================
// Background Check Connectors - Fully Implemented
// =============================================================================

@Injectable()
export class CheckrConnector extends BaseConnector {
  constructor() {
    super('CheckrConnector');
  }

  async testConnection(config: { apiKey: string; environment?: string }): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!config.apiKey) {
      return { success: false, message: 'API key is required' };
    }

    try {
      const baseUrl = config.environment === 'sandbox' 
        ? 'https://api.checkr.com' 
        : 'https://api.checkr.com';

      this.setHeaders({
        Authorization: `Basic ${Buffer.from(`${config.apiKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL(baseUrl);

      const result = await this.get('/v1/candidates');
      if (result.error) {
        return { success: false, message: result.error };
      }

      return {
        success: true,
        message: `Connected to Checkr. Found ${result.data?.data?.length || 0} candidates.`,
        details: result.data,
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }

  async sync(config: { apiKey: string; environment?: string }): Promise<any> {
    const baseUrl = config.environment === 'sandbox' 
      ? 'https://api.checkr.com' 
      : 'https://api.checkr.com';

    this.setHeaders({
      Authorization: `Basic ${Buffer.from(`${config.apiKey}:`).toString('base64')}`,
      'Content-Type': 'application/json',
    });
    this.setBaseURL(baseUrl);

    const candidates: any[] = [];
    const reports: any[] = [];
    const errors: string[] = [];

    try {
      const candidatesResult = await this.get('/v1/candidates');
      if (candidatesResult.data?.data) {
        candidates.push(...candidatesResult.data.data);
      } else if (candidatesResult.error) {
        errors.push(candidatesResult.error);
      }

      const reportsResult = await this.get('/v1/reports');
      if (reportsResult.data?.data) {
        reports.push(...reportsResult.data.data);
      } else if (reportsResult.error) {
        errors.push(reportsResult.error);
      }

      return {
        candidates: { total: candidates.length, items: candidates },
        reports: { total: reports.length, items: reports },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        candidates: { total: 0, items: [] },
        reports: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class SterlingConnector extends BaseConnector {
  constructor() {
    super('SterlingConnector');
  }

  async testConnection(config: { apiKey: string; baseUrl?: string }): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!config.apiKey) {
      return { success: false, message: 'API key is required' };
    }

    try {
      this.setHeaders({
        'X-Sterling-Auth-Token': config.apiKey,
        'Content-Type': 'application/json',
      });
      this.setBaseURL(config.baseUrl || 'https://api.sterlingcheck.com');

      const result = await this.get('/v1/screenings');
      if (result.error) {
        return { success: false, message: result.error };
      }

      return {
        success: true,
        message: `Connected to Sterling. Found ${result.data?.length || 0} screenings.`,
        details: result.data,
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }

  async sync(config: { apiKey: string; baseUrl?: string }): Promise<any> {
    this.setHeaders({
      'X-Sterling-Auth-Token': config.apiKey,
      'Content-Type': 'application/json',
    });
    this.setBaseURL(config.baseUrl || 'https://api.sterlingcheck.com');

    const screenings: any[] = [];
    const errors: string[] = [];

    try {
      const screeningsResult = await this.get('/v1/screenings');
      if (screeningsResult.data) {
        screenings.push(...(Array.isArray(screeningsResult.data) ? screeningsResult.data : []));
      } else if (screeningsResult.error) {
        errors.push(screeningsResult.error);
      }

      return {
        screenings: { total: screenings.length, items: screenings },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        screenings: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class GoodHireConnector extends BaseConnector {
  constructor() {
    super('GoodHireConnector');
  }

  async testConnection(config: { apiKey: string }): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!config.apiKey) {
      return { success: false, message: 'API key is required' };
    }

    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.goodhire.com');

      const result = await this.get('/v1/reports');
      if (result.error) {
        return { success: false, message: result.error };
      }

      return {
        success: true,
        message: `Connected to GoodHire. Found ${result.data?.length || 0} reports.`,
        details: result.data,
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }

  async sync(config: { apiKey: string }): Promise<any> {
    this.setHeaders({
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    });
    this.setBaseURL('https://api.goodhire.com');

    const reports: any[] = [];
    const errors: string[] = [];

    try {
      const reportsResult = await this.get('/v1/reports');
      if (reportsResult.data) {
        reports.push(...(Array.isArray(reportsResult.data) ? reportsResult.data : []));
      } else if (reportsResult.error) {
        errors.push(reportsResult.error);
      }

      return {
        reports: { total: reports.length, items: reports },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        reports: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class HireRightConnector extends BaseConnector {
  constructor() {
    super('HireRightConnector');
  }

  async testConnection(config: { apiKey: string; baseUrl?: string }): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!config.apiKey) {
      return { success: false, message: 'API key is required' };
    }

    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL(config.baseUrl || 'https://api.hireright.com');

      const result = await this.get('/v1/orders');
      if (result.error) {
        return { success: false, message: result.error };
      }

      return {
        success: true,
        message: `Connected to HireRight. Found ${result.data?.length || 0} orders.`,
        details: result.data,
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }

  async sync(config: { apiKey: string; baseUrl?: string }): Promise<any> {
    this.setHeaders({
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    });
    this.setBaseURL(config.baseUrl || 'https://api.hireright.com');

    const orders: any[] = [];
    const errors: string[] = [];

    try {
      const ordersResult = await this.get('/v1/orders');
      if (ordersResult.data) {
        orders.push(...(Array.isArray(ordersResult.data) ? ordersResult.data : []));
      } else if (ordersResult.error) {
        errors.push(ordersResult.error);
      }

      return {
        orders: { total: orders.length, items: orders },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        orders: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class CertnConnector extends BaseConnector {
  constructor() {
    super('CertnConnector');
  }

  async testConnection(config: { apiKey: string; environment?: string }): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!config.apiKey) {
      return { success: false, message: 'API key is required' };
    }

    try {
      const baseUrl = config.environment === 'sandbox' 
        ? 'https://api-sandbox.certn.co' 
        : 'https://api.certn.co';

      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL(baseUrl);

      const result = await this.get('/v1/applications');
      if (result.error) {
        return { success: false, message: result.error };
      }

      return {
        success: true,
        message: `Connected to Certn. Found ${result.data?.data?.length || 0} applications.`,
        details: result.data,
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }

  async sync(config: { apiKey: string; environment?: string }): Promise<any> {
    const baseUrl = config.environment === 'sandbox' 
      ? 'https://api-sandbox.certn.co' 
      : 'https://api.certn.co';

    this.setHeaders({
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    });
    this.setBaseURL(baseUrl);

    const applications: any[] = [];
    const errors: string[] = [];

    try {
      const applicationsResult = await this.get('/v1/applications');
      if (applicationsResult.data?.data) {
        applications.push(...applicationsResult.data.data);
      } else if (applicationsResult.error) {
        errors.push(applicationsResult.error);
      }

      return {
        applications: { total: applications.length, items: applications },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        applications: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class IntelifiConnector extends BaseConnector {
  constructor() {
    super('IntelifiConnector');
  }

  async testConnection(config: { apiKey: string; companyId: string }): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!config.apiKey || !config.companyId) {
      return { success: false, message: 'API key and Company ID are required' };
    }

    try {
      this.setHeaders({
        'X-API-Key': config.apiKey,
        'X-Company-ID': config.companyId,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.intelifi.com');

      const result = await this.get('/v1/screenings');
      if (result.error) {
        return { success: false, message: result.error };
      }

      return {
        success: true,
        message: `Connected to Intelifi. Found ${result.data?.length || 0} screenings.`,
        details: result.data,
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }

  async sync(config: { apiKey: string; companyId: string }): Promise<any> {
    this.setHeaders({
      'X-API-Key': config.apiKey,
      'X-Company-ID': config.companyId,
      'Content-Type': 'application/json',
    });
    this.setBaseURL('https://api.intelifi.com');

    const screenings: any[] = [];
    const errors: string[] = [];

    try {
      const screeningsResult = await this.get('/v1/screenings');
      if (screeningsResult.data) {
        screenings.push(...(Array.isArray(screeningsResult.data) ? screeningsResult.data : []));
      } else if (screeningsResult.error) {
        errors.push(screeningsResult.error);
      }

      return {
        screenings: { total: screenings.length, items: screenings },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        screenings: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}
