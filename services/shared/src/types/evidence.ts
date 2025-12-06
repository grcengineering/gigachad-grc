import { BaseEntity, Auditable, Tag } from './common';

export type EvidenceType =
  | 'screenshot'
  | 'document'
  | 'export'
  | 'report'
  | 'configuration'
  | 'log'
  | 'policy'
  | 'automated'
  | 'other';

export type EvidenceSource =
  | 'manual'
  | 'aws'
  | 'gcp'
  | 'azure'
  | 'github'
  | 'okta'
  | 'jira'
  | 'api'
  | 'webhook';

export type EvidenceStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'expired';

export interface Evidence extends BaseEntity, Auditable {
  organizationId: string;
  title: string;
  description?: string;
  type: EvidenceType;
  source: EvidenceSource;
  status: EvidenceStatus;
  
  // File information
  filename: string;
  mimeType: string;
  size: number;
  storagePath: string;
  
  // Validity
  collectedAt: Date;
  validFrom: Date;
  validUntil?: Date;
  isExpired: boolean;
  
  // Metadata
  tags: Tag[];
  category?: string;
  metadata?: Record<string, unknown>;
  
  // Approval
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  
  // Versioning
  version: number;
  previousVersionId?: string;
}

export interface EvidenceControlLink extends BaseEntity {
  evidenceId: string;
  controlId: string;
  implementationId: string;
  linkedBy: string;
  notes?: string;
}

export interface EvidenceWithControls extends Evidence {
  linkedControls: LinkedControlInfo[];
}

export interface LinkedControlInfo {
  controlId: string;
  controlRef: string;
  controlTitle: string;
  implementationStatus: string;
}

// Evidence Library organization
export interface EvidenceFolder {
  id: string;
  organizationId: string;
  name: string;
  parentId?: string;
  path: string;
  createdAt: Date;
  createdBy: string;
}

export interface EvidenceStats {
  total: number;
  byType: Record<EvidenceType, number>;
  bySource: Record<EvidenceSource, number>;
  byStatus: Record<EvidenceStatus, number>;
  expiringSoon: number;
  expired: number;
  unlinked: number;
}

// DTOs
export interface UploadEvidenceDto {
  title: string;
  description?: string;
  type: EvidenceType;
  category?: string;
  tags?: string[];
  validFrom?: Date;
  validUntil?: Date;
  controlIds?: string[];
  folderId?: string;
}

export interface UpdateEvidenceDto {
  title?: string;
  description?: string;
  type?: EvidenceType;
  category?: string;
  tags?: string[];
  validUntil?: Date;
}

export interface ReviewEvidenceDto {
  status: 'approved' | 'rejected';
  notes?: string;
}

export interface LinkEvidenceDto {
  controlIds: string[];
  notes?: string;
}

export interface EvidenceFilterParams {
  type?: EvidenceType[];
  source?: EvidenceSource[];
  status?: EvidenceStatus[];
  category?: string;
  tags?: string[];
  controlId?: string;
  folderId?: string;
  expiringSoon?: boolean;
  expired?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

// Automated evidence submission (from integrations)
export interface AutomatedEvidenceSubmission {
  controlId: string;
  source: EvidenceSource;
  type: EvidenceType;
  title: string;
  description?: string;
  data: Record<string, unknown>;
  collectedAt: Date;
  validUntil?: Date;
  metadata?: Record<string, unknown>;
}



