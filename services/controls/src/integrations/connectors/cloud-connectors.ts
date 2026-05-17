import { Injectable } from '@nestjs/common';
import { BaseConnector } from './base-connector';
import axios from 'axios';
import * as crypto from 'crypto';
import { URL } from 'url';

// =============================================================================
// Additional Cloud Provider Connectors - Fully Implemented
// =============================================================================

@Injectable()
export class DigitalOceanConnector extends BaseConnector {
  constructor() {
    super('DigitalOceanConnector');
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
      this.setBaseURL('https://api.digitalocean.com/v2');
      const result = await this.get<any>('/account');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to DigitalOcean. Account: ${result.data?.account?.email || 'Unknown'}`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { apiToken: string }): Promise<any> {
    const droplets: any[] = [];
    const databases: any[] = [];
    const volumes: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.digitalocean.com/v2');
      const dropletsResult = await this.get<any>('/droplets');
      if (dropletsResult.data?.droplets) droplets.push(...dropletsResult.data.droplets);
      else if (dropletsResult.error) errors.push(dropletsResult.error);
      const databasesResult = await this.get<any>('/databases');
      if (databasesResult.data?.databases) databases.push(...databasesResult.data.databases);
      else if (databasesResult.error) errors.push(databasesResult.error);
      const volumesResult = await this.get<any>('/volumes');
      if (volumesResult.data?.volumes) volumes.push(...volumesResult.data.volumes);
      else if (volumesResult.error) errors.push(volumesResult.error);
      return {
        droplets: { total: droplets.length, items: droplets },
        databases: { total: databases.length, items: databases },
        volumes: { total: volumes.length, items: volumes },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        droplets: { total: 0, items: [] },
        databases: { total: 0, items: [] },
        volumes: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class OracleCloudConnector extends BaseConnector {
  private ociConfig: { tenancyOcid: string; userOcid: string; fingerprint: string; privateKey: string; region: string } | null = null;
  constructor() { super('OracleCloudConnector'); }

  private ociSign(method: string, urlString: string): Record<string, string> {
    if (!this.ociConfig) throw new Error('OCI config not initialized');
    const { tenancyOcid, userOcid, fingerprint, privateKey } = this.ociConfig;
    const keyId = `${tenancyOcid}/${userOcid}/${fingerprint}`;
    const parsed = new URL(urlString);
    const date = new Date().toUTCString();
    const requestTarget = `${method.toLowerCase()} ${parsed.pathname}${parsed.search}`;
    const signingString = `(request-target): ${requestTarget}\nhost: ${parsed.host}\ndate: ${date}`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signingString);
    const signature = signer.sign(privateKey, 'base64');
    const headers = '(request-target) host date';
    return {
      'Authorization': `Signature version="1",keyId="${keyId}",algorithm="rsa-sha256",headers="${headers}",signature="${signature}"`,
      'date': date,
      'host': parsed.host,
      'Accept': 'application/json',
    };
  }

  async testConnection(config: any): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.tenancyOcid || !config.userOcid || !config.fingerprint || !config.privateKey || !config.region) {
      return { success: false, message: 'tenancyOcid, userOcid, fingerprint, privateKey, and region are required' };
    }
    this.ociConfig = config;
    try {
      const url = `https://identity.${config.region}.oraclecloud.com/20160918/compartments?compartmentId=${encodeURIComponent(config.tenancyOcid)}&limit=1`;
      const headers = this.ociSign('GET', url);
      const response = await axios.get(url, { headers, timeout: 30000, validateStatus: (s) => s < 500 });
      if (response.status >= 400) {
        return { success: false, message: `HTTP ${response.status}: ${JSON.stringify(response.data || response.statusText)}` };
      }
      return { success: true, message: 'Connected to Oracle Cloud', details: { compartments: Array.isArray(response.data) ? response.data.length : 0 } };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }

