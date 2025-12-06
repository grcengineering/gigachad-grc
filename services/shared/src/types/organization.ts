import { BaseEntity, Status } from './common';

export interface Organization extends BaseEntity {
  name: string;
  slug: string;
  description?: string;
  status: Status;
  settings: OrganizationSettings;
  subscription?: SubscriptionInfo;
}

export interface OrganizationSettings {
  timezone: string;
  dateFormat: string;
  defaultFrameworks: string[];
  slackWorkspaceId?: string;
  notificationPreferences: NotificationPreferences;
  complianceSettings: ComplianceSettings;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  slackNotifications: boolean;
  evidenceExpirationDays: number;
  reviewReminderDays: number;
  complianceDriftAlerts: boolean;
}

export interface ComplianceSettings {
  evidenceValidityDays: number;
  requireEvidenceApproval: boolean;
  autoArchiveCompletedTasks: boolean;
  controlTestingFrequency: 'monthly' | 'quarterly' | 'annually';
}

export interface SubscriptionInfo {
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'trial' | 'expired' | 'cancelled';
  expiresAt?: Date;
  features: string[];
}

export interface CreateOrganizationDto {
  name: string;
  slug?: string;
  description?: string;
  settings?: Partial<OrganizationSettings>;
}

export interface UpdateOrganizationDto {
  name?: string;
  description?: string;
  status?: Status;
  settings?: Partial<OrganizationSettings>;
}



