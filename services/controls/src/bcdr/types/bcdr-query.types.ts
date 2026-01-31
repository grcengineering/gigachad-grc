/**
 * Type definitions for BC/DR raw SQL query results.
 * These types match the database schema and are used for Prisma $queryRaw results.
 */

/** Base entity with common audit fields */
interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

/** BC/DR Incident record */
export interface BCDRIncidentRecord extends BaseEntity {
  organization_id: string;
  incident_id: string;
  title: string;
  description: string | null;
  incident_type: string;
  severity: string;
  status: string;
  declared_at: Date;
  declared_by: string;
  recovery_started_at: Date | null;
  resolved_at: Date | null;
  closed_at: Date | null;
  closed_by: string | null;
  operational_at: Date | null;
  root_cause: string | null;
  lessons_learned: string | null;
  improvement_actions: Record<string, unknown>[] | null;
  actual_downtime_minutes: number | null;
  data_loss_minutes: number | null;
  financial_impact: number | null;
  post_incident_review_date: Date | null;
  post_incident_review_by: string | null;
  activated_plans: string[];
  activated_teams: string[];
  timeline_count?: bigint | number;
  declared_by_name?: string;
  closed_by_name?: string;
}

/** BC/DR Incident timeline entry */
export interface IncidentTimelineRecord {
  id: string;
  incident_id: string;
  entry_type: string;
  description: string;
  created_by: string;
  timestamp: Date;
  metadata: Record<string, unknown> | null;
  created_by_name?: string;
}

/** BC/DR Plan record */
export interface BCDRPlanRecord extends BaseEntity {
  organization_id: string;
  workspace_id: string | null;
  plan_id: string;
  title: string;
  description: string | null;
  plan_type: string;
  status: string;
  version: string;
  version_notes: string | null;
  owner_id: string | null;
  approver_id: string | null;
  effective_date: Date | null;
  expiry_date: Date | null;
  scope_description: string | null;
  in_scope_processes: string[];
  out_of_scope: string | null;
  activation_criteria: string | null;
  deactivation_criteria: string | null;
  activation_authority: string | null;
  objectives: string | null;
  assumptions: string | null;
  filename: string | null;
  storage_path: string | null;
  mime_type: string | null;
  file_size: number | null;
  review_frequency_months: number;
  next_review_due: Date | null;
  last_review_date: Date | null;
  approved_at: Date | null;
  published_at: Date | null;
  tags: string[];
  created_by: string;
  updated_by: string;
  deleted_by: string | null;
  owner_name?: string;
  approver_name?: string;
  control_count?: bigint | number;
}

/** Plan version record */
export interface PlanVersionRecord {
  id: string;
  plan_id: string;
  version: string;
  filename: string | null;
  storage_path: string | null;
  file_size: number | null;
  created_by: string;
  created_at: Date;
  created_by_name?: string;
}

/** Plan control mapping */
export interface PlanControlRecord {
  id: string;
  plan_id: string;
  control_id: string;
  mapping_notes: string | null;
  created_by: string;
  created_at: Date;
  ctrl_id?: string;
  title?: string;
  category?: string;
}

/** Business process record */
export interface BusinessProcessRecord extends BaseEntity {
  organization_id: string;
  workspace_id: string | null;
  process_id: string;
  name: string;
  description: string | null;
  owner_id: string | null;
  department_id: string | null;
  criticality_tier: string;
  rto_hours: number | null;
  rpo_hours: number | null;
  mtpd_hours: number | null;
  is_active: boolean;
  peak_periods: string | null;
  staff_required_min: number | null;
  staff_required_normal: number | null;
  workaround_procedures: string | null;
  revenue_impact_per_hour: number | null;
  regulatory_impact: string | null;
  reputational_impact: string | null;
  review_frequency_months: number;
  next_review_due: Date | null;
  last_review_date: Date | null;
  last_bia_date: Date | null;
  tags: string[];
  created_by: string;
  updated_by: string;
  owner_name?: string;
  department_name?: string;
  dependencies_count?: bigint | number;
  strategies_count?: bigint | number;
}

