import { IsString, IsOptional } from 'class-validator';

// ============================================
// Security Scan Request DTOs
// ============================================

export class InitiateSecurityScanDto {
  @IsString()
  @IsOptional()
  targetUrl?: string; // Optional - will use vendor.website if not provided
}

// ============================================
// Security Information Types
// ============================================

export interface SSLInfo {
  enabled: boolean;
  issuer?: string;
  expiry?: string;
  daysUntilExpiry?: number;
  grade: 'A' | 'B' | 'C' | 'F' | 'N/A';
  httpRedirectsToHttps: boolean;
}

export interface SecurityHeaders {
  strictTransportSecurity?: string;
  contentSecurityPolicy?: string;
  xFrameOptions?: string;
  xContentTypeOptions?: string;
  xXssProtection?: string;
  referrerPolicy?: string;
  permissionsPolicy?: string;
}

export interface DNSSecurityInfo {
  hasSPF: boolean;
  hasDMARC: boolean;
  hasDNSSEC: boolean | null;
  dnssecStatus: 'validated' | 'unsigned' | 'unknown';
  hasCAA: boolean;
  spfRecord?: string;
  dmarcRecord?: string;
}

export interface WebPresenceInfo {
  accessible: boolean;
  statusCode?: number;
  title?: string;
  hasContactInfo: boolean;
  contactEmail?: string;
  hasPrivacyPolicy: boolean;
  privacyPolicyUrl?: string;
  hasTermsOfService: boolean;
}

export interface ComplianceIndicators {
  hasTrustPortal: boolean;
  trustPortalUrl?: string;
  trustPortalProvider?: string;
  hasSOC2: boolean;
  soc2Type?: 'Type I' | 'Type II';
  hasISO27001: boolean;
  hasGDPR: boolean;
  hasHIPAA: boolean;
  hasPCIDSS: boolean;
  certifications: string[];
  hasSecurityWhitepaper: boolean;
  hasBugBounty: boolean;
  bugBountyUrl?: string;
  // Privacy policy detection (also checked in WebCollector)
  hasPrivacyPolicy?: boolean;
  privacyPolicyUrl?: string;
}

// ============================================
// Subdomain Discovery Types
// ============================================

export interface SubdomainInfo {
  subdomain: string;
  fullDomain: string;
  resolved: boolean;
  ipAddresses?: string[];
  accessible?: boolean;
  httpStatus?: number;
  redirectsTo?: string;
  hasSSL?: boolean;
}

export interface SubdomainScanResult {
  domain: string;
  totalChecked: number;
  discovered: SubdomainInfo[];
  hasWildcard: boolean;
  wildcardIp?: string;
}

// ============================================
// Finding Types
// ============================================

export type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
export type RiskCategory = 'Security' | 'Breach' | 'Reputation' | 'Compliance';

export interface SecurityFinding {
  id: string;
  category: RiskCategory;
  level: RiskLevel;
  title: string;
  description: string;
  impact: string;
  remediation: string;
}

// ============================================
// Scan Result Types
// ============================================

export interface CategoryScores {
  security: number;
  breach: number;
  reputation: number;
  compliance: number;
}

export interface SecurityScanResult {
  id: string;
  vendorId: string;
  targetUrl: string;
  scannedAt: string;
  status: 'completed' | 'failed' | 'partial';

  // Collected Data
  ssl: SSLInfo;
  securityHeaders: SecurityHeaders;
  missingHeaders: string[];
  dns: DNSSecurityInfo;
  webPresence: WebPresenceInfo;
  compliance: ComplianceIndicators;
  subdomains?: SubdomainScanResult;

  // Analysis Results
  categoryScores: CategoryScores;
  overallScore: number;
  riskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  findings: SecurityFinding[];

  // Summary
  summary: string;
  keyRisks: string[];
  recommendations: string[];
}

// ============================================
// Risk Level Helpers
// ============================================

export function scoreToRiskLevel(score: number): SecurityScanResult['riskLevel'] {
  if (score >= 80) return 'Low';
  if (score >= 60) return 'Medium';
  if (score >= 40) return 'High';
  return 'Critical';
}

export function riskLevelToInherentScore(level: SecurityScanResult['riskLevel']): string {
  switch (level) {
    case 'Critical':
      return 'critical';
    case 'High':
      return 'high';
    case 'Medium':
      return 'medium';
    case 'Low':
      return 'low';
    default:
      return 'medium';
  }
}
