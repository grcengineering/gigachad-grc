/**
 * Shared constants for status, category, and configuration values.
 * Centralizes values that are used across multiple components to ensure consistency.
 */

// ============================================
// Control Status
// ============================================

export const CONTROL_STATUSES = {
  implemented: {
    value: 'implemented',
    label: 'Implemented',
    color: '#22c55e',
    bgColor: 'bg-green-500',
    textColor: 'text-green-400',
  },
  in_progress: {
    value: 'in_progress',
    label: 'In Progress',
    color: '#eab308',
    bgColor: 'bg-yellow-500',
    textColor: 'text-yellow-400',
  },
  not_started: {
    value: 'not_started',
    label: 'Not Started',
    color: '#6b7280',
    bgColor: 'bg-surface-500',
    textColor: 'text-surface-400',
  },
  not_applicable: {
    value: 'not_applicable',
    label: 'N/A',
    color: '#3b82f6',
    bgColor: 'bg-blue-500',
    textColor: 'text-blue-400',
  },
} as const;

export const CONTROL_STATUS_OPTIONS = Object.values(CONTROL_STATUSES);

export const CONTROL_STATUS_COLORS: Record<string, string> = {
  implemented: CONTROL_STATUSES.implemented.color,
  in_progress: CONTROL_STATUSES.in_progress.color,
  not_started: CONTROL_STATUSES.not_started.color,
  not_applicable: CONTROL_STATUSES.not_applicable.color,
};

// ============================================
// Policy Status
// ============================================

export const POLICY_STATUSES = {
  draft: { value: 'draft', label: 'Draft', color: '#6b7280', badge: 'badge-neutral' },
  in_review: { value: 'in_review', label: 'In Review', color: '#eab308', badge: 'badge-warning' },
  approved: { value: 'approved', label: 'Approved', color: '#3b82f6', badge: 'badge-success' },
  published: { value: 'published', label: 'Published', color: '#22c55e', badge: 'badge-info' },
  retired: { value: 'retired', label: 'Retired', color: '#ef4444', badge: 'badge-danger' },
} as const;

export const POLICY_STATUS_OPTIONS = Object.values(POLICY_STATUSES);

export const POLICY_STATUS_COLORS: Record<string, string> = {
  published: POLICY_STATUSES.published.color,
  approved: POLICY_STATUSES.approved.color,
  in_review: POLICY_STATUSES.in_review.color,
  draft: POLICY_STATUSES.draft.color,
};

// ============================================
// Risk Status
// ============================================

export const RISK_STATUSES = {
  // Risk Intake stages
  risk_identified: { value: 'risk_identified', label: 'Identified', stage: 'intake' },
  not_a_risk: { value: 'not_a_risk', label: 'Not a Risk', stage: 'intake' },
  actual_risk: { value: 'actual_risk', label: 'Validated', stage: 'intake' },
  risk_analysis_in_progress: {
    value: 'risk_analysis_in_progress',
    label: 'Analysis In Progress',
    stage: 'assessment',
  },
  risk_analyzed: { value: 'risk_analyzed', label: 'Analyzed', stage: 'assessment' },
  // Legacy statuses
  open: { value: 'open', label: 'Open', stage: 'intake' },
  in_treatment: { value: 'in_treatment', label: 'In Treatment', stage: 'treatment' },
  accepted: { value: 'accepted', label: 'Accepted', stage: 'treatment' },
  mitigated: { value: 'mitigated', label: 'Mitigated', stage: 'closed' },
  closed: { value: 'closed', label: 'Closed', stage: 'closed' },
} as const;

export const RISK_STATUS_OPTIONS = Object.values(RISK_STATUSES);

// ============================================
// Evidence Status
// ============================================

export const EVIDENCE_STATUSES = {
  pending_review: {
    value: 'pending_review',
    label: 'Pending Review',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    badge: 'badge-warning',
  },
  approved: {
    value: 'approved',
    label: 'Approved',
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    badge: 'badge-success',
  },
  rejected: {
    value: 'rejected',
    label: 'Rejected',
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    badge: 'badge-danger',
  },
  expired: {
    value: 'expired',
    label: 'Expired',
    color: 'text-surface-400',
    bgColor: 'bg-surface-400/10',
    badge: 'badge-neutral',
  },
} as const;

export const EVIDENCE_STATUS_OPTIONS = Object.values(EVIDENCE_STATUSES);

// ============================================
// Asset Status
// ============================================

