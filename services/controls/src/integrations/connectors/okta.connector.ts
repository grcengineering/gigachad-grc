import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { safeFetch, SSRFProtectionError } from '@gigachad-grc/shared';

/**
 * Okta Integration Configuration
 */
export interface OktaConfig {
  domain: string; // e.g., "company.okta.com"
  apiToken: string; // Okta API token
}

/**
 * Okta User
 */
interface OktaUser {
  id: string;
  status: string;
  created: string;
  activated: string;
  lastLogin: string;
  lastUpdated: string;
  profile: {
    login: string;
    email: string;
    firstName: string;
    lastName: string;
    mobilePhone?: string;
  };
  credentials: {
    provider: { type: string; name: string };
  };
}

/**
 * Okta Group
 */
interface OktaGroup {
  id: string;
  created: string;
  lastUpdated: string;
  lastMembershipUpdated: string;
  type: string;
  profile: {
    name: string;
    description?: string;
  };
  _embedded?: {
    users?: OktaUser[];
  };
}

/**
 * Okta Application
 */
interface OktaApplication {
  id: string;
  name: string;
  label: string;
  status: string;
  created: string;
  lastUpdated: string;
  signOnMode: string;
  features: string[];
  visibility: {
    autoSubmitToolbar: boolean;
    hide: { iOS: boolean; web: boolean };
  };
}

/**
 * Okta System Log Event
 */
interface OktaLogEvent {
  uuid: string;
  published: string;
  eventType: string;
  displayMessage: string;
  severity: string;
  actor: { id: string; type: string; displayName: string };
  client: { ipAddress: string; userAgent: { rawUserAgent: string } };
  outcome: { result: string; reason?: string };
  target?: Array<{ id: string; type: string; displayName: string }>;
}

/**
 * Okta Sync Result
 */
export interface OktaSyncResult {
  users: {
    total: number;
    active: number;
    suspended: number;
    deprovisioned: number;
    // withMFA counts users with at least one ACTIVE factor.
    // mfaUnknown counts users whose factor lookup failed — they are NOT
    // rolled into withMFA or noMFA because doing so would assert MFA state
    // we never actually observed.
    withMFA: number;
    noMFA: number;
    mfaUnknown: number;
    items: Array<{
      id: string;
      email: string;
      name: string;
      status: string;
      lastLogin: string;
      // mfaEnabled is null when the per-user /factors call failed —
      // PATTERN.md forbids defaulting security state to false.
      mfaEnabled: boolean | null;
    }>;
  };
  groups: {
    total: number;
    items: Array<{
      id: string;
      name: string;
      type: string;
      memberCount: number;
    }>;
  };
  applications: {
    total: number;
    active: number;
    inactive: number;
    items: Array<{
      id: string;
      name: string;
      status: string;
      signOnMode: string;
    }>;
  };
  securityEvents: {
    total: number;
    failedLogins: number;
    suspiciousActivity: number;
    passwordChanges: number;
    mfaEvents: number;
    items: Array<{
      id: string;
      eventType: string;
      severity: string;
      actor: string;
      target: string;
      outcome: string;
      timestamp: string;
    }>;
  };
  policies: {
    signOn: number;
    password: number;
    mfa: number;
    // Aggregated session controls collected by walking each sign-on policy's
    // rules (Okta keeps session settings on rule.actions.signon.session, not
    // on the policy itself). Strictest values win across all rules.
    signOnSession: {
      maxSessionLifetimeMinutes: number | null;
      maxSessionIdleMinutes: number | null;
      usePersistentCookie: boolean | null;
    };
  };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class OktaConnector {
  private readonly logger = new Logger(OktaConnector.name);

  /**
   * Test connection to Okta
   */
  async testConnection(config: OktaConfig): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!config.domain || !config.apiToken) {
      return { success: false, message: 'Domain and API Token are required' };
    }

    try {
      const baseUrl = this.getBaseUrl(config.domain);

      // Test by getting current user (API token owner)
      const response = await this.ssrfFetch(`${baseUrl}/api/v1/users/me`, {
        headers: this.buildHeaders(config.apiToken),
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, message: 'Invalid API token' };
        }
        const error = await response.text();
        return {
          success: false,
          message: `API error: ${response.status} - ${error.substring(0, 100)}`,
        };
      }

      const user = await response.json();

