import { BaseEntity } from './common';
import { ImplementationStatus } from './control';

export type FrameworkType =
  | 'soc2'
  | 'iso27001'
  | 'hipaa'
  | 'gdpr'
  | 'pci_dss'
  | 'nist_csf'
  | 'custom';

export interface Framework extends BaseEntity {
  type: FrameworkType;
  name: string;
  version: string;
  description: string;
  isActive: boolean;
  isCustom: boolean;
  organizationId?: string; // null for system frameworks
  publishedDate?: Date;
  effectiveDate?: Date;
}

export interface FrameworkRequirement extends BaseEntity {
  frameworkId: string;
  parentId?: string;
  reference: string; // e.g., "CC1.1", "A.5.1"
  title: string;
  description: string;
  guidance?: string;
  level: number; // hierarchy level (0 = category, 1 = requirement, 2 = sub-requirement)
  order: number;
  isCategory: boolean;
}

export interface ControlMapping extends BaseEntity {
  frameworkId: string;
  requirementId: string;
  controlId: string;
  mappingType: 'primary' | 'supporting';
  notes?: string;
  createdBy: string;
}

// Readiness Assessment
export interface ReadinessAssessment extends BaseEntity {
  organizationId: string;
  frameworkId: string;
  name: string;
  description?: string;
  status: 'draft' | 'in_progress' | 'completed';
  assessedAt?: Date;
  assessedBy?: string;
  score: number; // 0-100
  gapCount: number;
}

export interface RequirementStatus extends BaseEntity {
  assessmentId: string;
  requirementId: string;
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable';
  notes?: string;
  evidenceIds: string[];
  linkedControlIds: string[];
}

export interface Gap extends BaseEntity {
  assessmentId: string;
  requirementId: string;
  requirementRef: string;
  requirementTitle: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
  remediationStatus: 'open' | 'in_progress' | 'resolved';
  remediationDueDate?: Date;
  assignedTo?: string;
}

export interface RemediationTask extends BaseEntity {
  gapId: string;
  assessmentId: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo?: string;
  dueDate?: Date;
  completedAt?: Date;
  effort?: 'low' | 'medium' | 'high';
  linkedControlIds: string[];
}

// Framework views
export interface FrameworkWithReadiness extends Framework {
  lastAssessment?: ReadinessAssessment;
  requirementCount: number;
  mappedControlCount: number;
}

export interface RequirementWithStatus extends FrameworkRequirement {
  status?: RequirementStatus;
  mappedControls: MappedControlInfo[];
  children?: RequirementWithStatus[];
}

export interface MappedControlInfo {
  controlId: string;
  controlRef: string;
  controlTitle: string;
  implementationStatus: ImplementationStatus;
  mappingType: 'primary' | 'supporting';
}

export interface FrameworkTree {
  framework: Framework;
  requirements: RequirementWithStatus[];
}

// Readiness summary
export interface ReadinessSummary {
  frameworkId: string;
  frameworkName: string;
  overallScore: number;
  requirementsByStatus: {
    compliant: number;
    partial: number;
    non_compliant: number;
    not_applicable: number;
    not_assessed: number;
  };
  gapsByPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  remediationProgress: {
    total: number;
    completed: number;
    inProgress: number;
  };
}

// DTOs
export interface CreateAssessmentDto {
  frameworkId: string;
  name: string;
  description?: string;
}

export interface UpdateRequirementStatusDto {
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable';
  notes?: string;
  evidenceIds?: string[];
  linkedControlIds?: string[];
}

export interface CreateRemediationTaskDto {
  gapId: string;
  title: string;
  description?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  assignedTo?: string;
  dueDate?: Date;
  effort?: 'low' | 'medium' | 'high';
  linkedControlIds?: string[];
}

export interface CreateControlMappingDto {
  frameworkId: string;
  requirementId: string;
  controlId: string;
  mappingType?: 'primary' | 'supporting';
  notes?: string;
}



