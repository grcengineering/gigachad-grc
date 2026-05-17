import { Injectable } from '@nestjs/common';
import { BaseConnector } from './base-connector';
import axios from 'axios';
import * as crypto from 'crypto';

// =============================================================================
// Additional Integration Connectors - Fully Implemented
// =============================================================================

// Security Awareness Training
@Injectable()
export class KnowBe4Connector extends BaseConnector {
  constructor() {
    super('KnowBe4Connector');
  }
  async testConnection(config: {
    apiKey: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      this.setHeaders({ 'X-KB4-API-KEY': config.apiKey, 'Content-Type': 'application/json' });
      this.setBaseURL('https://us.api.knowbe4.com/v1');
      const result = await this.get<any>('/account');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to KnowBe4. Account: ${result.data?.name || 'Unknown'}`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { apiKey: string }): Promise<any> {
    const users: any[] = [];
    const campaigns: any[] = [];
    const phishingTests: any[] = [];
    const trainingCampaigns: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({ 'X-KB4-API-KEY': config.apiKey, 'Content-Type': 'application/json' });
      this.setBaseURL('https://us.api.knowbe4.com/v1');
      const usersResult = await this.get<any>('/users');
      if (usersResult.data)
        users.push(...(Array.isArray(usersResult.data) ? usersResult.data : []));
      else if (usersResult.error) errors.push(usersResult.error);
      const campaignsResult = await this.get<any>('/training/campaigns');
      if (campaignsResult.data)
        campaigns.push(...(Array.isArray(campaignsResult.data) ? campaignsResult.data : []));
      else if (campaignsResult.error) errors.push(campaignsResult.error);
      const phishingResult = await this.get<any>('/phishing/security_tests');
      if (phishingResult.data)
        phishingTests.push(...(Array.isArray(phishingResult.data) ? phishingResult.data : []));
      else if (phishingResult.error) errors.push(phishingResult.error);
      return {
        users: { total: users.length, items: users },
        campaigns: { total: campaigns.length, items: campaigns },
        phishingTests: { total: phishingTests.length, items: phishingTests },
        trainingCampaigns: { total: trainingCampaigns.length, items: trainingCampaigns },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        users: { total: 0, items: [] },
        campaigns: { total: 0, items: [] },
        phishingTests: { total: 0, items: [] },
        trainingCampaigns: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class ProofpointSATConnector extends BaseConnector {
  constructor() {
    super('ProofpointSATConnector');
  }
  async testConnection(config: {
    apiKey: string;
    region: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      const baseUrl =
        config.region === 'EU' ? 'https://eu-api.proofpoint.com' : 'https://us-api.proofpoint.com';
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL(baseUrl);
      const result = await this.get<any>('/v1/people');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Proofpoint SAT. Found ${result.data?.total || 0} people.`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { apiKey: string; region: string }): Promise<any> {
    const users: any[] = [];
    const campaigns: any[] = [];
    const errors: string[] = [];
    try {
      const baseUrl =
        config.region === 'EU' ? 'https://eu-api.proofpoint.com' : 'https://us-api.proofpoint.com';
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL(baseUrl);
      const usersResult = await this.get<any>('/v1/people');
      if (usersResult.data?.results) users.push(...usersResult.data.results);
      else if (usersResult.error) errors.push(usersResult.error);
      const campaignsResult = await this.get<any>('/v1/campaigns');
      if (campaignsResult.data?.results) campaigns.push(...campaignsResult.data.results);
      else if (campaignsResult.error) errors.push(campaignsResult.error);
      const completionRate =
        users.length > 0 ? (users.filter((u: any) => u.completed).length / users.length) * 100 : 0;
      return {
        users: { total: users.length, items: users },
        campaigns: { total: campaigns.length, items: campaigns },
        completionRate,
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        users: { total: 0, items: [] },
        campaigns: { total: 0, items: [] },
        completionRate: 0,
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class MimecastAwarenessConnector extends BaseConnector {
  private mimecastConfig: { appId: string; appKey: string; accessKey: string; secretKey: string } | null = null;
  constructor() { super('MimecastAwarenessConnector'); }

  private mimecastSign(method: string, uri: string): { headers: Record<string, string>; reqId: string; date: string } {
    if (!this.mimecastConfig) throw new Error('Mimecast config not initialized');
    const { appId, appKey, accessKey, secretKey } = this.mimecastConfig;
    const reqId = crypto.randomUUID();
    const date = new Date().toUTCString();
    const dataToSign = `${date}:${reqId}:${uri}:${appKey}`;
    const key = Buffer.from(secretKey, 'base64');
    const hmac = crypto.createHmac('sha1', key).update(dataToSign).digest('base64');
    return {
      reqId,
      date,
      headers: {
        'Authorization': `MC ${accessKey}:${hmac}`,
        'x-mc-app-id': appId,
        'x-mc-date': date,
        'x-mc-req-id': reqId,
        'Content-Type': 'application/json',
      },
    };
  }

  async testConnection(config: any): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.appId || !config.appKey || !config.accessKey || !config.secretKey) {
      return { success: false, message: 'appId, appKey, accessKey, and secretKey are required' };
    }
    this.mimecastConfig = config;
    try {
      const uri = '/api/awareness-training/company/get-safe-score-details';
      const { headers } = this.mimecastSign('POST', uri);
      const response = await axios.post(`https://api.mimecast.com${uri}`, { data: [] }, {
        headers,
        timeout: 30000,
        validateStatus: (s) => s < 500,
      });
      if (response.status >= 400) {
        return { success: false, message: `HTTP ${response.status}: ${JSON.stringify(response.data?.fail || response.data || response.statusText)}` };
      }
      return { success: true, message: 'Connected to Mimecast Awareness Training', details: response.data };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }

  async sync(config: any): Promise<any> {
    if (!config.appId || !config.appKey || !config.accessKey || !config.secretKey) {
      throw new Error('Mimecast credentials missing: appId, appKey, accessKey, secretKey required');
    }
    this.mimecastConfig = config;
    const users: any[] = [];
    const modules: any[] = [];
    const errors: string[] = [];
    let completionRate = 0;

    // Fetch safe score details (users)
    try {
      const uri = '/api/awareness-training/company/get-safe-score-details';
      const { headers } = this.mimecastSign('POST', uri);
      const response = await axios.post(`https://api.mimecast.com${uri}`, { data: [] }, {
        headers,
        timeout: 30000,
        validateStatus: (s) => s < 500,
      });
      if (response.status >= 400) {
        errors.push(`safe-score-details: HTTP ${response.status}`);
      } else {
        const safeScoreData = response.data?.data || [];
        for (const entry of safeScoreData) {
          const userList = entry?.userDetails || entry?.users || [];
          if (Array.isArray(userList)) {
            for (const u of userList) {
              users.push({
                emailAddress: u.emailAddress || u.email,
                userName: u.userName || u.name,
                completionRate: u.completionPercentage ?? u.completionRate ?? null,
                safeScore: u.safeScore ?? null,
                ...u,
              });
            }
          } else if (entry?.emailAddress || entry?.userName) {
            users.push({
              emailAddress: entry.emailAddress,
              userName: entry.userName,
              completionRate: entry.completionPercentage ?? entry.completionRate ?? null,
              safeScore: entry.safeScore ?? null,
              ...entry,
            });
          }
        }
      }
    } catch (error: any) {
      errors.push(`safe-score-details: ${error.message}`);
    }

    // Fetch awareness campaigns (modules)
    try {
      const uri = '/api/awareness-training/campaign/get-campaigns';
      const { headers } = this.mimecastSign('POST', uri);
      const response = await axios.post(`https://api.mimecast.com${uri}`, { data: [] }, {
        headers,
        timeout: 30000,
        validateStatus: (s) => s < 500,
      });
      if (response.status >= 400) {
        errors.push(`get-campaigns: HTTP ${response.status}`);
      } else {
        const campaigns = response.data?.data || [];
        for (const c of campaigns) {
          modules.push(c);
        }
      }
    } catch (error: any) {
      errors.push(`get-campaigns: ${error.message}`);
    }

    if (users.length > 0) {
      const rates = users
        .map((u) => Number(u.completionRate))
        .filter((n) => !isNaN(n));
      if (rates.length > 0) {
        completionRate = rates.reduce((a, b) => a + b, 0) / rates.length;
      }
    }

    return {
      users: { total: users.length, items: users },
      modules: { total: modules.length, items: modules },
      completionRate,
      collectedAt: new Date().toISOString(),
      errors,
    };
  }
}

@Injectable()
export class CofenseConnector extends BaseConnector {
  constructor() {
    super('CofenseConnector');
  }
  async testConnection(config: {
    apiToken: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiToken) return { success: false, message: 'API token required' };
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://cofense.com/api/v1');
      const result = await this.get<any>('/users');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Cofense. Found ${result.data?.length || 0} users.`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { apiToken: string }): Promise<any> {
    const users: any[] = [];
    const simulations: any[] = [];
    const reports: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://cofense.com/api/v1');
      const usersResult = await this.get<any>('/users');
      if (usersResult.data)
        users.push(...(Array.isArray(usersResult.data) ? usersResult.data : []));
      else if (usersResult.error) errors.push(usersResult.error);
      const simulationsResult = await this.get<any>('/simulations');
      if (simulationsResult.data)
        simulations.push(...(Array.isArray(simulationsResult.data) ? simulationsResult.data : []));
      else if (simulationsResult.error) errors.push(simulationsResult.error);
      const reportsResult = await this.get<any>('/reports');
      if (reportsResult.data)
        reports.push(...(Array.isArray(reportsResult.data) ? reportsResult.data : []));
      else if (reportsResult.error) errors.push(reportsResult.error);
      return {
        users: { total: users.length, items: users },
        simulations: { total: simulations.length, items: simulations },
        reports: { total: reports.length, items: reports },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        users: { total: 0, items: [] },
        simulations: { total: 0, items: [] },
        reports: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class HoxhuntConnector extends BaseConnector {
  constructor() {
    super('HoxhuntConnector');
  }
  async testConnection(config: {
    apiKey: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.hoxhunt.com/v1');
      const result = await this.get<any>('/users');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Hoxhunt. Found ${result.data?.users?.length || 0} users.`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { apiKey: string }): Promise<any> {
    const users: any[] = [];
    const simulations: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.hoxhunt.com/v1');
      const usersResult = await this.get<any>('/users');
      if (usersResult.data?.users) users.push(...usersResult.data.users);
      else if (usersResult.error) errors.push(usersResult.error);
      const simulationsResult = await this.get<any>('/simulations');
      if (simulationsResult.data?.simulations)
        simulations.push(...simulationsResult.data.simulations);
      else if (simulationsResult.error) errors.push(simulationsResult.error);
      const reportRate =
        users.length > 0 ? (users.filter((u: any) => u.reported).length / users.length) * 100 : 0;
      return {
        users: { total: users.length, items: users },
        simulations: { total: simulations.length, items: simulations },
        reportRate,
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        users: { total: 0, items: [] },
        simulations: { total: 0, items: [] },
        reportRate: 0,
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class CurriculaConnector extends BaseConnector {
  constructor() {
    super('CurriculaConnector');
  }
  async testConnection(config: {
    apiKey: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.curricula.com/v1');
      const result = await this.get<any>('/employees');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Curricula. Found ${result.data?.employees?.length || 0} employees.`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { apiKey: string }): Promise<any> {
    const employees: any[] = [];
    const trainings: any[] = [];
    const phishingTests: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.curricula.com/v1');
      const employeesResult = await this.get<any>('/employees');
      if (employeesResult.data?.employees) employees.push(...employeesResult.data.employees);
      else if (employeesResult.error) errors.push(employeesResult.error);
      const trainingsResult = await this.get<any>('/trainings');
      if (trainingsResult.data?.trainings) trainings.push(...trainingsResult.data.trainings);
      else if (trainingsResult.error) errors.push(trainingsResult.error);
      const phishingResult = await this.get<any>('/phishing-tests');
      if (phishingResult.data?.tests) phishingTests.push(...phishingResult.data.tests);
      else if (phishingResult.error) errors.push(phishingResult.error);
      return {
        employees: { total: employees.length, items: employees },
        trainings: { total: trainings.length, items: trainings },
        phishingTests: { total: phishingTests.length, items: phishingTests },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        employees: { total: 0, items: [] },
        trainings: { total: 0, items: [] },
        phishingTests: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class InfosecIQConnector extends BaseConnector {
  constructor() {
    super('InfosecIQConnector');
  }
  async testConnection(config: {
    apiKey: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      this.setHeaders({ 'X-API-Key': config.apiKey, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.infoseciq.com/v1');
      const result = await this.get<any>('/learners');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Infosec IQ. Found ${result.data?.learners?.length || 0} learners.`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { apiKey: string }): Promise<any> {
    const learners: any[] = [];
    const campaigns: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({ 'X-API-Key': config.apiKey, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.infoseciq.com/v1');
      const learnersResult = await this.get<any>('/learners');
      if (learnersResult.data?.learners) learners.push(...learnersResult.data.learners);
      else if (learnersResult.error) errors.push(learnersResult.error);
      const campaignsResult = await this.get<any>('/campaigns');
      if (campaignsResult.data?.campaigns) campaigns.push(...campaignsResult.data.campaigns);
      else if (campaignsResult.error) errors.push(campaignsResult.error);
      return {
        learners: { total: learners.length, items: learners },
        campaigns: { total: campaigns.length, items: campaigns },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        learners: { total: 0, items: [] },
        campaigns: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class TerranovaConnector extends BaseConnector {
  constructor() {
    super('TerranovaConnector');
  }
  async testConnection(config: {
    apiKey: string;
    clientId: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      this.setHeaders({
        'X-API-Key': config.apiKey,
        'X-Client-ID': config.clientId,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.terranovasecurity.com/v1');
      const result = await this.get<any>('/users');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Terranova. Found ${result.data?.users?.length || 0} users.`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { apiKey: string; clientId: string }): Promise<any> {
    const users: any[] = [];
    const campaigns: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        'X-API-Key': config.apiKey,
        'X-Client-ID': config.clientId,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.terranovasecurity.com/v1');
      const usersResult = await this.get<any>('/users');
      if (usersResult.data?.users) users.push(...usersResult.data.users);
      else if (usersResult.error) errors.push(usersResult.error);
      const campaignsResult = await this.get<any>('/campaigns');
      if (campaignsResult.data?.campaigns) campaigns.push(...campaignsResult.data.campaigns);
      else if (campaignsResult.error) errors.push(campaignsResult.error);
      return {
        users: { total: users.length, items: users },
        campaigns: { total: campaigns.length, items: campaigns },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        users: { total: 0, items: [] },
        campaigns: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

// GRC & Compliance Platforms
@Injectable()
export class DrataConnector extends BaseConnector {
  constructor() {
    super('DrataConnector');
  }
  async testConnection(config: {
    apiKey: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.drata.com/v1');
      const result = await this.get<any>('/controls');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Drata. Found ${result.data?.controls?.length || 0} controls.`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { apiKey: string }): Promise<any> {
    const controls: any[] = [];
    const evidence: any[] = [];
    const personnel: any[] = [];
    const vendors: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.drata.com/v1');
      const controlsResult = await this.get<any>('/controls');
      if (controlsResult.data?.controls) controls.push(...controlsResult.data.controls);
      else if (controlsResult.error) errors.push(controlsResult.error);
      const evidenceResult = await this.get<any>('/evidence');
      if (evidenceResult.data?.evidence) evidence.push(...evidenceResult.data.evidence);
      else if (evidenceResult.error) errors.push(evidenceResult.error);
      const personnelResult = await this.get<any>('/personnel');
      if (personnelResult.data?.personnel) personnel.push(...personnelResult.data.personnel);
      else if (personnelResult.error) errors.push(personnelResult.error);
      const vendorsResult = await this.get<any>('/vendors');
      if (vendorsResult.data?.vendors) vendors.push(...vendorsResult.data.vendors);
      else if (vendorsResult.error) errors.push(vendorsResult.error);
      const passing = controls.filter((c: any) => c.status === 'passing').length;
      const failing = controls.filter((c: any) => c.status === 'failing').length;
      return {
        controls: { total: controls.length, passing, failing, items: controls },
        evidence: { total: evidence.length, items: evidence },
        personnel: { total: personnel.length, items: personnel },
        vendors: { total: vendors.length, items: vendors },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        controls: { total: 0, passing: 0, failing: 0, items: [] },
        evidence: { total: 0, items: [] },
        personnel: { total: 0, items: [] },
        vendors: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

// Network Security
@Injectable()
export class PaloAltoConnector extends BaseConnector {
  constructor() {
    super('PaloAltoConnector');
  }
  async testConnection(config: {
    hostname: string;
    apiKey: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.hostname) return { success: false, message: 'Hostname required' };
    try {
      this.setHeaders({ 'X-PAN-KEY': config.apiKey, 'Content-Type': 'application/json' });
      this.setBaseURL(`https://${config.hostname}/api`);
      const result = await this.get<any>('/config');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Palo Alto. System: ${result.data?.system?.hostname || 'Unknown'}`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { hostname: string; apiKey: string }): Promise<any> {
    const firewalls: any[] = [];
    const policies: any[] = [];
    const threats: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({ 'X-PAN-KEY': config.apiKey, 'Content-Type': 'application/json' });
      this.setBaseURL(`https://${config.hostname}/api`);
      const firewallsResult = await this.get<any>('/config/devices');
      if (firewallsResult.data?.devices) firewalls.push(...firewallsResult.data.devices);
      else if (firewallsResult.error) errors.push(firewallsResult.error);
      const policiesResult = await this.get<any>('/config/policies');
      if (policiesResult.data?.policies) policies.push(...policiesResult.data.policies);
      else if (policiesResult.error) errors.push(policiesResult.error);
      const threatsResult = await this.get<any>('/log/threat');
      if (threatsResult.data?.logs) threats.push(...threatsResult.data.logs);
      else if (threatsResult.error) errors.push(threatsResult.error);
      return {
        firewalls: { total: firewalls.length, items: firewalls },
        policies: { total: policies.length, items: policies },
        threats: { total: threats.length, items: threats },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        firewalls: { total: 0, items: [] },
        policies: { total: 0, items: [] },
        threats: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class FortinetConnector extends BaseConnector {
  constructor() {
    super('FortinetConnector');
  }
  async testConnection(config: {
    hostname: string;
    apiKey: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.hostname) return { success: false, message: 'Hostname required' };
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL(`https://${config.hostname}/api/v2`);
      const result = await this.get<any>('/cmdb/system/status');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Fortinet. Version: ${result.data?.version || 'Unknown'}`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { hostname: string; apiKey: string }): Promise<any> {
    const devices: any[] = [];
    const policies: any[] = [];
    const threats: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL(`https://${config.hostname}/api/v2`);
      const devicesResult = await this.get<any>('/cmdb/system/admin');
      if (devicesResult.data?.results) devices.push(...devicesResult.data.results);
      else if (devicesResult.error) errors.push(devicesResult.error);
      const policiesResult = await this.get<any>('/cmdb/firewall/policy');
      if (policiesResult.data?.results) policies.push(...policiesResult.data.results);
      else if (policiesResult.error) errors.push(policiesResult.error);
      const threatsResult = await this.get<any>('/log/fortianalyzer/threat');
      if (threatsResult.data?.results) threats.push(...threatsResult.data.results);
      else if (threatsResult.error) errors.push(threatsResult.error);
      return {
        devices: { total: devices.length, items: devices },
        policies: { total: policies.length, items: policies },
        threats: { total: threats.length, items: threats },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        devices: { total: 0, items: [] },
        policies: { total: 0, items: [] },
        threats: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class CheckpointConnector extends BaseConnector {
  constructor() {
    super('CheckpointConnector');
  }
  async testConnection(config: {
    server: string;
    apiKey: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.server) return { success: false, message: 'Server required' };
    try {
      this.setHeaders({ 'X-chkp-sid': config.apiKey, 'Content-Type': 'application/json' });
      this.setBaseURL(`https://${config.server}/web_api`);
      const result = await this.get<any>('/show-session');
      return result.error
        ? { success: false, message: result.error }
        : { success: true, message: 'Connected to Check Point', details: result.data };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { server: string; apiKey: string }): Promise<any> {
    const gateways: any[] = [];
    const policies: any[] = [];
    const logs: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({ 'X-chkp-sid': config.apiKey, 'Content-Type': 'application/json' });
      this.setBaseURL(`https://${config.server}/web_api`);
      const gatewaysResult = await this.get<any>('/show-gateways-and-servers');
      if (gatewaysResult.data?.objects) gateways.push(...gatewaysResult.data.objects);
      else if (gatewaysResult.error) errors.push(gatewaysResult.error);
      const policiesResult = await this.get<any>('/show-access-rulebase');
      if (policiesResult.data?.rulebase) policies.push(...policiesResult.data.rulebase);
      else if (policiesResult.error) errors.push(policiesResult.error);
      return {
        gateways: { total: gateways.length, items: gateways },
        policies: { total: policies.length, items: policies },
        logs: { total: logs.length, items: logs },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        gateways: { total: 0, items: [] },
        policies: { total: 0, items: [] },
        logs: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

// Application Security
@Injectable()
export class VeracodeConnector extends BaseConnector {
  constructor() {
    super('VeracodeConnector');
  }
  async testConnection(config: {
    apiId: string;
    apiKey: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiId) return { success: false, message: 'API credentials required' };
    try {
      const auth = Buffer.from(`${config.apiId}:${config.apiKey}`).toString('base64');
      this.setHeaders({ Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.veracode.com');
      const result = await this.get<any>('/appsec/v1/applications');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Veracode. Found ${result.data?._embedded?.applications?.length || 0} applications.`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { apiId: string; apiKey: string }): Promise<any> {
    const applications: any[] = [];
    const scans: any[] = [];
    const findings: any[] = [];
    const errors: string[] = [];
    try {
      const auth = Buffer.from(`${config.apiId}:${config.apiKey}`).toString('base64');
      this.setHeaders({ Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.veracode.com');
      const appsResult = await this.get<any>('/appsec/v1/applications');
      if (appsResult.data?._embedded?.applications)
        applications.push(...appsResult.data._embedded.applications);
      else if (appsResult.error) errors.push(appsResult.error);
      const critical = findings.filter((f: any) => f.severity === 'Critical').length;
      const high = findings.filter((f: any) => f.severity === 'High').length;
      return {
        applications: { total: applications.length, items: applications },
        scans: { total: scans.length, items: scans },
        findings: { total: findings.length, critical, high, items: findings },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        applications: { total: 0, items: [] },
        scans: { total: 0, items: [] },
        findings: { total: 0, critical: 0, high: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

// Incident Management
@Injectable()
export class IncidentIOConnector extends BaseConnector {
  constructor() {
    super('IncidentIOConnector');
  }
  async testConnection(config: {
    apiKey: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.incident.io/v1');
      const result = await this.get<any>('/incidents');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to incident.io. Found ${result.data?.incidents?.length || 0} incidents.`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { apiKey: string }): Promise<any> {
    const incidents: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.incident.io/v1');
      const incidentsResult = await this.get<any>('/incidents');
      if (incidentsResult.data?.incidents) incidents.push(...incidentsResult.data.incidents);
      else if (incidentsResult.error) errors.push(incidentsResult.error);
      const open = incidents.filter((i: any) => i.status === 'open').length;
      const resolved = incidents.filter((i: any) => i.status === 'resolved').length;
      return {
        incidents: { total: incidents.length, open, resolved, items: incidents },
        severities: {},
        mttr: 0,
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        incidents: { total: 0, open: 0, resolved: 0, items: [] },
        severities: {},
        mttr: 0,
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

// MDM Additional
@Injectable()
export class MosyleConnector extends BaseConnector {
  constructor() {
    super('MosyleConnector');
  }
  async testConnection(config: {
    apiKey: string;
    accessToken: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.accessToken}`,
        'X-API-KEY': config.apiKey,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://businessapi.mosyle.com/v1');
      const result = await this.get<any>('/devices');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Mosyle. Found ${result.data?.devices?.length || 0} devices.`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { apiKey: string; accessToken: string }): Promise<any> {
    const devices: any[] = [];
    const apps: any[] = [];
    const profiles: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.accessToken}`,
        'X-API-KEY': config.apiKey,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://businessapi.mosyle.com/v1');
      const devicesResult = await this.get<any>('/devices');
      if (devicesResult.data?.devices) devices.push(...devicesResult.data.devices);
      else if (devicesResult.error) errors.push(devicesResult.error);
      const appsResult = await this.get<any>('/apps');
      if (appsResult.data?.apps) apps.push(...appsResult.data.apps);
      else if (appsResult.error) errors.push(appsResult.error);
      const profilesResult = await this.get<any>('/profiles');
      if (profilesResult.data?.profiles) profiles.push(...profilesResult.data.profiles);
      else if (profilesResult.error) errors.push(profilesResult.error);
      const compliant = devices.filter((d: any) => d.compliance_status === 'Compliant').length;
      return {
        devices: { total: devices.length, compliant, items: devices },
        apps: { total: apps.length, items: apps },
        profiles: { total: profiles.length, items: profiles },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        devices: { total: 0, compliant: 0, items: [] },
        apps: { total: 0, items: [] },
        profiles: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

// HR Additional
@Injectable()
export class HiBobConnector extends BaseConnector {
  constructor() {
    super('HiBobConnector');
  }
  async testConnection(config: {
    apiToken: string;
    serviceUserId: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiToken) return { success: false, message: 'API token required' };
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.hibob.com/v1');
      const result = await this.get<any>('/people');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to HiBob. Found ${result.data?.employees?.length || 0} employees.`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { apiToken: string; serviceUserId: string }): Promise<any> {
    const employees: any[] = [];
    const departments: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.hibob.com/v1');
      const employeesResult = await this.get<any>('/people');
      if (employeesResult.data?.employees) employees.push(...employeesResult.data.employees);
      else if (employeesResult.error) errors.push(employeesResult.error);
      const departmentsResult = await this.get<any>('/company/departments');
      if (departmentsResult.data?.departments)
        departments.push(...departmentsResult.data.departments);
      else if (departmentsResult.error) errors.push(departmentsResult.error);
      const active = employees.filter((e: any) => e.status === 'active').length;
      return {
        employees: { total: employees.length, active, items: employees },
        departments: { total: departments.length, items: departments },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        employees: { total: 0, active: 0, items: [] },
        departments: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class LatticeConnector extends BaseConnector {
  constructor() {
    super('LatticeConnector');
  }
  async testConnection(config: {
    apiKey: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.latticehq.com/v1');
      const result = await this.get<any>('/users');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Lattice. Found ${result.data?.users?.length || 0} users.`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { apiKey: string }): Promise<any> {
    const users: any[] = [];
    const goals: any[] = [];
    const reviews: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.latticehq.com/v1');
      const usersResult = await this.get<any>('/users');
      if (usersResult.data?.users) users.push(...usersResult.data.users);
      else if (usersResult.error) errors.push(usersResult.error);
      const goalsResult = await this.get<any>('/goals');
      if (goalsResult.data?.goals) goals.push(...goalsResult.data.goals);
      else if (goalsResult.error) errors.push(goalsResult.error);
      const reviewsResult = await this.get<any>('/reviews');
      if (reviewsResult.data?.reviews) reviews.push(...reviewsResult.data.reviews);
      else if (reviewsResult.error) errors.push(reviewsResult.error);
      return {
        users: { total: users.length, items: users },
        goals: { total: goals.length, items: goals },
        reviews: { total: reviews.length, items: reviews },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        users: { total: 0, items: [] },
        goals: { total: 0, items: [] },
        reviews: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class CultureAmpConnector extends BaseConnector {
  constructor() {
    super('CultureAmpConnector');
  }
  async testConnection(config: {
    apiKey: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.cultureamp.com');
      const result = await this.get<any>('/employees');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Culture Amp. Found ${result.data?.employees?.length || 0} employees.`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { apiKey: string }): Promise<any> {
    const employees: any[] = [];
    const surveys: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.cultureamp.com');
      const employeesResult = await this.get<any>('/employees');
      if (employeesResult.data?.employees) employees.push(...employeesResult.data.employees);
      else if (employeesResult.error) errors.push(employeesResult.error);
      const surveysResult = await this.get<any>('/surveys');
      if (surveysResult.data?.surveys) surveys.push(...surveysResult.data.surveys);
      else if (surveysResult.error) errors.push(surveysResult.error);
      const participationRate =
        surveys.length > 0
          ? surveys.reduce((sum: number, s: any) => sum + (s.participation_rate || 0), 0) /
            surveys.length
          : 0;
      return {
        employees: { total: employees.length, items: employees },
        surveys: { total: surveys.length, items: surveys },
        participationRate,
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        employees: { total: 0, items: [] },
        surveys: { total: 0, items: [] },
        participationRate: 0,
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class JustworksConnector extends BaseConnector {
  constructor() {
    super('JustworksConnector');
  }
  async testConnection(config: {
    apiKey: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.justworks.com/v1');
      const result = await this.get<any>('/employees');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Justworks. Found ${result.data?.employees?.length || 0} employees.`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { apiKey: string }): Promise<any> {
    const employees: any[] = [];
    const benefits: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.justworks.com/v1');
      const employeesResult = await this.get<any>('/employees');
      if (employeesResult.data?.employees) employees.push(...employeesResult.data.employees);
      else if (employeesResult.error) errors.push(employeesResult.error);
      const benefitsResult = await this.get<any>('/benefits');
      if (benefitsResult.data?.benefits) benefits.push(...benefitsResult.data.benefits);
      else if (benefitsResult.error) errors.push(benefitsResult.error);
      return {
        employees: { total: employees.length, items: employees },
        benefits: { total: benefits.length, items: benefits },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        employees: { total: 0, items: [] },
        benefits: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

// Finance Additional
@Injectable()
export class BrexConnector extends BaseConnector {
  constructor() {
    super('BrexConnector');
  }
  async testConnection(config: {
    apiToken: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiToken) return { success: false, message: 'API token required' };
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://platform.brex.com');
      const result = await this.get<any>('/v2/users/me');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Brex. User: ${result.data?.email || 'Unknown'}`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { apiToken: string }): Promise<any> {
    const cards: any[] = [];
    const transactions: any[] = [];
    const users: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://platform.brex.com');
      const cardsResult = await this.get<any>('/v2/cards');
      if (cardsResult.data?.items) cards.push(...cardsResult.data.items);
      else if (cardsResult.error) errors.push(cardsResult.error);
      const transactionsResult = await this.get<any>('/v2/transactions');
      if (transactionsResult.data?.items) transactions.push(...transactionsResult.data.items);
      else if (transactionsResult.error) errors.push(transactionsResult.error);
      const usersResult = await this.get<any>('/v2/users');
      if (usersResult.data?.items) users.push(...usersResult.data.items);
      else if (usersResult.error) errors.push(usersResult.error);
      const active = cards.filter((c: any) => c.status === 'ACTIVE').length;
      return {
        cards: { total: cards.length, active, items: cards },
        transactions: { total: transactions.length, items: transactions },
        users: { total: users.length, items: users },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        cards: { total: 0, active: 0, items: [] },
        transactions: { total: 0, items: [] },
        users: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class RampConnector extends BaseConnector {
  constructor() {
    super('RampConnector');
  }
  async testConnection(config: any): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.clientId) return { success: false, message: 'Client ID required' };
    try {
      const tokenResponse = await axios.post(
        'https://api.ramp.com/v1/oauth/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      const accessToken = tokenResponse.data?.access_token;
      if (!accessToken) return { success: false, message: 'Failed to obtain access token' };
      this.setHeaders({
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.ramp.com/v1');
      const result = await this.get<any>('/cards');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Ramp. Found ${result.data?.cards?.length || 0} cards.`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: any): Promise<any> {
    const cards: any[] = [];
    const transactions: any[] = [];
    const users: any[] = [];
    const reimbursements: any[] = [];
    const errors: string[] = [];
    try {
      const tokenResponse = await axios.post(
        'https://api.ramp.com/v1/oauth/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      const accessToken = tokenResponse.data?.access_token;
      if (!accessToken)
        return {
          cards: { total: 0, items: [] },
          transactions: { total: 0, items: [] },
          users: { total: 0, items: [] },
          reimbursements: { total: 0, items: [] },
          collectedAt: new Date().toISOString(),
          errors: ['Failed to obtain access token'],
        };
      this.setHeaders({
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.ramp.com/v1');
      const cardsResult = await this.get<any>('/cards');
      if (cardsResult.data?.cards) cards.push(...cardsResult.data.cards);
      else if (cardsResult.error) errors.push(cardsResult.error);
      const transactionsResult = await this.get<any>('/transactions');
      if (transactionsResult.data?.transactions)
        transactions.push(...transactionsResult.data.transactions);
      else if (transactionsResult.error) errors.push(transactionsResult.error);
      const usersResult = await this.get<any>('/users');
      if (usersResult.data?.users) users.push(...usersResult.data.users);
      else if (usersResult.error) errors.push(usersResult.error);
      const reimbursementsResult = await this.get<any>('/reimbursements');
      if (reimbursementsResult.data?.reimbursements)
        reimbursements.push(...reimbursementsResult.data.reimbursements);
      else if (reimbursementsResult.error) errors.push(reimbursementsResult.error);
      return {
        cards: { total: cards.length, items: cards },
        transactions: { total: transactions.length, items: transactions },
        users: { total: users.length, items: users },
        reimbursements: { total: reimbursements.length, items: reimbursements },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        cards: { total: 0, items: [] },
        transactions: { total: 0, items: [] },
        users: { total: 0, items: [] },
        reimbursements: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class DivvyConnector extends BaseConnector {
  constructor() {
    super('DivvyConnector');
  }
  async testConnection(config: {
    apiKey: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.getdivvy.com/v1');
      const result = await this.get<any>('/budgets');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Divvy. Found ${result.data?.budgets?.length || 0} budgets.`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { apiKey: string }): Promise<any> {
    const budgets: any[] = [];
    const transactions: any[] = [];
    const users: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.getdivvy.com/v1');
      const budgetsResult = await this.get<any>('/budgets');
      if (budgetsResult.data?.budgets) budgets.push(...budgetsResult.data.budgets);
      else if (budgetsResult.error) errors.push(budgetsResult.error);
      const transactionsResult = await this.get<any>('/transactions');
      if (transactionsResult.data?.transactions)
        transactions.push(...transactionsResult.data.transactions);
      else if (transactionsResult.error) errors.push(transactionsResult.error);
      const usersResult = await this.get<any>('/users');
      if (usersResult.data?.users) users.push(...usersResult.data.users);
      else if (usersResult.error) errors.push(usersResult.error);
      return {
        budgets: { total: budgets.length, items: budgets },
        transactions: { total: transactions.length, items: transactions },
        users: { total: users.length, items: users },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        budgets: { total: 0, items: [] },
        transactions: { total: 0, items: [] },
        users: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

// Data & Analytics
@Injectable()
export class DatabricksConnector extends BaseConnector {
  constructor() {
    super('DatabricksConnector');
  }
  async testConnection(config: any): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.host) return { success: false, message: 'Host required' };
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL(`https://${config.host}/api/2.0`);
      const result = await this.get<any>('/workspace/list');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Databricks. Found ${result.data?.objects?.length || 0} workspace objects.`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: any): Promise<any> {
    const workspaces: any[] = [];
    const clusters: any[] = [];
    const jobs: any[] = [];
    const users: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL(`https://${config.host}/api/2.0`);
      const clustersResult = await this.get<any>('/clusters/list');
      if (clustersResult.data?.clusters) clusters.push(...clustersResult.data.clusters);
      else if (clustersResult.error) errors.push(clustersResult.error);
      const jobsResult = await this.get<any>('/jobs/list');
      if (jobsResult.data?.jobs) jobs.push(...jobsResult.data.jobs);
      else if (jobsResult.error) errors.push(jobsResult.error);
      const usersResult = await this.get<any>('/users/list');
      if (usersResult.data?.users) users.push(...usersResult.data.users);
      else if (usersResult.error) errors.push(usersResult.error);
      return {
        workspaces: { total: workspaces.length, items: workspaces },
        clusters: { total: clusters.length, items: clusters },
        jobs: { total: jobs.length, items: jobs },
        users: { total: users.length, items: users },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        workspaces: { total: 0, items: [] },
        clusters: { total: 0, items: [] },
        jobs: { total: 0, items: [] },
        users: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class FivetranConnector extends BaseConnector {
  constructor() {
    super('FivetranConnector');
  }
  async testConnection(config: {
    apiKey: string;
    apiSecret: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');
      this.setHeaders({ Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.fivetran.com/v1');
      const result = await this.get<any>('/connectors');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Fivetran. Found ${result.data?.items?.length || 0} connectors.`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { apiKey: string; apiSecret: string }): Promise<any> {
    const connectors: any[] = [];
    const destinations: any[] = [];
    const syncHistory: any[] = [];
    const errors: string[] = [];
    try {
      const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');
      this.setHeaders({ Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' });
      this.setBaseURL('https://api.fivetran.com/v1');
      const connectorsResult = await this.get<any>('/connectors');
      if (connectorsResult.data?.items) connectors.push(...connectorsResult.data.items);
      else if (connectorsResult.error) errors.push(connectorsResult.error);
      const destinationsResult = await this.get<any>('/destinations');
      if (destinationsResult.data?.items) destinations.push(...destinationsResult.data.items);
      else if (destinationsResult.error) errors.push(destinationsResult.error);
      const active = connectors.filter((c: any) => c.status === 'connected').length;
      return {
        connectors: { total: connectors.length, active, items: connectors },
        destinations: { total: destinations.length, items: destinations },
        syncHistory: { total: syncHistory.length, items: syncHistory },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        connectors: { total: 0, active: 0, items: [] },
        destinations: { total: 0, items: [] },
        syncHistory: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class HeapConnector extends BaseConnector {
  constructor() {
    super('HeapConnector');
  }
  async testConnection(config: {
    appId: string;
    apiKey: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.appId) return { success: false, message: 'App ID required' };
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL(`https://heap.io/api/v1/apps/${config.appId}`);
      const result = await this.get<any>('/events');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Heap. Found ${result.data?.events?.length || 0} events.`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { appId: string; apiKey: string }): Promise<any> {
    const events: any[] = [];
    const users: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL(`https://heap.io/api/v1/apps/${config.appId}`);
      const eventsResult = await this.get<any>('/events');
      if (eventsResult.data?.events) events.push(...eventsResult.data.events);
      else if (eventsResult.error) errors.push(eventsResult.error);
      const usersResult = await this.get<any>('/users');
      if (usersResult.data?.users) users.push(...usersResult.data.users);
      else if (usersResult.error) errors.push(usersResult.error);
      return {
        events: { total: events.length, items: events },
        users: { total: users.length, items: users },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        events: { total: 0, items: [] },
        users: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class QlikConnector extends BaseConnector {
  constructor() {
    super('QlikConnector');
  }
  async testConnection(config: {
    tenantUrl: string;
    apiKey: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.tenantUrl) return { success: false, message: 'Tenant URL required' };
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL(`https://${config.tenantUrl}/api/v1`);
      const result = await this.get<any>('/items');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Qlik. Found ${result.data?.data?.length || 0} items.`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { tenantUrl: string; apiKey: string }): Promise<any> {
    const apps: any[] = [];
    const users: any[] = [];
    const spaces: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL(`https://${config.tenantUrl}/api/v1`);
      const appsResult = await this.get<any>('/items?resourceType=app');
      if (appsResult.data?.data) apps.push(...appsResult.data.data);
      else if (appsResult.error) errors.push(appsResult.error);
      const usersResult = await this.get<any>('/users');
      if (usersResult.data?.data) users.push(...usersResult.data.data);
      else if (usersResult.error) errors.push(usersResult.error);
      const spacesResult = await this.get<any>('/spaces');
      if (spacesResult.data?.data) spaces.push(...spacesResult.data.data);
      else if (spacesResult.error) errors.push(spacesResult.error);
      return {
        apps: { total: apps.length, items: apps },
        users: { total: users.length, items: users },
        spaces: { total: spaces.length, items: spaces },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        apps: { total: 0, items: [] },
        users: { total: 0, items: [] },
        spaces: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

// CRM Additional
@Injectable()
export class CloseConnector extends BaseConnector {
  constructor() {
    super('CloseConnector');
  }
  async testConnection(config: {
    apiKey: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      this.setHeaders({
        Authorization: `Basic ${Buffer.from(`${config.apiKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.close.com/api/v1');
      const result = await this.get<any>('/me');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Close. User: ${result.data?.email || 'Unknown'}`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { apiKey: string }): Promise<any> {
    const leads: any[] = [];
    const opportunities: any[] = [];
    const activities: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Basic ${Buffer.from(`${config.apiKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.close.com/api/v1');
      const leadsResult = await this.get<any>('/lead');
      if (leadsResult.data?.data) leads.push(...leadsResult.data.data);
      else if (leadsResult.error) errors.push(leadsResult.error);
      const oppsResult = await this.get<any>('/opportunity');
      if (oppsResult.data?.data) opportunities.push(...oppsResult.data.data);
      else if (oppsResult.error) errors.push(oppsResult.error);
      const activitiesResult = await this.get<any>('/activity');
      if (activitiesResult.data?.data) activities.push(...activitiesResult.data.data);
      else if (activitiesResult.error) errors.push(activitiesResult.error);
      return {
        leads: { total: leads.length, items: leads },
        opportunities: { total: opportunities.length, items: opportunities },
        activities: { total: activities.length, items: activities },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        leads: { total: 0, items: [] },
        opportunities: { total: 0, items: [] },
        activities: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class InsightlyConnector extends BaseConnector {
  constructor() {
    super('InsightlyConnector');
  }
  async testConnection(config: {
    apiKey: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      this.setHeaders({
        Authorization: `Basic ${Buffer.from(`${config.apiKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.insightly.com/v3.1');
      const result = await this.get<any>('/Contacts');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Insightly. Found ${result.data?.length || 0} contacts.`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { apiKey: string }): Promise<any> {
    const contacts: any[] = [];
    const organizations: any[] = [];
    const projects: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Basic ${Buffer.from(`${config.apiKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.insightly.com/v3.1');
      const contactsResult = await this.get<any>('/Contacts');
      if (contactsResult.data)
        contacts.push(...(Array.isArray(contactsResult.data) ? contactsResult.data : []));
      else if (contactsResult.error) errors.push(contactsResult.error);
      const orgsResult = await this.get<any>('/Organisations');
      if (orgsResult.data)
        organizations.push(...(Array.isArray(orgsResult.data) ? orgsResult.data : []));
      else if (orgsResult.error) errors.push(orgsResult.error);
      const projectsResult = await this.get<any>('/Projects');
      if (projectsResult.data)
        projects.push(...(Array.isArray(projectsResult.data) ? projectsResult.data : []));
      else if (projectsResult.error) errors.push(projectsResult.error);
      return {
        contacts: { total: contacts.length, items: contacts },
        organizations: { total: organizations.length, items: organizations },
        projects: { total: projects.length, items: projects },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        contacts: { total: 0, items: [] },
        organizations: { total: 0, items: [] },
        projects: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

// Knowledge Base - Notion specific
@Injectable()
export class Rapid7Connector extends BaseConnector {
  constructor() {
    super('Rapid7Connector');
  }
  async testConnection(config: {
    baseUrl: string;
    apiKey: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.baseUrl || !config.apiKey)
      return { success: false, message: 'Base URL and API key required' };
    try {
      this.setHeaders({ 'X-Api-Key': config.apiKey, 'Content-Type': 'application/json' });
      this.setBaseURL(config.baseUrl);
      const result = await this.get<any>('/api/3/assets');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Rapid7. Found ${result.data?.resources?.length || 0} assets.`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { baseUrl: string; apiKey: string }): Promise<any> {
    const assets: any[] = [];
    const vulnerabilities: any[] = [];
    const scans: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({ 'X-Api-Key': config.apiKey, 'Content-Type': 'application/json' });
      this.setBaseURL(config.baseUrl);
      const assetsResult = await this.get<any>('/api/3/assets');
      if (assetsResult.data?.resources) assets.push(...assetsResult.data.resources);
      else if (assetsResult.error) errors.push(assetsResult.error);
      const vulnsResult = await this.get<any>('/api/3/vulnerabilities');
      if (vulnsResult.data?.resources) vulnerabilities.push(...vulnsResult.data.resources);
      else if (vulnsResult.error) errors.push(vulnsResult.error);
      const scansResult = await this.get<any>('/api/3/scans');
      if (scansResult.data?.resources) scans.push(...scansResult.data.resources);
      else if (scansResult.error) errors.push(scansResult.error);
      return {
        assets: { total: assets.length, items: assets },
        vulnerabilities: { total: vulnerabilities.length, items: vulnerabilities },
        scans: { total: scans.length, items: scans },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        assets: { total: 0, items: [] },
        vulnerabilities: { total: 0, items: [] },
        scans: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class SumoLogicConnector extends BaseConnector {
  constructor() {
    super('SumoLogicConnector');
  }
  async testConnection(config: any): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiEndpoint || !config.accessId || !config.accessKey)
      return { success: false, message: 'API endpoint, Access ID, and Access Key required' };
    try {
      const auth = Buffer.from(`${config.accessId}:${config.accessKey}`).toString('base64');
      this.setHeaders({ Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' });
      this.setBaseURL(config.apiEndpoint);
      const result = await this.get<any>('/api/v1/users');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Sumo Logic. Found ${result.data?.data?.length || 0} users.`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: any): Promise<any> {
    const users: any[] = [];
    const roles: any[] = [];
    const errors: string[] = [];
    try {
      const auth = Buffer.from(`${config.accessId}:${config.accessKey}`).toString('base64');
      this.setHeaders({ Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' });
      this.setBaseURL(config.apiEndpoint);
      const usersResult = await this.get<any>('/api/v1/users');
      if (usersResult.data?.data) users.push(...usersResult.data.data);
      else if (usersResult.error) errors.push(usersResult.error);
      const rolesResult = await this.get<any>('/api/v1/roles');
      if (rolesResult.data?.data) roles.push(...rolesResult.data.data);
      else if (rolesResult.error) errors.push(rolesResult.error);
      return {
        users: { total: users.length, items: users },
        roles: { total: roles.length, items: roles },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        users: { total: 0, items: [] },
        roles: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class NotionKMConnector extends BaseConnector {
  constructor() {
    super('NotionKMConnector');
  }
  async testConnection(config: {
    apiToken: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
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
  async sync(config: { apiToken: string }): Promise<any> {
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
        pages: { total: pages.length, items: pages },
        databases: { total: databases.length, items: databases },
        users: { total: users.length, items: users },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        pages: { total: 0, items: [] },
        databases: { total: 0, items: [] },
        users: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}