export const ASSET_STATUSES = {
  active: { value: 'active', label: 'Active', color: 'bg-emerald-500/20 text-emerald-400' },
  inactive: { value: 'inactive', label: 'Inactive', color: 'bg-surface-500/20 text-surface-400' },
  decommissioned: {
    value: 'decommissioned',
    label: 'Decommissioned',
    color: 'bg-red-500/20 text-red-400',
  },
} as const;

export const ASSET_STATUS_OPTIONS = Object.values(ASSET_STATUSES);

// ============================================
// Vendor Status & Criticality
// ============================================

export const VENDOR_STATUSES = {
  active: { value: 'active', label: 'Active', color: 'bg-green-500/20 text-green-400' },
  pending_review: {
    value: 'pending_review',
    label: 'Pending Review',
    color: 'bg-yellow-500/20 text-yellow-400',
  },
  in_review: { value: 'in_review', label: 'In Review', color: 'bg-blue-500/20 text-blue-400' },
  approved: { value: 'approved', label: 'Approved', color: 'bg-green-500/20 text-green-400' },
  inactive: { value: 'inactive', label: 'Inactive', color: 'bg-surface-500/20 text-surface-400' },
  terminated: { value: 'terminated', label: 'Terminated', color: 'bg-red-500/20 text-red-400' },
} as const;

export const VENDOR_CRITICALITIES = {
  critical: {
    value: 'critical',
    label: 'Critical',
    color: 'bg-red-500',
    textColor: 'text-red-400',
  },
  high: { value: 'high', label: 'High', color: 'bg-orange-500', textColor: 'text-orange-400' },
  medium: {
    value: 'medium',
    label: 'Medium',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-400',
  },
  low: { value: 'low', label: 'Low', color: 'bg-green-500', textColor: 'text-green-400' },
} as const;

export const VENDOR_STATUS_OPTIONS = Object.values(VENDOR_STATUSES);
export const VENDOR_CRITICALITY_OPTIONS = Object.values(VENDOR_CRITICALITIES);

// ============================================
// BCDR Plan Status
// ============================================

export const BCDR_PLAN_STATUSES = {
  draft: { value: 'draft', label: 'Draft', color: 'bg-surface-600 text-surface-300' },
  in_review: { value: 'in_review', label: 'In Review', color: 'bg-yellow-500/20 text-yellow-400' },
  approved: { value: 'approved', label: 'Approved', color: 'bg-blue-500/20 text-blue-400' },
  published: { value: 'published', label: 'Published', color: 'bg-green-500/20 text-green-400' },
  archived: { value: 'archived', label: 'Archived', color: 'bg-surface-700 text-surface-400' },
} as const;

export const BCDR_PLAN_STATUS_OPTIONS = Object.values(BCDR_PLAN_STATUSES);

// ============================================
// DR Test Status
// ============================================