  async sync(config: any): Promise<any> {
    if (!config.tenancyOcid || !config.userOcid || !config.fingerprint || !config.privateKey || !config.region) {
      throw new Error('Oracle Cloud credentials missing: tenancyOcid, userOcid, fingerprint, privateKey, region required');
    }
    this.ociConfig = config;
    const compartments: any[] = [];
    const instances: any[] = [];
    const databases: any[] = [];
    const errors: string[] = [];

    const callOci = async (url: string): Promise<any> => {
      const headers = this.ociSign('GET', url);
      const response = await axios.get(url, { headers, timeout: 30000, validateStatus: (s) => s < 500 });
      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data || response.statusText)}`);
      }
      return response.data;
    };

    try {
      const data = await callOci(`https://identity.${config.region}.oraclecloud.com/20160918/compartments?compartmentId=${encodeURIComponent(config.tenancyOcid)}`);
      if (Array.isArray(data)) compartments.push(...data);
    } catch (error: any) {
      errors.push(`compartments: ${error.message}`);
    }

    try {
      const data = await callOci(`https://iaas.${config.region}.oraclecloud.com/20160918/instances?compartmentId=${encodeURIComponent(config.tenancyOcid)}`);
      if (Array.isArray(data)) instances.push(...data);
    } catch (error: any) {
      errors.push(`instances: ${error.message}`);
    }

    try {
      const data = await callOci(`https://database.${config.region}.oraclecloud.com/20160918/dbSystems?compartmentId=${encodeURIComponent(config.tenancyOcid)}`);
      if (Array.isArray(data)) databases.push(...data);
    } catch (error: any) {
      errors.push(`databases: ${error.message}`);
    }

    return {
      compartments: { total: compartments.length, items: compartments },
      instances: { total: instances.length, items: instances },
      databases: { total: databases.length, items: databases },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }
}

