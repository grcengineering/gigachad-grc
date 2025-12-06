import { BaseEntity, Auditable, Tag } from './common';

export type PolicyCategory =
  | 'information_security'
  | 'data_privacy'
  | 'acceptable_use'
  | 'access_control'
  | 'incident_response'
  | 'business_continuity'
  | 'human_resources'
  | 'vendor_management'
  | 'compliance'
  | 'other';

export type PolicyStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'published'
  | 'retired';

export type ReviewFrequency =
  | 'quarterly'
  | 'semi_annual'
  | 'annual'
  | 'biennial'
  | 'custom';

export interface Policy extends BaseEntity, Auditable {
  organizationId: string;
  title: string;
  description?: string;
  category: PolicyCategory;
  status: PolicyStatus;
  
  // Current version
  currentVersionId?: string;
  version: string; // e.g., "1.0", "2.1"
  
  // File information
  filename: string;
  mimeType: string;
  size: number;
  storagePath: string;
  
  // Ownership
  ownerId: string;
  ownerName?: string;
  departmentId?: string;
  
  // Review cycle
  reviewFrequency: ReviewFrequency;
  lastReviewedAt?: Date;
  nextReviewDue?: Date;
  
  // Approval
  approvedBy?: string;
  approvedAt?: Date;
  effectiveDate?: Date;
  
  // Metadata
  tags: Tag[];
  scope?: string;
  audience?: string;
}

export interface PolicyVersion extends BaseEntity {
  policyId: string;
  version: string;
  filename: string;
  storagePath: string;
  size: number;
  changeNotes?: string;
  createdBy: string;
}

export interface PolicyApproval extends BaseEntity {
  policyId: string;
  versionId: string;
  approverId: string;
  approverName: string;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  decidedAt?: Date;
  order: number; // for multi-step approval chains
}

export interface PolicyReview extends BaseEntity {
  policyId: string;
  reviewerId: string;
  reviewerName: string;
  scheduledFor: Date;
  completedAt?: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'overdue';
  outcome?: 'no_changes' | 'minor_updates' | 'major_revision' | 'retired';
  notes?: string;
}

export interface PolicyControlLink extends BaseEntity {
  policyId: string;
  controlId: string;
  linkedBy: string;
  notes?: string;
}

// Views
export interface PolicyWithDetails extends Policy {
  versions: PolicyVersion[];
  pendingApprovals: PolicyApproval[];
  linkedControls: LinkedPolicyControl[];
  upcomingReview?: PolicyReview;
}

export interface LinkedPolicyControl {
  controlId: string;
  controlRef: string;
  controlTitle: string;
}

export interface PolicyStats {
  total: number;
  byCategory: Record<PolicyCategory, number>;
  byStatus: Record<PolicyStatus, number>;
  overdueReviews: number;
  upcomingReviews: number;
  pendingApprovals: number;
}

// DTOs
export interface CreatePolicyDto {
  title: string;
  description?: string;
  category: PolicyCategory;
  ownerId: string;
  reviewFrequency: ReviewFrequency;
  effectiveDate?: Date;
  tags?: string[];
  scope?: string;
  audience?: string;
  controlIds?: string[];
}

export interface UpdatePolicyDto {
  title?: string;
  description?: string;
  category?: PolicyCategory;
  ownerId?: string;
  reviewFrequency?: ReviewFrequency;
  tags?: string[];
  scope?: string;
  audience?: string;
}

export interface UploadPolicyVersionDto {
  version: string;
  changeNotes?: string;
}

export interface SubmitForApprovalDto {
  approverIds: string[];
  comments?: string;
}

export interface ApprovalDecisionDto {
  status: 'approved' | 'rejected';
  comments?: string;
}

export interface ScheduleReviewDto {
  reviewerId: string;
  scheduledFor: Date;
  notes?: string;
}

export interface CompleteReviewDto {
  outcome: 'no_changes' | 'minor_updates' | 'major_revision' | 'retired';
  notes?: string;
}

export interface LinkPolicyToControlsDto {
  controlIds: string[];
  notes?: string;
}

export interface PolicyFilterParams {
  category?: PolicyCategory[];
  status?: PolicyStatus[];
  ownerId?: string;
  overdueReview?: boolean;
  tags?: string[];
  search?: string;
}



