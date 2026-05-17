import { Injectable, Logger } from '@nestjs/common';
import {
  STSClient,
  GetCallerIdentityCommand,
  AssumeRoleCommand,
} from '@aws-sdk/client-sts';
import {
  CloudTrailClient,
  LookupEventsCommand,
} from '@aws-sdk/client-cloudtrail';
import {
  ConfigServiceClient,
  DescribeConfigRulesCommand,
  DescribeComplianceByConfigRuleCommand,
  GetComplianceDetailsByConfigRuleCommand,
} from '@aws-sdk/client-config-service';
import {
  IAMClient,
  ListUsersCommand,
  ListMFADevicesCommand,
  ListAccessKeysCommand,
  GetAccountPasswordPolicyCommand,
  GetAccountSummaryCommand,
  ListPoliciesCommand,
  GetPolicyVersionCommand,
} from '@aws-sdk/client-iam';
import {
  SecurityHubClient,
  GetFindingsCommand,
} from '@aws-sdk/client-securityhub';
import {
  BaseCollector,
  CollectorConfig,
  CollectionResult,
  CollectedEvidence,
} from './collector.interface';

/**
 * Resolved AWS credentials, either static or temporary from AssumeRole.
 */
interface ResolvedAWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

// Safety caps to avoid runaway loops and rate-limit issues.
const IAM_USER_DETAIL_CAP = 100;
const CONFIG_NON_COMPLIANT_DETAIL_CAP = 20;
const CLOUDTRAIL_MAX_EVENTS = 5000;
const SECURITYHUB_MAX_FINDINGS = 100;

