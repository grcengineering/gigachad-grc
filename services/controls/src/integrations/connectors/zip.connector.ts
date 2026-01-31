/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

/**
 * Configuration for Zip (ZipHQ) integration
 */
export interface ZipConfig {
  apiKey: string;
  environment?: 'production' | 'sandbox';
  baseUrl?: string;
}

/**
 * Zip Supplier from API
 */
interface ZipSupplier {
  id: string;
  name: string;
  legal_name?: string;
  display_name?: string;
  status: string; // active, inactive, pending, blocked
  category?: string;
  subcategory?: string;
  website?: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  contacts?: Array<{
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
    is_primary?: boolean;
  }>;
  payment_terms?: string;
  currency?: string;
  tax_id?: string;
  duns_number?: string;
  risk_score?: number;
  risk_level?: string;
  compliance_status?: string;
  certifications?: string[];
  insurance?: {
    has_general_liability?: boolean;
    has_cyber_insurance?: boolean;
    has_professional_liability?: boolean;
    expires_at?: string;
  };
  soc2_certified?: boolean;
  iso27001_certified?: boolean;
  gdpr_compliant?: boolean;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
  tags?: string[];
  custom_fields?: Record<string, any>;
}

/**
 * Zip Contract/Agreement
 */
interface ZipContract {
  id: string;
  supplier_id: string;
  name: string;
  type: string; // msa, nda, sow, order_form
  status: string; // draft, active, expired, terminated
  start_date?: string;
  end_date?: string;
  total_value?: number;
  currency?: string;
  renewal_type?: string; // auto, manual, none
  auto_renewal_notice_days?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Zip Spend Summary
 */
interface ZipSpendSummary {
  supplier_id: string;
  total_spend: number;
  spend_ytd: number;
  spend_last_12_months: number;
  po_count: number;
  invoice_count: number;
  currency: string;
}

/**
 * Sync result returned by the connector
 */
export interface ZipSyncResult {
  suppliers: {
    total: number;
    active: number;
    synced: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
    items: ZipVendorSummary[];
  };
  contracts: {
    total: number;
    active: number;
    expiringSoon: number;
  };
  spend: {
    totalSpend: number;
    spendYTD: number;
    topSuppliers: Array<{ name: string; spend: number }>;
  };
  compliance: {
    soc2Certified: number;
    iso27001Certified: number;
    gdprCompliant: number;
    hasInsurance: number;
    highRisk: number;
  };
  syncedAt: string;
  errors: string[];
}

/**
 * Vendor summary for storage
 */
interface ZipVendorSummary {
  zipId: string;
  name: string;
  legalName?: string;
  status: string;
  category?: string;
  website?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  riskLevel?: string;
  hasActiveContract: boolean;
  totalSpend?: number;
  soc2Certified: boolean;
  iso27001Certified: boolean;
  syncAction: 'created' | 'updated' | 'skipped' | 'error';
}

/**
 * Mapped vendor for TPRM
 */
export interface MappedVendor {
  externalId: string;
  externalSource: 'ziphq';
  name: string;
  legalName?: string;
  category: string;
  tier: string;
  status: string;
  description?: string;
  website?: string;
  primaryContact?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  inherentRiskScore?: string;
  metadata: {
    zipId: string;
    zipStatus: string;
    soc2Certified: boolean;
    iso27001Certified: boolean;
    gdprCompliant: boolean;
    hasInsurance: boolean;
    totalSpend?: number;
    spendYTD?: number;
    contractCount?: number;
    tags?: string[];
    lastSyncedAt: string;
  };
}

@Injectable()
export class ZipConnector {
  private readonly logger = new Logger(ZipConnector.name);
  
  private readonly DEFAULT_BASE_URL = 'https://api.ziphq.com/v1';
  private readonly SANDBOX_BASE_URL = 'https://api.sandbox.ziphq.com/v1';