/** Process dependency record */
export interface ProcessDependencyRecord {
  id: string;
  process_id: string;
  dependency_type: string;
  dependency_id: string | null;
  external_name: string | null;
  criticality: string;
  rto_impact: string | null;
  workaround: string | null;
  notes: string | null;
  dependency_name?: string;
}

/** Recovery strategy record */
export interface RecoveryStrategyRecord extends BaseEntity {
  id: string;
  process_id: string;
  strategy_type: string;
  description: string;
  estimated_recovery_time_hours: number | null;
  estimated_cost: number | null;
  resources_required: string | null;
  created_by: string;
  updated_by: string;
}

/** Communication plan record */
export interface CommunicationPlanRecord extends BaseEntity {
  organization_id: string;
  plan_id: string;
  name: string;
  description: string | null;
  plan_type: string;
  status: string;
  owner_id: string | null;
  is_active: boolean;
  created_by: string;
  updated_by: string;
  owner_name?: string;
  contact_count?: bigint | number;
  template_count?: bigint | number;
}

/** Communication contact record */
export interface CommunicationContactRecord {
  id: string;
  communication_plan_id: string;
  name: string;
  title: string | null;
  organization_name: string | null;
  contact_type: string;
  primary_phone: string | null;
  secondary_phone: string | null;
  email: string | null;
  alternate_email: string | null;
  location: string | null;
  time_zone: string | null;
  role_in_plan: string | null;
  responsibilities: string | null;
  escalation_level: number;
  escalation_wait_minutes: number;
  availability_hours: string | null;
  notes: string | null;
  sort_order: number;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date | null;
}

/** Communication template record */
export interface CommunicationTemplateRecord {
  id: string;
  plan_id: string;
  name: string;
  template_type: string;
  subject: string | null;
  body: string;
  channels: string[];
  created_at: Date;
}

/** DR Test record */
export interface DRTestRecord extends BaseEntity {
  organization_id: string;
  test_id: string;
  name: string;
  test_type: string;
  status: string;
  result: string | null;
  planned_start_at: Date | null;
  planned_end_at: Date | null;
  actual_start_at: Date | null;
  actual_end_at: Date | null;
  actual_recovery_time_minutes: number | null;
  target_rto_minutes: number | null;
  target_rpo_minutes: number | null;
  lead_id: string | null;
  lead_name?: string;
  participant_count?: bigint | number;
  finding_count?: bigint | number;
}

/** DR Test finding record */
export interface DRTestFindingRecord {
  id: string;
  test_id: string;
  title: string;
  description: string | null;
  severity: string;
  remediation_required: boolean;
  remediation_status: string;
  remediation_due_date: Date | null;
  remediation_notes: string | null;
  assigned_to: string | null;
}

/** Plan stats result */
export interface PlanStatsRecord {
  total: bigint | number;
  draft_count: bigint | number;
  in_review_count: bigint | number;
  approved_count: bigint | number;
  published_count: bigint | number;
  overdue_review_count: bigint | number;
  expired_count: bigint | number;
}

/** Incident stats result */
export interface IncidentStatsRecord {
  total: bigint | number;
  active_count: bigint | number;
  recovering_count: bigint | number;
  resolved_count: bigint | number;
  closed_count: bigint | number;
  disaster_count: bigint | number;
  drill_count: bigint | number;
  avg_downtime_minutes: number | null;
  avg_resolution_minutes: number | null;
}

/** Process stats result */
export interface ProcessStatsRecord {
  total: bigint | number;
  tier_1_count: bigint | number;
  tier_2_count: bigint | number;
  tier_3_count: bigint | number;
  tier_4_count: bigint | number;
  active_count: bigint | number;
  overdue_review_count: bigint | number;
}

/** Count query result */
export interface CountRecord {
  count: bigint;
}

/** Generic ID check result */
export interface IdRecord {
  id: string;
}

/** Name lookup result */
export interface NameRecord {
  name?: string;
  title?: string;
}