/**
 * AWS Evidence Collector
 *
 * Collects evidence from AWS services using the AWS SDK v3:
 * - CloudTrail logs
 * - Config rules compliance
 * - IAM users, MFA, access keys, password policy, policies
 * - Security Hub findings
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

    const region = config.credentials.region;

    try {
      const credentials = await this.getClientCredentials(config);

      const sts = new STSClient({ region, credentials });
      const identity = await sts.send(new GetCallerIdentityCommand({}));

      if (!identity.Account) {
        return {
          success: false,
          message: 'STS GetCallerIdentity returned no Account; credentials may be invalid',
        };
      }

      this.logger.log(`AWS connection succeeded for account ${identity.Account} in ${region}`);
      return {
        success: true,
        message: `Successfully connected to AWS account ${identity.Account} as ${identity.Arn ?? identity.UserId}`,
      };
    } catch (error: any) {
      const msg = error?.message ?? String(error);
      this.logger.error(`AWS connection failed: ${msg}`);
      return { success: false, message: `Connection failed: ${msg}` };
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

    let credentials: ResolvedAWSCredentials;
    try {
      credentials = await this.getClientCredentials(config);
    } catch (error: any) {
      // Auth failures are fatal — no useful data can be collected.
      errors.push(`AWS authentication failed: ${error?.message ?? String(error)}`);
      return this.createResult(evidence, errors, warnings, startTime);
    }

    const region = config.credentials.region;

    // CloudTrail
    const cloudTrailEvidence = await this.collectCloudTrailEvents(credentials, region);
    evidence.push(...cloudTrailEvidence.evidence);
    errors.push(...cloudTrailEvidence.errors);

    // Config
    const configEvidence = await this.collectConfigCompliance(credentials, region);
    evidence.push(...configEvidence.evidence);
    errors.push(...configEvidence.errors);

    // IAM
    const iamEvidence = await this.collectIAMData(credentials, region);
    evidence.push(...iamEvidence.evidence);
    errors.push(...iamEvidence.errors);
    warnings.push(...iamEvidence.warnings);

    // Security Hub
    const securityHubEvidence = await this.collectSecurityHubFindings(credentials, region);
    evidence.push(...securityHubEvidence.evidence);
    warnings.push(...securityHubEvidence.warnings);
    errors.push(...securityHubEvidence.errors);

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
  // Credential resolution
  // ============================================

  /**
   * Resolve credentials for SDK clients. If `roleArn` is set, calls
   * STS AssumeRole using the static credentials and returns the temporary
   * credentials. Otherwise returns the static credentials.
   */
  private async getClientCredentials(
    config: CollectorConfig
  ): Promise<ResolvedAWSCredentials> {
    const { accessKeyId, secretAccessKey, region, roleArn } = config.credentials;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('Missing AWS accessKeyId or secretAccessKey');
    }

    const staticCreds: ResolvedAWSCredentials = {
      accessKeyId,
      secretAccessKey,
    };

    if (!roleArn) {
      return staticCreds;
    }

    const sts = new STSClient({ region, credentials: staticCreds });
    const assumed = await sts.send(
      new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: `gigachad-grc-collector-${Date.now()}`,
        DurationSeconds: 3600,
      })
    );

    const creds = assumed.Credentials;
    if (!creds?.AccessKeyId || !creds?.SecretAccessKey || !creds?.SessionToken) {
      throw new Error(`AssumeRole returned incomplete credentials for ${roleArn}`);
    }

    return {
      accessKeyId: creds.AccessKeyId,
      secretAccessKey: creds.SecretAccessKey,
      sessionToken: creds.SessionToken,
    };
  }

  // ============================================
  // Private Collection Methods
  // ============================================

  private async collectCloudTrailEvents(
    credentials: ResolvedAWSCredentials,
    region: string
  ): Promise<{
    evidence: CollectedEvidence[];
    errors: string[];
  }> {
    const evidence: CollectedEvidence[] = [];
    const errors: string[] = [];

    try {
      const client = new CloudTrailClient({ region, credentials });

      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000);

      const events: Array<{ EventName?: string; Username?: string }> = [];
      let nextToken: string | undefined;
      // `truncated` is true iff we exited the loop because we hit the cap and
      // CloudTrail still had more pages (nextToken set). It is NOT a function
      // of events.length alone, because the last page may be partial and still
      // fit under the cap with no more data available upstream.
      let truncated = false;
      // Page until cap reached. CloudTrail LookupEvents max page size is 50.
      do {
        const resp = await client.send(
          new LookupEventsCommand({
            StartTime: startTime,
            EndTime: endTime,
            MaxResults: 50,
            NextToken: nextToken,
          })
        );

        for (const e of resp.Events ?? []) {
          events.push({ EventName: e.EventName, Username: e.Username });
        }
        nextToken = resp.NextToken;

        if (events.length >= CLOUDTRAIL_MAX_EVENTS && nextToken) {
          truncated = true;
          break;
        }
      } while (nextToken);

      const eventNameCounts = new Map<string, number>();
      const usernames = new Set<string>();
      for (const e of events) {
        if (e.EventName) {
          eventNameCounts.set(e.EventName, (eventNameCounts.get(e.EventName) ?? 0) + 1);
        }
        if (e.Username) {
          usernames.add(e.Username);
        }
      }

      const topAPIs = Array.from(eventNameCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([api, count]) => ({ api, count }));

      evidence.push({
        title: 'CloudTrail Log Summary',
        description: 'Summary of CloudTrail management events for the past 30 days',
        evidenceType: 'cloudtrail_events',
        category: 'logging',
        source: 'aws-cloudtrail',
        sourceId: `cloudtrail-${region}-${Date.now()}`,
        collectedAt: new Date(),
        data: {
          region,
          eventCount: events.length,
          uniqueAPICalls: eventNameCounts.size,
          uniqueUsers: usernames.size,
          period: '30 days',
          topAPIs,
          truncated,
        },
        tags: ['aws', 'cloudtrail', 'logging', 'audit'],
      });
    } catch (error: any) {
      errors.push(`CloudTrail collection failed: ${error?.message ?? String(error)}`);
    }

    return { evidence, errors };
  }

  private async collectConfigCompliance(
    credentials: ResolvedAWSCredentials,
    region: string
  ): Promise<{
    evidence: CollectedEvidence[];
    errors: string[];
  }> {
    const evidence: CollectedEvidence[] = [];
    const errors: string[] = [];

    try {
      const client = new ConfigServiceClient({ region, credentials });

      // List all Config rules (paginated).
      const allRules: Array<{ ConfigRuleName?: string }> = [];
      {
        let nextToken: string | undefined;
        do {
          const resp = await client.send(
            new DescribeConfigRulesCommand({ NextToken: nextToken })
          );
          for (const r of resp.ConfigRules ?? []) {
            allRules.push({ ConfigRuleName: r.ConfigRuleName });
          }
          nextToken = resp.NextToken;
        } while (nextToken);
      }

      // Get compliance status per rule (paginated).
      const compliance: Array<{
        ConfigRuleName?: string;
        ComplianceType?: string;
      }> = [];
      {
        let nextToken: string | undefined;
        do {
          const resp = await client.send(
            new DescribeComplianceByConfigRuleCommand({ NextToken: nextToken })
          );
          for (const c of resp.ComplianceByConfigRules ?? []) {
            compliance.push({
              ConfigRuleName: c.ConfigRuleName,
              ComplianceType: c.Compliance?.ComplianceType,
            });
          }
          nextToken = resp.NextToken;
        } while (nextToken);
      }

      const compliant = compliance.filter((c) => c.ComplianceType === 'COMPLIANT').length;
      const nonCompliant = compliance.filter((c) => c.ComplianceType === 'NON_COMPLIANT').length;
      const notApplicable = compliance.filter((c) => c.ComplianceType === 'NOT_APPLICABLE').length;

      const evaluated = compliant + nonCompliant;
      const compliancePercentage = evaluated > 0
        ? Math.round((compliant / evaluated) * 1000) / 10
        : 0;

      // For non-compliant rules, fetch resource-level non-compliant counts.
      const nonCompliantRuleNames = compliance
        .filter((c) => c.ComplianceType === 'NON_COMPLIANT' && c.ConfigRuleName)
        .map((c) => c.ConfigRuleName as string)
        .slice(0, CONFIG_NON_COMPLIANT_DETAIL_CAP);

      const nonCompliantRules: Array<{
        ruleName: string;
        resourcesNonCompliant: number;
      }> = [];

      // Aggregate per-rule failures by error name (e.g. AccessDenied) and
      // emit a single summary error at the end of the loop instead of one
      // entry per failed rule.
      const detailFailures = new Map<
        string,
        { count: number; sampleMessage: string }
      >();

      for (const ruleName of nonCompliantRuleNames) {
        try {
          const detail = await client.send(
            new GetComplianceDetailsByConfigRuleCommand({
              ConfigRuleName: ruleName,
              ComplianceTypes: ['NON_COMPLIANT'],
              Limit: 100,
            })
          );
          nonCompliantRules.push({
            ruleName,
            resourcesNonCompliant: (detail.EvaluationResults ?? []).length,
          });
        } catch (innerError: any) {
          const message = innerError?.message ?? String(innerError);
          const key = innerError?.name ?? message.slice(0, 80);
          const existing = detailFailures.get(key);
          if (existing) {
            existing.count++;
          } else {
            detailFailures.set(key, { count: 1, sampleMessage: message });
          }
        }
      }

      for (const [errorName, info] of detailFailures) {
        errors.push(
          `Config GetComplianceDetailsByConfigRule failed for ${info.count} of ${nonCompliantRuleNames.length} non-compliant rules: ${errorName} (sample: ${info.sampleMessage})`
        );
      }

      evidence.push({
        title: 'AWS Config Rule Compliance Summary',
        description: 'Compliance status for all AWS Config rules',
        evidenceType: 'config_compliance',
        category: 'compliance',
        source: 'aws-config',
        sourceId: `config-compliance-${region}-${Date.now()}`,
        collectedAt: new Date(),
        data: {
          region,
          totalRules: allRules.length,
          compliant,
          nonCompliant,
          notApplicable,
          compliancePercentage,
          nonCompliantRules,
          nonCompliantDetailCap: CONFIG_NON_COMPLIANT_DETAIL_CAP,
        },
        tags: ['aws', 'config', 'compliance'],
      });
    } catch (error: any) {
      errors.push(`Config compliance collection failed: ${error?.message ?? String(error)}`);
    }

    return { evidence, errors };
  }

  private async collectIAMData(
    credentials: ResolvedAWSCredentials,
    region: string
  ): Promise<{
    evidence: CollectedEvidence[];
    errors: string[];
    warnings: string[];
  }> {
    const evidence: CollectedEvidence[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // IAM is a global service; the API endpoint is in us-east-1 but the client
    // accepts any region. Using the configured region keeps signing consistent.
    const client = new IAMClient({ region, credentials });

    // --- Users / MFA / Access keys ---
    try {
      const users: Array<{ UserName?: string }> = [];
      {
        let marker: string | undefined;
        do {
          const resp = await client.send(new ListUsersCommand({ Marker: marker }));
          for (const u of resp.Users ?? []) {
            users.push({ UserName: u.UserName });
          }
          marker = resp.IsTruncated ? resp.Marker : undefined;
        } while (marker);
      }

      const totalUsers = users.length;
      const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

      // MFA + access keys are fetched only for the first IAM_USER_DETAIL_CAP
      // users to avoid runaway loops and IAM rate limits on large accounts.
      const inspectableUsers = users.slice(0, IAM_USER_DETAIL_CAP).filter(
        (u): u is { UserName: string } => typeof u.UserName === 'string'
      );

      if (totalUsers > IAM_USER_DETAIL_CAP) {
        warnings.push(
          `IAM MFA/access-key inspection capped at first ${IAM_USER_DETAIL_CAP} of ${totalUsers} users`
        );
      }

      let inspectedUsersWithMFA = 0;
      let inspectedUsersWithAccessKeys = 0;
      // Bounded by the inspection cap: this is the number of access keys
      // older than 90 days observed across the at-most-IAM_USER_DETAIL_CAP
      // users we inspected, NOT a tenant-wide total.
      let accessKeysOlderThan90Days = 0;

      // Aggregate per-user IAM failures by error name (AccessDenied, Throttling,
      // etc.) and emit ONE summary error per (operation, error) bucket so the
      // errors array doesn't get spammed with one entry per failed user.
      const mfaFailures = new Map<
        string,
        { count: number; sampleMessage: string }
      >();
      const keyFailures = new Map<
        string,
        { count: number; sampleMessage: string }
      >();

      for (const u of inspectableUsers) {
        try {
          const mfaResp = await client.send(
            new ListMFADevicesCommand({ UserName: u.UserName })
          );
          if ((mfaResp.MFADevices ?? []).length > 0) {
            inspectedUsersWithMFA++;
          }
        } catch (innerError: any) {
          const message = innerError?.message ?? String(innerError);
          const key = innerError?.name ?? message.slice(0, 80);
          const existing = mfaFailures.get(key);
          if (existing) {
            existing.count++;
          } else {
            mfaFailures.set(key, { count: 1, sampleMessage: message });
          }
        }

        try {
          const keysResp = await client.send(
            new ListAccessKeysCommand({ UserName: u.UserName })
          );
          const keys = keysResp.AccessKeyMetadata ?? [];
          if (keys.length > 0) {
            inspectedUsersWithAccessKeys++;
            for (const k of keys) {
              if (k.CreateDate && k.CreateDate.getTime() < ninetyDaysAgo) {
                accessKeysOlderThan90Days++;
              }
            }
          }
        } catch (innerError: any) {
          const message = innerError?.message ?? String(innerError);
          const key = innerError?.name ?? message.slice(0, 80);
          const existing = keyFailures.get(key);
          if (existing) {
            existing.count++;
          } else {
            keyFailures.set(key, { count: 1, sampleMessage: message });
          }
        }
      }

      for (const [errorName, info] of mfaFailures) {
        errors.push(
          `IAM ListMFADevices failed for ${info.count} of ${inspectableUsers.length} inspected users: ${errorName} (sample: ${info.sampleMessage})`
        );
      }
      for (const [errorName, info] of keyFailures) {
        errors.push(
          `IAM ListAccessKeys failed for ${info.count} of ${inspectableUsers.length} inspected users: ${errorName} (sample: ${info.sampleMessage})`
        );
      }

      // Password policy. NOTE: `passwordPolicyConfigured` only signals that a
      // policy *exists* — it does NOT assert that the policy meets any
      // particular strength benchmark (e.g. CIS recommends minLength >= 14,
      // reuse prevention >= 24, etc.). Downstream checks should evaluate the
      // returned `passwordPolicy` object against the framework's specific
      // requirements.
      let passwordPolicyConfigured = false;
      let passwordPolicy: Record<string, unknown> | null = null;
      try {
        const pp = await client.send(new GetAccountPasswordPolicyCommand({}));
        if (pp.PasswordPolicy) {
          passwordPolicyConfigured = true;
          passwordPolicy = {
            minimumPasswordLength: pp.PasswordPolicy.MinimumPasswordLength,
            requireSymbols: pp.PasswordPolicy.RequireSymbols,
            requireNumbers: pp.PasswordPolicy.RequireNumbers,
            requireUppercaseCharacters: pp.PasswordPolicy.RequireUppercaseCharacters,
            requireLowercaseCharacters: pp.PasswordPolicy.RequireLowercaseCharacters,
            allowUsersToChangePassword: pp.PasswordPolicy.AllowUsersToChangePassword,
            expirePasswords: pp.PasswordPolicy.ExpirePasswords,
            maxPasswordAge: pp.PasswordPolicy.MaxPasswordAge,
            passwordReusePrevention: pp.PasswordPolicy.PasswordReusePrevention,
            hardExpiry: pp.PasswordPolicy.HardExpiry,
          };
        }
      } catch (innerError: any) {
        // NoSuchEntity means no password policy is configured — that's a real
        // finding, not an error.
        if (innerError?.name === 'NoSuchEntityException') {
          passwordPolicyConfigured = false;
        } else {
          errors.push(
            `IAM GetAccountPasswordPolicy failed: ${innerError?.message ?? String(innerError)}`
          );
        }
      }

      // Root MFA status via account summary
      let rootAccountMFAEnabled: boolean | null = null;
      try {
        const summary = await client.send(new GetAccountSummaryCommand({}));
        const mfaFlag = summary.SummaryMap?.AccountMFAEnabled;
        rootAccountMFAEnabled = mfaFlag === 1;
      } catch (innerError: any) {
        errors.push(
          `IAM GetAccountSummary failed: ${innerError?.message ?? String(innerError)}`
        );
      }

      const usersInspected = inspectableUsers.length;
      const inspectedUsersWithoutMFA = Math.max(
        0,
        usersInspected - inspectedUsersWithMFA
      );
      const mfaComplianceRate = usersInspected > 0
        ? Math.round((inspectedUsersWithMFA / usersInspected) * 1000) / 10
        : 0;

      evidence.push({
        title: 'IAM User Summary',
        description: 'Summary of IAM users and MFA status',
        evidenceType: 'iam_users',
        category: 'access_control',
        source: 'aws-iam',
        sourceId: `iam-users-${Date.now()}`,
        collectedAt: new Date(),
        data: {
          totalUsers,
          usersInspected,
          inspectionCap: IAM_USER_DETAIL_CAP,
          inspectionTruncated: totalUsers > IAM_USER_DETAIL_CAP,
          // These counts apply ONLY to the inspected subset (first
          // `inspectionCap` users); they are not tenant-wide totals when
          // `inspectionTruncated` is true.
          inspectedUsersWithMFA,
          inspectedUsersWithoutMFA,
          mfaComplianceRate,
          inspectedUsersWithAccessKeys,
          // Bounded by the inspection cap — see the variable comment above.
          accessKeysOlderThan90Days,
          rootAccountMFAEnabled,
          passwordPolicyConfigured,
          passwordPolicy,
        },
        tags: ['aws', 'iam', 'access-control', 'mfa'],
      });
    } catch (error: any) {
      errors.push(`IAM user collection failed: ${error?.message ?? String(error)}`);
    }

    // --- IAM Policies (customer-managed + AWS-managed) ---
    try {
      const POLICY_LIST_CAP = 5000;

      const customerPolicies: Array<{
        PolicyName?: string;
        Arn?: string;
        DefaultVersionId?: string;
      }> = [];
      // True iff we exited the customer-policy list loop because we hit the
      // cap with more pages still available upstream.
      let customerPoliciesTruncated = false;
      {
        let marker: string | undefined;
        do {
          const resp = await client.send(
            new ListPoliciesCommand({ Scope: 'Local', Marker: marker })
          );
          for (const p of resp.Policies ?? []) {
            customerPolicies.push({
              PolicyName: p.PolicyName,
              Arn: p.Arn,
              DefaultVersionId: p.DefaultVersionId,
            });
          }
          marker = resp.IsTruncated ? resp.Marker : undefined;
          if (customerPolicies.length >= POLICY_LIST_CAP && marker) {
            customerPoliciesTruncated = true;
            break;
          }
        } while (marker);
      }

      // AWS-managed policies are very numerous; we just need a count.
      let awsManagedCount = 0;
      let awsManagedPoliciesTruncated = false;
      {
        let marker: string | undefined;
        do {
          const resp = await client.send(
            new ListPoliciesCommand({ Scope: 'AWS', Marker: marker })
          );
          awsManagedCount += (resp.Policies ?? []).length;
          marker = resp.IsTruncated ? resp.Marker : undefined;
          if (awsManagedCount >= POLICY_LIST_CAP && marker) {
            awsManagedPoliciesTruncated = true;
            break;
          }
        } while (marker);
      }

      // Inspect customer-managed policies for admin/wildcard patterns.
      // `wildcardCount` is the raw count of policies that match the wildcard
      // pattern; because admin (`{Action:"*",Resource:"*"}`) is a strict
      // subset of wildcard, we subtract `policiesWithAdmin` from
      // `wildcardCount` so the two buckets we expose
      // (`policiesWithAdmin` and `policiesWithWildcard`) are mutually
      // exclusive — preventing the same policy from being counted twice.
      let policiesWithAdmin = 0;
      let wildcardCount = 0;
      const adminPolicyNames: string[] = [];

      for (const policy of customerPolicies) {
        if (!policy.Arn || !policy.DefaultVersionId) continue;
        try {
          const versionResp = await client.send(
            new GetPolicyVersionCommand({
              PolicyArn: policy.Arn,
              VersionId: policy.DefaultVersionId,
            })
          );
          const docEncoded = versionResp.PolicyVersion?.Document;
          if (!docEncoded || typeof docEncoded !== 'string') continue;

          let doc: any;
          try {
            doc = JSON.parse(decodeURIComponent(docEncoded));
          } catch {
            try {
              doc = JSON.parse(docEncoded);
            } catch {
              continue;
            }
          }

          const statements = Array.isArray(doc?.Statement)
            ? doc.Statement
            : doc?.Statement
              ? [doc.Statement]
              : [];

          let hasAdmin = false;
          let hasWildcard = false;
          for (const stmt of statements) {
            if (stmt?.Effect !== 'Allow') continue;
            const actions = Array.isArray(stmt.Action)
              ? stmt.Action
              : stmt.Action !== undefined
                ? [stmt.Action]
                : [];
            const resources = Array.isArray(stmt.Resource)
              ? stmt.Resource
              : stmt.Resource !== undefined
                ? [stmt.Resource]
                : [];

            if (actions.includes('*') && resources.includes('*')) {
              hasAdmin = true;
            }
            if (
              actions.some((a: any) => typeof a === 'string' && a.includes('*')) ||
              resources.some((r: any) => typeof r === 'string' && r.includes('*'))
            ) {
              hasWildcard = true;
            }
          }

          if (hasAdmin) {
            policiesWithAdmin++;
            if (policy.PolicyName) adminPolicyNames.push(policy.PolicyName);
          }
          if (hasWildcard) wildcardCount++;
        } catch (innerError: any) {
          errors.push(
            `IAM GetPolicyVersion for ${policy.PolicyName ?? policy.Arn} failed: ${innerError?.message ?? String(innerError)}`
          );
        }
      }

      // Make wildcard and admin buckets mutually exclusive: admin is a
      // strict subset of wildcard, so subtract to avoid double-counting.
      const policiesWithWildcard = Math.max(0, wildcardCount - policiesWithAdmin);

      evidence.push({
        title: 'IAM Policy Analysis',
        description: 'Analysis of IAM policies for least privilege',
        evidenceType: 'iam_policies',
        category: 'access_control',
        source: 'aws-iam',
        sourceId: `iam-policies-${Date.now()}`,
        collectedAt: new Date(),
        data: {
          totalPolicies: customerPolicies.length + awsManagedCount,
          customerManagedPolicies: customerPolicies.length,
          customerPoliciesTruncated,
          awsManagedPolicies: awsManagedCount,
          awsManagedPoliciesTruncated,
          policiesWithAdmin,
          policiesWithWildcard,
          adminPolicyNames: adminPolicyNames.slice(0, 20),
        },
        tags: ['aws', 'iam', 'policies', 'least-privilege'],
      });
    } catch (error: any) {
      errors.push(`IAM policy collection failed: ${error?.message ?? String(error)}`);
    }

    return { evidence, errors, warnings };
  }

  private async collectSecurityHubFindings(
    credentials: ResolvedAWSCredentials,
    region: string
  ): Promise<{
    evidence: CollectedEvidence[];
    warnings: string[];
    errors: string[];
  }> {
    const evidence: CollectedEvidence[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      const client = new SecurityHubClient({ region, credentials });

      const resp = await client.send(
        new GetFindingsCommand({
          Filters: {},
          MaxResults: SECURITYHUB_MAX_FINDINGS,
        })
      );

      const findings = resp.Findings ?? [];

      const counts = { critical: 0, high: 0, medium: 0, low: 0, informational: 0, other: 0 };
      const frameworkSet = new Set<string>();
      const criticalFindings: Array<{ title: string; resourceId: string }> = [];

      for (const f of findings) {
        const label = (f.Severity?.Label ?? '').toUpperCase();
        switch (label) {
          case 'CRITICAL': counts.critical++; break;
          case 'HIGH': counts.high++; break;
          case 'MEDIUM': counts.medium++; break;
          case 'LOW': counts.low++; break;
          case 'INFORMATIONAL': counts.informational++; break;
          default: counts.other++;
        }

        // Framework / standard parsing.
        const standardsArn =
          (f.ProductFields as Record<string, string> | undefined)?.['StandardsArn'] ??
          (f.ProductFields as Record<string, string> | undefined)?.['StandardsGuideArn'] ??
          (f.ProductFields as Record<string, string> | undefined)?.['aws/securityhub/StandardsArn'];
        if (standardsArn) {
          frameworkSet.add(this.deriveFrameworkName(standardsArn));
        }
        const controlId = f.Compliance?.SecurityControlId;
        if (controlId) {
          frameworkSet.add(controlId.split('.')[0]);
        }

        if (label === 'CRITICAL') {
          const resourceId =
            f.Resources?.[0]?.Id ?? f.Resources?.[0]?.Type ?? 'unknown';
          criticalFindings.push({
            title: f.Title ?? '(no title)',
            resourceId,
          });
        }
      }

      evidence.push({
        title: 'AWS Security Hub Findings Summary',
        description: 'Summary of Security Hub findings by severity',
        evidenceType: 'security_hub_findings',
        category: 'security',
        source: 'aws-security-hub',
        sourceId: `securityhub-${region}-${Date.now()}`,
        collectedAt: new Date(),
        data: {
          region,
          totalFindings: findings.length,
          critical: counts.critical,
          high: counts.high,
          medium: counts.medium,
          low: counts.low,
          informational: counts.informational,
          frameworks: Array.from(frameworkSet),
          criticalFindings,
          sampleCap: SECURITYHUB_MAX_FINDINGS,
        },
        tags: ['aws', 'security-hub', 'findings', 'compliance'],
      });
    } catch (error: any) {
      const name = error?.name ?? '';
      const msg = error?.message ?? String(error);
      // Security Hub may not be enabled in the account/region. Surface as a
      // warning rather than aborting the whole run.
      if (
        name === 'InvalidAccessException' ||
        name === 'ResourceNotFoundException' ||
        /not subscribed|not enabled|is not subscribed/i.test(msg)
      ) {
        warnings.push(
          `Security Hub not enabled or accessible in ${region}: ${msg}`
        );
      } else {
        errors.push(`Security Hub collection failed: ${msg}`);
      }
    }

    return { evidence, warnings, errors };
  }

  private deriveFrameworkName(standardsArn: string): string {
    // Examples:
    //   arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.2.0
    //   arn:aws:securityhub:us-east-1::standards/aws-foundational-security-best-practices/v/1.0.0
    const match = standardsArn.match(/\/(?:standard|ruleset)s?\/([^/]+)/);
    if (match) {
      return match[1]
        .split('-')
        .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
        .join(' ');
    }
    return standardsArn;
  }
}
