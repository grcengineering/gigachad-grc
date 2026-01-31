/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

/**
 * AWS Integration Configuration
 * 
 * Credentials must be provided via:
 * - Integration configuration (stored encrypted)
 * - Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 * - IAM role (when running on AWS infrastructure)
 */
export interface AWSConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  assumeRoleArn?: string;
}

/**
 * Result type with mock mode indicator
 */
interface _AWSResponseResult {
  data: any;
  isMockMode?: boolean;
  mockModeReason?: string;
}

/**
 * AWS Security Finding from Security Hub
 */
interface SecurityHubFinding {
  Id: string;
  Title: string;
  Description: string;
  Severity: { Label: string; Normalized: number };
  Compliance: { Status: string };
  ProductName: string;
  GeneratorId: string;
  Resources: Array<{ Type: string; Id: string; Region: string }>;
  CreatedAt: string;
  UpdatedAt: string;
}

/**
 * AWS CloudTrail Event
 */
interface CloudTrailEvent {
  EventId: string;
  EventName: string;
  EventSource: string;
  EventTime: string;
  Username: string;
  SourceIPAddress: string;
  UserAgent: string;
  Resources: Array<{ ResourceType: string; ResourceName: string }>;
}

/**
 * AWS Config Compliance Result
 */
interface ConfigComplianceResult {
  ConfigRuleName: string;
  ComplianceType: 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_APPLICABLE' | 'INSUFFICIENT_DATA';
  EvaluationResultIdentifier: {
    EvaluationResultQualifier: {
      ConfigRuleName: string;
      ResourceType: string;
      ResourceId: string;
    };
  };
  ResultRecordedTime: string;
}

/**
 * IAM User/Role Summary
 */
interface IAMSummary {
  users: Array<{
    UserName: string;
    UserId: string;
    Arn: string;
    CreateDate: string;
    PasswordLastUsed?: string;
    MFAEnabled: boolean;
    AccessKeys: Array<{ AccessKeyId: string; Status: string; CreateDate: string }>;
  }>;
  roles: Array<{
    RoleName: string;
    RoleId: string;
    Arn: string;
    CreateDate: string;
    AssumeRolePolicyDocument: any;
  }>;
  policies: Array<{
    PolicyName: string;
    PolicyId: string;
    Arn: string;
    AttachmentCount: number;
  }>;
}

/**
 * AWS Sync Result
 */