@Injectable()
export class IBMCloudConnector extends BaseConnector {
  constructor() {
    super('IBMCloudConnector');
  }
  async testConnection(config: {
    apiKey: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      const tokenResponse = await axios.post(
        'https://iam.cloud.ibm.com/identity/token',
        new URLSearchParams({
          grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
          apikey: config.apiKey,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
        }
      );
      const accessToken = tokenResponse.data?.access_token;
      if (!accessToken) return { success: false, message: 'Failed to obtain access token' };
      this.setHeaders({
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://resource-controller.cloud.ibm.com');
      const result = await this.get<any>('/v2/resource_instances');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to IBM Cloud. Found ${result.data?.resources?.length || 0} resources.`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { apiKey: string }): Promise<any> {
    const resources: any[] = [];
    const vms: any[] = [];
    const errors: string[] = [];
    try {
      const tokenResponse = await axios.post(
        'https://iam.cloud.ibm.com/identity/token',
        new URLSearchParams({
          grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
          apikey: config.apiKey,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
        }
      );
      const accessToken = tokenResponse.data?.access_token;
      if (!accessToken)
        return {
          resources: { total: 0, items: [] },
          vms: { total: 0, items: [] },
          collectedAt: new Date().toISOString(),
          errors: ['Failed to obtain access token'],
        };
      this.setHeaders({
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://resource-controller.cloud.ibm.com');
      const resourcesResult = await this.get<any>('/v2/resource_instances');
      if (resourcesResult.data?.resources) resources.push(...resourcesResult.data.resources);
      else if (resourcesResult.error) errors.push(resourcesResult.error);
      return {
        resources: { total: resources.length, items: resources },
        vms: { total: vms.length, items: vms },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        resources: { total: 0, items: [] },
        vms: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class AlibabaCloudConnector extends BaseConnector {
  private alibabaConfig: { accessKeyId: string; accessKeySecret: string; region: string } | null = null;
  constructor() { super('AlibabaCloudConnector'); }

  private percentEncode(s: string): string {
    return encodeURIComponent(s)
      .replace(/!/g, '%21')
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/\*/g, '%2A');
  }

  /**
   * Alibaba Cloud ACS3 signature (HMAC-SHA256 over canonical request).
   * Returns headers (including Authorization) for a signed request.
   * action — API action (e.g., 'DescribeInstances')
   * host   — full host (e.g., 'ecs.cn-hangzhou.aliyuncs.com')
   * params — query parameters (Action, RegionId, Version already merged by caller).
   */
  private alibabaSign(method: string, host: string, params: Record<string, string>, body: string = ''): { url: string; headers: Record<string, string> } {
    if (!this.alibabaConfig) throw new Error('Alibaba Cloud config not initialized');
    const { accessKeyId, accessKeySecret } = this.alibabaConfig;
    const dateIso = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const nonce = crypto.randomUUID();
    const payloadHash = crypto.createHash('sha256').update(body).digest('hex');

    const headers: Record<string, string> = {
      'host': host,
      'x-acs-action': params.Action,
      'x-acs-version': params.Version || '2014-05-26',
      'x-acs-date': dateIso,
      'x-acs-signature-nonce': nonce,
      'x-acs-content-sha256': payloadHash,
    };

    // Build canonical query string (sorted)
    const queryKeys = Object.keys(params).sort();
    const canonicalQuery = queryKeys
      .map((k) => `${this.percentEncode(k)}=${this.percentEncode(params[k])}`)
      .join('&');

    // Canonical headers (lowercase keys, sorted). All our header keys are already lowercase.
    const headerKeys = Object.keys(headers).sort();
    const canonicalHeaders = headerKeys
      .map((k) => `${k}:${headers[k]}\n`)
      .join('');
    const signedHeaders = headerKeys.join(';');

    const canonicalRequest = [
      method.toUpperCase(),
      '/',
      canonicalQuery,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const hashedCanonical = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
    const stringToSign = `ACS3-HMAC-SHA256\n${hashedCanonical}`;
    const signature = crypto.createHmac('sha256', accessKeySecret).update(stringToSign).digest('hex');

    headers['Authorization'] = `ACS3-HMAC-SHA256 Credential=${accessKeyId}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      url: `https://${host}/?${canonicalQuery}`,
      headers,
    };
  }

  async testConnection(config: any): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.accessKeyId || !config.accessKeySecret || !config.region) {
      return { success: false, message: 'accessKeyId, accessKeySecret, and region are required' };
    }
    this.alibabaConfig = config;
    try {
      const host = `ecs.${config.region}.aliyuncs.com`;
      const { url, headers } = this.alibabaSign('GET', host, {
        Action: 'DescribeRegions',
        Version: '2014-05-26',
      });
      const response = await axios.get(url, { headers, timeout: 30000, validateStatus: (s) => s < 500 });
      if (response.status >= 400) {
        return { success: false, message: `HTTP ${response.status}: ${JSON.stringify(response.data || response.statusText)}` };
      }
      return { success: true, message: 'Connected to Alibaba Cloud', details: response.data };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }

  async sync(config: any): Promise<any> {
    if (!config.accessKeyId || !config.accessKeySecret || !config.region) {
      throw new Error('Alibaba Cloud credentials missing: accessKeyId, accessKeySecret, region required');
    }
    this.alibabaConfig = config;
    const instances: any[] = [];
    const databases: any[] = [];
    const storage: any[] = [];
    const errors: string[] = [];

    // ECS instances
    try {
      const host = `ecs.${config.region}.aliyuncs.com`;
      const { url, headers } = this.alibabaSign('GET', host, {
        Action: 'DescribeInstances',
        Version: '2014-05-26',
        RegionId: config.region,
      });
      const response = await axios.get(url, { headers, timeout: 30000, validateStatus: (s) => s < 500 });
      if (response.status >= 400) {
        errors.push(`ECS DescribeInstances: HTTP ${response.status}: ${JSON.stringify(response.data || '')}`);
      } else {
        const items = response.data?.Instances?.Instance || response.data?.Instances || [];
        if (Array.isArray(items)) instances.push(...items);
      }
    } catch (error: any) {
      errors.push(`ECS DescribeInstances: ${error.message}`);
    }

    // RDS databases
    try {
      const host = `rds.${config.region}.aliyuncs.com`;
      const { url, headers } = this.alibabaSign('GET', host, {
        Action: 'DescribeDBInstances',
        Version: '2014-08-15',
        RegionId: config.region,
      });
      const response = await axios.get(url, { headers, timeout: 30000, validateStatus: (s) => s < 500 });
      if (response.status >= 400) {
        errors.push(`RDS DescribeDBInstances: HTTP ${response.status}: ${JSON.stringify(response.data || '')}`);
      } else {
        const items = response.data?.Items?.DBInstance || response.data?.Items || [];
        if (Array.isArray(items)) databases.push(...items);
      }
    } catch (error: any) {
      errors.push(`RDS DescribeDBInstances: ${error.message}`);
    }

    // OSS uses a separate, older signature scheme (HMAC-SHA1 with a different canonical request).
    // Not implemented here; surface the gap rather than fake success.
    errors.push('OSS list buckets not implemented: requires legacy OSS signature scheme (HMAC-SHA1, different canonical format)');

    return {
      instances: { total: instances.length, items: instances },
      databases: { total: databases.length, items: databases },
      storage: { total: storage.length, items: storage },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }
}

@Injectable()
export class LinodeConnector extends BaseConnector {
  constructor() {
    super('LinodeConnector');
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
      this.setBaseURL('https://api.linode.com/v4');
      const result = await this.get<any>('/account');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Linode. Account: ${result.data?.email || 'Unknown'}`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { apiToken: string }): Promise<any> {
    const linodes: any[] = [];
    const volumes: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.linode.com/v4');
      const linodesResult = await this.get<any>('/linode/instances');
      if (linodesResult.data?.data) linodes.push(...linodesResult.data.data);
      else if (linodesResult.error) errors.push(linodesResult.error);
      const volumesResult = await this.get<any>('/volumes');
      if (volumesResult.data?.data) volumes.push(...volumesResult.data.data);
      else if (volumesResult.error) errors.push(volumesResult.error);
      const running = linodes.filter((l: any) => l.status === 'running').length;
      return {
        linodes: { total: linodes.length, running, items: linodes },
        volumes: { total: volumes.length, items: volumes },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        linodes: { total: 0, running: 0, items: [] },
        volumes: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class VultrConnector extends BaseConnector {
  constructor() {
    super('VultrConnector');
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
      this.setBaseURL('https://api.vultr.com/v2');
      const result = await this.get<any>('/account');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Vultr. Account: ${result.data?.account?.email || 'Unknown'}`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { apiKey: string }): Promise<any> {
    const instances: any[] = [];
    const volumes: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.vultr.com/v2');
      const instancesResult = await this.get<any>('/instances');
      if (instancesResult.data?.instances) instances.push(...instancesResult.data.instances);
      else if (instancesResult.error) errors.push(instancesResult.error);
      const volumesResult = await this.get<any>('/blocks');
      if (volumesResult.data?.blocks) volumes.push(...volumesResult.data.blocks);
      else if (volumesResult.error) errors.push(volumesResult.error);
      return {
        instances: { total: instances.length, items: instances },
        volumes: { total: volumes.length, items: volumes },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        instances: { total: 0, items: [] },
        volumes: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class HerokuConnector extends BaseConnector {
  constructor() {
    super('HerokuConnector');
  }
  async testConnection(config: {
    apiKey: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiKey) return { success: false, message: 'API key required' };
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        Accept: 'application/vnd.heroku+json; version=3',
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.heroku.com');
      const result = await this.get<any>('/account');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Heroku. User: ${result.data?.email || 'Unknown'}`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { apiKey: string }): Promise<any> {
    const apps: any[] = [];
    const dynos: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        Accept: 'application/vnd.heroku+json; version=3',
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.heroku.com');
      const appsResult = await this.get<any>('/apps');
      if (appsResult.data) apps.push(...(Array.isArray(appsResult.data) ? appsResult.data : []));
      else if (appsResult.error) errors.push(appsResult.error);
      for (const app of apps.slice(0, 10)) {
        const dynosResult = await this.get<any>(`/apps/${app.name}/dynos`);
        if (dynosResult.data)
          dynos.push(...(Array.isArray(dynosResult.data) ? dynosResult.data : []));
        else if (dynosResult.error) errors.push(dynosResult.error);
      }
      return {
        apps: { total: apps.length, items: apps },
        dynos: { total: dynos.length, items: dynos },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        apps: { total: 0, items: [] },
        dynos: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class VercelConnector extends BaseConnector {
  constructor() {
    super('VercelConnector');
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
      this.setBaseURL('https://api.vercel.com');
      const result = await this.get<any>('/v2/user');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Vercel. User: ${result.data?.user?.username || 'Unknown'}`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { apiToken: string }): Promise<any> {
    const projects: any[] = [];
    const deployments: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.vercel.com');
      const projectsResult = await this.get<any>('/v9/projects');
      if (projectsResult.data?.projects) projects.push(...projectsResult.data.projects);
      else if (projectsResult.error) errors.push(projectsResult.error);
      for (const project of projects.slice(0, 10)) {
        const deploymentsResult = await this.get<any>(`/v6/deployments?projectId=${project.id}`);
        if (deploymentsResult.data?.deployments)
          deployments.push(...deploymentsResult.data.deployments);
        else if (deploymentsResult.error) errors.push(deploymentsResult.error);
      }
      return {
        projects: { total: projects.length, items: projects },
        deployments: { total: deployments.length, items: deployments },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        projects: { total: 0, items: [] },
        deployments: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class NetlifyConnector extends BaseConnector {
  constructor() {
    super('NetlifyConnector');
  }
  async testConnection(config: any): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.accessToken) return { success: false, message: 'Access token required' };
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.netlify.com/api/v1');
      const result = await this.get<any>('/user');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Netlify. User: ${result.data?.email || 'Unknown'}`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: any): Promise<any> {
    const sites: any[] = [];
    const deploys: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.netlify.com/api/v1');
      const sitesResult = await this.get<any>('/sites');
      if (sitesResult.data)
        sites.push(...(Array.isArray(sitesResult.data) ? sitesResult.data : []));
      else if (sitesResult.error) errors.push(sitesResult.error);
      for (const site of sites.slice(0, 10)) {
        const deploysResult = await this.get<any>(`/sites/${site.id}/deploys`);
        if (deploysResult.data)
          deploys.push(...(Array.isArray(deploysResult.data) ? deploysResult.data : []));
        else if (deploysResult.error) errors.push(deploysResult.error);
      }
      return {
        sites: { total: sites.length, items: sites },
        deploys: { total: deploys.length, items: deploys },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        sites: { total: 0, items: [] },
        deploys: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class RenderConnector extends BaseConnector {
  constructor() {
    super('RenderConnector');
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
      this.setBaseURL('https://api.render.com/v1');
      const result = await this.get<any>('/owners');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Render. Found ${result.data?.length || 0} owners.`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { apiKey: string }): Promise<any> {
    const services: any[] = [];
    const databases: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.render.com/v1');
      const servicesResult = await this.get<any>('/services');
      if (servicesResult.data)
        services.push(...(Array.isArray(servicesResult.data) ? servicesResult.data : []));
      else if (servicesResult.error) errors.push(servicesResult.error);
      const databasesResult = await this.get<any>('/databases');
      if (databasesResult.data)
        databases.push(...(Array.isArray(databasesResult.data) ? databasesResult.data : []));
      else if (databasesResult.error) errors.push(databasesResult.error);
      return {
        services: { total: services.length, items: services },
        databases: { total: databases.length, items: databases },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        services: { total: 0, items: [] },
        databases: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}

@Injectable()
export class HetznerConnector extends BaseConnector {
  constructor() {
    super('HetznerConnector');
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
      this.setBaseURL('https://api.hetzner.cloud/v1');
      const result = await this.get<any>('/servers');
      return result.error
        ? { success: false, message: result.error }
        : {
            success: true,
            message: `Connected to Hetzner. Found ${result.data?.servers?.length || 0} servers.`,
            details: result.data,
          };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }
  async sync(config: { apiToken: string }): Promise<any> {
    const servers: any[] = [];
    const volumes: any[] = [];
    const errors: string[] = [];
    try {
      this.setHeaders({
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      });
      this.setBaseURL('https://api.hetzner.cloud/v1');
      const serversResult = await this.get<any>('/servers');
      if (serversResult.data?.servers) servers.push(...serversResult.data.servers);
      else if (serversResult.error) errors.push(serversResult.error);
      const volumesResult = await this.get<any>('/volumes');
      if (volumesResult.data?.volumes) volumes.push(...volumesResult.data.volumes);
      else if (volumesResult.error) errors.push(volumesResult.error);
      const running = servers.filter((s: any) => s.status === 'running').length;
      return {
        servers: { total: servers.length, running, items: servers },
        volumes: { total: volumes.length, items: volumes },
        collectedAt: new Date().toISOString(),
        errors,
      };
    } catch (error: any) {
      return {
        servers: { total: 0, running: 0, items: [] },
        volumes: { total: 0, items: [] },
        collectedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
}