export const DR_TEST_STATUSES = {
  planned: { value: 'planned', label: 'Planned', color: 'bg-surface-600 text-surface-300' },
  scheduled: { value: 'scheduled', label: 'Scheduled', color: 'bg-blue-500/20 text-blue-400' },
  in_progress: {
    value: 'in_progress',
    label: 'In Progress',
    color: 'bg-yellow-500/20 text-yellow-400',
  },
  completed: { value: 'completed', label: 'Completed', color: 'bg-green-500/20 text-green-400' },
  cancelled: { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500/20 text-red-400' },
  postponed: { value: 'postponed', label: 'Postponed', color: 'bg-orange-500/20 text-orange-400' },
} as const;

export const DR_TEST_STATUS_OPTIONS = Object.values(DR_TEST_STATUSES);

// ============================================
// Compliance Status (Frameworks)
// ============================================

export const COMPLIANCE_STATUSES = {
  compliant: {
    value: 'compliant',
    label: 'Compliant',
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
  },
  partial: {
    value: 'partial',
    label: 'Partial',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
  },
  non_compliant: {
    value: 'non_compliant',
    label: 'Non-Compliant',
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
  },
  not_applicable: {
    value: 'not_applicable',
    label: 'N/A',
    color: 'text-surface-400',
    bgColor: 'bg-surface-400/10',
  },
  not_assessed: {
    value: 'not_assessed',
    label: 'Not Assessed',
    color: 'text-surface-500',
    bgColor: 'bg-surface-500/10',
  },
} as const;

export const COMPLIANCE_STATUS_OPTIONS = Object.values(COMPLIANCE_STATUSES);

// ============================================
// Audit Finding Status
// ============================================

export const AUDIT_FINDING_STATUSES = {
  open: { value: 'open', label: 'Open', color: 'text-red-400' },
  acknowledged: { value: 'acknowledged', label: 'Acknowledged', color: 'text-yellow-400' },
  remediation_planned: {
    value: 'remediation_planned',
    label: 'Remediation Planned',
    color: 'text-blue-400',
  },
  remediation_in_progress: {
    value: 'remediation_in_progress',
    label: 'In Progress',
    color: 'text-cyan-400',
  },
  resolved: { value: 'resolved', label: 'Resolved', color: 'text-green-400' },
  accepted_risk: { value: 'accepted_risk', label: 'Risk Accepted', color: 'text-purple-400' },
} as const;

export const AUDIT_FINDING_STATUS_OPTIONS = Object.values(AUDIT_FINDING_STATUSES);

// ============================================
// Policy Categories
// ============================================

export const POLICY_CATEGORIES = {
  information_security: { value: 'information_security', label: 'Information Security' },
  acceptable_use: { value: 'acceptable_use', label: 'Acceptable Use' },
  data_protection: { value: 'data_protection', label: 'Data Protection' },
  access_control: { value: 'access_control', label: 'Access Control' },
  incident_response: { value: 'incident_response', label: 'Incident Response' },
  business_continuity: { value: 'business_continuity', label: 'Business Continuity' },
  vendor_management: { value: 'vendor_management', label: 'Vendor Management' },
  hr_security: { value: 'hr_security', label: 'HR Security' },
  physical_security: { value: 'physical_security', label: 'Physical Security' },
  compliance: { value: 'compliance', label: 'Compliance' },
} as const;

export const POLICY_CATEGORY_OPTIONS = Object.values(POLICY_CATEGORIES);

// ============================================
// Risk Levels (Severity)
// ============================================

export const RISK_LEVELS = {
  critical: {
    value: 'critical',
    label: 'Critical',
    color: 'bg-red-600',
    textColor: 'text-red-400',
    score: 5,
  },
  high: {
    value: 'high',
    label: 'High',
    color: 'bg-orange-500',
    textColor: 'text-orange-400',
    score: 4,
  },
  medium: {
    value: 'medium',
    label: 'Medium',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-400',
    score: 3,
  },
  low: { value: 'low', label: 'Low', color: 'bg-green-500', textColor: 'text-green-400', score: 2 },
  negligible: {
    value: 'negligible',
    label: 'Negligible',
    color: 'bg-blue-500',
    textColor: 'text-blue-400',
    score: 1,
  },
} as const;

export const RISK_LEVEL_OPTIONS = Object.values(RISK_LEVELS);

// ============================================
// Test Frequencies
// ============================================

export const TEST_FREQUENCIES = {
  weekly: { value: 'weekly', label: 'Weekly', days: 7 },
  monthly: { value: 'monthly', label: 'Monthly', days: 30 },
  quarterly: { value: 'quarterly', label: 'Quarterly', days: 90 },
  semi_annually: { value: 'semi_annually', label: 'Semi-Annually', days: 180 },
  annually: { value: 'annually', label: 'Annually', days: 365 },
} as const;

export const TEST_FREQUENCY_OPTIONS = Object.values(TEST_FREQUENCIES);

// ============================================
// Security Constants
// ============================================

/**
 * Get allowed origins for postMessage validation
 * These are the origins that are allowed to send messages to our application
 */
export function getAllowedOrigins(): string[] {
  const origins: string[] = [window.location.origin];

  // Add configured API and CDN URLs if available
  const apiUrl = import.meta.env.VITE_API_URL;
  const trainingCdnUrl = import.meta.env.VITE_TRAINING_CDN_URL;

  if (apiUrl) {
    try {
      const url = new URL(apiUrl);
      origins.push(url.origin);
    } catch {
      // Invalid URL, skip
    }
  }

  if (trainingCdnUrl) {
    try {
      const url = new URL(trainingCdnUrl);
      origins.push(url.origin);
    } catch {
      // Invalid URL, skip
    }
  }

  // Remove duplicates
  return [...new Set(origins)];
}

/**
 * Check if an origin is allowed for postMessage communication
 */
export function isAllowedOrigin(origin: string): boolean {
  return getAllowedOrigins().includes(origin);
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get status configuration by value from any status object
 */
export function getStatusConfig<T extends Record<string, { value: string; label: string }>>(
  statuses: T,
  value: string
): { value: string; label: string } | undefined {
  return Object.values(statuses).find((s) => s.value === value);
}

/**
 * Get label for a status value
 */
export function getStatusLabel<T extends Record<string, { value: string; label: string }>>(
  statuses: T,
  value: string
): string {
  const config = getStatusConfig(statuses, value);
  return config?.label || value;
}
