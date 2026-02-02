/**
 * Integration Types
 * 
 * Type definitions for third-party integrations and their responses.
 */

export type IntegrationType =
  | 'jira'
  | 'servicenow'
  | 'slack'
  | 'teams'
  | 'aws'
  | 'azure'
  | 'gcp'
  | 'github'
  | 'gitlab'
  | 'okta'
  | 'onelogin'
  | 'crowdstrike'
  | 'qualys'
  | 'tenable'
  | 'snyk'
  | 'sonarqube'
  | 'datadog'
  | 'splunk'
  | 'pagerduty'
  | 'custom';

export type IntegrationStatus = 'active' | 'inactive' | 'error' | 'pending';

export type AuthType = 'oauth2' | 'api_key' | 'basic' | 'bearer' | 'custom';

export interface IntegrationCredentials {
  authType: AuthType;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
  customHeaders?: Record<string, string>;
}

export interface IntegrationConfig {
  baseUrl?: string;
  webhookUrl?: string;
  syncInterval?: number; // in minutes
  syncEnabled?: boolean;
  syncDirection?: 'inbound' | 'outbound' | 'bidirectional';
  fieldMappings?: FieldMapping[];
  filters?: IntegrationFilter[];
  customSettings?: Record<string, unknown>;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: 'none' | 'uppercase' | 'lowercase' | 'date' | 'boolean' | 'custom';
  defaultValue?: unknown;
  customTransform?: string; // JavaScript expression
}

export interface IntegrationFilter {
  field: string;
  operator: 'eq' | 'neq' | 'contains' | 'gt' | 'lt' | 'in';
  value: unknown;
}

export interface Integration {
  id: string;
  organizationId: string;
  type: IntegrationType;
  name: string;
  description?: string;
  status: IntegrationStatus;
  credentials: IntegrationCredentials;
  config: IntegrationConfig;
  lastSyncAt?: Date;
  lastError?: string;
  syncStats?: IntegrationSyncStats;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationSyncStats {
  totalSynced: number;
  lastSyncDuration?: number; // in milliseconds
  lastSyncRecords?: number;
  errorCount: number;
  successRate: number;
}

export interface IntegrationSyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: IntegrationSyncError[];
  duration: number; // in milliseconds
  startedAt: Date;
  completedAt: Date;
}

export interface IntegrationSyncError {
  recordId?: string;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface IntegrationWebhookPayload {
  integrationId: string;
  eventType: string;
  timestamp: Date;
  data: Record<string, unknown>;
  signature?: string;
}

export interface CreateIntegrationDto {
  type: IntegrationType;
  name: string;
  description?: string;
  credentials: IntegrationCredentials;
  config?: IntegrationConfig;
}

export interface UpdateIntegrationDto {
  name?: string;
  description?: string;
  status?: IntegrationStatus;
  credentials?: Partial<IntegrationCredentials>;
  config?: Partial<IntegrationConfig>;
}

export interface TestIntegrationResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
  responseTime?: number;
}

// Integration-specific response types
export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  description?: string;
  status: { name: string };
  priority: { name: string };
  assignee?: { displayName: string; emailAddress: string };
  created: string;
  updated: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  memberCount: number;
}

export interface AWSSecurityFinding {
  id: string;
  productArn: string;
  generatorId: string;
  awsAccountId: string;
  severity: { label: string; normalized: number };
  title: string;
  description: string;
  resources: Array<{ type: string; id: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface VulnerabilityScanResult {
  id: string;
  source: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  cveId?: string;
  cvssScore?: number;
  affectedAssets: string[];
  recommendation?: string;
  discoveredAt: Date;
}