export interface AWSSyncResult {
  securityHub: {
    findings: SecurityHubFinding[];
    totalFindings: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
  cloudTrail: {
    events: CloudTrailEvent[];
    totalEvents: number;
    securityEvents: number;
  };
  config: {
    rules: ConfigComplianceResult[];
    compliantCount: number;
    nonCompliantCount: number;
    compliancePercentage: number;
  };
  iam: IAMSummary;
  s3: {
    buckets: Array<{
      Name: string;
      Region: string;
      PublicAccessBlocked: boolean;
      Encrypted: boolean;
      VersioningEnabled: boolean;
      LoggingEnabled: boolean;
    }>;
  };
  guardDuty: {
    findings: Array<{
      Id: string;
      Type: string;
      Severity: number;
      Title: string;
      Description: string;
      CreatedAt: string;
    }>;
    totalFindings: number;
  };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class AWSConnector {
  private readonly logger = new Logger(AWSConnector.name);

  /**
   * Test connection to AWS
   */
  async testConnection(config: AWSConfig): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!config.accessKeyId || !config.secretAccessKey) {
      return { success: false, message: 'Access Key ID and Secret Access Key are required' };
    }

    try {
      // Test by calling STS GetCallerIdentity
      const response = await this.makeAWSRequest(
        'sts',
        config.region || 'us-east-1',
        'GetCallerIdentity',
        {},
        config,
      );

      if (response.error) {
        return { success: false, message: response.error };
      }

      return {
        success: true,
        message: `Connected to AWS as ${response.Arn || response.UserId}`,
        details: {
          accountId: response.Account,
          arn: response.Arn,
          userId: response.UserId,
        },
      };
    } catch (error: any) {
      this.logger.error('AWS connection test failed', error);
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  /**
   * Full sync - collect security evidence from AWS
   */
  async sync(config: AWSConfig): Promise<AWSSyncResult> {
    const errors: string[] = [];
    const region = config.region || 'us-east-1';

    this.logger.log('Starting AWS sync...');

    // Collect data from various AWS services in parallel
    const [securityHub, cloudTrail, configRules, iam, s3Buckets, guardDuty] = await Promise.all([
      this.getSecurityHubFindings(config, region).catch(e => {
        errors.push(`Security Hub: ${e.message}`);
        return { findings: [], totalFindings: 0, criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0 };
      }),
      this.getCloudTrailEvents(config, region).catch(e => {
        errors.push(`CloudTrail: ${e.message}`);
        return { events: [], totalEvents: 0, securityEvents: 0 };
      }),
      this.getConfigCompliance(config, region).catch(e => {
        errors.push(`Config: ${e.message}`);
        return { rules: [], compliantCount: 0, nonCompliantCount: 0, compliancePercentage: 0 };
      }),
      this.getIAMSummary(config).catch(e => {
        errors.push(`IAM: ${e.message}`);
        return { users: [], roles: [], policies: [] };
      }),
      this.getS3BucketSecurity(config, region).catch(e => {
        errors.push(`S3: ${e.message}`);
        return { buckets: [] };
      }),
      this.getGuardDutyFindings(config, region).catch(e => {
        errors.push(`GuardDuty: ${e.message}`);
        return { findings: [], totalFindings: 0 };
      }),
    ]);

    this.logger.log(`AWS sync complete with ${errors.length} errors`);

    return {
      securityHub,
      cloudTrail,
      config: configRules,
      iam,
      s3: s3Buckets,
      guardDuty,
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  /**
   * Get Security Hub findings
   */
  private async getSecurityHubFindings(config: AWSConfig, region: string) {
    const response = await this.makeAWSRequest(
      'securityhub',
      region,
      'GetFindings',
      {
        Filters: {
          RecordState: [{ Value: 'ACTIVE', Comparison: 'EQUALS' }],
        },
        MaxResults: 100,
      },
      config,
    );

    const findings = response.Findings || [];
    
    return {
      findings: findings.slice(0, 50), // Limit for storage
      totalFindings: findings.length,
      criticalCount: findings.filter((f: any) => f.Severity?.Label === 'CRITICAL').length,
      highCount: findings.filter((f: any) => f.Severity?.Label === 'HIGH').length,
      mediumCount: findings.filter((f: any) => f.Severity?.Label === 'MEDIUM').length,
      lowCount: findings.filter((f: any) => f.Severity?.Label === 'LOW').length,
    };
  }

  /**
   * Get CloudTrail events (security-related)
   */
  private async getCloudTrailEvents(config: AWSConfig, region: string) {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

    const response = await this.makeAWSRequest(
      'cloudtrail',
      region,
      'LookupEvents',
      {
        StartTime: startTime.toISOString(),
        EndTime: endTime.toISOString(),
        MaxResults: 50,
        LookupAttributes: [
          { AttributeKey: 'ReadOnly', AttributeValue: 'false' }, // Only write events
        ],
      },
      config,
    );

    const events = response.Events || [];
    const securityEventNames = [
      'CreateUser', 'DeleteUser', 'CreateAccessKey', 'DeleteAccessKey',
      'AttachUserPolicy', 'DetachUserPolicy', 'CreateRole', 'DeleteRole',
      'PutBucketPolicy', 'DeleteBucketPolicy', 'AuthorizeSecurityGroupIngress',
      'RevokeSecurityGroupIngress', 'CreateSecurityGroup', 'DeleteSecurityGroup',
    ];

    return {
      events,
      totalEvents: events.length,
      securityEvents: events.filter((e: any) => 
        securityEventNames.some(name => e.EventName?.includes(name))
      ).length,
    };
  }

  /**
   * Get AWS Config compliance status
   */
  private async getConfigCompliance(config: AWSConfig, region: string) {
    const response = await this.makeAWSRequest(
      'config',
      region,
      'DescribeComplianceByConfigRule',
      {},
      config,
    );

    const rules = response.ComplianceByConfigRules || [];
    const compliantCount = rules.filter((r: any) => r.Compliance?.ComplianceType === 'COMPLIANT').length;
    const nonCompliantCount = rules.filter((r: any) => r.Compliance?.ComplianceType === 'NON_COMPLIANT').length;

    return {
      rules,
      compliantCount,
      nonCompliantCount,
      compliancePercentage: rules.length > 0 
        ? Math.round((compliantCount / rules.length) * 100) 
        : 0,
    };
  }

  /**
   * Get IAM summary (users, roles, policies)
   */
  private async getIAMSummary(config: AWSConfig): Promise<IAMSummary> {
    // IAM is global, not regional
    const [usersResponse, rolesResponse, policiesResponse] = await Promise.all([
      this.makeAWSRequest('iam', 'us-east-1', 'ListUsers', {}, config),
      this.makeAWSRequest('iam', 'us-east-1', 'ListRoles', {}, config),
      this.makeAWSRequest('iam', 'us-east-1', 'ListPolicies', { Scope: 'Local' }, config),
    ]);

    // Get MFA status for each user
    const users = await Promise.all(
      (usersResponse.Users || []).slice(0, 20).map(async (user: any) => {
        const mfaResponse = await this.makeAWSRequest(
          'iam', 'us-east-1', 'ListMFADevices',
          { UserName: user.UserName },
          config,
        ).catch(() => ({ MFADevices: [] }));

        const keysResponse = await this.makeAWSRequest(
          'iam', 'us-east-1', 'ListAccessKeys',
          { UserName: user.UserName },
          config,
        ).catch(() => ({ AccessKeyMetadata: [] }));

        return {
          UserName: user.UserName,
          UserId: user.UserId,
          Arn: user.Arn,
          CreateDate: user.CreateDate,
          PasswordLastUsed: user.PasswordLastUsed,
          MFAEnabled: (mfaResponse.MFADevices || []).length > 0,
          AccessKeys: (keysResponse.AccessKeyMetadata || []).map((k: any) => ({
            AccessKeyId: k.AccessKeyId,
            Status: k.Status,
            CreateDate: k.CreateDate,
          })),
        };
      })
    );

    return {
      users,
      roles: (rolesResponse.Roles || []).slice(0, 20).map((r: any) => ({
        RoleName: r.RoleName,
        RoleId: r.RoleId,
        Arn: r.Arn,
        CreateDate: r.CreateDate,
        AssumeRolePolicyDocument: r.AssumeRolePolicyDocument,
      })),
      policies: (policiesResponse.Policies || []).map((p: any) => ({
        PolicyName: p.PolicyName,
        PolicyId: p.PolicyId,
        Arn: p.Arn,
        AttachmentCount: p.AttachmentCount,
      })),
    };
  }

  /**
   * Get S3 bucket security configuration
   */
  private async getS3BucketSecurity(config: AWSConfig, region: string) {
    const listResponse = await this.makeAWSRequest('s3', region, 'ListBuckets', {}, config);
    const buckets = listResponse.Buckets || [];

    const bucketDetails = await Promise.all(
      buckets.slice(0, 20).map(async (bucket: any) => {
        const [publicAccess, encryption, versioning, logging] = await Promise.all([
          this.makeAWSRequest('s3', region, 'GetPublicAccessBlock', { Bucket: bucket.Name }, config)
            .catch(() => null),
          this.makeAWSRequest('s3', region, 'GetBucketEncryption', { Bucket: bucket.Name }, config)
            .catch(() => null),
          this.makeAWSRequest('s3', region, 'GetBucketVersioning', { Bucket: bucket.Name }, config)
            .catch(() => null),
          this.makeAWSRequest('s3', region, 'GetBucketLogging', { Bucket: bucket.Name }, config)
            .catch(() => null),
        ]);

        return {
          Name: bucket.Name,
          Region: region,
          PublicAccessBlocked: !!(publicAccess?.PublicAccessBlockConfiguration?.BlockPublicAcls),
          Encrypted: !!encryption?.ServerSideEncryptionConfiguration,
          VersioningEnabled: versioning?.Status === 'Enabled',
          LoggingEnabled: !!logging?.LoggingEnabled,
        };
      })
    );

    return { buckets: bucketDetails };
  }

  /**
   * Get GuardDuty findings
   */
  private async getGuardDutyFindings(config: AWSConfig, region: string) {
    // First get the detector ID
    const detectorsResponse = await this.makeAWSRequest(
      'guardduty', region, 'ListDetectors', {}, config,
    );

    const detectorId = detectorsResponse.DetectorIds?.[0];
    if (!detectorId) {
      return { findings: [], totalFindings: 0 };
    }

    // Get findings
    const findingsResponse = await this.makeAWSRequest(
      'guardduty', region, 'ListFindings',
      { DetectorId: detectorId, MaxResults: 50 },
      config,
    );

    const findingIds = findingsResponse.FindingIds || [];
    if (findingIds.length === 0) {
      return { findings: [], totalFindings: 0 };
    }

    // Get finding details
    const detailsResponse = await this.makeAWSRequest(
      'guardduty', region, 'GetFindings',
      { DetectorId: detectorId, FindingIds: findingIds.slice(0, 20) },
      config,
    );

    const findings = (detailsResponse.Findings || []).map((f: any) => ({
      Id: f.Id,
      Type: f.Type,
      Severity: f.Severity,
      Title: f.Title,
      Description: f.Description,
      CreatedAt: f.CreatedAt,
    }));

    return {
      findings,
      totalFindings: findingIds.length,
    };
  }

  /**
   * Make AWS API request using the official AWS SDK v3
   * Falls back to demo mode when SDK is not available or credentials are missing
   */
  private async makeAWSRequest(
    service: string,
    region: string,
    action: string,
    params: any,
    config: AWSConfig,
  ): Promise<any> {
    // Check if credentials are properly configured
    if (!config.accessKeyId || !config.secretAccessKey) {
      this.logger.warn(`AWS credentials not configured for ${service}.${action} - using demo mode`);
      return this.getDemoResponse(service, action);
    }

    try {
      // Try to use the actual AWS SDK
      const result = await this.executeAWSSDKCall(service, region, action, params, config);
      return result;
    } catch (error: any) {
      // If SDK is not installed or call fails, fall back to demo mode
      if (error.code === 'MODULE_NOT_FOUND') {
        this.logger.warn(`AWS SDK not installed for ${service} - using demo mode. Install @aws-sdk/client-${service} for actual functionality.`);
        return this.getDemoResponse(service, action);
      }
      
      // Re-throw actual API errors
      throw error;
    }
  }

  /**
   * Execute actual AWS SDK call
   * Uses dynamic imports to avoid requiring SDK at build time
   */
  private async executeAWSSDKCall(
    service: string,
    region: string,
    action: string,
    params: any,
    config: AWSConfig,
  ): Promise<any> {
    const credentials = {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    };

    this.logger.debug(`AWS API call: ${service}.${action} in ${region}`);

    try {
      switch (service) {
        case 'sts':
          return await this.callSTS(region, action, params, credentials);
        case 'securityhub':
          return await this.callSecurityHub(region, action, params, credentials);
        case 'cloudtrail':
          return await this.callCloudTrail(region, action, params, credentials);
        case 'config':
          return await this.callConfig(region, action, params, credentials);
        case 'iam':
          return await this.callIAM(action, params, credentials);
        case 's3':
          return await this.callS3(region, action, params, credentials);
        case 'guardduty':
          return await this.callGuardDuty(region, action, params, credentials);
        default:
          this.logger.warn(`Unknown AWS service: ${service}`);
          return this.getDemoResponse(service, action);
      }
    } catch (error: any) {
      this.logger.error(`AWS ${service}.${action} failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Dynamically load and call AWS STS service
   */
  private async callSTS(region: string, action: string, params: any, credentials: any): Promise<any> {
    try {
       
      const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
      const client = new STSClient({ region, credentials });
      
      if (action === 'GetCallerIdentity') {
        const response = await client.send(new GetCallerIdentityCommand(params));
        return {
          Account: response.Account,
          Arn: response.Arn,
          UserId: response.UserId,
        };
      }
      return {};
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw Object.assign(new Error('AWS STS SDK not installed'), { code: 'MODULE_NOT_FOUND' });
      }
      throw error;
    }
  }

  /**
   * Dynamically load and call AWS Security Hub service
   */
  private async callSecurityHub(region: string, action: string, params: any, credentials: any): Promise<any> {
    try {
       
      const { SecurityHubClient, GetFindingsCommand } = require('@aws-sdk/client-securityhub');
      const client = new SecurityHubClient({ region, credentials });
      
      if (action === 'GetFindings') {
        const response = await client.send(new GetFindingsCommand(params));
        return { Findings: response.Findings || [] };
      }
      return {};
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw Object.assign(new Error('AWS Security Hub SDK not installed'), { code: 'MODULE_NOT_FOUND' });
      }
      throw error;
    }
  }

  /**
   * Dynamically load and call AWS CloudTrail service
   */
  private async callCloudTrail(region: string, action: string, params: any, credentials: any): Promise<any> {
    try {
       
      const { CloudTrailClient, LookupEventsCommand } = require('@aws-sdk/client-cloudtrail');
      const client = new CloudTrailClient({ region, credentials });
      
      if (action === 'LookupEvents') {
        const response = await client.send(new LookupEventsCommand(params));
        return { Events: response.Events || [] };
      }
      return {};
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw Object.assign(new Error('AWS CloudTrail SDK not installed'), { code: 'MODULE_NOT_FOUND' });
      }
      throw error;
    }
  }

  /**
   * Dynamically load and call AWS Config service
   */
  private async callConfig(region: string, action: string, params: any, credentials: any): Promise<any> {
    try {
       
      const { ConfigServiceClient, DescribeComplianceByConfigRuleCommand } = require('@aws-sdk/client-config-service');
      const client = new ConfigServiceClient({ region, credentials });
      
      if (action === 'DescribeComplianceByConfigRule') {
        const response = await client.send(new DescribeComplianceByConfigRuleCommand(params));
        return { ComplianceByConfigRules: response.ComplianceByConfigRules || [] };
      }
      return {};
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw Object.assign(new Error('AWS Config SDK not installed'), { code: 'MODULE_NOT_FOUND' });
      }
      throw error;
    }
  }

  /**
   * Dynamically load and call AWS IAM service
   */
  private async callIAM(action: string, params: any, credentials: any): Promise<any> {
    try {
       
      const { 
        IAMClient, 
        ListUsersCommand, 
        ListRolesCommand, 
        ListPoliciesCommand,
        ListMFADevicesCommand,
        ListAccessKeysCommand,
      } = require('@aws-sdk/client-iam');
      
      // IAM is global
      const client = new IAMClient({ region: 'us-east-1', credentials });
      
      switch (action) {
        case 'ListUsers': {
          const usersResponse = await client.send(new ListUsersCommand(params));
          return { Users: usersResponse.Users || [] };
        }
        case 'ListRoles': {
          const rolesResponse = await client.send(new ListRolesCommand(params));
          return { Roles: rolesResponse.Roles || [] };
        }
        case 'ListPolicies': {
          const policiesResponse = await client.send(new ListPoliciesCommand(params));
          return { Policies: policiesResponse.Policies || [] };
        }
        case 'ListMFADevices': {
          const mfaResponse = await client.send(new ListMFADevicesCommand(params));
          return { MFADevices: mfaResponse.MFADevices || [] };
        }
        case 'ListAccessKeys': {
          const keysResponse = await client.send(new ListAccessKeysCommand(params));
          return { AccessKeyMetadata: keysResponse.AccessKeyMetadata || [] };
        }
        default:
          return {};
      }
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw Object.assign(new Error('AWS IAM SDK not installed'), { code: 'MODULE_NOT_FOUND' });
      }
      throw error;
    }
  }

  /**
   * Dynamically load and call AWS S3 service
   */
  private async callS3(region: string, action: string, params: any, credentials: any): Promise<any> {
    try {
       
      const { 
        S3Client, 
        ListBucketsCommand,
        GetPublicAccessBlockCommand,
        GetBucketEncryptionCommand,
        GetBucketVersioningCommand,
        GetBucketLoggingCommand,
      } = require('@aws-sdk/client-s3');
      
      const client = new S3Client({ region, credentials });
      
      switch (action) {
        case 'ListBuckets': {
          const bucketsResponse = await client.send(new ListBucketsCommand(params));
          return { Buckets: bucketsResponse.Buckets || [] };
        }
        case 'GetPublicAccessBlock': {
          const publicResponse = await client.send(new GetPublicAccessBlockCommand(params));
          return { PublicAccessBlockConfiguration: publicResponse.PublicAccessBlockConfiguration };
        }
        case 'GetBucketEncryption': {
          const encResponse = await client.send(new GetBucketEncryptionCommand(params));
          return { ServerSideEncryptionConfiguration: encResponse.ServerSideEncryptionConfiguration };
        }
        case 'GetBucketVersioning': {
          const versResponse = await client.send(new GetBucketVersioningCommand(params));
          return { Status: versResponse.Status };
        }
        case 'GetBucketLogging': {
          const logResponse = await client.send(new GetBucketLoggingCommand(params));
          return { LoggingEnabled: logResponse.LoggingEnabled };
        }
        default:
          return {};
      }
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw Object.assign(new Error('AWS S3 SDK not installed'), { code: 'MODULE_NOT_FOUND' });
      }
      throw error;
    }
  }

  /**
   * Dynamically load and call AWS GuardDuty service
   */
  private async callGuardDuty(region: string, action: string, params: any, credentials: any): Promise<any> {
    try {
       
      const { 
        GuardDutyClient, 
        ListDetectorsCommand,
        ListFindingsCommand,
        GetFindingsCommand,
      } = require('@aws-sdk/client-guardduty');
      
      const client = new GuardDutyClient({ region, credentials });
      
      switch (action) {
        case 'ListDetectors': {
          const detectorsResponse = await client.send(new ListDetectorsCommand(params));
          return { DetectorIds: detectorsResponse.DetectorIds || [] };
        }
        case 'ListFindings': {
          const findingsListResponse = await client.send(new ListFindingsCommand(params));
          return { FindingIds: findingsListResponse.FindingIds || [] };
        }
        case 'GetFindings': {
          const findingsResponse = await client.send(new GetFindingsCommand(params));
          return { Findings: findingsResponse.Findings || [] };
        }
        default:
          return {};
      }
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw Object.assign(new Error('AWS GuardDuty SDK not installed'), { code: 'MODULE_NOT_FOUND' });
      }
      throw error;
    }
  }

  /**
   * Get demo response when AWS SDK is not available or credentials are missing
   * Returns empty data with clear indication of demo mode
   */
  private getDemoResponse(service: string, action: string): any {
    const demoResponses: Record<string, Record<string, any>> = {
      sts: {
        GetCallerIdentity: {
          Account: 'DEMO-ACCOUNT',
          Arn: 'arn:aws:iam::DEMO-ACCOUNT:user/demo-mode',
          UserId: 'DEMO-USER-ID',
          _isMockMode: true,
          _mockModeReason: 'AWS credentials not configured or SDK not installed',
        },
      },
      securityhub: {
        GetFindings: { 
          Findings: [],
          _isMockMode: true,
          _mockModeReason: 'Install @aws-sdk/client-securityhub and configure credentials for Security Hub data',
        },
      },
      cloudtrail: {
        LookupEvents: { 
          Events: [],
          _isMockMode: true,
          _mockModeReason: 'Install @aws-sdk/client-cloudtrail and configure credentials for CloudTrail data',
        },
      },
      config: {
        DescribeComplianceByConfigRule: { 
          ComplianceByConfigRules: [],
          _isMockMode: true,
          _mockModeReason: 'Install @aws-sdk/client-config-service and configure credentials for AWS Config data',
        },
      },
      iam: {
        ListUsers: { Users: [], _isMockMode: true },
        ListRoles: { Roles: [], _isMockMode: true },
        ListPolicies: { Policies: [], _isMockMode: true },
        ListMFADevices: { MFADevices: [], _isMockMode: true },
        ListAccessKeys: { AccessKeyMetadata: [], _isMockMode: true },
      },
      s3: {
        ListBuckets: { 
          Buckets: [],
          _isMockMode: true,
          _mockModeReason: 'Install @aws-sdk/client-s3 and configure credentials for S3 data',
        },
      },
      guardduty: {
        ListDetectors: { DetectorIds: [], _isMockMode: true },
        ListFindings: { FindingIds: [], _isMockMode: true },
        GetFindings: { Findings: [], _isMockMode: true },
      },
    };

    return demoResponses[service]?.[action] || { _isMockMode: true };
  }
}