      // Get org info
      const orgResponse = await this.ssrfFetch(`${baseUrl}/api/v1/org`, {
        headers: this.buildHeaders(config.apiToken),
      });
      const org = orgResponse.ok ? await orgResponse.json() : null;

      return {
        success: true,
        message: `Connected to Okta org: ${org?.companyName || config.domain}`,
        details: {
          organization: org?.companyName,
          subdomain: org?.subdomain,
          apiUser: user.profile?.email,
        },
      };
    } catch (error: any) {
      this.logger.error('Okta connection test failed', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  /**
   * Full sync - collect identity evidence from Okta
   */
  async sync(config: OktaConfig): Promise<OktaSyncResult> {
    const baseUrl = this.getBaseUrl(config.domain);
    const errors: string[] = [];

    this.logger.log('Starting Okta sync...');

    // Collect data in parallel
    const [users, groups, applications, logs, signOnPolicies, passwordPolicies, mfaPolicies] =
      await Promise.all([
        this.getUsers(baseUrl, config.apiToken).catch((e) => {
          errors.push(`Users: ${e.message}`);
          return [];
        }),
        this.getGroups(baseUrl, config.apiToken).catch((e) => {
          errors.push(`Groups: ${e.message}`);
          return [];
        }),
        this.getApplications(baseUrl, config.apiToken).catch((e) => {
          errors.push(`Applications: ${e.message}`);
          return [];
        }),
        this.getSecurityLogs(baseUrl, config.apiToken).catch((e) => {
          errors.push(`Logs: ${e.message}`);
          return [];
        }),
        this.getPolicies(baseUrl, config.apiToken, 'OKTA_SIGN_ON').catch((e) => {
          errors.push(`SignOn Policies: ${e.message}`);
          return [] as any[];
        }),
        this.getPolicies(baseUrl, config.apiToken, 'PASSWORD').catch((e) => {
          errors.push(`Password Policies: ${e.message}`);
          return [] as any[];
        }),
        this.getPolicies(baseUrl, config.apiToken, 'MFA_ENROLL').catch((e) => {
          errors.push(`MFA Policies: ${e.message}`);
          return [] as any[];
        }),
      ]);

    // Get MFA factors for users — mfaEnabled is now boolean | null where
    // null means the factor lookup failed and the state is genuinely unknown.
    const usersWithMFA = await this.checkUserMFA(baseUrl, config.apiToken, users.slice(0, 50));

    // Process users
    const activeUsers = users.filter((u) => u.status === 'ACTIVE');
    const mfaEnabledUsers = usersWithMFA.filter((u) => u.mfaEnabled === true);
    const mfaDisabledUsers = usersWithMFA.filter((u) => u.mfaEnabled === false);
    const mfaUnknownUsers = usersWithMFA.filter((u) => u.mfaEnabled === null);

    // Aggregate sign-on session settings from each policy's rules.
    // Strictest wins: smallest maxSessionLifetime, smallest maxSessionIdle,
    // usePersistentCookie=false beats =true.
    const signOnSessionAggregate = await this.aggregateSignOnSessionFromRules(
      baseUrl,
      config.apiToken,
      signOnPolicies
    ).catch((e) => {
      errors.push(`SignOn Rules: ${e.message}`);
      return {
        maxSessionLifetimeMinutes: null as number | null,
        maxSessionIdleMinutes: null as number | null,
        usePersistentCookie: null as boolean | null,
      };
    });

    // Process logs
    const failedLogins = logs.filter(
      (l) => l.eventType === 'user.session.start' && l.outcome?.result === 'FAILURE'
    );
    const suspiciousEvents = logs.filter(
      (l) => l.eventType.includes('security') || l.severity === 'WARN' || l.severity === 'ERROR'
    );
    const passwordEvents = logs.filter((l) => l.eventType.includes('password'));
    const mfaEvents = logs.filter(
      (l) => l.eventType.includes('mfa') || l.eventType.includes('factor')
    );

    this.logger.log(
      `Okta sync complete: ${users.length} users, ${groups.length} groups, ${applications.length} apps`
    );

    return {
      users: {
        total: users.length,
        active: activeUsers.length,
        suspended: users.filter((u) => u.status === 'SUSPENDED').length,
        deprovisioned: users.filter((u) => u.status === 'DEPROVISIONED').length,
        withMFA: mfaEnabledUsers.length,
        // noMFA only counts users we confirmed have no active factor.
        // mfaUnknown is reported separately so consumers don't silently
        // bucket "lookup failed" as "no MFA".
        noMFA: mfaDisabledUsers.length,
        mfaUnknown: mfaUnknownUsers.length,
        items: usersWithMFA.slice(0, 100).map((u) => ({
          id: u.id,
          email: u.profile?.email || '',
          name: `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim(),
          status: u.status,
          lastLogin: u.lastLogin,
          mfaEnabled: u.mfaEnabled,
        })),
      },
      groups: {
        total: groups.length,
        items: groups.slice(0, 50).map((g) => ({
          id: g.id,
          name: g.profile?.name || '',
          type: g.type,
          memberCount: g._embedded?.users?.length || 0,
        })),
      },
      applications: {
        total: applications.length,
        active: applications.filter((a) => a.status === 'ACTIVE').length,
        inactive: applications.filter((a) => a.status === 'INACTIVE').length,
        items: applications.slice(0, 50).map((a) => ({
          id: a.id,
          name: a.label || a.name,
          status: a.status,
          signOnMode: a.signOnMode,
        })),
      },
      securityEvents: {
        total: logs.length,
        failedLogins: failedLogins.length,
        suspiciousActivity: suspiciousEvents.length,
        passwordChanges: passwordEvents.length,
        mfaEvents: mfaEvents.length,
        items: logs.slice(0, 100).map((l) => ({
          id: l.uuid,
          eventType: l.eventType,
          severity: l.severity,
          actor: l.actor?.displayName || l.actor?.id || 'Unknown',
          target: l.target?.[0]?.displayName || l.target?.[0]?.id || '',
          outcome: l.outcome?.result || '',
          timestamp: l.published,
        })),
      },
      policies: {
        signOn: signOnPolicies.length,
        password: passwordPolicies.length,
        mfa: mfaPolicies.length,
        signOnSession: signOnSessionAggregate,
      },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private async ssrfFetch(url: string, init?: RequestInit): Promise<Response> {
    try {
      return await safeFetch(url, init);
    } catch (error) {
      if (error instanceof SSRFProtectionError) {
        throw new BadRequestException(`SSRF protection blocked: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get policies by type (OKTA_SIGN_ON, PASSWORD, MFA_ENROLL)
   */
  private async getPolicies(baseUrl: string, apiToken: string, type: string): Promise<any[]> {
    const response = await this.ssrfFetch(`${baseUrl}/api/v1/policies?type=${type}`, {
      headers: this.buildHeaders(apiToken),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${type} policies: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Get all users with pagination
   */
  private async getUsers(baseUrl: string, apiToken: string): Promise<OktaUser[]> {
    const users: OktaUser[] = [];
    let url: string | null = `${baseUrl}/api/v1/users?limit=200`;

    while (url && users.length < 1000) {
      const response = await this.ssrfFetch(url, {
        headers: this.buildHeaders(apiToken),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }

      const data = await response.json();
      users.push(...data);

      // Get next page from Link header
      const linkHeader = response.headers.get('Link');
      url = this.getNextPageUrl(linkHeader);
    }

    return users;
  }

  /**
   * Get all groups
   */
  private async getGroups(baseUrl: string, apiToken: string): Promise<OktaGroup[]> {
    const response = await this.ssrfFetch(`${baseUrl}/api/v1/groups?limit=200`, {
      headers: this.buildHeaders(apiToken),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch groups: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get all applications
   */
  private async getApplications(baseUrl: string, apiToken: string): Promise<OktaApplication[]> {
    const response = await this.ssrfFetch(`${baseUrl}/api/v1/apps?limit=200`, {
      headers: this.buildHeaders(apiToken),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch applications: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get security-related system logs
   */
  private async getSecurityLogs(baseUrl: string, apiToken: string): Promise<OktaLogEvent[]> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const response = await this.ssrfFetch(
      `${baseUrl}/api/v1/logs?since=${since}&limit=100&filter=eventType sw "user.session" or eventType sw "user.authentication" or eventType sw "security" or eventType sw "policy"`,
      { headers: this.buildHeaders(apiToken) }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch logs: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Check MFA status for users.
   *
   * mfaEnabled is:
   *   true  — at least one ACTIVE factor was returned
   *   false — call succeeded and the user has no ACTIVE factor
   *   null  — the factor lookup failed; state is unknown and MUST NOT be
   *           treated as either enrolled or not enrolled (PATTERN.md).
   */
  private async checkUserMFA(
    baseUrl: string,
    apiToken: string,
    users: OktaUser[]
  ): Promise<Array<OktaUser & { mfaEnabled: boolean | null }>> {
    return Promise.all(
      users.map(async (user) => {
        try {
          const response = await this.ssrfFetch(`${baseUrl}/api/v1/users/${user.id}/factors`, {
            headers: this.buildHeaders(apiToken),
          });

          if (!response.ok) {
            return { ...user, mfaEnabled: null as boolean | null };
          }

          const factors = await response.json();
          const activeFactors = Array.isArray(factors)
            ? factors.filter((f: any) => f.status === 'ACTIVE')
            : [];

          return { ...user, mfaEnabled: activeFactors.length > 0 };
        } catch {
          return { ...user, mfaEnabled: null as boolean | null };
        }
      })
    );
  }

  /**
   * Aggregate session controls across all sign-on policies' rules.
   *
   * Okta puts session settings on rule.actions.signon.session (not at the
   * policy level the way `signOnPolicies` is read elsewhere). For each
   * policy, fetch /api/v1/policies/{id}/rules and combine:
   *   maxSessionLifetimeMinutes -> smallest wins (strictest)
   *   maxSessionIdleMinutes     -> smallest wins (strictest)
   *   usePersistentCookie       -> false wins (strictest)
   *
   * Returns null fields when no rule supplied that value, distinguishing
   * "no rules say anything" from "rules permit liberal sessions".
   */
  private async aggregateSignOnSessionFromRules(
    baseUrl: string,
    apiToken: string,
    policies: any[]
  ): Promise<{
    maxSessionLifetimeMinutes: number | null;
    maxSessionIdleMinutes: number | null;
    usePersistentCookie: boolean | null;
  }> {
    let maxLifetime: number | null = null;
    let maxIdle: number | null = null;
    let persistentCookie: boolean | null = null;

    for (const policy of policies || []) {
      const policyId = policy?.id;
      if (!policyId) continue;
      try {
        const response = await this.ssrfFetch(`${baseUrl}/api/v1/policies/${policyId}/rules`, {
          headers: this.buildHeaders(apiToken),
        });
        if (!response.ok) continue;
        const rules = await response.json();
        if (!Array.isArray(rules)) continue;
        for (const rule of rules) {
          const session = rule?.actions?.signon?.session;
          if (!session) continue;
          if (typeof session.maxSessionLifetimeMinutes === 'number') {
            maxLifetime =
              maxLifetime === null
                ? session.maxSessionLifetimeMinutes
                : Math.min(maxLifetime, session.maxSessionLifetimeMinutes);
          }
          if (typeof session.maxSessionIdleMinutes === 'number') {
            maxIdle =
              maxIdle === null
                ? session.maxSessionIdleMinutes
                : Math.min(maxIdle, session.maxSessionIdleMinutes);
          }
          if (typeof session.usePersistentCookie === 'boolean') {
            // false (strictest) wins.
            if (persistentCookie === null) persistentCookie = session.usePersistentCookie;
            else if (session.usePersistentCookie === false) persistentCookie = false;
          }
        }
      } catch {
        // Skip — partial aggregation is acceptable; null preserved otherwise.
      }
    }

    return {
      maxSessionLifetimeMinutes: maxLifetime,
      maxSessionIdleMinutes: maxIdle,
      usePersistentCookie: persistentCookie,
    };
  }

  /**
   * Build base URL from domain
   */
  private getBaseUrl(domain: string): string {
    let url = domain.trim();
    if (!url.startsWith('https://')) {
      url = 'https://' + url;
    }
    return url.replace(/\/+$/, '');
  }

  /**
   * Build headers for Okta API requests
   */
  private buildHeaders(apiToken: string): Record<string, string> {
    return {
      Authorization: `SSWS ${apiToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Parse Link header for pagination
   */
  private getNextPageUrl(linkHeader: string | null): string | null {
    if (!linkHeader) return null;

    const links = linkHeader.split(',');
    for (const link of links) {
      const match = link.match(/<([^>]+)>;\s*rel="next"/);
      if (match) {
        return match[1];
      }
    }
    return null;
  }
}