  /**
   * Test connection to Zip API
   */
  async testConnection(config: ZipConfig): Promise<{ 
    success: boolean; 
    message: string; 
    details?: any 
  }> {
    // Validate config
    if (!config.apiKey) {
      return { success: false, message: 'API Key is required' };
    }

    const baseUrl = this.getBaseUrl(config);
    this.logger.log(`Testing Zip connection to: ${baseUrl}`);

    try {
      // Test with a simple API call to get current user/organization
      const response = await fetch(`${baseUrl}/me`, {
        headers: this.buildHeaders(config.apiKey),
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        if (response.status === 401) {
          return { success: false, message: 'Invalid API key' };
        }
        if (response.status === 403) {
          return { success: false, message: 'API key does not have sufficient permissions' };
        }
        
        return { 
          success: false, 
          message: `API request failed: ${response.status} - ${errorText.substring(0, 200)}` 
        };
      }

      const data = await response.json();
      
      // Try to get supplier count
      const suppliersResponse = await fetch(`${baseUrl}/suppliers?limit=1`, {
        headers: this.buildHeaders(config.apiKey),
      });
      
      let supplierCount = 0;
      if (suppliersResponse.ok) {
        const suppliersData = await suppliersResponse.json();
        supplierCount = suppliersData.total || suppliersData.data?.length || 0;
      }

      return { 
        success: true, 
        message: `Connected to Zip successfully. Found ${supplierCount} suppliers.`,
        details: {
          organization: data.organization?.name || data.name,
          environment: config.environment || 'production',
          supplierCount,
        },
      };
    } catch (error: any) {
      this.logger.error('Zip connection test failed', error);
      
      let message = error.message || 'Connection failed';
      
      if (message.includes('ENOTFOUND') || message.includes('getaddrinfo')) {
        message = 'Cannot reach Zip API - check your network connection';
      } else if (message.includes('ECONNREFUSED')) {
        message = 'Connection refused by Zip API';
      }
      
      return { success: false, message };
    }
  }

  /**
   * Full sync - fetch all suppliers and related data from Zip
   */
  async sync(config: ZipConfig): Promise<ZipSyncResult> {
    const baseUrl = this.getBaseUrl(config);
    const errors: string[] = [];
    
    this.logger.log('Starting Zip sync...');

    // Fetch all data in parallel
    const [suppliers, contracts, spendData] = await Promise.all([
      this.fetchAllSuppliers(baseUrl, config.apiKey),
      this.fetchAllContracts(baseUrl, config.apiKey).catch(e => {
        errors.push(`Failed to fetch contracts: ${e.message}`);
        return [] as ZipContract[];
      }),
      this.fetchSpendSummary(baseUrl, config.apiKey).catch(e => {
        errors.push(`Failed to fetch spend data: ${e.message}`);
        return [] as ZipSpendSummary[];
      }),
    ]);

    // Build spend lookup map
    const spendBySupplier = new Map<string, ZipSpendSummary>();
    for (const spend of spendData) {
      spendBySupplier.set(spend.supplier_id, spend);
    }

    // Build contract lookup map
    const contractsBySupplier = new Map<string, ZipContract[]>();
    for (const contract of contracts) {
      const existing = contractsBySupplier.get(contract.supplier_id) || [];
      existing.push(contract);
      contractsBySupplier.set(contract.supplier_id, existing);
    }

    // Process suppliers into vendor summaries
    const vendorSummaries: ZipVendorSummary[] = suppliers.map(supplier => {
      const spend = spendBySupplier.get(supplier.id);
      const supplierContracts = contractsBySupplier.get(supplier.id) || [];
      const primaryContact = supplier.contacts?.find(c => c.is_primary) || supplier.contacts?.[0];
      
      return {
        zipId: supplier.id,
        name: supplier.display_name || supplier.name,
        legalName: supplier.legal_name,
        status: supplier.status,
        category: supplier.category,
        website: supplier.website,
        primaryContactName: primaryContact?.name,
        primaryContactEmail: primaryContact?.email,
        riskLevel: supplier.risk_level,
        hasActiveContract: supplierContracts.some(c => c.status === 'active'),
        totalSpend: spend?.total_spend,
        soc2Certified: supplier.soc2_certified || false,
        iso27001Certified: supplier.iso27001_certified || false,
        syncAction: 'updated' as const,
      };
    });

    // Calculate compliance stats
    const compliance = {
      soc2Certified: suppliers.filter(s => s.soc2_certified).length,
      iso27001Certified: suppliers.filter(s => s.iso27001_certified).length,
      gdprCompliant: suppliers.filter(s => s.gdpr_compliant).length,
      hasInsurance: suppliers.filter(s => 
        s.insurance?.has_general_liability || 
        s.insurance?.has_cyber_insurance
      ).length,
      highRisk: suppliers.filter(s => 
        s.risk_level === 'high' || s.risk_level === 'critical'
      ).length,
    };

    // Calculate spend stats
    const totalSpend = spendData.reduce((sum, s) => sum + (s.total_spend || 0), 0);
    const spendYTD = spendData.reduce((sum, s) => sum + (s.spend_ytd || 0), 0);
    
    // Get top suppliers by spend
    const topSuppliers = [...spendData]
      .sort((a, b) => (b.total_spend || 0) - (a.total_spend || 0))
      .slice(0, 10)
      .map(s => {
        const supplier = suppliers.find(sup => sup.id === s.supplier_id);
        return {
          name: supplier?.name || 'Unknown',
          spend: s.total_spend || 0,
        };
      });

    // Count contract stats
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringSoon = contracts.filter(c => {
      if (!c.end_date) return false;
      const endDate = new Date(c.end_date);
      return endDate > now && endDate <= thirtyDaysFromNow;
    }).length;

    this.logger.log(`Zip sync complete: ${suppliers.length} suppliers, ${contracts.length} contracts`);

    return {
      suppliers: {
        total: suppliers.length,
        active: suppliers.filter(s => s.status === 'active').length,
        synced: vendorSummaries.length,
        created: 0, // Set by caller after TPRM sync
        updated: 0,
        skipped: 0,
        errors: 0,
        items: vendorSummaries,
      },
      contracts: {
        total: contracts.length,
        active: contracts.filter(c => c.status === 'active').length,
        expiringSoon,
      },
      spend: {
        totalSpend,
        spendYTD,
        topSuppliers,
      },
      compliance,
      syncedAt: new Date().toISOString(),
      errors,
    };
  }

  /**
   * Map Zip suppliers to GRC vendor format for TPRM import
   */
  mapToVendors(
    suppliers: ZipSupplier[], 
    spendData: Map<string, ZipSpendSummary>,
    contracts: Map<string, ZipContract[]>,
  ): MappedVendor[] {
    return suppliers.map(supplier => {
      const spend = spendData.get(supplier.id);
      const supplierContracts = contracts.get(supplier.id) || [];
      const primaryContact = supplier.contacts?.find(c => c.is_primary) || supplier.contacts?.[0];

      return {
        externalId: supplier.id,
        externalSource: 'ziphq' as const,
        name: supplier.display_name || supplier.name,
        legalName: supplier.legal_name,
        category: this.mapCategory(supplier.category),
        tier: this.determineTier(supplier, spend),
        status: this.mapStatus(supplier.status),
        description: supplier.description,
        website: supplier.website,
        primaryContact: primaryContact?.name,
        primaryContactEmail: primaryContact?.email,
        primaryContactPhone: primaryContact?.phone,
        inherentRiskScore: this.mapRiskLevel(supplier.risk_level),
        metadata: {
          zipId: supplier.id,
          zipStatus: supplier.status,
          soc2Certified: supplier.soc2_certified || false,
          iso27001Certified: supplier.iso27001_certified || false,
          gdprCompliant: supplier.gdpr_compliant || false,
          hasInsurance: !!(supplier.insurance?.has_general_liability || supplier.insurance?.has_cyber_insurance),
          totalSpend: spend?.total_spend,
          spendYTD: spend?.spend_ytd,
          contractCount: supplierContracts.length,
          tags: supplier.tags,
          lastSyncedAt: new Date().toISOString(),
        },
      };
    });
  }

  /**
   * Fetch all suppliers with pagination
   */
  async fetchAllSuppliers(baseUrl: string, apiKey: string): Promise<ZipSupplier[]> {
    const suppliers: ZipSupplier[] = [];
    let cursor: string | null = null;
    let hasMore = true;
    const limit = 100;

    try {
      while (hasMore) {
        const url = new URL(`${baseUrl}/suppliers`);
        url.searchParams.set('limit', String(limit));
        if (cursor) {
          url.searchParams.set('cursor', cursor);
        }

        const response = await fetch(url.toString(), {
          headers: this.buildHeaders(apiKey),
        });

        if (!response.ok) {
          this.logger.warn(`Failed to fetch suppliers: ${response.status}`);
          break;
        }

        const data = await response.json();
        const items = data.data || data.suppliers || [];
        suppliers.push(...items);

        // Handle pagination
        cursor = data.next_cursor || data.cursor || null;
        hasMore = !!cursor && items.length === limit;

        // Safety limit
        if (suppliers.length > 10000) {
          this.logger.warn('Reached supplier fetch limit (10,000)');
          break;
        }
      }

      this.logger.log(`Fetched ${suppliers.length} suppliers from Zip`);
      return suppliers;
    } catch (error) {
      this.logger.error('Failed to fetch suppliers from Zip', error);
      throw error;
    }
  }

  /**
   * Fetch all contracts
   */
  private async fetchAllContracts(baseUrl: string, apiKey: string): Promise<ZipContract[]> {
    const contracts: ZipContract[] = [];
    let cursor: string | null = null;
    let hasMore = true;
    const limit = 100;

    try {
      while (hasMore) {
        const url = new URL(`${baseUrl}/contracts`);
        url.searchParams.set('limit', String(limit));
        if (cursor) {
          url.searchParams.set('cursor', cursor);
        }

        const response = await fetch(url.toString(), {
          headers: this.buildHeaders(apiKey),
        });

        if (!response.ok) {
          // Contracts endpoint might not be available
          if (response.status === 404) {
            this.logger.log('Contracts endpoint not available');
            return [];
          }
          this.logger.warn(`Failed to fetch contracts: ${response.status}`);
          break;
        }

        const data = await response.json();
        const items = data.data || data.contracts || [];
        contracts.push(...items);

        cursor = data.next_cursor || data.cursor || null;
        hasMore = !!cursor && items.length === limit;

        if (contracts.length > 5000) break;
      }

      this.logger.log(`Fetched ${contracts.length} contracts from Zip`);
      return contracts;
    } catch (error) {
      this.logger.error('Failed to fetch contracts from Zip', error);
      return [];
    }
  }

  /**
   * Fetch spend summary
   */
  private async fetchSpendSummary(baseUrl: string, apiKey: string): Promise<ZipSpendSummary[]> {
    try {
      const response = await fetch(`${baseUrl}/analytics/spend/by-supplier`, {
        headers: this.buildHeaders(apiKey),
      });

      if (!response.ok) {
        // Analytics endpoint might not be available
        if (response.status === 404) {
          this.logger.log('Spend analytics endpoint not available');
          return [];
        }
        this.logger.warn(`Failed to fetch spend summary: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return data.data || data.spend || [];
    } catch (error) {
      this.logger.error('Failed to fetch spend summary from Zip', error);
      return [];
    }
  }

  /**
   * Map Zip category to GRC vendor category
   */
  private mapCategory(zipCategory?: string): string {
    if (!zipCategory) return 'software_vendor';

    const categoryMap: Record<string, string> = {
      'software': 'software_vendor',
      'saas': 'software_vendor',
      'cloud': 'cloud_provider',
      'infrastructure': 'cloud_provider',
      'hosting': 'cloud_provider',
      'consulting': 'consultant',
      'professional_services': 'professional_services',
      'legal': 'professional_services',
      'accounting': 'professional_services',
      'hardware': 'hardware_vendor',
      'equipment': 'hardware_vendor',
    };

    const lowerCategory = zipCategory.toLowerCase();
    for (const [key, value] of Object.entries(categoryMap)) {
      if (lowerCategory.includes(key)) {
        return value;
      }
    }

    return 'software_vendor';
  }

  /**
   * Determine vendor tier based on spend and criticality
   */
  private determineTier(supplier: ZipSupplier, spend?: ZipSpendSummary): string {
    // Tier based on spend
    const totalSpend = spend?.total_spend || 0;
    
    if (totalSpend >= 1000000) return 'tier_1'; // $1M+
    if (totalSpend >= 100000) return 'tier_2';  // $100K+
    if (totalSpend >= 10000) return 'tier_3';   // $10K+
    
    // Also consider risk level
    if (supplier.risk_level === 'critical' || supplier.risk_level === 'high') {
      return 'tier_2';
    }
    
    return 'tier_4';
  }

  /**
   * Map Zip status to GRC vendor status
   */
  private mapStatus(zipStatus: string): string {
    const statusMap: Record<string, string> = {
      'active': 'active',
      'approved': 'active',
      'inactive': 'inactive',
      'pending': 'pending_onboarding',
      'pending_approval': 'pending_onboarding',
      'onboarding': 'pending_onboarding',
      'blocked': 'terminated',
      'terminated': 'terminated',
      'offboarding': 'offboarding',
    };

    return statusMap[zipStatus?.toLowerCase()] || 'active';
  }

  /**
   * Map Zip risk level to GRC risk score
   */
  private mapRiskLevel(riskLevel?: string): string {
    if (!riskLevel) return 'medium';

    const riskMap: Record<string, string> = {
      'critical': 'critical',
      'high': 'high',
      'medium': 'medium',
      'moderate': 'medium',
      'low': 'low',
      'minimal': 'low',
    };

    return riskMap[riskLevel.toLowerCase()] || 'medium';
  }

  /**
   * Get the base URL for API calls
   */
  private getBaseUrl(config: ZipConfig): string {
    if (config.baseUrl) {
      return config.baseUrl.replace(/\/+$/, '');
    }
    return config.environment === 'sandbox' 
      ? this.SANDBOX_BASE_URL 
      : this.DEFAULT_BASE_URL;
  }

  /**
   * Build headers for API requests
   */
  private buildHeaders(apiKey: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'GigaChad-GRC/1.0',
    };
  }
}

