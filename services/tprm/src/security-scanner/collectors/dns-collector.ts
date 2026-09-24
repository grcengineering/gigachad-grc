import { Injectable, Logger } from '@nestjs/common';
import * as dns from 'dns';
import { promisify } from 'util';
import { DNSSecurityInfo } from '../dto/security-scan.dto';

const resolveTxt = promisify(dns.resolveTxt);
const resolveCaa = promisify(dns.resolveCaa);

@Injectable()
export class DNSCollector {
  private readonly logger = new Logger(DNSCollector.name);

  /**
   * Collect DNS security information for a domain
   */
  async collect(targetUrl: string): Promise<DNSSecurityInfo> {
    const result: DNSSecurityInfo = {
      hasSPF: false,
      hasDMARC: false,
      hasDNSSEC: null,
      dnssecStatus: 'unknown',
      hasCAA: false,
    };

    try {
      const url = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
      const domain = url.hostname;

      // Check SPF record
      const spfResult = await this.checkSPF(domain);
      result.hasSPF = spfResult.hasSPF;
      result.spfRecord = spfResult.record;

      // Check DMARC record
      const dmarcResult = await this.checkDMARC(domain);
      result.hasDMARC = dmarcResult.hasDMARC;
      result.dmarcRecord = dmarcResult.record;

      // Check CAA record
      result.hasCAA = await this.checkCAA(domain);

      const dnssec = await this.checkDNSSEC(domain);
      result.hasDNSSEC = dnssec.hasDNSSEC;
      result.dnssecStatus = dnssec.status;
    } catch (error) {
      this.logger.warn(`Failed to collect DNS info for ${targetUrl}: ${error.message}`);
    }

    return result;
  }

  private async checkSPF(domain: string): Promise<{ hasSPF: boolean; record?: string }> {
    try {
      const records = await resolveTxt(domain);
      for (const record of records) {
        const txt = record.join('');
        if (txt.toLowerCase().startsWith('v=spf1')) {
          return { hasSPF: true, record: txt };
        }
      }
    } catch (error) {
      this.logger.debug(`SPF lookup failed for ${domain}: ${error.message}`);
    }
    return { hasSPF: false };
  }

  private async checkDMARC(domain: string): Promise<{ hasDMARC: boolean; record?: string }> {
    try {
      const dmarcDomain = `_dmarc.${domain}`;
      const records = await resolveTxt(dmarcDomain);
      for (const record of records) {
        const txt = record.join('');
        if (txt.toLowerCase().startsWith('v=dmarc1')) {
          return { hasDMARC: true, record: txt };
        }
      }
    } catch (error) {
      this.logger.debug(`DMARC lookup failed for ${domain}: ${error.message}`);
    }
    return { hasDMARC: false };
  }

  private async checkCAA(domain: string): Promise<boolean> {
    try {
      const records = await resolveCaa(domain);
      return records && records.length > 0;
    } catch (error) {
      this.logger.debug(`CAA lookup failed for ${domain}: ${error.message}`);
      return false;
    }
  }

  private async checkDNSSEC(
    domain: string
  ): Promise<{ hasDNSSEC: boolean | null; status: 'validated' | 'unsigned' | 'unknown' }> {
    try {
      const endpoint = new URL('https://cloudflare-dns.com/dns-query');
      endpoint.searchParams.set('name', domain);
      endpoint.searchParams.set('type', 'DNSKEY');
      const response = await fetch(endpoint, {
        headers: { Accept: 'application/dns-json' },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        throw new Error(`DNS-over-HTTPS returned ${response.status}`);
      }

      const payload = (await response.json()) as {
        Status?: number;
        AD?: boolean;
        Answer?: Array<{ type?: number }>;
      };
      if (payload.Status !== 0) {
        return { hasDNSSEC: null, status: 'unknown' };
      }

      const hasDnsKey = payload.Answer?.some((answer) => answer.type === 48) === true;
      const validated = payload.AD === true && hasDnsKey;
      return {
        hasDNSSEC: validated,
        status: validated ? 'validated' : 'unsigned',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`DNSSEC validation failed for ${domain}: ${message}`);
      return { hasDNSSEC: null, status: 'unknown' };
    }
  }
}
