import { Injectable, Logger } from '@nestjs/common';

export interface CloudflareConfig {
  apiToken: string;
  accountId?: string;
}

export interface CloudflareSyncResult {
  zones: {
    total: number;
    active: number;
    items: Array<{ id: string; name: string; status: string; plan: string }>;
  };
  security: {
    wafEnabled: number;
    sslStrict: number;
    ddosProtected: number;
  };
  dns: { totalRecords: number };
  firewall: { rules: number; accessRules: number };
  certificates: { total: number; expiringSoon: number };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class CloudflareConnector {
  private readonly logger = new Logger(CloudflareConnector.name);
  private readonly baseUrl = 'https://api.cloudflare.com/client/v4';

  async testConnection(config: CloudflareConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.apiToken) {
      return { success: false, message: 'API token is required' };
    }
    try {
      const response = await fetch(`${this.baseUrl}/user/tokens/verify`, {
        headers: { 'Authorization': `Bearer ${config.apiToken}` },
      });
      if (!response.ok) return { success: false, message: `API error: ${response.status}` };
      const data = await response.json();
      return { success: data.success, message: data.success ? 'Connected to Cloudflare' : 'Token verification failed' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async sync(config: CloudflareConfig): Promise<CloudflareSyncResult> {
    const errors: string[] = [];
    const zones = await this.getZones(config).catch(e => { errors.push(`zones: ${e.message}`); return []; });
    const activeZones = zones.filter((z: any) => z.status === 'active');

    // Cap per-zone work at 20 zones
    const sampleZones = zones.slice(0, 20);
    let dnsRecords = 0;
    let firewallRules = 0;
    let accessRules = 0;
    let certsTotal = 0;
    let certsExpiringSoon = 0;
    let wafEnabledCount = 0;
    let sslStrictCount = 0;
    let ddosProtectedCount = 0;
    const thirtyDaysFromNow = Date.now() + 30 * 24 * 60 * 60 * 1000;

    await Promise.all(sampleZones.map(async (z: any) => {
      const zid = z.id;
      await Promise.all([
        this.getDnsRecords(zid, config.apiToken)
          .then(records => { dnsRecords += records.length; })
          .catch(e => { errors.push(`dns ${z.name}: ${e.message}`); }),
        this.getFirewallRules(zid, config.apiToken)
          .then(rules => { firewallRules += rules.length; })
          .catch(e => { errors.push(`firewall ${z.name}: ${e.message}`); }),
        this.getAccessRules(zid, config.apiToken)
          .then(rules => { accessRules += rules.length; })
          .catch(e => { errors.push(`accessRules ${z.name}: ${e.message}`); }),
        this.getCertificatePacks(zid, config.apiToken)
          .then(certs => {
            certsTotal += certs.length;
            certs.forEach((c: any) => {
              const expires = c.certificates?.[0]?.expires_on || c.expires_on;
              if (expires) {
                const t = Date.parse(expires);
                if (!isNaN(t) && t <= thirtyDaysFromNow) certsExpiringSoon++;
              }
            });
          })
          .catch(e => { errors.push(`certificates ${z.name}: ${e.message}`); }),
        this.getWafSetting(zid, config.apiToken)
          .then(enabled => { if (enabled) wafEnabledCount++; })
          .catch(e => { errors.push(`waf ${z.name}: ${e.message}`); }),
        this.getSslSetting(zid, config.apiToken)
          .then(value => { if (value === 'strict') sslStrictCount++; })
          .catch(e => { errors.push(`ssl ${z.name}: ${e.message}`); }),
        this.getDdosProtected(zid, config.apiToken)
          .then(protectedZone => { if (protectedZone) ddosProtectedCount++; })
          .catch(e => { errors.push(`ddos ${z.name}: ${e.message}`); }),
      ]);
    }));

    return {
      zones: {
        total: zones.length,
        active: activeZones.length,
        items: zones.slice(0, 50).map((z: any) => ({ id: z.id, name: z.name, status: z.status, plan: z.plan?.name })),
      },
      security: { wafEnabled: wafEnabledCount, sslStrict: sslStrictCount, ddosProtected: ddosProtectedCount },
      dns: { totalRecords: dnsRecords },
      firewall: { rules: firewallRules, accessRules },
      certificates: { total: certsTotal, expiringSoon: certsExpiringSoon },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private async getZones(config: CloudflareConfig): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/zones?per_page=50`, {
      headers: { 'Authorization': `Bearer ${config.apiToken}` },
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.result || [];
  }

  private async getDnsRecords(zoneId: string, token: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/zones/${zoneId}/dns_records?per_page=100`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.result || [];
  }

  private async getFirewallRules(zoneId: string, token: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/zones/${zoneId}/firewall/rules`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.result || [];
  }

  private async getAccessRules(zoneId: string, token: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/zones/${zoneId}/firewall/access_rules/rules`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.result || [];
  }

  private async getCertificatePacks(zoneId: string, token: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/zones/${zoneId}/ssl/certificate_packs`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.result || [];
  }

  private async getWafSetting(zoneId: string, token: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/zones/${zoneId}/settings/waf`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.result?.value === 'on';
  }

  private async getSslSetting(zoneId: string, token: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/zones/${zoneId}/settings/ssl`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.result?.value ?? '';
  }

  private async getDdosProtected(zoneId: string, token: string): Promise<boolean> {
    // Treat a zone as DDoS-protected if any IP-range lockdown is configured OR security_level is not 'off'.
    // Both endpoints check enforceable protections — not just the Cloudflare default-on advertised feature.
    let hasLockdown = false;
    try {
      const lockdownRes = await fetch(`${this.baseUrl}/zones/${zoneId}/firewall/lockdowns`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (lockdownRes.ok) {
        const ld = await lockdownRes.json();
        const result = ld.result || [];
        hasLockdown = Array.isArray(result) && result.length > 0;
      }
    } catch {
      // ignore — fall through to security_level
    }
    const secRes = await fetch(`${this.baseUrl}/zones/${zoneId}/settings/security_level`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!secRes.ok) throw new Error(`Failed: ${secRes.status}`);
    const secData = await secRes.json();
    const level = secData.result?.value;
    return hasLockdown || (typeof level === 'string' && level !== 'off');
  }
}

