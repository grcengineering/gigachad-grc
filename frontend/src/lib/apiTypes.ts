/**
 * API Types - Comprehensive TypeScript interfaces for all API operations
 * 
 * This file provides type safety for the entire API layer, eliminating `any` types.
 */

// ===========================================
// Common Types
// ===========================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export type SortOrder = 'asc' | 'desc';

// ===========================================
// User Types
// ===========================================

export type UserRole = 'admin' | 'editor' | 'viewer' | 'auditor';
export type UserStatus = 'active' | 'inactive' | 'pending';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  organizationId: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: string;
  preferences: Record<string, unknown>;
  permissions?: UserPermissionsResponse;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  status?: UserStatus;
  preferences?: Record<string, unknown>;
}

export interface UserListParams extends PaginationParams {
  search?: string;
  status?: UserStatus;
  role?: UserRole;
  groupId?: string;
}

// ===========================================
// Control Types
// ===========================================

// Must match backend ControlCategory enum exactly
export type ControlCategory = 
  | 'access_control'
  | 'data_protection'
  | 'network_security'
  | 'incident_response'
  | 'business_continuity'
  | 'change_management'
  | 'risk_management'
  | 'vendor_management'
  | 'physical_security'
  | 'human_resources'
  | 'compliance'
  | 'other';

