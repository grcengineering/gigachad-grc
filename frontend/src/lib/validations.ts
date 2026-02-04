import { z } from 'zod';

// ===========================================
// CIDR/IP Validation Utilities
// ===========================================

/**
 * Validates a single IP address (IPv4)
 * @param ip - The IP address string to validate
 * @returns true if valid IPv4 address, false otherwise
 */
export function isValidIp(ip: string): boolean {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) return false;
  const octets = ip.split('.');
  return octets.every((octet) => {
    const num = parseInt(octet, 10);
    return num >= 0 && num <= 255;
  });
}

/**
 * Validates CIDR notation (e.g., "192.168.1.0/24" or single IPs like "10.0.0.1")
 * @param cidr - The CIDR string to validate
 * @returns true if valid CIDR notation or single IP, false otherwise
 */
export function isValidCidr(cidr: string): boolean {
  // Handle single IP addresses (no CIDR prefix)
  if (!cidr.includes('/')) {
    return isValidIp(cidr);
  }

  // Validate CIDR format
  const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/(\d{1,2})$/;
  if (!cidrRegex.test(cidr)) return false;

  const [ip, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);

  // Validate prefix length (0-32 for IPv4)
  if (prefix < 0 || prefix > 32) return false;

  // Validate each octet
  return isValidIp(ip);
}

/**
 * Validates an array of CIDR/IP strings
 * @param cidrs - Array of CIDR strings to validate
 * @returns Array of invalid entries (empty if all valid)
 */
export function validateCidrArray(cidrs: string[]): string[] {
  return cidrs.filter((cidr) => !isValidCidr(cidr.trim()));
}

/**
 * Formats CIDR validation error message
 * @param invalidCidrs - Array of invalid CIDR strings
 * @returns Error message string
 */
export function formatCidrError(invalidCidrs: string[]): string {
  if (invalidCidrs.length === 0) return '';
  return `Invalid CIDR notation: ${invalidCidrs.join(', ')}. Expected format: single IP (e.g., "192.168.1.1") or CIDR range (e.g., "192.168.1.0/24")`;
}

// Zod custom refinement for CIDR validation
export const cidrSchema = z
  .string()
  .refine(
    (val) => !val || isValidCidr(val.trim()),
    'Invalid CIDR notation. Expected format: single IP (e.g., "192.168.1.1") or CIDR range (e.g., "192.168.1.0/24")'
  );

export const cidrArraySchema = z.array(z.string()).refine(
  (arr) => validateCidrArray(arr).length === 0,
  (arr) => ({ message: formatCidrError(validateCidrArray(arr)) })
);

// ===========================================
// Common Validation Patterns
// ===========================================

export const requiredString = (field: string) => z.string().min(1, `${field} is required`);

export const optionalString = z.string().optional().or(z.literal(''));

export const emailSchema = z.string().email('Please enter a valid email address');

export const urlSchema = z.string().url('Please enter a valid URL').optional().or(z.literal(''));

export const dateSchema = z
  .string()
  .refine((val) => !val || !isNaN(Date.parse(val)), 'Please enter a valid date');

export const positiveNumber = z.number().positive('Must be a positive number');

export const percentageSchema = z.number().min(0).max(100, 'Must be between 0 and 100');

// ===========================================
// Risk Schemas
// ===========================================

export const riskIntakeSchema = z.object({
  title: requiredString('Title').max(200, 'Title must be less than 200 characters'),
  description: requiredString('Description').max(
    2000,
    'Description must be less than 2000 characters'
  ),
  source: z.enum(
    [
      'internal_security_reviews',
      'ad_hoc_discovery',
      'external_security_reviews',
      'incident_response',
      'policy_exception',
      'employee_reporting',
    ],
    { required_error: 'Please select a source' }
  ),
  initialSeverity: z.enum(['very_low', 'low', 'medium', 'high', 'very_high'], {
    required_error: 'Please select an initial severity',
  }),
  tags: z.array(z.string()).optional(),
});

