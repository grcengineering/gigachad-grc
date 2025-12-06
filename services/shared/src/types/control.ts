import { BaseEntity, Auditable, Tag } from './common';

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

export type ImplementationStatus =
  | 'not_started'
  | 'in_progress'
  | 'implemented'
  | 'not_applicable';

export type ControlFrequency =
  | 'continuous'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'annually'
  | 'as_needed';

export interface Control extends BaseEntity {
  controlId: string; // e.g., "AC-001", "CC1.1"
  title: string;
  description: string;
  category: ControlCategory;
  subcategory?: string;
  isCustom: boolean;
  organizationId?: string; // null for system controls
  tags: Tag[];
  guidance?: string;
  automationSupported: boolean;
}

export interface ControlImplementation extends BaseEntity, Auditable {
  controlId: string;
  organizationId: string;
  status: ImplementationStatus;
  ownerId?: string;
  ownerName?: string;
  implementationNotes?: string;
  testingFrequency: ControlFrequency;
  lastTestedAt?: Date;
  nextTestDue?: Date;
  effectivenessScore?: number; // 0-100
  dueDate?: Date;
}

export interface ControlTest extends BaseEntity, Auditable {
  implementationId: string;
  testType: 'manual' | 'automated';
  result: 'pass' | 'fail' | 'partial' | 'not_tested';
  findings?: string;
  recommendations?: string;
  testedAt: Date;
  evidenceIds: string[];
}

export interface ControlWithImplementation extends Control {
  implementation?: ControlImplementation;
  evidenceCount?: number;
  frameworkMappings?: FrameworkMapping[];
}

export interface FrameworkMapping {
  frameworkId: string;
  frameworkName: string;
  requirementId: string;
  requirementRef: string;
}

// Dashboard types
export interface ControlsSummary {
  total: number;
  byStatus: Record<ImplementationStatus, number>;
  byCategory: Record<ControlCategory, number>;
  overdue: number;
  upcomingTests: number;
}

export interface ComplianceScore {
  overall: number;
  byFramework: Record<string, number>;
  byCategory: Record<ControlCategory, number>;
  trend: ScoreTrend[];
}

export interface ScoreTrend {
  date: Date;
  score: number;
}

// DTOs
export interface CreateControlDto {
  controlId: string;
  title: string;
  description: string;
  category: ControlCategory;
  subcategory?: string;
  tags?: string[];
  guidance?: string;
}

export interface UpdateControlDto {
  title?: string;
  description?: string;
  category?: ControlCategory;
  subcategory?: string;
  tags?: string[];
  guidance?: string;
}

export interface UpdateImplementationDto {
  status?: ImplementationStatus;
  ownerId?: string;
  implementationNotes?: string;
  testingFrequency?: ControlFrequency;
  dueDate?: Date;
}

export interface CreateControlTestDto {
  testType: 'manual' | 'automated';
  result: 'pass' | 'fail' | 'partial' | 'not_tested';
  findings?: string;
  recommendations?: string;
  evidenceIds?: string[];
}



