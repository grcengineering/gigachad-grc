import { Injectable, Logger } from '@nestjs/common';
import {
  createGoogleServiceAccountJwt,
  exchangeGoogleJwtForAccessToken,
  parseServiceAccountKey,
  GoogleServiceAccountKey,
} from './utils/google-jwt';

export interface GCPConfig {
  projectId: string;
  serviceAccountKey: string; // JSON string of service account credentials
  organizationId?: string;   // Optional - enables org-scoped Security Command Center
}

export interface GCPSyncResult {
  securityCommandCenter: {
    findings: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    sources: string[];
  };
  iamPolicies: {
    serviceAccounts: number;
    roles: number;
    bindings: number;
    excessivePermissions: number;
  };
  computeInstances: {
    total: number;
    running: number;
    withPublicIp: number;
    withShieldedVm: number;
  };
  cloudStorage: {
    buckets: number;
    publicBuckets: number;
    uniformAccessBuckets: number;
  };
  cloudSql: {
    instances: number;
    withSsl: number;
    publicInstances: number;
  };
  logging: {
    sinks: number;
    auditLogsEnabled: boolean;
  };
  collectedAt: string;
  errors: string[];
}

const GCP_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

// IAM roles considered overly broad / "excessive" for purposes of GRC reporting.
const EXCESSIVE_ROLES = new Set<string>([
  'roles/owner',
  'roles/editor',
  'roles/iam.securityAdmin',
  'roles/iam.serviceAccountTokenCreator',
  'roles/iam.serviceAccountKeyAdmin',
]);

@Injectable()
export class GCPConnector {
  private readonly logger = new Logger(GCPConnector.name);

  async testConnection(config: GCPConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.projectId || !config.serviceAccountKey) {
      return { success: false, message: 'Project ID and Service Account Key are required' };
    }

    let credentials: GoogleServiceAccountKey;
    try {
      credentials = parseServiceAccountKey(config.serviceAccountKey);
    } catch (error: any) {
      return { success: false, message: error.message || 'Invalid service account key' };
    }