export const riskAssessmentSchema = z.object({
  threatDescription: requiredString('Threat description'),
  vulnerabilities: optionalString,
  likelihoodScore: z.enum(['rare', 'unlikely', 'possible', 'likely', 'almost_certain'], {
    required_error: 'Please select a likelihood',
  }),
  likelihoodRationale: requiredString('Likelihood rationale'),
  impactScore: z.enum(['negligible', 'minor', 'moderate', 'major', 'severe'], {
    required_error: 'Please select an impact level',
  }),
  impactRationale: requiredString('Impact rationale'),
  recommendedOwnerId: optionalString,
  assessmentNotes: optionalString,
  treatmentRecommendation: z.enum(['mitigate', 'accept', 'transfer', 'avoid']).optional(),
  affectedAssets: z.array(z.string()).optional(),
  existingControls: z.array(z.string()).optional(),
});

export const riskTreatmentSchema = z.object({
  decision: z.enum(['mitigate', 'accept', 'transfer', 'avoid'], {
    required_error: 'Please select a treatment decision',
  }),
  justification: requiredString('Justification'),
  mitigationDescription: optionalString,
  mitigationTargetDate: dateSchema.optional(),
  transferTo: optionalString,
  transferCost: z.number().optional(),
  avoidStrategy: optionalString,
  acceptanceRationale: optionalString,
  acceptanceExpiresAt: dateSchema.optional(),
});

// ===========================================
// Control Schemas
// ===========================================

export const controlSchema = z.object({
  controlId: requiredString('Control ID').regex(
    /^[A-Z]{2,}-\d{3}$/,
    'Control ID must be in format XX-000 (e.g., AC-001)'
  ),
  title: requiredString('Title').max(200, 'Title must be less than 200 characters'),
  description: requiredString('Description'),
  category: z.enum(
    [
      'access_control',
      'data_protection',
      'network_security',
      'incident_management',
      'business_continuity',
      'risk_management',
      'change_management',
      'asset_management',
      'compliance',
      'physical_security',
      'hr_security',
      'supplier_management',
      'cryptography',
      'operations',
      'communications',
      'system_acquisition',
      'other',
    ],
    { required_error: 'Please select a category' }
  ),
  subcategory: optionalString,
  tags: z.array(z.string()).optional(),
  guidance: optionalString,
  automationSupported: z.boolean().optional(),
});

export const controlImplementationSchema = z.object({
  status: z.enum(['not_started', 'in_progress', 'implemented', 'not_applicable'], {
    required_error: 'Please select a status',
  }),
  ownerId: optionalString,
  implementationNotes: optionalString,
  testingFrequency: z.enum(['weekly', 'monthly', 'quarterly', 'semi_annual', 'annual']).optional(),
  dueDate: dateSchema.optional(),
});

// ===========================================
// Evidence Schemas
// ===========================================

export const evidenceSchema = z.object({
  title: requiredString('Title').max(200, 'Title must be less than 200 characters'),
  description: optionalString,
  type: z.enum(
    [
      'screenshot',
      'document',
      'export',
      'report',
      'configuration',
      'log',
      'policy',
      'procedure',
      'certificate',
      'audit_report',
      'other',
    ],
    { required_error: 'Please select a type' }
  ),
  validFrom: requiredString('Valid from date'),
  validUntil: dateSchema.optional(),
  tags: z.array(z.string()).optional(),
  category: optionalString,
});

// ===========================================
// Policy Schemas
// ===========================================

