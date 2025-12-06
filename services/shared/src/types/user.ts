import { BaseEntity, Status } from './common';

export type UserRole = 'admin' | 'compliance_manager' | 'auditor' | 'viewer';

export interface User extends BaseEntity {
  keycloakId: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  organizationId: string;
  role: UserRole;
  status: Status;
  lastLoginAt?: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  dashboardLayout?: DashboardLayoutConfig;
  emailDigest: 'daily' | 'weekly' | 'never';
  notifications: {
    taskAssignments: boolean;
    evidenceReminders: boolean;
    complianceAlerts: boolean;
    policyReviews: boolean;
  };
}

export interface DashboardLayoutConfig {
  widgets: DashboardWidget[];
}

export interface DashboardWidget {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config?: Record<string, unknown>;
}

export interface UserContext {
  userId: string;
  keycloakId: string;
  email: string;
  organizationId: string;
  role: UserRole;
  permissions: string[];
}

export interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  role: UserRole;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  status?: Status;
  preferences?: Partial<UserPreferences>;
}

// Permission constants
export const Permissions = {
  // Controls
  CONTROLS_VIEW: 'controls:view',
  CONTROLS_CREATE: 'controls:create',
  CONTROLS_UPDATE: 'controls:update',
  CONTROLS_DELETE: 'controls:delete',
  
  // Evidence
  EVIDENCE_VIEW: 'evidence:view',
  EVIDENCE_UPLOAD: 'evidence:upload',
  EVIDENCE_DELETE: 'evidence:delete',
  EVIDENCE_APPROVE: 'evidence:approve',
  
  // Frameworks
  FRAMEWORKS_VIEW: 'frameworks:view',
  FRAMEWORKS_MANAGE: 'frameworks:manage',
  
  // Policies
  POLICIES_VIEW: 'policies:view',
  POLICIES_CREATE: 'policies:create',
  POLICIES_UPDATE: 'policies:update',
  POLICIES_APPROVE: 'policies:approve',
  POLICIES_DELETE: 'policies:delete',
  
  // Integrations
  INTEGRATIONS_VIEW: 'integrations:view',
  INTEGRATIONS_MANAGE: 'integrations:manage',
  
  // Admin
  ADMIN_USERS: 'admin:users',
  ADMIN_SETTINGS: 'admin:settings',
  ADMIN_AUDIT_LOGS: 'admin:audit_logs',
} as const;

export const RolePermissions: Record<UserRole, string[]> = {
  admin: Object.values(Permissions),
  compliance_manager: [
    Permissions.CONTROLS_VIEW,
    Permissions.CONTROLS_CREATE,
    Permissions.CONTROLS_UPDATE,
    Permissions.EVIDENCE_VIEW,
    Permissions.EVIDENCE_UPLOAD,
    Permissions.EVIDENCE_APPROVE,
    Permissions.FRAMEWORKS_VIEW,
    Permissions.FRAMEWORKS_MANAGE,
    Permissions.POLICIES_VIEW,
    Permissions.POLICIES_CREATE,
    Permissions.POLICIES_UPDATE,
    Permissions.POLICIES_APPROVE,
    Permissions.INTEGRATIONS_VIEW,
    Permissions.INTEGRATIONS_MANAGE,
  ],
  auditor: [
    Permissions.CONTROLS_VIEW,
    Permissions.EVIDENCE_VIEW,
    Permissions.FRAMEWORKS_VIEW,
    Permissions.POLICIES_VIEW,
    Permissions.ADMIN_AUDIT_LOGS,
  ],
  viewer: [
    Permissions.CONTROLS_VIEW,
    Permissions.EVIDENCE_VIEW,
    Permissions.FRAMEWORKS_VIEW,
    Permissions.POLICIES_VIEW,
  ],
};



