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
      warnings.push(...userEvidence.warnings);

      // Collect authentication policies
      const policyEvidence = await this.collectAuthPolicies(config);
      evidence.push(...policyEvidence.evidence);
      warnings.push(...policyEvidence.warnings);

      // Collect application data
      const appEvidence = await this.collectApplicationData(config);
      evidence.push(...appEvidence.evidence);
      warnings.push(...appEvidence.warnings);

      // Collect system logs
      const logEvidence = await this.collectSystemLogs(config);
      evidence.push(...logEvidence.evidence);
      warnings.push(...logEvidence.warnings);

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

  private async oktaFetch(
    url: string,
    apiToken: string
  ): Promise<{ ok: boolean; status: number; data: any; linkHeader: string | null }> {
    const response = await fetch(url, {
      headers: {
        'Authorization': `SSWS ${apiToken}`,
        'Accept': 'application/json',
      },
    });
    const linkHeader = response.headers.get('link');
    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    return { ok: response.ok, status: response.status, data, linkHeader };
  }

  /**
   * Like oktaFetch but exposes the raw Headers so callers can read
   * rate-limit headers (X-Rate-Limit-Reset) for backoff decisions.
   */
  private async oktaFetchWithHeaders(
    url: string,
    apiToken: string
  ): Promise<{ ok: boolean; status: number; data: any; headers: Headers }> {
    const response = await fetch(url, {
      headers: {
        'Authorization': `SSWS ${apiToken}`,
        'Accept': 'application/json',
      },
    });
    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    return { ok: response.ok, status: response.status, data, headers: response.headers };
  }

  private parseNextLink(linkHeader: string | null): string | null {
    if (!linkHeader) return null;
    const parts = linkHeader.split(',');
    for (const part of parts) {
      const match = part.match(/<([^>]+)>;\s*rel="next"/);
      if (match) return match[1];
    }
    return null;
  }

  /**
   * Aggregate session controls across one sign-on policy's rules.
   *
   * Okta places session settings on rule.actions.signon.session, not on
   * the policy itself. The strictest value wins:
   *   maxSessionLifetimeMinutes -> smallest
   *   maxSessionIdleMinutes     -> smallest
   *   usePersistentCookie       -> false
   *
   * Null fields = no rule supplied that value (don't default).
   */
  private async aggregateSignOnSessionFromRules(
    domain: string,
    apiToken: string,
    policyId: string | undefined,
  ): Promise<{
    maxSessionLifetimeMinutes: number | null;
    maxSessionIdleMinutes: number | null;
    usePersistentCookie: boolean | null;
  }> {
    const result = {
      maxSessionLifetimeMinutes: null as number | null,
      maxSessionIdleMinutes: null as number | null,
      usePersistentCookie: null as boolean | null,
    };
    if (!policyId) return result;
    try {
      const { ok, data } = await this.oktaFetch(
        `https://${domain}/api/v1/policies/${policyId}/rules`,
        apiToken,
      );
      if (!ok || !Array.isArray(data)) return result;
      for (const rule of data) {
        const session = rule?.actions?.signon?.session;
        if (!session) continue;
        if (typeof session.maxSessionLifetimeMinutes === 'number') {
          result.maxSessionLifetimeMinutes = result.maxSessionLifetimeMinutes === null
            ? session.maxSessionLifetimeMinutes
            : Math.min(result.maxSessionLifetimeMinutes, session.maxSessionLifetimeMinutes);
        }
        if (typeof session.maxSessionIdleMinutes === 'number') {
          result.maxSessionIdleMinutes = result.maxSessionIdleMinutes === null
            ? session.maxSessionIdleMinutes
            : Math.min(result.maxSessionIdleMinutes, session.maxSessionIdleMinutes);
        }
        if (typeof session.usePersistentCookie === 'boolean') {
          if (result.usePersistentCookie === null) {
            result.usePersistentCookie = session.usePersistentCookie;
          } else if (session.usePersistentCookie === false) {
            result.usePersistentCookie = false;
          }
        }
      }
    } catch {
      // Leave null fields — strictly preferable to fabricating defaults.
    }
    return result;
  }

  private async paginate<T = any>(
    initialUrl: string,
    apiToken: string,
    capItems: number,
    capPages: number = 50
  ): Promise<{ items: T[]; warnings: string[] }> {
    const items: T[] = [];
    const warnings: string[] = [];
    let url: string | null = initialUrl;
    let pageCount = 0;

    while (url && items.length < capItems && pageCount < capPages) {
      const { ok, status, data, linkHeader }: { ok: boolean; status: number; data: any; linkHeader: string | null } =
        await this.oktaFetch(url, apiToken);
      if (!ok) {
        warnings.push(`Okta pagination request failed (HTTP ${status}): ${url}`);
        break;
      }
      if (Array.isArray(data)) {
        for (const item of data) {
          if (items.length >= capItems) break;
          items.push(item as T);
        }
      }
      url = this.parseNextLink(linkHeader);
      pageCount++;
    }

    return { items, warnings };
  }

  private async collectUserData(config: CollectorConfig): Promise<{
    evidence: CollectedEvidence[];
    errors: string[];
    warnings: string[];
  }> {
    const evidence: CollectedEvidence[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    const { domain, apiToken } = config.credentials;

    try {
      // ---- Users
      const { items: users, warnings: userWarn } = await this.paginate<any>(
        `https://${domain}/api/v1/users?limit=200`,
        apiToken,
        5000
      );
      warnings.push(...userWarn);

      const totalUsers = users.length;
      const activeUsers = users.filter((u: any) => u.status === 'ACTIVE').length;
      const suspendedUsers = users.filter((u: any) => u.status === 'SUSPENDED').length;
      const deactivatedUsers = users.filter((u: any) => u.status === 'DEPROVISIONED').length;
      const provisionedUsers = users.filter((u: any) => u.status === 'PROVISIONED').length;
      const passwordExpiredUsers = users.filter((u: any) => u.status === 'PASSWORD_EXPIRED').length;
      const lockedOutUsers = users.filter((u: any) => u.status === 'LOCKED_OUT').length;

      // ---- MFA factors (N+1 - cap at first 200 users)
      // Handle Okta rate limits: on HTTP 429, read X-Rate-Limit-Reset
      // (Unix seconds) and wait until that point (cap 60s, or 60s if the
      // header is missing) before retrying ONCE. After retry, if still
      // failing, the user falls into the unknown bucket — we do not mark
      // them enrolled=false because that would assert security state we
      // never actually observed.
      const factorSampleUsers = users.slice(0, 200);
      let enrolled = 0;
      let unknownEnrollment = 0;
      const factorTypeCounts = new Map<string, number>();
      let factorErrorCount = 0;

      const fetchFactorsWithRetry = async (userId: string): Promise<{
        ok: boolean;
        data: any;
      }> => {
        const url = `https://${domain}/api/v1/users/${userId}/factors`;
        const first = await this.oktaFetchWithHeaders(url, apiToken);
        if (first.ok) return { ok: true, data: first.data };
        if (first.status !== 429) return { ok: false, data: null };

        // Compute wait time: X-Rate-Limit-Reset is Unix seconds. Bound to 60s.
        const resetHeader = first.headers.get('x-rate-limit-reset');
        let waitMs = 60_000;
        if (resetHeader) {
          const resetSec = parseInt(resetHeader, 10);
          if (!isNaN(resetSec)) {
            const now = Math.floor(Date.now() / 1000);
            waitMs = Math.min(60_000, Math.max(0, (resetSec - now) * 1000));
          }
        }
        await new Promise(resolve => setTimeout(resolve, waitMs));
        const second = await this.oktaFetchWithHeaders(url, apiToken);
        if (second.ok) return { ok: true, data: second.data };
        return { ok: false, data: null };
      };

      for (const u of factorSampleUsers) {
        try {
          const { ok, data } = await fetchFactorsWithRetry(u.id);
          if (!ok) {
            // Push to "mfa-unknown" bucket instead of marking enrolled=false.
            unknownEnrollment++;
            factorErrorCount++;
            continue;
          }
          const factors = Array.isArray(data) ? data : [];
          const hasActive = factors.some((f: any) => f.status === 'ACTIVE');
          if (hasActive) enrolled++;
          for (const f of factors) {
            if (f?.status === 'ACTIVE' && f?.factorType) {
              const t = String(f.factorType);
              factorTypeCounts.set(t, (factorTypeCounts.get(t) || 0) + 1);
            }
          }
        } catch (e) {
          unknownEnrollment++;
          factorErrorCount++;
        }
      }
      if (factorErrorCount > 0) {
        warnings.push(`${factorErrorCount} MFA factor lookups failed out of ${factorSampleUsers.length}`);
      }

      // notEnrolled is "we confirmed no ACTIVE factor". unknownEnrollment is
      // tracked separately so consumers do not silently bucket failed
      // lookups as not-enrolled.
      const notEnrolled = factorSampleUsers.length - enrolled - unknownEnrollment;
      const enrollmentRate = factorSampleUsers.length > 0
        ? Math.round((enrolled / factorSampleUsers.length) * 1000) / 10
        : 0;

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
          totalUsers,
          activeUsers,
          suspendedUsers,
          deactivatedUsers,
          provisionedUsers,
          passwordExpiredUsers,
          lockedOutUsers,
          mfaEnrollment: {
            sampleSize: factorSampleUsers.length,
            enrolled,
            notEnrolled,
            // unknown: lookup failed even after a 429 retry. Reported
            // separately so callers don't conflate it with not-enrolled.
            unknown: unknownEnrollment,
            enrollmentRate,
            factorTypes: Array.from(factorTypeCounts.entries())
              .map(([type, count]) => ({ type, count }))
              .sort((a, b) => b.count - a.count),
          },
        },
        tags: ['okta', 'users', 'mfa', 'identity'],
      });

      // ---- Groups
      const { items: groups, warnings: groupWarn } = await this.paginate<any>(
        `https://${domain}/api/v1/groups?limit=200`,
        apiToken,
        5000
      );
      warnings.push(...groupWarn);

      const totalGroups = groups.length;
      const oktaManagedGroups = groups.filter((g: any) => g.type === 'OKTA_GROUP').length;
      const appGroups = groups.filter((g: any) => g.type === 'APP_GROUP').length;
      const directoryGroups = groups.filter((g: any) => g.type === 'BUILT_IN').length;

      evidence.push({
        title: 'Okta Groups Summary',
        description: 'Summary of groups and membership assignments',
        evidenceType: 'group_memberships',
        category: 'access_control',
        source: 'okta',
        sourceId: `okta-groups-${Date.now()}`,
        collectedAt: new Date(),
        data: {
          domain,
          totalGroups,
          oktaManagedGroups,
          appGroups,
          directoryGroups,
        },
        tags: ['okta', 'groups', 'access-control'],
      });

    } catch (error) {
      errors.push(`User data collection failed: ${error.message}`);
    }

    return { evidence, errors, warnings };
  }

  private async collectAuthPolicies(config: CollectorConfig): Promise<{
    evidence: CollectedEvidence[];
    warnings: string[];
  }> {
    const evidence: CollectedEvidence[] = [];
    const warnings: string[] = [];
    const { domain, apiToken } = config.credentials;

    const fetchPolicies = async (
      type: string
    ): Promise<any[]> => {
      const url = `https://${domain}/api/v1/policies?type=${type}`;
      const { ok, status, data }: { ok: boolean; status: number; data: any } =
        await this.oktaFetch(url, apiToken);
      if (!ok) {
        warnings.push(`Failed to fetch ${type} policies: HTTP ${status}`);
        return [];
      }
      return Array.isArray(data) ? data : [];
    };

    try {
      const signOnRaw = await fetchPolicies('OKTA_SIGN_ON');
      const passwordRaw = await fetchPolicies('PASSWORD');
      const mfaEnrollRaw = await fetchPolicies('MFA_ENROLL');

      // Okta keeps session settings on policy RULES, not on policies. For
      // each sign-on policy fetch its rules and aggregate the strictest
      // values across all rules. Then attach per-policy aggregates to the
      // policies list and also produce a global strictest-of-strictest.
      const perPolicyRuleAggregates = await Promise.all(
        signOnRaw.map(async (p: any) => {
          const agg = await this.aggregateSignOnSessionFromRules(domain, apiToken, p?.id);
          return { policy: p, agg };
        })
      );

      const signOnPolicies = {
        total: signOnRaw.length,
        policies: perPolicyRuleAggregates.map(({ policy: p, agg }) => ({
          name: p?.name,
          status: p?.status,
          priority: p?.priority,
          system: p?.system,
          // Sourced from rule.actions.signon.session aggregated across rules.
          // Reading p.settings.session here was unreliable because Okta
          // populates session controls at the rule level.
          maxSessionLifetime: agg.maxSessionLifetimeMinutes,
          maxIdleTime: agg.maxSessionIdleMinutes,
          persistentCookie: agg.usePersistentCookie,
        })),
      };

      // Global strictest across every rule of every sign-on policy.
      let globalMaxLifetime: number | null = null;
      let globalMaxIdle: number | null = null;
      let globalPersistentCookie: boolean | null = null;
      for (const { agg } of perPolicyRuleAggregates) {
        if (agg.maxSessionLifetimeMinutes !== null) {
          globalMaxLifetime = globalMaxLifetime === null
            ? agg.maxSessionLifetimeMinutes
            : Math.min(globalMaxLifetime, agg.maxSessionLifetimeMinutes);
        }
        if (agg.maxSessionIdleMinutes !== null) {
          globalMaxIdle = globalMaxIdle === null
            ? agg.maxSessionIdleMinutes
            : Math.min(globalMaxIdle, agg.maxSessionIdleMinutes);
        }
        if (agg.usePersistentCookie !== null) {
          if (globalPersistentCookie === null) globalPersistentCookie = agg.usePersistentCookie;
          else if (agg.usePersistentCookie === false) globalPersistentCookie = false;
        }
      }
      const globalSessionPolicy = {
        // Strictest values observed across all sign-on policy rules. Null
        // fields mean no rule supplied that value — kept as null per
        // PATTERN.md instead of being defaulted.
        maxSessionLifetime: globalMaxLifetime,
        maxIdleTime: globalMaxIdle,
        persistentCookie: globalPersistentCookie,
      };

      // Password policies — aggregate the strictest values across all
      let minLength: number | undefined;
      let requireUppercase = false;
      let requireLowercase = false;
      let requireNumber = false;
      let requireSymbol = false;
      let maxAge: number | undefined;
      let historyCount: number | undefined;
      let lockoutAttempts: number | undefined;
      let lockoutDuration: number | undefined;

      for (const p of passwordRaw) {
        const complexity = p?.settings?.password?.complexity;
        const age = p?.settings?.password?.age;
        const lockout = p?.settings?.password?.lockout;
        if (complexity) {
          if (typeof complexity.minLength === 'number') {
            minLength = minLength === undefined ? complexity.minLength : Math.max(minLength, complexity.minLength);
          }
          if (complexity.minUpperCase > 0) requireUppercase = true;
          if (complexity.minLowerCase > 0) requireLowercase = true;
          if (complexity.minNumber > 0) requireNumber = true;
          if (complexity.minSymbol > 0) requireSymbol = true;
        }
        if (age) {
          if (typeof age.maxAgeDays === 'number') {
            maxAge = maxAge === undefined ? age.maxAgeDays : Math.min(maxAge, age.maxAgeDays);
          }
          if (typeof age.historyCount === 'number') {
            historyCount = historyCount === undefined ? age.historyCount : Math.max(historyCount, age.historyCount);
          }
        }
        if (lockout) {
          if (typeof lockout.maxAttempts === 'number') {
            lockoutAttempts = lockoutAttempts === undefined
              ? lockout.maxAttempts
              : Math.min(lockoutAttempts, lockout.maxAttempts);
          }
          if (typeof lockout.autoUnlockMinutes === 'number') {
            lockoutDuration = lockoutDuration === undefined
              ? lockout.autoUnlockMinutes
              : Math.max(lockoutDuration, lockout.autoUnlockMinutes);
          }
        }
      }

      const passwordPolicies = {
        total: passwordRaw.length,
        minLength,
        requireUppercase,
        requireLowercase,
        requireNumber,
        requireSymbol,
        maxAge,
        historyCount,
        lockoutAttempts,
        lockoutDuration,
      };

      const mfaEnrollPolicies = {
        total: mfaEnrollRaw.length,
        policies: mfaEnrollRaw.map((p: any) => ({
          name: p?.name,
          status: p?.status,
          priority: p?.priority,
        })),
      };

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
          signOnPolicies,
          passwordPolicies,
          mfaEnrollPolicies,
          globalSessionPolicy,
        },
        tags: ['okta', 'authentication', 'policies', 'mfa'],
      });

    } catch (error) {
      warnings.push(`Auth policies collection had issues: ${error.message}`);
    }

    return { evidence, warnings };
  }

  private async collectApplicationData(config: CollectorConfig): Promise<{
    evidence: CollectedEvidence[];
    warnings: string[];
  }> {
    const evidence: CollectedEvidence[] = [];
    const warnings: string[] = [];
    const { domain, apiToken } = config.credentials;

    try {
      const { items: apps, warnings: appWarn } = await this.paginate<any>(
        `https://${domain}/api/v1/apps?limit=200`,
        apiToken,
        5000
      );
      warnings.push(...appWarn);

      const totalApplications = apps.length;
      const activeApplications = apps.filter((a: any) => a.status === 'ACTIVE').length;
      const inactiveApplications = totalApplications - activeApplications;

      const signOnModeCounts = new Map<string, number>();
      for (const a of apps) {
        const mode = a?.signOnMode || 'UNKNOWN';
        signOnModeCounts.set(mode, (signOnModeCounts.get(mode) || 0) + 1);
      }
      const applicationTypes = Array.from(signOnModeCounts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      const provisioningEnabled = apps.filter((a: any) =>
        Array.isArray(a?.features) && a.features.includes('PROVISIONING_PUSH')
      ).length;

      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const recentlyAdded = apps
        .filter((a: any) => {
          if (!a?.created) return false;
          const t = Date.parse(a.created);
          return !isNaN(t) && t >= thirtyDaysAgo;
        })
        .map((a: any) => ({ name: a?.label || a?.name, addedAt: a?.created }))
        .sort((a, b) => Date.parse(b.addedAt) - Date.parse(a.addedAt))
        .slice(0, 20);

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
          totalApplications,
          activeApplications,
          inactiveApplications,
          applicationTypes,
          provisioningEnabled,
          recentlyAdded,
        },
        tags: ['okta', 'applications', 'sso', 'access-control'],
      });

    } catch (error) {
      warnings.push(`Application data collection had issues: ${error.message}`);
    }

    return { evidence, warnings };
  }

  private async collectSystemLogs(config: CollectorConfig): Promise<{
    evidence: CollectedEvidence[];
    warnings: string[];
  }> {
    const evidence: CollectedEvidence[] = [];
    const warnings: string[] = [];
    const { domain, apiToken } = config.credentials;

    try {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { items: logs, warnings: logWarn } = await this.paginate<any>(
        `https://${domain}/api/v1/logs?since=${encodeURIComponent(since)}&limit=1000`,
        apiToken,
        10000,
        100
      );
      warnings.push(...logWarn);

      const totalEvents = logs.length;
      const authEvents = logs.filter((e: any) =>
        typeof e?.eventType === 'string' && e.eventType.startsWith('user.authentication')
      );
      const successful = authEvents.filter((e: any) => e?.outcome?.result === 'SUCCESS').length;
      const failed = authEvents.length - successful;
      const failureRate = authEvents.length > 0
        ? Math.round((failed / authEvents.length) * 10000) / 100
        : 0;

      const failureReasonCounts = new Map<string, number>();
      for (const e of authEvents) {
        if (e?.outcome?.result !== 'SUCCESS') {
          const reason = e?.outcome?.reason || 'UNKNOWN';
          failureReasonCounts.set(reason, (failureReasonCounts.get(reason) || 0) + 1);
        }
      }
      const topFailureReasons = Array.from(failureReasonCounts.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const adminEvents = logs.filter((e: any) => {
        const t = e?.eventType;
        if (typeof t !== 'string') return false;
        return t.startsWith('system') || t.includes('admin');
      });

      const impossibleTravel = logs.filter((e: any) =>
        typeof e?.eventType === 'string' && e.eventType === 'user.session.impossible_travel'
      ).length;
      // Broadened MFA-failure detection. The original filter only caught
      // user.authentication.auth_via_mfa with non-SUCCESS. Okta also emits
      //   - user.mfa.factor.fail (any factor failure)
      //   - user.authentication.failure with outcome.reason mentioning MFA
      // so include those as well to avoid undercounting MFA fraud signals.
      const mfaFailures = logs.filter((e: any) => {
        const t = e?.eventType;
        if (typeof t !== 'string') return false;
        if (t === 'user.authentication.auth_via_mfa' && e?.outcome?.result !== 'SUCCESS') {
          return true;
        }
        if (t === 'user.mfa.factor.fail') {
          return true;
        }
        if (t === 'user.authentication.failure') {
          const reason = e?.outcome?.reason;
          if (typeof reason === 'string' && reason.toUpperCase().includes('MFA')) {
            return true;
          }
        }
        return false;
      }).length;

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
          totalEvents,
          authenticationEvents: {
            total: authEvents.length,
            successful,
            failed,
            failureRate,
          },
          topFailureReasons,
          adminEvents: {
            total: adminEvents.length,
          },
          suspiciousActivity: {
            impossibleTravel,
            mfaFailures,
          },
        },
        tags: ['okta', 'system-logs', 'authentication', 'audit'],
      });

    } catch (error) {
      warnings.push(`System logs collection had issues: ${error.message}`);
    }

    return { evidence, warnings };
  }
}