export const policySchema = z.object({
  title: requiredString('Title').max(200, 'Title must be less than 200 characters'),
  description: optionalString,
  category: z.enum(
    [
      'information_security',
      'data_privacy',
      'acceptable_use',
      'access_control',
      'business_continuity',
      'incident_response',
      'vendor_management',
      'change_management',
      'asset_management',
      'hr_security',
      'physical_security',
      'compliance',
      'other',
    ],
    { required_error: 'Please select a category' }
  ),
  ownerId: requiredString('Owner'),
  reviewFrequency: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual', 'biennial']).optional(),
  effectiveDate: dateSchema.optional(),
  scope: optionalString,
  audience: optionalString,
  tags: z.array(z.string()).optional(),
});

// ===========================================
// Vendor Schemas
// ===========================================

export const vendorSchema = z.object({
  name: requiredString('Vendor name').max(200, 'Name must be less than 200 characters'),
  legalName: optionalString,
  description: optionalString,
  website: urlSchema,
  primaryContact: optionalString,
  primaryContactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  primaryContactPhone: optionalString,
  category: z
    .enum([
      'software_vendor',
      'cloud_provider',
      'professional_services',
      'hardware_vendor',
      'consultant',
    ])
    .optional(),
  tier: z.enum(['tier_1', 'tier_2', 'tier_3', 'tier_4']).optional(),
  dataClassification: z.enum(['public', 'internal', 'confidential', 'restricted']).optional(),
  hasDataAccess: z.boolean().optional(),
  accessLevel: z.enum(['read_only', 'read_write', 'admin']).optional(),
  businessOwner: optionalString,
  serviceDescription: optionalString,
  criticality: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  annualSpend: z.number().optional(),
  certifications: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  notes: optionalString,
});

// ===========================================
// Questionnaire Schemas
// ===========================================

export const questionnaireSchema = z.object({
  title: requiredString('Title').max(200, 'Title must be less than 200 characters'),
  requesterName: requiredString('Requester name'),
  requesterCompany: requiredString('Company name'),
  requesterEmail: emailSchema,
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  dueDate: dateSchema.optional(),
  notes: optionalString,
  tags: z.array(z.string()).optional(),
});

export const questionAnswerSchema = z.object({
  answer: requiredString('Answer'),
  notes: optionalString,
});

// ===========================================
// Knowledge Base Schemas
// ===========================================

export const knowledgeBaseEntrySchema = z.object({
  question: requiredString('Question').max(500, 'Question must be less than 500 characters'),
  answer: requiredString('Answer'),
  category: z.enum(['security', 'privacy', 'compliance', 'technical', 'operational'], {
    required_error: 'Please select a category',
  }),
  tags: z.array(z.string()).optional(),
  framework: optionalString,
});

// ===========================================
// Asset Schemas
// ===========================================

export const assetSchema = z.object({
  name: requiredString('Asset name').max(200, 'Name must be less than 200 characters'),
  type: z.enum(['server', 'workstation', 'mobile', 'network', 'application', 'data'], {
    required_error: 'Please select a type',
  }),
  category: optionalString,
  status: z.enum(['active', 'inactive', 'decommissioned']).optional(),
  criticality: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  owner: optionalString,
  location: optionalString,
  department: optionalString,
});

// ===========================================
// Framework Schemas
// ===========================================

export const frameworkSchema = z.object({
  name: requiredString('Framework name').max(200, 'Name must be less than 200 characters'),
  type: z.enum(
    [
      'soc2',
      'iso27001',
      'iso27701',
      'hipaa',
      'gdpr',
      'pci_dss',
      'nist_csf',
      'nist_800_53',
      'cis',
      'fedramp',
      'cmmc',
      'ccpa',
      'custom',
    ],
    { required_error: 'Please select a framework type' }
  ),
  version: optionalString,
  description: optionalString,
  isActive: z.boolean().optional(),
});

// ===========================================
// Assessment Schemas
// ===========================================

export const assessmentSchema = z.object({
  name: requiredString('Assessment name'),
  assessorName: optionalString,
  assessorEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  notes: optionalString,
});

// ===========================================
// Contract Schemas
// ===========================================