    try {
      const token = await this.getAccessToken(credentials);

      // Verify the token actually works against a real GCP endpoint.
      const verifyResp = await fetch(
        `https://cloudresourcemanager.googleapis.com/v1/projects/${encodeURIComponent(config.projectId)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!verifyResp.ok) {
        const text = await verifyResp.text();
        return { success: false, message: `GCP API error: ${verifyResp.status} ${text}` };
      }

      return {
        success: true,
        message: `Connected to GCP project: ${config.projectId}`,
        details: { projectId: config.projectId, serviceAccountEmail: credentials.client_email },
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  async sync(config: GCPConfig): Promise<GCPSyncResult> {
    const errors: string[] = [];

    const credentials = parseServiceAccountKey(config.serviceAccountKey);
    const token = await this.getAccessToken(credentials);

    const [
      securityFindings,
      iamData,
      computeData,
      storageData,
      sqlData,
      loggingData,
    ] = await Promise.all([
      this.getSecurityFindings(token, config.projectId, config.organizationId).catch(e => {
        errors.push(`Security: ${e.message}`);
        return { findings: 0, critical: 0, high: 0, medium: 0, low: 0, sources: [] };
      }),
      this.getIAMData(token, config.projectId).catch(e => {
        errors.push(`IAM: ${e.message}`);
        return { serviceAccounts: 0, roles: 0, bindings: 0, excessivePermissions: 0 };
      }),
      this.getComputeData(token, config.projectId).catch(e => {
        errors.push(`Compute: ${e.message}`);
        return { total: 0, running: 0, withPublicIp: 0, withShieldedVm: 0 };
      }),
      this.getCloudStorageData(token, config.projectId).catch(e => {
        errors.push(`Cloud Storage: ${e.message}`);
        return { buckets: 0, publicBuckets: 0, uniformAccessBuckets: 0 };
      }),
      this.getCloudSqlData(token, config.projectId).catch(e => {
        errors.push(`Cloud SQL: ${e.message}`);
        return { instances: 0, withSsl: 0, publicInstances: 0 };
      }),
      this.getLoggingData(token, config.projectId).catch(e => {
        errors.push(`Logging: ${e.message}`);
        return { sinks: 0, auditLogsEnabled: false };
      }),
    ]);

    return {
      securityCommandCenter: securityFindings,
      iamPolicies: iamData,
      computeInstances: computeData,
      cloudStorage: storageData,
      cloudSql: sqlData,
      logging: loggingData,
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private async getAccessToken(credentials: GoogleServiceAccountKey): Promise<string> {
    const jwt = createGoogleServiceAccountJwt(credentials, { scope: GCP_SCOPE });
    return exchangeGoogleJwtForAccessToken(jwt, credentials.token_uri);
  }

  private async authedGet(token: string, url: string): Promise<any> {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GET ${url} failed: ${response.status} ${text}`);
    }
    return response.json();
  }

  private async authedPost(token: string, url: string, body: any): Promise<any> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`POST ${url} failed: ${response.status} ${text}`);
    }
    return response.json();
  }

  private async getSecurityFindings(
    token: string,
    projectId: string,
    organizationId?: string,
  ): Promise<GCPSyncResult['securityCommandCenter']> {
    const findings: any[] = [];
    const sources = new Set<string>();

    // Prefer org-level if provided, fall back to project-level.
    const baseParent = organizationId
      ? `organizations/${organizationId}`
      : `projects/${projectId}`;
    const url = `https://securitycenter.googleapis.com/v1/${baseParent}/sources/-/findings:list`;

    let pageToken: string | undefined;
    let pages = 0;
    do {
      const body: any = { pageSize: 1000 };
      if (pageToken) body.pageToken = pageToken;
      const data = await this.authedPost(token, url, body);
      const listed = data.listFindingsResults || data.findings || [];
      for (const entry of listed) {
        const finding = entry.finding || entry;
        findings.push(finding);
        if (finding.parent) sources.add(finding.parent);
      }
      pageToken = data.nextPageToken;
      pages += 1;
    } while (pageToken && findings.length < 5000 && pages < 20);

    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;
    for (const f of findings) {
      switch ((f.severity || '').toUpperCase()) {
        case 'CRITICAL':
          critical += 1;
          break;
        case 'HIGH':
          high += 1;
          break;
        case 'MEDIUM':
          medium += 1;
          break;
        case 'LOW':
          low += 1;
          break;
        default:
          break;
      }
    }

    return {
      findings: findings.length,
      critical,
      high,
      medium,
      low,
      sources: Array.from(sources),
    };
  }

  private async getIAMData(token: string, projectId: string): Promise<GCPSyncResult['iamPolicies']> {
    // Service accounts
    const serviceAccounts: any[] = [];
    let pageToken: string | undefined;
    let pages = 0;
    do {
      const url = `https://iam.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/serviceAccounts?pageSize=100${
        pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
      }`;
      const data = await this.authedGet(token, url);
      serviceAccounts.push(...(data.accounts || []));
      pageToken = data.nextPageToken;
      pages += 1;
    } while (pageToken && serviceAccounts.length < 5000 && pages < 50);

    // Project IAM policy
    const policyUrl = `https://cloudresourcemanager.googleapis.com/v1/projects/${encodeURIComponent(projectId)}:getIamPolicy`;
    const policy = await this.authedPost(token, policyUrl, {});
    const bindings = policy.bindings || [];

    let totalBindingMembers = 0;
    let excessivePermissions = 0;
    const roleSet = new Set<string>();
    for (const b of bindings) {
      if (b.role) roleSet.add(b.role);
      const members = b.members || [];
      totalBindingMembers += members.length;
      if (EXCESSIVE_ROLES.has(b.role)) {
        excessivePermissions += members.length;
      }
    }

    return {
      serviceAccounts: serviceAccounts.length,
      roles: roleSet.size,
      bindings: totalBindingMembers,
      excessivePermissions,
    };
  }

  private async getComputeData(token: string, projectId: string): Promise<GCPSyncResult['computeInstances']> {
    let total = 0;
    let running = 0;
    let withPublicIp = 0;
    let withShieldedVm = 0;

    let pageToken: string | undefined;
    let pages = 0;
    do {
      const url = `https://compute.googleapis.com/compute/v1/projects/${encodeURIComponent(projectId)}/aggregated/instances?maxResults=500${
        pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
      }`;
      const data = await this.authedGet(token, url);
      const items = data.items || {};
      for (const zone of Object.keys(items)) {
        const zoneInstances = items[zone]?.instances || [];
        for (const instance of zoneInstances) {
          total += 1;
          if (instance.status === 'RUNNING') running += 1;
          const interfaces = instance.networkInterfaces || [];
          const hasPublic = interfaces.some((iface: any) =>
            (iface.accessConfigs || []).some((ac: any) => !!ac.natIP),
          );
          if (hasPublic) withPublicIp += 1;
          if (instance.shieldedInstanceConfig?.enableSecureBoot) withShieldedVm += 1;
        }
      }
      pageToken = data.nextPageToken;
      pages += 1;
    } while (pageToken && pages < 50);

    return { total, running, withPublicIp, withShieldedVm };
  }

  private async getCloudStorageData(token: string, projectId: string): Promise<GCPSyncResult['cloudStorage']> {
    const buckets: any[] = [];
    let pageToken: string | undefined;
    let pages = 0;
    do {
      const url = `https://storage.googleapis.com/storage/v1/b?project=${encodeURIComponent(projectId)}&maxResults=200${
        pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
      }`;
      const data = await this.authedGet(token, url);
      buckets.push(...(data.items || []));
      pageToken = data.nextPageToken;
      pages += 1;
    } while (pageToken && buckets.length < 5000 && pages < 50);

    let publicBuckets = 0;
    let uniformAccessBuckets = 0;
    for (const b of buckets) {
      if (b.iamConfiguration?.uniformBucketLevelAccess?.enabled) uniformAccessBuckets += 1;
      // Count buckets where public access prevention is NOT enforced as potentially public.
      // (The bucket list endpoint does not expose effective ACLs; this is the closest signal
      // available without per-bucket policy lookups.)
      if (b.iamConfiguration?.publicAccessPrevention &&
          b.iamConfiguration.publicAccessPrevention !== 'enforced') {
        publicBuckets += 1;
      }
    }

    return {
      buckets: buckets.length,
      publicBuckets,
      uniformAccessBuckets,
    };
  }

  private async getCloudSqlData(token: string, projectId: string): Promise<GCPSyncResult['cloudSql']> {
    const instances: any[] = [];
    let pageToken: string | undefined;
    let pages = 0;
    do {
      const url = `https://sqladmin.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/instances?maxResults=200${
        pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
      }`;
      const data = await this.authedGet(token, url);
      instances.push(...(data.items || []));
      pageToken = data.nextPageToken;
      pages += 1;
    } while (pageToken && instances.length < 5000 && pages < 50);

    let withSsl = 0;
    let publicInstances = 0;
    for (const inst of instances) {
      const ipConfig = inst.settings?.ipConfiguration;
      if (ipConfig?.requireSsl || ipConfig?.sslMode === 'ENCRYPTED_ONLY' ||
          ipConfig?.sslMode === 'TRUSTED_CLIENT_CERTIFICATE_REQUIRED') {
        withSsl += 1;
      }
      const authNetworks = ipConfig?.authorizedNetworks || [];
      const hasPublicAuth = authNetworks.some((n: any) => n.value === '0.0.0.0/0');
      if (ipConfig?.ipv4Enabled && hasPublicAuth) publicInstances += 1;
    }

    return {
      instances: instances.length,
      withSsl,
      publicInstances,
    };
  }

  private async getLoggingData(token: string, projectId: string): Promise<GCPSyncResult['logging']> {
    const sinks: any[] = [];
    let pageToken: string | undefined;
    let pages = 0;
    do {
      const url = `https://logging.googleapis.com/v2/projects/${encodeURIComponent(projectId)}/sinks?pageSize=200${
        pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
      }`;
      const data = await this.authedGet(token, url);
      sinks.push(...(data.sinks || []));
      pageToken = data.nextPageToken;
      pages += 1;
    } while (pageToken && sinks.length < 5000 && pages < 50);

    // Check the project's IAM audit config to determine if audit logs are enabled.
    let auditLogsEnabled = false;
    try {
      const policyUrl = `https://cloudresourcemanager.googleapis.com/v1/projects/${encodeURIComponent(projectId)}:getIamPolicy`;
      const policy = await this.authedPost(token, policyUrl, {
        options: { requestedPolicyVersion: 3 },
      });
      const auditConfigs = policy.auditConfigs || [];
      auditLogsEnabled = auditConfigs.some((ac: any) =>
        (ac.auditLogConfigs || []).some((alc: any) =>
          ['DATA_READ', 'DATA_WRITE', 'ADMIN_READ'].includes(alc.logType),
        ),
      );
    } catch {
      // If we cannot determine, leave as false rather than fabricate a value.
      auditLogsEnabled = false;
    }

    return {
      sinks: sinks.length,
      auditLogsEnabled,
    };
  }
}
