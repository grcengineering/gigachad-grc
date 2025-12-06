import { BaseEntity, Auditable } from './common';

export type IntegrationType =
  | 'aws'
  | 'gcp'
  | 'azure'
  | 'github'
  | 'okta'
  | 'jira'
  | 'slack'
  | 'custom';

export type IntegrationStatus =
  | 'active'
  | 'inactive'
  | 'error'
  | 'pending_setup';

export type SyncFrequency =
  | 'realtime'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'manual';

export interface Integration extends BaseEntity, Auditable {
  organizationId: string;
  type: IntegrationType;
  name: string;
  description?: string;
  status: IntegrationStatus;
  
  // Configuration (encrypted)
  config: IntegrationConfig;
  
  // Sync settings
  syncFrequency: SyncFrequency;
  lastSyncAt?: Date;
  nextSyncAt?: Date;
  lastSyncStatus?: 'success' | 'partial' | 'failed';
  lastSyncError?: string;
  
  // Stats
  totalEvidenceCollected: number;
  lastEvidenceAt?: Date;
}

export interface IntegrationConfig {
  // AWS
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsRegion?: string;
  awsRoleArn?: string;
  
  // GCP
  gcpProjectId?: string;
  gcpCredentials?: string;
  
  // Azure
  azureTenantId?: string;
  azureClientId?: string;
  azureClientSecret?: string;
  azureSubscriptionId?: string;
  
  // GitHub
  githubAppId?: string;
  githubPrivateKey?: string;
  githubInstallationId?: string;
  githubOrg?: string;
  
  // Okta
  oktaDomain?: string;
  oktaApiToken?: string;
  
  // Jira
  jiraHost?: string;
  jiraEmail?: string;
  jiraApiToken?: string;
  jiraProjectKey?: string;
  
  // Slack
  slackBotToken?: string;
  slackSigningSecret?: string;
  slackAppToken?: string;
  slackChannelId?: string;
  
  // Custom webhook
  webhookUrl?: string;
  webhookSecret?: string;
  
  // Additional settings
  [key: string]: unknown;
}

export interface SyncJob extends BaseEntity {
  integrationId: string;
  organizationId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  triggeredBy: 'schedule' | 'manual' | 'webhook';
  startedAt?: Date;
  completedAt?: Date;
  itemsProcessed: number;
  itemsFailed: number;
  evidenceCreated: number;
  logs: SyncJobLog[];
  error?: string;
}

export interface SyncJobLog {
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
  message: string;
  details?: Record<string, unknown>;
}

// API Keys for inbound integrations
export interface ApiKey extends BaseEntity {
  organizationId: string;
  name: string;
  description?: string;
  keyHash: string;
  keyPrefix: string; // First 8 chars for identification
  scopes: ApiKeyScope[];
  lastUsedAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
  createdBy: string;
}

export type ApiKeyScope =
  | 'evidence:write'
  | 'controls:read'
  | 'controls:write'
  | 'frameworks:read'
  | 'policies:read'
  | 'all';

// Webhooks
export interface WebhookEvent extends BaseEntity {
  organizationId: string;
  source: IntegrationType | 'custom';
  eventType: string;
  payload: Record<string, unknown>;
  receivedAt: Date;
  processedAt?: Date;
  status: 'received' | 'processing' | 'processed' | 'failed';
  error?: string;
}

// Compliance Checks (for continuous monitoring)
export interface ComplianceCheck extends BaseEntity {
  organizationId: string;
  integrationId: string;
  controlId: string;
  name: string;
  description?: string;
  checkType: string; // e.g., 'aws_config_rule', 'github_branch_protection'
  config: Record<string, unknown>;
  isEnabled: boolean;
  lastRunAt?: Date;
  lastResult?: 'pass' | 'fail' | 'error';
  lastResultDetails?: Record<string, unknown>;
}

export interface ComplianceCheckResult extends BaseEntity {
  checkId: string;
  runAt: Date;
  result: 'pass' | 'fail' | 'error';
  details?: Record<string, unknown>;
  evidenceId?: string;
  resourcesChecked: number;
  resourcesPassed: number;
  resourcesFailed: number;
}

// Alerts
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved' | 'suppressed';

export interface Alert extends BaseEntity {
  organizationId: string;
  type: 'compliance_drift' | 'evidence_expiring' | 'integration_error' | 'review_due' | 'custom';
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  source?: string;
  sourceId?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  metadata?: Record<string, unknown>;
}

// DTOs
export interface CreateIntegrationDto {
  type: IntegrationType;
  name: string;
  description?: string;
  config: Partial<IntegrationConfig>;
  syncFrequency?: SyncFrequency;
}

export interface UpdateIntegrationDto {
  name?: string;
  description?: string;
  config?: Partial<IntegrationConfig>;
  syncFrequency?: SyncFrequency;
  status?: IntegrationStatus;
}

export interface CreateApiKeyDto {
  name: string;
  description?: string;
  scopes: ApiKeyScope[];
  expiresAt?: Date;
}

export interface CreateComplianceCheckDto {
  integrationId: string;
  controlId: string;
  name: string;
  description?: string;
  checkType: string;
  config: Record<string, unknown>;
}

export interface AcknowledgeAlertDto {
  notes?: string;
}

export interface ResolveAlertDto {
  notes?: string;
}

// Slack-specific types
export interface SlackNotification {
  channel: string;
  type: 'compliance_alert' | 'task_assigned' | 'evidence_expiring' | 'review_due' | 'custom';
  title: string;
  message: string;
  severity?: AlertSeverity;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface SlackCommand {
  command: string;
  text: string;
  userId: string;
  channelId: string;
  responseUrl: string;
}