export const contractSchema = z.object({
  vendorId: requiredString('Vendor ID'),
  title: requiredString('Title').max(200, 'Title must be less than 200 characters'),
  startDate: requiredString('Start date'),
  endDate: dateSchema.optional(),
  value: z.number().optional(),
  currency: z.string().optional(),
  status: z.enum(['draft', 'active', 'expired', 'terminated']).optional(),
  renewalType: z.enum(['auto', 'manual', 'none']).optional(),
  notes: optionalString,
  attachments: z.array(z.string()).optional(),
});

// ===========================================
// Risk Schema (Simple)
// ===========================================

export const riskSchema = z.object({
  title: requiredString('Title').max(200, 'Title must be less than 200 characters'),
  description: requiredString('Description'),
  likelihood: z.enum(['rare', 'unlikely', 'possible', 'likely', 'almost_certain']).optional(),
  impact: z.enum(['negligible', 'minor', 'moderate', 'major', 'severe']).optional(),
  status: z.enum(['identified', 'assessed', 'mitigated', 'accepted', 'closed']).optional(),
  ownerId: optionalString,
  category: optionalString,
  tags: z.array(z.string()).optional(),
});

// ===========================================
// User/Settings Schemas
// ===========================================

export const userProfileSchema = z.object({
  firstName: requiredString('First name'),
  lastName: requiredString('Last name'),
  email: emailSchema,
  displayName: optionalString,
});

export const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  controlAlerts: z.boolean(),
  evidenceReminders: z.boolean(),
  policyReviews: z.boolean(),
  riskUpdates: z.boolean(),
  vendorAlerts: z.boolean(),
  weeklyDigest: z.boolean(),
});

// ===========================================
// Portal User Schemas
// ===========================================

export const portalUserSchema = z.object({
  name: requiredString('Name').max(200, 'Name must be less than 200 characters'),
  email: emailSchema,
  role: z.enum(['lead_auditor', 'auditor', 'reviewer'], {
    required_error: 'Please select a role',
  }),
  canViewAll: z.boolean().optional(),
  canUpload: z.boolean().optional(),
  canComment: z.boolean().optional(),
  allowedIpRanges: cidrArraySchema.optional(),
  enforceIpRestriction: z.boolean().optional(),
  downloadLimit: z.number().positive('Download limit must be positive').optional(),
  enableWatermark: z.boolean().optional(),
  watermarkText: optionalString,
  expiresAt: dateSchema.optional(),
});

export const updatePortalUserSchema = portalUserSchema.partial();

// ===========================================
// Type Exports
// ===========================================

export type RiskIntakeInput = z.infer<typeof riskIntakeSchema>;
export type RiskAssessmentInput = z.infer<typeof riskAssessmentSchema>;
export type RiskTreatmentInput = z.infer<typeof riskTreatmentSchema>;
export type ControlInput = z.infer<typeof controlSchema>;
export type ControlImplementationInput = z.infer<typeof controlImplementationSchema>;
export type EvidenceInput = z.infer<typeof evidenceSchema>;
export type PolicyInput = z.infer<typeof policySchema>;
export type VendorInput = z.infer<typeof vendorSchema>;
export type QuestionnaireInput = z.infer<typeof questionnaireSchema>;
export type QuestionAnswerInput = z.infer<typeof questionAnswerSchema>;
export type KnowledgeBaseEntryInput = z.infer<typeof knowledgeBaseEntrySchema>;
export type AssetInput = z.infer<typeof assetSchema>;
export type FrameworkInput = z.infer<typeof frameworkSchema>;
export type AssessmentInput = z.infer<typeof assessmentSchema>;
export type ContractInput = z.infer<typeof contractSchema>;
export type RiskInput = z.infer<typeof riskSchema>;
export type UserProfileInput = z.infer<typeof userProfileSchema>;
export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>;
export type PortalUserInput = z.infer<typeof portalUserSchema>;
export type UpdatePortalUserInput = z.infer<typeof updatePortalUserSchema>;
