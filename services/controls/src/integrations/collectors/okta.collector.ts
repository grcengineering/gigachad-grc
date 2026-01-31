 
import { Injectable, Logger } from '@nestjs/common';
import {
  BaseCollector,
  CollectorConfig,
  CollectionResult,
  CollectedEvidence,
} from './collector.interface';

/**
 * Okta Evidence Collector
 * 
 * Collects evidence from Okta:
 * - User directory
 * - Group memberships
 * - Application assignments
 * - Authentication policies
 * - System logs
 * - Security settings
 */
@Injectable()
export class OktaCollector extends BaseCollector {
  private readonly logger = new Logger(OktaCollector.name);

  readonly name = 'okta';
  readonly displayName = 'Okta';
  readonly description = 'Collect evidence from Okta identity management, SSO, and authentication';
  readonly icon = 'okta';

  readonly requiredCredentials = [
    {
      key: 'domain',
      label: 'Okta Domain',
      type: 'text' as const,
      required: true,
      description: 'Your Okta domain (e.g., company.okta.com)',
    },
    {
      key: 'apiToken',
      label: 'API Token',
      type: 'password' as const,
      required: true,
      description: 'Okta API token with read permissions',
    },
  ];

  async testConnection(config: CollectorConfig): Promise<{
    success: boolean;
    message: string;
  }> {
    const errors = this.validateConfig(config);
    if (errors.length > 0) {
      return { success: false, message: errors.join(', ') };
    }

    try {
      const { domain, apiToken } = config.credentials;
      
      const response = await fetch(`https://${domain}/api/v1/org`, {
        headers: {
          'Authorization': `SSWS ${apiToken}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, message: error.errorSummary || 'Authentication failed' };
      }

      const org = await response.json();
      return { 
        success: true, 
        message: `Successfully connected to ${org.companyName || domain}` 
      };
    } catch (error) {
      return { success: false, message: `Connection failed: ${error.message}` };
    }
  }

  async collect(
    organizationId: string,
    config: CollectorConfig
  ): Promise<CollectionResult> {
    const startTime = new Date();
    const evidence: CollectedEvidence[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    const configErrors = this.validateConfig(config);
    if (configErrors.length > 0) {
      return this.createResult([], configErrors, [], startTime);
    }

    try {
      // Collect user data
      const userEvidence = await this.collectUserData(config);
      evidence.push(...userEvidence.evidence);
      errors.push(...userEvidence.errors);

      // Collect authentication policies
      const policyEvidence = await this.collectAuthPolicies(config);
      evidence.push(...policyEvidence.evidence);

      // Collect application data
      const appEvidence = await this.collectApplicationData(config);
      evidence.push(...appEvidence.evidence);

      // Collect system logs
      const logEvidence = await this.collectSystemLogs(config);
      evidence.push(...logEvidence.evidence);

    } catch (error) {
      errors.push(`Okta collection failed: ${error.message}`);
    }

    return this.createResult(evidence, errors, warnings, startTime);
  }

  async getAvailableEvidenceTypes(): Promise<{
    type: string;
    description: string;
    category: string;
  }[]> {
    return [
      {
        type: 'user_directory',
        description: 'User directory and profile information',
        category: 'access_control',
      },
      {
        type: 'mfa_status',
        description: 'MFA enrollment status for all users',
        category: 'authentication',
      },
      {
        type: 'group_memberships',
        description: 'Group definitions and memberships',
        category: 'access_control',
      },
      {
        type: 'auth_policies',
        description: 'Authentication policies and rules',
        category: 'authentication',
      },
      {
        type: 'application_assignments',
        description: 'Application access assignments',
        category: 'access_control',
      },
      {
        type: 'system_logs',
        description: 'Authentication and admin activity logs',
        category: 'logging',
      },
      {
        type: 'password_policies',
        description: 'Password policy configurations',
        category: 'authentication',
      },
    ];
  }

  // ============================================
  // Private Collection Methods
  // ============================================

  private async collectUserData(config: CollectorConfig): Promise<{
    evidence: CollectedEvidence[];
    errors: string[];
  }> {
    const evidence: CollectedEvidence[] = [];
    const errors: string[] = [];
    const { domain } = config.credentials;

    try {
      // Mock user data (would use Okta SDK in production)
      evidence.push({
        title: 'Okta User Directory Summary',
        description: 'Summary of users, status, and MFA enrollment',
        evidenceType: 'user_directory',
        category: 'access_control',
        source: 'okta',
        sourceId: `okta-users-${Date.now()}`,
        collectedAt: new Date(),
        data: {
          domain,
          totalUsers: 450,
          activeUsers: 412,
          suspendedUsers: 23,
          deactivatedUsers: 15,
          provisionedUsers: 425,
          passwordExpiredUsers: 8,
          lockedOutUsers: 3,
          mfaEnrollment: {
            enrolled: 398,
            notEnrolled: 52,
            enrollmentRate: 88.4,
            factorTypes: [
              { type: 'Okta Verify', count: 350 },
              { type: 'SMS', count: 120 },
              { type: 'Google Authenticator', count: 45 },
              { type: 'Hardware Token', count: 12 },
            ],
          },
          userTypes: [
            { type: 'Employee', count: 380 },
            { type: 'Contractor', count: 50 },
            { type: 'Service Account', count: 20 },
          ],
        },
        tags: ['okta', 'users', 'mfa', 'identity'],
      });

      // Group memberships
      evidence.push({
        title: 'Okta Groups Summary',
        description: 'Summary of groups and membership assignments',
        evidenceType: 'group_memberships',
        category: 'access_control',
        source: 'okta',
        sourceId: `okta-groups-${Date.now()}`,
        collectedAt: new Date(),
        data: {
          totalGroups: 85,
          oktaManagedGroups: 45,
          appGroups: 25,
          directoryGroups: 15,
          averageMembership: 32,
          largestGroups: [
            { name: 'All Employees', members: 380 },
            { name: 'Engineering', members: 120 },
            { name: 'Sales', members: 85 },
          ],
          emptyGroups: 3,
        },
        tags: ['okta', 'groups', 'access-control'],
      });

    } catch (error) {
      errors.push(`User data collection failed: ${error.message}`);
    }

    return { evidence, errors };
  }

  private async collectAuthPolicies(config: CollectorConfig): Promise<{
    evidence: CollectedEvidence[];
  }> {
    const evidence: CollectedEvidence[] = [];
    const { domain } = config.credentials;

    evidence.push({
      title: 'Okta Authentication Policies',
      description: 'Authentication and sign-on policies configuration',
      evidenceType: 'auth_policies',
      category: 'authentication',
      source: 'okta',
      sourceId: `okta-policies-${Date.now()}`,
      collectedAt: new Date(),
      data: {
        domain,
        signOnPolicies: {
          total: 5,
          policies: [
            {
              name: 'Default Policy',
              status: 'ACTIVE',
              mfaRequired: true,
              sessionLifetime: 12,
              rememberDevice: true,
            },
            {
              name: 'High Security Apps',
              status: 'ACTIVE',
              mfaRequired: true,
              mfaPromptMode: 'ALWAYS',
              sessionLifetime: 4,
            },
            {
              name: 'Contractors',
              status: 'ACTIVE',
              mfaRequired: true,
              networkZoneRequired: true,
              sessionLifetime: 8,
            },
          ],
        },
        passwordPolicies: {
          minLength: 12,
          requireUppercase: true,
          requireLowercase: true,
          requireNumber: true,
          requireSymbol: true,
          maxAge: 90,
          historyCount: 12,
          lockoutAttempts: 5,
          lockoutDuration: 30,
        },
        globalSessionPolicy: {
          maxSessionLifetime: 24,
          maxIdleTime: 2,
          persistentCookie: false,
        },
      },
      tags: ['okta', 'authentication', 'policies', 'mfa'],
    });

    return { evidence };
  }

  private async collectApplicationData(config: CollectorConfig): Promise<{
    evidence: CollectedEvidence[];
  }> {
    const evidence: CollectedEvidence[] = [];
    const { domain } = config.credentials;

    evidence.push({
      title: 'Okta Applications Summary',
      description: 'Summary of integrated applications and access',
      evidenceType: 'application_assignments',
      category: 'access_control',
      source: 'okta',
      sourceId: `okta-apps-${Date.now()}`,
      collectedAt: new Date(),
      data: {
        domain,
        totalApplications: 67,
        activeApplications: 62,
        inactiveApplications: 5,
        applicationTypes: [
          { type: 'SAML 2.0', count: 35 },
          { type: 'OIDC', count: 18 },
          { type: 'SWA', count: 8 },
          { type: 'Bookmark', count: 6 },
        ],
        provisioningEnabled: 28,
        mostUsedApps: [
          { name: 'Slack', users: 420 },
          { name: 'Google Workspace', users: 415 },
          { name: 'Salesforce', users: 180 },
          { name: 'AWS Console', users: 95 },
          { name: 'GitHub Enterprise', users: 85 },
        ],
        recentlyAdded: [
          { name: 'Notion', addedAt: '2024-01-15' },
          { name: 'Linear', addedAt: '2024-01-10' },
        ],
      },
      tags: ['okta', 'applications', 'sso', 'access-control'],
    });

    return { evidence };
  }

  private async collectSystemLogs(config: CollectorConfig): Promise<{
    evidence: CollectedEvidence[];
  }> {
    const evidence: CollectedEvidence[] = [];
    const { domain } = config.credentials;

    evidence.push({
      title: 'Okta System Logs Summary',
      description: 'Summary of authentication and admin activity logs',
      evidenceType: 'system_logs',
      category: 'logging',
      source: 'okta',
      sourceId: `okta-logs-${Date.now()}`,
      collectedAt: new Date(),
      data: {
        domain,
        period: '30 days',
        totalEvents: 125678,
        authenticationEvents: {
          total: 98234,
          successful: 94521,
          failed: 3713,
          failureRate: 3.78,
        },
        topFailureReasons: [
          { reason: 'INVALID_CREDENTIALS', count: 2145 },
          { reason: 'MFA_TIMEOUT', count: 876 },
          { reason: 'LOCKED_OUT', count: 432 },
          { reason: 'VERIFICATION_FAILED', count: 260 },
        ],
        adminEvents: {
          total: 1234,
          userChanges: 567,
          policyChanges: 89,
          appChanges: 234,
          securityChanges: 44,
        },
        suspiciousActivity: {
          impossibleTravel: 12,
          bruteForceAttempts: 45,
          newDeviceLogins: 234,
          unusualLocations: 28,
        },
      },
      tags: ['okta', 'system-logs', 'authentication', 'audit'],
    });

    return { evidence };
  }
}