export interface Control {
  id: string;
  controlId: string;
  title: string;
  description: string;
  category: ControlCategory;
  type?: string;
  tags?: string[];
  ownerId?: string;
  owner?: User;
  guidance?: string;
  isCustom?: boolean;
  implementation?: ControlImplementation; // Single implementation (convenience accessor)
  implementations?: ControlImplementation[];
  evidenceLinks?: { id: string; evidenceId: string; evidence?: { id: string; title: string; type: string } }[];
  policyLinks?: { id: string; policyId: string; policy?: { id: string; title: string } }[];
  mappings?: { id: string; frameworkId: string; requirementId: string; framework?: { name: string }; requirement?: { code: string; title: string } }[];
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateControlData {
  controlId: string;
  title: string;
  description: string;
  category: ControlCategory;
  type?: string;
  tags?: string[];
  ownerId?: string;
}

export interface UpdateControlData {
  controlId?: string;
  title?: string;
  description?: string;
  category?: ControlCategory;
  type?: string;
  tags?: string[];
  ownerId?: string;
  guidance?: string;
  implementation?: {
    status?: string;
    ownerId?: string;
    testingFrequency?: string;
    effectivenessScore?: string | number;
    implementationNotes?: string;
  };
}

export interface ControlListParams extends PaginationParams {
  search?: string;
  category?: ControlCategory | string | string[];
  status?: ImplementationStatus | string | string[];
  tag?: string;
  ownerId?: string;
  frameworkId?: string;
}

export interface BulkControlUploadData {
  controls: CreateControlData[];
  skipExisting?: boolean;
  updateExisting?: boolean;
}

// ===========================================
// Control Implementation Types
// ===========================================

export type ImplementationStatus = 
  | 'not_implemented'
  | 'planned'
  | 'in_progress'
  | 'implemented'
  | 'not_applicable';

export interface ControlImplementation {
  id: string;
  controlId: string;
  status: ImplementationStatus;
  notes?: string;
  implementationNotes?: string;
  ownerId?: string;
  owner?: User;
  evidence?: Evidence[];
  testingFrequency?: string;
  effectivenessScore?: string | number;
  lastTestDate?: string;
  nextTestDate?: string;
  nextReviewDate?: string;
  tests?: {
    id: string;
    testDate: string;
    result: string;
    notes?: string;
    conductedBy?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateImplementationData {
  status?: ImplementationStatus;
  notes?: string;
  ownerId?: string;
  lastTestDate?: string;
  nextTestDate?: string;
}

export interface ControlTest {
  id: string;
  implementationId: string;
  testType: string;
  result: 'pass' | 'fail' | 'partial';
  findings?: string;
  testedBy: string;
  testedAt: string;
}

export interface CreateControlTestData {
  testType: string;
  result: 'pass' | 'fail' | 'partial';
  findings?: string;
}

// ===========================================
// Evidence Types
// ===========================================

export type EvidenceStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type EvidenceType = 'document' | 'screenshot' | 'log' | 'config' | 'report' | 'other';

export interface Evidence {
  id: string;
  title: string;
  description?: string;
  type: EvidenceType;
  status: EvidenceStatus | string;
  filename: string;
  mimeType: string;
  size: number;
  storagePath: string;
  version?: string;
  tags?: string[];
  folder?: { id: string; name: string };
  folderId?: string;
  controlIds?: string[];
  controlLinks?: { id: string; controlId: string; control?: { id: string; controlId: string; title: string } }[];
  source?: string;
  collectedAt?: string;
  validFrom?: string;
  validUntil?: string;
  reviewNotes?: string;
  uploadedBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  expiresAt?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadEvidenceData {
  title: string;
  description?: string;
  type?: EvidenceType;
  controlIds?: string[];
  folderId?: string;
  expiresAt?: string;
}

export interface UpdateEvidenceData {
  title?: string;
  description?: string;
  type?: EvidenceType;
  status?: EvidenceStatus;
  expiresAt?: string;
}

export interface EvidenceListParams extends PaginationParams {
  search?: string;
  type?: EvidenceType | string | string[];
  status?: EvidenceStatus | string | string[];
  controlId?: string;
  folderId?: string;
  workspaceId?: string;
}

export interface EvidenceFolder {
  id: string;
  name: string;
  parentId?: string;
  organizationId: string;
  createdAt: string;
}

export interface CreateEvidenceFolderData {
  name: string;
  parentId?: string;
}

export interface ReviewEvidenceData {
  status: 'approved' | 'rejected' | string;
  notes?: string;
}

// ===========================================
// Framework Types
// ===========================================

export type FrameworkType = 'regulatory' | 'industry' | 'internal' | 'custom';

export interface Framework {
  id: string;
  name: string;
  type: FrameworkType;
  version?: string;
  description?: string;
  isActive: boolean;
  organizationId: string;
  requirements?: FrameworkRequirement[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateFrameworkData {
  name: string;
  type: FrameworkType;
  version?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateFrameworkData {
  name?: string;
  type?: FrameworkType;
  version?: string;
  description?: string;
  isActive?: boolean;
}

export interface FrameworkRequirement {
  id: string;
  frameworkId: string;
  reference: string;
  title: string;
  description: string;
  guidance?: string;
  parentId?: string;
  isCategory: boolean;
  order: number;
  owner?: string;
  ownerNotes?: string;
  dueDate?: string;
  priority?: string;
  children?: FrameworkRequirement[];
  mappings?: ControlMapping[];
}

export interface CreateRequirementData {
  reference: string;
  title: string;
  description: string;
  guidance?: string;
  parentId?: string;
  isCategory?: boolean;
  order?: number;
}

export interface UpdateRequirementData {
  reference?: string;
  title?: string;
  description?: string;
  guidance?: string;
  parentId?: string;
  isCategory?: boolean;
  order?: number;
}

// ===========================================
// Assessment Types
// ===========================================

export type AssessmentStatus = 'draft' | 'in_progress' | 'completed' | 'archived';
export type RequirementAssessmentStatus = 'not_assessed' | 'compliant' | 'partially_compliant' | 'non_compliant' | 'not_applicable';

export interface Assessment {
  id: string;
  frameworkId: string;
  framework?: Framework;
  name: string;
  description?: string;
  status: AssessmentStatus;
  startDate?: string;
  completedDate?: string;
  assessorId?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssessmentData {
  frameworkId: string;
  name: string;
  description?: string;
}

export interface UpdateAssessmentData {
  name?: string;
  description?: string;
  status?: AssessmentStatus;
  assessorId?: string;
}

export interface AssessmentRequirementUpdate {
  status: RequirementAssessmentStatus;
  notes?: string;
  evidenceIds?: string[];
}

export interface AssessmentGap {
  id: string;
  assessmentId: string;
  requirementId: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  remediationPlan?: string;
  status: 'open' | 'in_progress' | 'resolved';
}

export interface CreateGapData {
  requirementId: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  remediationPlan?: string;
}

export interface RemediationTask {
  id: string;
  gapId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface CreateRemediationData {
  gapId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
}

export interface UpdateRemediationData {
  title?: string;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
  status?: 'pending' | 'in_progress' | 'completed';
}

// ===========================================
// Mapping Types
// ===========================================

export interface ControlMapping {
  id: string;
  controlId: string;
  control?: Control;
  requirementId: string;
  requirement?: FrameworkRequirement;
  notes?: string;
  createdAt: string;
}

export interface CreateMappingData {
  controlId: string;
  requirementId: string;
  notes?: string;
}

export interface BulkMappingData {
  mappings: CreateMappingData[];
}

export interface MappingListParams {
  controlId?: string;
  requirementId?: string;
  frameworkId?: string;
}

// ===========================================
// Policy Types
// ===========================================

export type PolicyStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'archived';
export type PolicyType = 'policy' | 'procedure' | 'standard' | 'guideline';

export interface Policy {
  id: string;
  title: string;
  description?: string;
  type: PolicyType;
  status: PolicyStatus;
  version: string;
  filename: string;
  mimeType: string;
  size: number;
  storagePath: string;
  category?: string;
  ownerId?: string;
  owner?: User;
  approvedBy?: string;
  approvedAt?: string;
  publishedAt?: string;
  effectiveDate?: string;
  reviewDate?: string;
  nextReviewDue?: string;
  tags?: string[];
  controlIds?: string[];
  controlLinks?: { id: string; controlId: string; control?: { id: string; controlId: string; title: string } }[];
  versions?: { id: string; version: string; filename: string; createdAt: string; createdBy?: string }[];
  statusHistory?: { id: string; status: string; changedBy: string; changedAt: string; notes?: string }[];
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadPolicyData {
  title: string;
  description?: string;
  type?: PolicyType;
  version?: string;
  ownerId?: string;
  effectiveDate?: string;
  reviewDate?: string;
  tags?: string[];
}

export interface UpdatePolicyData {
  title?: string;
  description?: string;
  type?: PolicyType;
  ownerId?: string;
  effectiveDate?: string;
  reviewDate?: string;
  tags?: string[];
}

export interface PolicyListParams extends PaginationParams {
  search?: string;
  type?: PolicyType;
  status?: PolicyStatus;
  ownerId?: string;
  tag?: string;
}

export interface PolicyVersion {
  id: string;
  policyId: string;
  versionNumber: string;
  changeNotes?: string;
  filename: string;
  storagePath: string;
  createdBy: string;
  createdAt: string;
}

// ===========================================
// Risk Types
// ===========================================

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'minimal';
export type RiskLikelihood = 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
export type RiskImpact = 'critical' | 'high' | 'medium' | 'low' | 'minimal';
export type RiskStatus = 
  | 'identified' 
  | 'assessed' 
  | 'mitigating' 
  | 'accepted' 
  | 'closed'
  | 'risk_intake'
  | 'risk_analysis_in_progress'
  | 'risk_analysis_review'
  | 'treatment_decision_review'
  | 'executive_approval'
  | 'grc_approval'
  | 'mitigation_in_progress'
  | 'mitigation_complete'
  | 'monitoring';
export type TreatmentDecision = 'accept' | 'mitigate' | 'transfer' | 'avoid';

export interface Risk {
  id: string;
  riskId?: string;
  title: string;
  description: string;
  category: string;
  source?: string;
  status: RiskStatus;
  // Inherent risk (before controls)
  inherentRisk?: RiskLevel | string;
  initialSeverity?: RiskLevel;
  likelihood?: RiskLikelihood;
  impact?: RiskImpact;
  riskLevel?: RiskLevel;
  // Residual risk (after controls)
  residualRisk?: RiskLevel | string;
  residualLikelihood?: RiskLikelihood;
  residualImpact?: RiskImpact;
  residualRiskLevel?: RiskLevel;
  // Treatment
  treatmentPlan?: TreatmentDecision;
  treatmentNotes?: string;
  treatmentDueDate?: string;
  // Owner
  ownerId?: string;
  owner?: User;
  ownerName?: string;
  // Review
  reviewFrequency?: string;
  lastReviewDate?: string;
  nextReviewDue?: string;
  // Counts
  assetCount?: number;
  controlCount?: number;
  scenarioCount?: number;
  // Misc
  tags?: string[];
  organizationId: string;
  createdAt: string;
  updatedAt?: string;
}

// Extended Risk interface for detail pages
export interface RiskDetail extends Risk {
  // Quantitative fields
  likelihoodPct?: number;
  impactValue?: number;
  annualLossExp?: number;
  // Additional owner fields
  reporterId?: string;
  grcSmeId?: string;
  riskAssessorId?: string;
  riskOwnerId?: string;
  // Review fields
  reviewFrequency?: string;
  lastReviewedAt?: string;
  // Related entities
  assets?: { id: string; name: string; type: string; criticality: string; source: string }[];
  controls?: { id: string; controlId: string; title: string; status: string; effectiveness: string }[];
  scenarios?: {
    id: string;
    title: string;
    description: string;
    threatActor?: string;
    attackVector?: string;
    likelihood: string;
    impact: string;
    createdAt: string;
  }[];
  history?: {
    id: string;
    action: string;
    changes?: Record<string, unknown>;
    notes?: string;
    changedBy: string;
    changedAt: string;
  }[];
  // Workflow assessment
  assessment?: {
    id: string;
    status: string;
    riskAssessorId?: string;
    threatDescription?: string;
    affectedAssets?: string[];
    existingControls?: string[];
    vulnerabilities?: string;
    likelihoodScore?: string;
    likelihoodRationale?: string;
    impactScore?: string;
    impactRationale?: string;
    recommendedOwnerId?: string;
    assessmentNotes?: string;
    treatmentRecommendation?: string;
    calculatedRiskScore?: string;
    grcReviewedBy?: string;
    grcReviewNotes?: string;
    grcDeclinedReason?: string;
  };
  // Treatment workflow
  treatment?: {
    id: string;
    decision: string;
    treatmentPlan?: string;
    justification?: string;
    mitigationDescription?: string;
    mitigationDueDate?: string;
    executiveApproverId?: string;
    executiveApprovedAt?: string;
    executiveNotes?: string;
    grcApprovedAt?: string;
    grcApprovedBy?: string;
    mitigationStatus?: string;
    mitigationProgress?: number;
    mitigationNotes?: string;
    mitigationCompletedAt?: string;
    residualLikelihood?: string;
    residualImpact?: string;
  };
}

export interface CreateRiskData {
  title: string;
  description: string;
  source?: string;
  initialSeverity?: RiskLevel;
  smeId?: string;
  documentation?: { title: string; url: string }[];
  tags?: string[];
}

export interface UpdateRiskData {
  title?: string;
  description?: string;
  category?: string;
  status?: RiskStatus;
  likelihood?: RiskLikelihood;
  impact?: RiskImpact;
  ownerId?: string;
  tags?: string[];
}

export interface RiskListParams extends PaginationParams {
  search?: string;
  category?: string;
  status?: RiskStatus;
  riskLevel?: RiskLevel;
  ownerId?: string;
  tag?: string;
}

export interface RiskTreatmentData {
  treatmentPlan: TreatmentDecision;
  treatmentNotes?: string;
  treatmentDueDate?: string;
  residualLikelihood?: RiskLikelihood;
  residualImpact?: RiskImpact;
}

export interface RiskAssessmentData {
  threatDescription: string;
  affectedAssets?: string[];
  existingControls?: string[];
  vulnerabilities?: string;
  likelihoodScore: RiskLikelihood;
  likelihoodRationale: string;
  impactScore: RiskImpact;
  impactRationale: string;
  impactCategories?: {
    financial?: string;
    operational?: string;
    reputational?: string;
    legal?: string;
  };
  recommendedOwnerId: string;
  assessmentNotes?: string;
  treatmentRecommendation?: string;
}

// ===========================================
// Risk Scenario Types
// ===========================================

export interface RiskScenario {
  id: string;
  title: string;
  description: string;
  category: string;
  threatActor: string;
  attackVector: string;
  targetAssets: string[];
  likelihood: RiskLikelihood;
  impact: RiskImpact;
  riskLevel?: RiskLevel;
  riskScore?: number;
  tags?: string[];
  isTemplate: boolean;
  usageCount?: number;
  simulation?: ScenarioSimulation;
  relatedControlIds?: string[];
  relatedRiskIds?: string[];
  mitigationStrategy?: string;
  businessContext?: string;
  complianceImpact?: string;
  organizationId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ScenarioSimulation {
  controlEffectiveness?: number;
  mitigations?: string[];
  financialImpact?: number;
  recoveryTimeHours?: number;
}

export interface CreateRiskScenarioData {
  title: string;
  description: string;
  category: string;
  threatActor: string;
  attackVector: string;
  targetAssets: string[];
  likelihood: RiskLikelihood;
  impact: RiskImpact;
  tags?: string[];
  isTemplate?: boolean;
  simulation?: ScenarioSimulation;
  relatedControlIds?: string[];
  relatedRiskIds?: string[];
  mitigationStrategy?: string;
  businessContext?: string;
  complianceImpact?: string;
}

export interface UpdateRiskScenarioData {
  title?: string;
  description?: string;
  category?: string;
  threatActor?: string;
  attackVector?: string;
  targetAssets?: string[];
  likelihood?: RiskLikelihood;
  impact?: RiskImpact;
  tags?: string[];
  simulation?: ScenarioSimulation;
  mitigationStrategy?: string;
  businessContext?: string;
  complianceImpact?: string;
}

export interface RiskScenarioListParams extends PaginationParams {
  search?: string;
  category?: string;
  threatActor?: string;
  attackVector?: string;
  isTemplate?: boolean;
}

// ===========================================
// Asset Types
// ===========================================

export type AssetType = 'hardware' | 'software' | 'data' | 'network' | 'facility' | 'personnel' | 'service';
export type AssetCriticality = 'critical' | 'high' | 'medium' | 'low';
export type AssetStatus = 'active' | 'inactive' | 'retired' | 'maintenance';

export interface Asset {
  id: string;
  externalId?: string;
  name: string;
  type: AssetType | string;
  category?: string;
  description?: string;
  criticality?: AssetCriticality | string;
  status?: AssetStatus | string;
  owner?: string;
  location?: string;
  department?: string;
  source?: string;
  metadata?: Record<string, unknown>;
  lastSyncAt?: string;
  riskCount?: number;
  risks?: { id: string; riskId: string; title: string; inherentRisk: string; status: string }[];
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetData {
  name: string;
  type: AssetType | string;
  category?: string;
  criticality?: AssetCriticality | string;
  owner?: string;
  location?: string;
  department?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateAssetData {
  name?: string;
  type?: AssetType | string;
  category?: string;
  criticality?: AssetCriticality | string;
  status?: AssetStatus | string;
  owner?: string;
  location?: string;
  department?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AssetListParams extends PaginationParams {
  search?: string;
  source?: string;
  type?: AssetType;
  status?: AssetStatus;
  criticality?: AssetCriticality;
  department?: string;
}

// ===========================================
// Vendor Types
// ===========================================

export type VendorTier = 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4';
export type VendorCategory = 'software_vendor' | 'cloud_provider' | 'service_provider' | 'contractor' | 'supplier' | 'partner';
export type VendorStatus = 'active' | 'pending_review' | 'approved' | 'rejected' | 'inactive';

export interface Vendor {
  id: string;
  organizationId: string;
  vendorId?: string;
  name: string;
  legalName?: string;
  description?: string;
  category: VendorCategory | string;
  tier: VendorTier | string;
  status: VendorStatus | string;
  website?: string;
  primaryContact?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  inherentRiskScore?: string;
  residualRiskScore?: string;
  riskScore?: number;
  dataClassification?: string;
  hasDataAccess?: boolean;
  accessLevel?: string;
  businessOwner?: string;
  serviceDescription?: string;
  criticality?: string;
  annualSpend?: number;
  certifications?: string[];
  complianceStatus?: string;
  lastReviewedAt?: string;
  nextReviewDue?: string;
  reviewFrequency?: string;
  country?: string;
  region?: string;
  dataLocation?: string;
  tags?: string[];
  notes?: string;
  lastAssessmentDate?: string;
  nextAssessmentDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVendorData {
  name: string;
  description?: string;
  category?: VendorCategory | string;
  tier?: VendorTier | string;
  website?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  [key: string]: unknown;
}

export interface UpdateVendorData {
  name?: string;
  description?: string;
  category?: VendorCategory | string;
  tier?: VendorTier | string;
  status?: VendorStatus | string;
  website?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  [key: string]: unknown;
}

export interface VendorListParams extends PaginationParams {
  search?: string;
  tier?: VendorTier;
  category?: VendorCategory;
  status?: VendorStatus;
}

// ===========================================
// Vendor Assessment Types
// ===========================================

export type VendorAssessmentStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type VendorAssessmentType = 'initial_onboarding' | 'annual_review' | 'continuous_monitoring' | 'incident_triggered' | 'contract_renewal' | 'security_review' | 'privacy_assessment' | 'compliance_audit' | 'vendor_questionnaire' | 'on_site_audit' | 'penetration_test';
export type VendorRiskLevel = 'very_low' | 'low' | 'medium' | 'high' | 'critical';
export type AssessmentOutcome = 'approved' | 'approved_with_conditions' | 'rejected' | 'requires_remediation';

export interface VendorAssessment {
  id: string;
  vendorId: string;
  organizationId?: string;
  vendor?: {
    id: string;
    name: string;
    tier?: string;
  };
  assessmentType: VendorAssessmentType | string;
  status: VendorAssessmentStatus | string;
  dueDate?: string;
  completedAt?: string;
  questionnaireTemplate?: string;
  responses?: Record<string, unknown>;
  // Risk scores
  inherentRiskScore?: VendorRiskLevel | string;
  residualRiskScore?: VendorRiskLevel | string;
  overallScore?: number;
  // Risk categories
  securityRisk?: VendorRiskLevel | string;
  complianceRisk?: VendorRiskLevel | string;
  operationalRisk?: VendorRiskLevel | string;
  financialRisk?: VendorRiskLevel | string;
  reputationalRisk?: VendorRiskLevel | string;
  // Outcome
  outcome?: AssessmentOutcome | string;
  outcomeNotes?: string;
  conditions?: string[];
  // People
  assessorId?: string;
  reviewerId?: string;
  createdBy?: string;
  // Notes
  findings?: string | Record<string, unknown>;
  recommendations?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateVendorAssessmentData {
  organizationId: string;
  vendorId: string;
  assessmentType: VendorAssessmentType | string;
  status?: VendorAssessmentStatus | string;
  dueDate?: string;
  inherentRiskScore?: VendorRiskLevel | string;
  assessorId?: string;
}

export interface UpdateVendorAssessmentData {
  status?: VendorAssessmentStatus | string;
  dueDate?: string;
  completedAt?: string;
  inherentRiskScore?: VendorRiskLevel | string;
  residualRiskScore?: VendorRiskLevel | string;
  overallScore?: number;
  securityRisk?: VendorRiskLevel | string;
  complianceRisk?: VendorRiskLevel | string;
  operationalRisk?: VendorRiskLevel | string;
  financialRisk?: VendorRiskLevel | string;
  reputationalRisk?: VendorRiskLevel | string;
  outcome?: AssessmentOutcome | string;
  outcomeNotes?: string;
  findings?: string | Record<string, unknown>;
  recommendations?: string;
  assessorId?: string;
  reviewerId?: string;
  [key: string]: unknown;
}

// ===========================================
// Contract Types
// ===========================================

export type ContractStatus = 'draft' | 'active' | 'expired' | 'terminated' | 'pending_renewal';
export type ContractType = 'subscription' | 'license' | 'service' | 'consulting' | 'maintenance' | 'other';

export interface Contract {
  id: string;
  vendorId: string;
  vendor?: Vendor;
  title: string;
  description?: string;
  type: ContractType;
  status: ContractStatus;
  value?: number;
  currency?: string;
  startDate: string;
  endDate?: string;
  renewalDate?: string;
  autoRenewal: boolean;
  filename?: string;
  storagePath?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContractData {
  vendorId: string;
  title: string;
  description?: string;
  type: ContractType;
  value?: number;
  currency?: string;
  startDate: string;
  endDate?: string;
  renewalDate?: string;
  autoRenewal?: boolean;
}

export interface UpdateContractData {
  title?: string;
  description?: string;
  type?: ContractType;
  status?: ContractStatus;
  value?: number;
  currency?: string;
  startDate?: string;
  endDate?: string;
  renewalDate?: string;
  autoRenewal?: boolean;
}

// ===========================================
// Audit Types
// ===========================================

export type AuditType = 'internal' | 'external' | 'certification' | 'compliance';
export type AuditStatus = 'planning' | 'in_progress' | 'completed' | 'cancelled';

export interface Audit {
  id: string;
  auditId: string;
  name: string;
  description?: string;
  type: AuditType;
  status: AuditStatus;
  auditor?: string;
  startDate?: string;
  endDate?: string;
  frameworkIds?: string[];
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAuditData {
  name: string;
  description?: string;
  type: AuditType;
  auditor?: string;
  startDate?: string;
  endDate?: string;
  frameworkIds?: string[];
}

export interface UpdateAuditData {
  name?: string;
  description?: string;
  type?: AuditType;
  status?: AuditStatus;
  auditor?: string;
  startDate?: string;
  endDate?: string;
  frameworkIds?: string[];
}

export interface AuditListParams {
  status?: AuditStatus | string;
  auditType?: AuditType | string;
}

// ===========================================
// Audit Finding Types
// ===========================================

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'informational';
export type FindingStatus = 'open' | 'in_progress' | 'resolved' | 'accepted_risk' | 'closed';

export interface AuditFinding {
  id: string;
  findingNumber: string;
  auditId: string;
  audit?: Audit;
  title: string;
  description: string;
  severity: FindingSeverity;
  status: FindingStatus;
  category?: string;
  managementResponse?: string;
  remediationPlan?: string;
  remediationOwner?: string;
  targetDate?: string;
  actualDate?: string;
  identifiedBy: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFindingData {
  auditId: string;
  title: string;
  description: string;
  severity: FindingSeverity | string;
  category?: string;
  remediationOwner?: string;
  targetDate?: string;
  status?: FindingStatus | string;
  [key: string]: unknown;
}

export interface UpdateFindingData {
  title?: string;
  description?: string;
  severity?: FindingSeverity;
  status?: FindingStatus;
  category?: string;
  managementResponse?: string;
  remediationPlan?: string;
  remediationOwner?: string;
  targetDate?: string;
  actualDate?: string;
}

export interface FindingListParams {
  auditId?: string;
  status?: FindingStatus | string;
  severity?: FindingSeverity | string;
  category?: string;
  remediationOwner?: string;
}

// ===========================================
// Integration Types
// ===========================================

export type IntegrationStatus = 'active' | 'inactive' | 'error' | 'pending';

export interface Integration {
  id: string;
  type: string;
  name: string;
  description?: string;
  status: IntegrationStatus;
  config?: Record<string, unknown>;
  syncFrequency?: string;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  evidenceCount?: number;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIntegrationData {
  type: string;
  name: string;
  description?: string;
  config?: Record<string, unknown>;
  syncFrequency?: string;
}

export interface UpdateIntegrationData {
  name?: string;
  description?: string;
  status?: IntegrationStatus;
  config?: Record<string, unknown>;
  syncFrequency?: string;
}

export interface IntegrationListParams extends PaginationParams {
  type?: string;
  status?: IntegrationStatus;
  search?: string;
}

export interface CustomIntegrationConfig {
  mode?: 'visual' | 'code' | 'raw';
  baseUrl?: string;
  authType?: 'none' | 'api_key' | 'oauth2' | 'basic' | null;
  authConfig?: Record<string, unknown> | null;
  endpoints?: CustomEndpoint[];
  transformCode?: string;
  responseMapping?: Record<string, unknown> | null;
  customCode?: string;
  lastTestAt?: string;
  lastTestStatus?: 'success' | 'error' | null;
  lastTestError?: string | null;
}

export interface CustomEndpoint {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: unknown;
  evidenceType?: string;
}

// ===========================================
// Notification Types
// ===========================================

export type NotificationType = 
  | 'compliance_drift'
  | 'evidence_expiring'
  | 'policy_review'
  | 'risk_escalation'
  | 'assessment_due'
  | 'task_assigned'
  | 'comment_mention'
  | 'system';

export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success';

export interface Notification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  userId: string;
  organizationId: string;
  createdAt: string;
}

export interface NotificationListParams {
  unreadOnly?: boolean;
  types?: NotificationType[];
  severities?: NotificationSeverity[];
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface NotificationPreference {
  notificationType: NotificationType;
  inApp: boolean;
  email: boolean;
}

// ===========================================
// Questionnaire Types
// ===========================================

export type QuestionnaireStatus = 'draft' | 'sent' | 'in_progress' | 'completed' | 'expired';
export type QuestionType = 'text' | 'textarea' | 'select' | 'multiselect' | 'boolean' | 'date' | 'file';

export interface Questionnaire {
  id: string;
  title: string;
  description?: string;
  status: QuestionnaireStatus;
  vendorId?: string;
  dueDate?: string;
  completedAt?: string;
  questions?: Question[];
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: string;
  questionnaireId: string;
  text: string;
  type: QuestionType;
  options?: string[];
  isRequired: boolean;
  order: number;
  section?: string;
  answer?: string;
  attachments?: string[];
}

export interface CreateQuestionnaireData {
  title: string;
  description?: string;
  vendorId?: string;
  dueDate?: string;
}

export interface UpdateQuestionnaireData {
  title?: string;
  description?: string;
  status?: QuestionnaireStatus;
  dueDate?: string;
}

export interface CreateQuestionData {
  questionnaireId: string;
  text: string;
  type: QuestionType;
  options?: string[];
  isRequired?: boolean;
  order?: number;
  section?: string;
}

export interface UpdateQuestionData {
  text?: string;
  type?: QuestionType;
  options?: string[];
  isRequired?: boolean;
  order?: number;
  section?: string;
  answer?: string;
}

// ===========================================
// Knowledge Base Types
// ===========================================

export type KnowledgeBaseStatus = 'draft' | 'approved' | 'archived' | 'pending' | string;

export interface KnowledgeBaseEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  question?: string;
  answer?: string;
  framework?: { id: string; name: string };
  tags?: string[];
  status: KnowledgeBaseStatus;
  isPublic?: boolean;
  usageCount: number;
  createdBy: string;
  approvedBy?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateKnowledgeBaseData {
  title: string;
  content: string;
  category: string;
  tags?: string[];
}

export interface UpdateKnowledgeBaseData {
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
  status?: KnowledgeBaseStatus;
}

export interface KnowledgeBaseListParams {
  organizationId?: string;
  category?: string;
  status?: KnowledgeBaseStatus;
  search?: string;
}

// ===========================================
// Trust Center Types
// ===========================================

export interface TrustCenterConfig {
  id: string;
  organizationId?: string;
  isEnabled: boolean;
  customDomain?: string;
  companyName: string;
  companyLogo?: string;
  logoUrl?: string;
  description?: string;
  primaryColor?: string;
  securityEmail?: string;
  supportUrl?: string;
  showCertifications: boolean;
  showPolicies: boolean;
  showSecurityFeatures: boolean;
  showPrivacy: boolean;
  showIncidentResponse: boolean;
  showSOC2?: boolean;
  showISO27001?: boolean;
  showGDPR?: boolean;
  showHIPAA?: boolean;
  showPCI?: boolean;
  contactEmail?: string;
  customCss?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateTrustCenterConfigData {
  isEnabled?: boolean;
  customDomain?: string;
  companyName?: string;
  companyLogo?: string;
  primaryColor?: string;
  showSOC2?: boolean;
  showISO27001?: boolean;
  showGDPR?: boolean;
  showHIPAA?: boolean;
  showPCI?: boolean;
  contactEmail?: string;
  customCss?: string;
}

export interface TrustCenterContent {
  id: string;
  organizationId: string;
  section: string;
  title: string;
  content: string;
  order: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTrustCenterContentData {
  section: string;
  title: string;
  content: string;
  order?: number;
  isPublished?: boolean;
}

export interface UpdateTrustCenterContentData {
  title?: string;
  content?: string;
  order?: number;
  isPublished?: boolean;
}

// ===========================================
// Comment Types
// ===========================================

export interface Comment {
  id: string;
  entityType: string;
  entityId: string;
  content: string;
  parentId?: string;
  authorId: string;
  author?: User;
  isResolved: boolean;
  replies?: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentData {
  entityType: string;
  entityId: string;
  content: string;
  parentId?: string;
}

export interface UpdateCommentData {
  content?: string;
  isResolved?: boolean;
}

// ===========================================
// Task Types
// ===========================================

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  assignee?: User;
  dueDate?: string;
  completedAt?: string;
  createdBy: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskData {
  entityType: string;
  entityId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  assigneeId?: string;
  dueDate?: string;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
}

export interface TaskListParams {
  entityType?: string;
  entityId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
}

// ===========================================
// Permission Types
// ===========================================

export interface Permission {
  resource: string;
  action: string;
  scope?: 'own' | 'all';
}

export interface PermissionGroup {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  organizationId: string;
  isSystem?: boolean;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePermissionGroupData {
  name: string;
  description?: string;
  permissions: Permission[];
}

export interface UpdatePermissionGroupData {
  name?: string;
  description?: string;
  permissions?: Permission[];
}

export interface UserPermissionOverride {
  resource: string;
  action: string;
  allowed: boolean;
  permission?: string;
  granted?: boolean;
}

export interface EffectivePermission {
  resource: string;
  actions: string[];
  source: 'group' | 'override';
  groupName?: string;
  scope?: {
    ownership?: string;
    tags?: string[];
    categories?: string[];
  };
}

export interface UserPermissionsResponse {
  groups: PermissionGroup[];
  effectivePermissions: EffectivePermission[];
  overrides: UserPermissionOverride[];
}

// ===========================================
// Dashboard Types
// ===========================================

export interface DashboardSummary {
  complianceScore: number;
  totalControls: number;
  implementedControls: number;
  totalRisks: number;
  criticalRisks: number;
  highRisks: number;
  totalPolicies: number;
  activePolicies: number;
  evidenceCount: number;
  expiringEvidence: number;
  upcomingAudits: number;
  openFindings: number;
}

export interface ComplianceTrend {
  date: string;
  score: number;
  controlsImplemented: number;
  controlsTotal: number;
}

export interface RecentActivity {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  description: string;
  userId: string;
  user?: User;
  createdAt: string;
}

// ===========================================
// Collector Types
// ===========================================

export type CollectorType = 'api' | 'screenshot' | 'file' | 'custom';
export type CollectorFrequency = 'manual' | 'hourly' | 'daily' | 'weekly' | 'monthly';
export type CollectorRunStatus = 'pending' | 'running' | 'success' | 'failed';

export interface EvidenceCollector {
  id: string;
  name: string;
  type: CollectorType;
  integrationId?: string;
  config: CollectorConfig;
  schedule?: CollectorFrequency;
  isActive: boolean;
  lastRunAt?: string;
  lastRunStatus?: CollectorRunStatus;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CollectorConfig {
  endpoint?: string;
  method?: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: unknown;
  responseMapping?: ResponseMapping;
  screenshotUrl?: string;
  filePath?: string;
  customCode?: string;
}

export interface ResponseMapping {
  titleField?: string;
  descriptionField?: string;
  typeField?: string;
  dataField?: string;
}

export interface CreateCollectorData {
  name: string;
  type: CollectorType;
  integrationId?: string;
  config: CollectorConfig;
  schedule?: CollectorFrequency;
  isActive?: boolean;
}

export interface UpdateCollectorData {
  name?: string;
  config?: CollectorConfig;
  schedule?: CollectorFrequency;
  isActive?: boolean;
}

export interface CollectorRun {
  id: string;
  collectorId: string;
  status: CollectorRunStatus;
  evidenceId?: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

// ===========================================
// Audit Log Types
// ===========================================

export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  userId: string;
  user?: User;
  ipAddress?: string;
  userAgent?: string;
  organizationId: string;
  createdAt: string;
}

export interface AuditLogListParams extends PaginationParams {
  entityType?: string;
  entityId?: string;
  action?: string;
  userId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export interface AuditLogFilters {
  entityTypes: string[];
  actions: string[];
  users: User[];
}

// ===========================================
// Risk Configuration Types
// ===========================================

export interface RiskConfiguration {
  id: string;
  organizationId: string;
  methodology: 'quantitative' | 'qualitative' | 'hybrid';
  likelihoodScale: ScaleLevel[];
  impactScale: ScaleLevel[];
  categories: RiskCategory[];
  riskLevelThresholds: RiskThresholds;
  workflowSettings: WorkflowSettings;
  riskAppetite: RiskAppetiteLevel[];
}

export interface ScaleLevel {
  id: string;
  name: string;
  value: number;
  description: string;
  color: string;
}

export interface RiskCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
}

export interface RiskThresholds {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface WorkflowSettings {
  requireApproval: boolean;
  approvalThreshold: string;
  autoAssignOwner: boolean;
  reviewFrequency: number;
}

export interface RiskAppetiteLevel {
  category: string;
  level: RiskLevel;
  description?: string;
}

export interface UpdateRiskConfigData {
  methodology?: 'quantitative' | 'qualitative' | 'hybrid';
  likelihoodScale?: ScaleLevel[];
  impactScale?: ScaleLevel[];
  categories?: RiskCategory[];
  riskLevelThresholds?: RiskThresholds;
  workflowSettings?: WorkflowSettings;
  riskAppetite?: RiskAppetiteLevel[];
}

// ===========================================
// Seed/Demo Data Types
// ===========================================

export interface SeedStatus {
  hasData: boolean;
  lastSeededAt?: string;
  modules: {
    frameworks: boolean;
    controls: boolean;
    policies: boolean;
    risks: boolean;
    vendors: boolean;
    evidence: boolean;
  };
}

export interface SeedOptions {
  frameworks?: boolean;
  controls?: boolean;
  policies?: boolean;
  risks?: boolean;
  vendors?: boolean;
  evidence?: boolean;
}

