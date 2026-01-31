 
import { Injectable, Logger } from '@nestjs/common';
import {
  BaseCollector,
  CollectorConfig,
  CollectionResult,
  CollectedEvidence,
} from './collector.interface';

/**
 * AWS Evidence Collector
 * 
 * Collects evidence from AWS services:
 * - CloudTrail logs
 * - Config rules compliance
 * - IAM policies and users
 * - Security Hub findings
 * - GuardDuty findings
 */
@Injectable()
export class AWSCollector extends BaseCollector {
  private readonly logger = new Logger(AWSCollector.name);

  readonly name = 'aws';
  readonly displayName = 'Amazon Web Services';
  readonly description = 'Collect evidence from AWS CloudTrail, Config, IAM, and Security Hub';
  readonly icon = 'aws';

  readonly requiredCredentials = [
    {
      key: 'accessKeyId',
      label: 'AWS Access Key ID',
      type: 'text' as const,
      required: true,
      description: 'IAM user or role access key',
    },
    {
      key: 'secretAccessKey',
      label: 'AWS Secret Access Key',
      type: 'password' as const,
      required: true,
      description: 'IAM user or role secret key',
    },
    {
      key: 'region',
      label: 'AWS Region',
      type: 'select' as const,
      required: true,
      options: [
        'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
        'eu-west-1', 'eu-west-2', 'eu-central-1',
        'ap-northeast-1', 'ap-southeast-1', 'ap-southeast-2',
      ],
      description: 'Primary AWS region',
    },
    {
      key: 'roleArn',
      label: 'IAM Role ARN (Optional)',
      type: 'text' as const,
      required: false,
      description: 'Role to assume for cross-account access',
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
      // In a real implementation, we would use AWS SDK to test credentials
      // For now, we'll simulate the connection test
      const { accessKeyId, secretAccessKey, region } = config.credentials;
      
      if (!accessKeyId.startsWith('AKIA') && !accessKeyId.startsWith('ASIA')) {
        return { success: false, message: 'Invalid AWS Access Key ID format' };
      }

      if (secretAccessKey.length < 20) {
        return { success: false, message: 'Invalid AWS Secret Access Key format' };
      }

      // Simulate API call to STS GetCallerIdentity
      this.logger.log(`Testing AWS connection to ${region}`);
      
      return { success: true, message: 'Successfully connected to AWS' };
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
      // Collect CloudTrail events
      const cloudTrailEvidence = await this.collectCloudTrailEvents(config);
      evidence.push(...cloudTrailEvidence.evidence);
      errors.push(...cloudTrailEvidence.errors);

      // Collect Config rule compliance
      const configEvidence = await this.collectConfigCompliance(config);
      evidence.push(...configEvidence.evidence);
      errors.push(...configEvidence.errors);

      // Collect IAM data
      const iamEvidence = await this.collectIAMData(config);
      evidence.push(...iamEvidence.evidence);
      errors.push(...iamEvidence.errors);

      // Collect Security Hub findings
      const securityHubEvidence = await this.collectSecurityHubFindings(config);
      evidence.push(...securityHubEvidence.evidence);
      warnings.push(...securityHubEvidence.warnings);

    } catch (error) {
      errors.push(`AWS collection failed: ${error.message}`);
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
        type: 'cloudtrail_events',
        description: 'AWS CloudTrail management and data events',
        category: 'logging',
      },
      {
        type: 'config_compliance',
        description: 'AWS Config rule compliance status',
        category: 'compliance',
      },
      {
        type: 'iam_users',
        description: 'IAM users and their permissions',
        category: 'access_control',
      },
      {
        type: 'iam_policies',
        description: 'IAM policies and attachments',
        category: 'access_control',
      },
      {
        type: 'iam_mfa_status',
        description: 'MFA configuration for IAM users',
        category: 'access_control',
      },
      {
        type: 'security_hub_findings',
        description: 'AWS Security Hub findings',
        category: 'security',
      },
      {
        type: 'guardduty_findings',
        description: 'AWS GuardDuty threat findings',
        category: 'security',
      },
      {
        type: 's3_bucket_policies',
        description: 'S3 bucket policies and ACLs',
        category: 'data_protection',
      },
      {
        type: 'kms_keys',
        description: 'KMS key policies and rotation status',
        category: 'encryption',
      },
    ];
  }

  // ============================================
  // Private Collection Methods
  // ============================================

  private async collectCloudTrailEvents(config: CollectorConfig): Promise<{
    evidence: CollectedEvidence[];
    errors: string[];
  }> {
    const evidence: CollectedEvidence[] = [];
    const errors: string[] = [];

    try {
      // In production, use AWS SDK to fetch CloudTrail events
      // const cloudTrail = new AWS.CloudTrail({ region: config.credentials.region });
      // const events = await cloudTrail.lookupEvents({ ... }).promise();

      // Mock evidence for demonstration
      evidence.push({
        title: 'CloudTrail Log Summary',
        description: 'Summary of CloudTrail management events for the past 30 days',
        evidenceType: 'cloudtrail_events',
        category: 'logging',
        source: 'aws-cloudtrail',
        sourceId: `cloudtrail-${config.credentials.region}-${Date.now()}`,
        collectedAt: new Date(),
        data: {
          region: config.credentials.region,
          eventCount: 15234,
          uniqueAPICalls: 89,
          uniqueUsers: 12,
          period: '30 days',
          topAPIs: [
            { api: 'DescribeInstances', count: 3421 },
            { api: 'AssumeRole', count: 2156 },
            { api: 'GetObject', count: 1893 },
          ],
        },
        tags: ['aws', 'cloudtrail', 'logging', 'audit'],
      });

    } catch (error) {
      errors.push(`CloudTrail collection failed: ${error.message}`);
    }

    return { evidence, errors };
  }

  private async collectConfigCompliance(_config: CollectorConfig): Promise<{
    evidence: CollectedEvidence[];
    errors: string[];
  }> {
    const evidence: CollectedEvidence[] = [];
    const errors: string[] = [];

    try {
      // Mock evidence for AWS Config compliance
      evidence.push({
        title: 'AWS Config Rule Compliance Summary',
        description: 'Compliance status for all AWS Config rules',
        evidenceType: 'config_compliance',
        category: 'compliance',
        source: 'aws-config',
        sourceId: `config-compliance-${Date.now()}`,
        collectedAt: new Date(),
        data: {
          totalRules: 45,
          compliant: 38,
          nonCompliant: 5,
          notApplicable: 2,
          compliancePercentage: 88.4,
          nonCompliantRules: [
            { ruleName: 's3-bucket-public-read-prohibited', resourcesNonCompliant: 2 },
            { ruleName: 'ec2-instance-no-public-ip', resourcesNonCompliant: 3 },
            { ruleName: 'iam-root-access-key-check', resourcesNonCompliant: 1 },
          ],
        },
        tags: ['aws', 'config', 'compliance'],
      });

    } catch (error) {
      errors.push(`Config compliance collection failed: ${error.message}`);
    }

    return { evidence, errors };
  }

  private async collectIAMData(_config: CollectorConfig): Promise<{
    evidence: CollectedEvidence[];
    errors: string[];
  }> {
    const evidence: CollectedEvidence[] = [];
    const errors: string[] = [];

    try {
      // Mock evidence for IAM
      evidence.push({
        title: 'IAM User Summary',
        description: 'Summary of IAM users and MFA status',
        evidenceType: 'iam_users',
        category: 'access_control',
        source: 'aws-iam',
        sourceId: `iam-users-${Date.now()}`,
        collectedAt: new Date(),
        data: {
          totalUsers: 25,
          usersWithMFA: 23,
          usersWithoutMFA: 2,
          mfaComplianceRate: 92,
          usersWithAccessKeys: 18,
          accessKeysOlderThan90Days: 4,
          rootAccountMFAEnabled: true,
          passwordPolicyCompliant: true,
        },
        tags: ['aws', 'iam', 'access-control', 'mfa'],
      });

      evidence.push({
        title: 'IAM Policy Analysis',
        description: 'Analysis of IAM policies for least privilege',
        evidenceType: 'iam_policies',
        category: 'access_control',
        source: 'aws-iam',
        sourceId: `iam-policies-${Date.now()}`,
        collectedAt: new Date(),
        data: {
          totalPolicies: 67,
          customerManagedPolicies: 45,
          awsManagedPolicies: 22,
          policiesWithAdmin: 3,
          policiesWithWildcard: 8,
          recommendations: [
            'Review AdminAccess policy attachments',
            'Scope down wildcard permissions in CustomS3Policy',
          ],
        },
        tags: ['aws', 'iam', 'policies', 'least-privilege'],
      });

    } catch (error) {
      errors.push(`IAM collection failed: ${error.message}`);
    }

    return { evidence, errors };
  }

  private async collectSecurityHubFindings(_config: CollectorConfig): Promise<{
    evidence: CollectedEvidence[];
    warnings: string[];
  }> {
    const evidence: CollectedEvidence[] = [];
    const warnings: string[] = [];

    try {
      // Mock evidence for Security Hub
      evidence.push({
        title: 'AWS Security Hub Findings Summary',
        description: 'Summary of Security Hub findings by severity',
        evidenceType: 'security_hub_findings',
        category: 'security',
        source: 'aws-security-hub',
        sourceId: `securityhub-${Date.now()}`,
        collectedAt: new Date(),
        data: {
          totalFindings: 127,
          critical: 2,
          high: 15,
          medium: 48,
          low: 62,
          frameworks: ['CIS AWS Foundations', 'AWS Foundational Security Best Practices'],
          criticalFindings: [
            { title: 'Root user has active access keys', resourceId: 'root' },
            { title: 'S3 bucket allows public access', resourceId: 'public-bucket-123' },
          ],
        },
        tags: ['aws', 'security-hub', 'findings', 'compliance'],
      });

    } catch (error) {
      warnings.push(`Security Hub collection had issues: ${error.message}`);
    }

    return { evidence, warnings };
  }
}

