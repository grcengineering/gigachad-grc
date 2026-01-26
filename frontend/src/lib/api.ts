import axios, { AxiosError, AxiosResponse } from 'axios';
import { secureStorage, STORAGE_KEYS, migrateLegacyStorage } from './secureStorage';

// Migrate legacy storage on module load
migrateLegacyStorage();
import type {
  // Common
  PaginationParams,
  // Users
  User,
  CreateUserData,
  UpdateUserData,
  UserListParams,
  // Controls
  Control,
  CreateControlData,
  UpdateControlData,
  ControlListParams,
  BulkControlUploadData,
  ControlImplementation,
  UpdateImplementationData,
  CreateControlTestData,
  // Evidence
  Evidence,
  UploadEvidenceData,
  UpdateEvidenceData,
  EvidenceListParams,
  EvidenceFolder,
  CreateEvidenceFolderData,
  ReviewEvidenceData,
  // Frameworks
  Framework,
  CreateFrameworkData,
  UpdateFrameworkData,
  FrameworkRequirement,
  CreateRequirementData,
  UpdateRequirementData,
  // Assessments
  VendorAssessment,
  CreateVendorAssessmentData,
  UpdateVendorAssessmentData,
  AssessmentRequirementUpdate,
  CreateGapData,
  CreateRemediationData,
  UpdateRemediationData,
  // Mappings
  CreateMappingData,
  BulkMappingData,
  MappingListParams,
  // Policies
  Policy,
  UploadPolicyData,
  UpdatePolicyData,
  PolicyListParams,
  // Risks
  Risk,
  RiskDetail,
  CreateRiskData,
  UpdateRiskData,
  RiskListParams,
  RiskTreatmentData,
  RiskAssessmentData,
  // Risk Scenarios
  RiskScenario,
  CreateRiskScenarioData,
  UpdateRiskScenarioData,
  RiskScenarioListParams,
  // Assets
  Asset,
  CreateAssetData,
  UpdateAssetData,
  AssetListParams,
  // Vendors
  Vendor,
  CreateVendorData,
  UpdateVendorData,
  VendorListParams,
  // Contracts
  Contract,
  CreateContractData,
  UpdateContractData,
  // Audits
  Audit,
  CreateAuditData,
  UpdateAuditData,
  AuditListParams,
  AuditFinding,
  CreateFindingData,
  UpdateFindingData,
  FindingListParams,
  // Integrations
  Integration,
  CreateIntegrationData,
  UpdateIntegrationData,
  IntegrationListParams,
  CustomIntegrationConfig,
  // Notifications
  NotificationListParams,
  NotificationPreference,
  // Questionnaires
  Questionnaire,
  CreateQuestionnaireData,
  UpdateQuestionnaireData,
  CreateQuestionData,
  UpdateQuestionData,
  // Knowledge Base
  KnowledgeBaseEntry,
  CreateKnowledgeBaseData,
  UpdateKnowledgeBaseData,
  KnowledgeBaseListParams,
  // Trust Center
  TrustCenterConfig,
  UpdateTrustCenterConfigData,
  TrustCenterContent,
  CreateTrustCenterContentData,
  UpdateTrustCenterContentData,
  // Comments & Tasks
  CreateCommentData,
  UpdateCommentData,
  CreateTaskData,
  UpdateTaskData,
  TaskListParams,
  // Permissions
  Permission,
  CreatePermissionGroupData,
  UpdatePermissionGroupData,
  UserPermissionOverride,
  UserPermissionsResponse,
  // Collectors
  CreateCollectorData,
  UpdateCollectorData,
  // Audit Log
  AuditLogListParams,
  // Risk Config
  UpdateRiskConfigData,
  RiskCategory,
} from './apiTypes';

// Re-export types commonly used in components
export type { RiskScenario, Risk, Control, Policy, Vendor, Asset, Evidence, Framework, User, Audit };

export const API_URL = import.meta.env.VITE_API_URL || '';
// Dedicated controls service URL for module configuration and other org-wide settings.
// Falls back to API_URL for environments that front a single gateway.
const CONTROLS_API_URL =
  import.meta.env.VITE_CONTROLS_API_URL || API_URL || 'http://localhost:3001';

/**
 * Retry configuration for API requests
 */
const RETRY_CONFIG = {
  /** Maximum number of retry attempts */
  maxRetries: 3,
  /** Base delay for exponential backoff (ms) */
  baseDelayMs: 1000,
  /** Maximum delay between retries (ms) */
  maxDelayMs: 10000,
  /** HTTP status codes that should trigger a retry */
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  /** HTTP methods that are safe to retry (idempotent) */
  retryableMethods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'],
};

/**
 * Check if an error should trigger a retry
 */
function shouldRetry(error: AxiosError, attempt: number): boolean {
  // Don't retry if we've exceeded max attempts
  if (attempt >= RETRY_CONFIG.maxRetries) {
    return false;
  }

  // Retry on network errors (no response)
  if (!error.response) {
    return true;
  }

  const status = error.response.status;
  const method = error.config?.method?.toUpperCase() || '';

  // Check if status code is retryable
  if (!RETRY_CONFIG.retryableStatusCodes.includes(status)) {
    return false;
  }

  // Only retry idempotent methods (safe to repeat)
  // POST is excluded by default as it may not be idempotent
  if (!RETRY_CONFIG.retryableMethods.includes(method)) {
    return false;
  }

  return true;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateRetryDelay(attempt: number): number {
  const exponentialDelay = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, RETRY_CONFIG.maxDelayMs);
  // Add 10% jitter to prevent thundering herd
  const jitter = cappedDelay * 0.1 * Math.random();
  return Math.floor(cappedDelay + jitter);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Request timeout - 30 seconds for most requests
  timeout: 30000,
});

// Request interceptor to add auth token and user ID
api.interceptors.request.use((config) => {
  // Skip auth for health checks
  if (config.headers?.['X-Skip-Auth'] === 'true') {
    delete config.headers['X-Skip-Auth'];
    return config;
  }

  // Get token from secure storage (with fallback to legacy localStorage)
  const token = secureStorage.get(STORAGE_KEYS.TOKEN) || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Add user ID for notifications and other user-specific endpoints
  const userId = secureStorage.get(STORAGE_KEYS.USER_ID) || localStorage.getItem('userId');
  if (userId) {
    config.headers['x-user-id'] = userId;
  }
  
  // Add organization ID
  const orgId = secureStorage.get(STORAGE_KEYS.ORGANIZATION_ID) || localStorage.getItem('organizationId');
  if (orgId) {
    config.headers['x-organization-id'] = orgId;
  }
  
  return config;
});

// Track if we're already redirecting to prevent multiple redirects
let isRedirecting = false;
let redirectTimeout: NodeJS.Timeout | null = null;

/**
 * Response interceptor with retry logic for transient failures
 * 
 * Implements exponential backoff for:
 * - Network errors (no response)
 * - Server errors (5xx)
 * - Rate limiting (429)
 * - Request timeout (408)
 */
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as any;
    
    // Initialize retry count if not present
    if (config && config.__retryCount === undefined) {
      config.__retryCount = 0;
    }

    // Check if we should retry this request
    if (config && shouldRetry(error, config.__retryCount)) {
      config.__retryCount += 1;
      const delay = calculateRetryDelay(config.__retryCount);
      
      console.log(
        `API request failed, retrying in ${delay}ms ` +
        `(attempt ${config.__retryCount}/${RETRY_CONFIG.maxRetries}): ` +
        `${config.method?.toUpperCase()} ${config.url}`
      );
      
      await sleep(delay);
      
      // Retry the request
      return api.request(config);
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // Prevent multiple redirects
      if (isRedirecting) {
        return Promise.reject(error);
      }
      
      // Skip redirect for certain endpoints that might fail during normal operation
      const url = error.config?.url || '';
      const skipRedirectEndpoints = ['/api/health', '/api/workspaces/status'];
      if (skipRedirectEndpoints.some(endpoint => url.includes(endpoint))) {
        return Promise.reject(error);
      }
      
      // Handle unauthorized - clear all auth data
      secureStorage.clearAll();
      // Also clear legacy storage
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('organizationId');
      
      // Only redirect if we're not already on the login page to prevent redirect loops
      if (!window.location.pathname.includes('/login')) {
        isRedirecting = true;
        
        // Clear any pending redirect timeout
        if (redirectTimeout) {
          clearTimeout(redirectTimeout);
        }
        
        // Use a small delay to batch multiple 401s and prevent rapid redirects
        redirectTimeout = setTimeout(() => {
          // Use replace to avoid adding to history and prevent back button issues
          window.location.replace('/login');
        }, 100);
      }
    }
    
    return Promise.reject(error);
  }
);

// API functions
interface ControlListResponse {
  data: Control[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages?: number;
  };
}

export const controlsApi = {
  list: (params?: ControlListParams): Promise<AxiosResponse<ControlListResponse>> => 
    api.get('/api/controls', { params }),
  get: (id: string): Promise<AxiosResponse<Control>> => 
    api.get(`/api/controls/${id}`),
  create: (data: CreateControlData): Promise<AxiosResponse<Control>> => 
    api.post('/api/controls', data),
  update: (id: string, data: UpdateControlData): Promise<AxiosResponse<Control>> => 
    api.put(`/api/controls/${id}`, data),
  delete: (id: string): Promise<AxiosResponse<void>> => 
    api.delete(`/api/controls/${id}`),
  getCategories: (): Promise<AxiosResponse<string[]>> => 
    api.get('/api/controls/categories'),
  getTags: (): Promise<AxiosResponse<string[]>> => 
    api.get('/api/controls/tags'),
  // Bulk upload endpoints
  bulkUpload: (data: BulkControlUploadData): Promise<AxiosResponse<{ created: number; updated: number; skipped: number }>> =>
    api.post('/api/controls/bulk', data),
  bulkUploadCSV: (data: { csv: string; skipExisting?: boolean; updateExisting?: boolean }): Promise<AxiosResponse<{ created: number; updated: number; skipped: number }>> =>
    api.post('/api/controls/bulk/csv', data),
  getTemplate: (): Promise<AxiosResponse<string>> => 
    api.get('/api/controls/bulk/template', { responseType: 'text' }),
};

export const implementationsApi = {
  list: (params?: PaginationParams & { controlId?: string; status?: string }): Promise<AxiosResponse<ControlImplementation[]>> => 
    api.get('/api/implementations', { params }),
  get: (id: string): Promise<AxiosResponse<ControlImplementation>> => 
    api.get(`/api/implementations/${id}`),
  update: (id: string, data: UpdateImplementationData): Promise<AxiosResponse<ControlImplementation>> => 
    api.put(`/api/implementations/${id}`, data),
  bulkUpdate: (data: { ids: string[]; updates: UpdateImplementationData }): Promise<AxiosResponse<{ updated: number }>> => 
    api.post('/api/implementations/bulk-update', data),
  createTest: (id: string, data: CreateControlTestData): Promise<AxiosResponse<{ id: string }>> => 
    api.post(`/api/implementations/${id}/tests`, data),
  getTests: (id: string): Promise<AxiosResponse<Array<{ id: string; testType: string; result: string; testedAt: string }>>> => 
    api.get(`/api/implementations/${id}/tests`),
};

export const collectorsApi = {
  list: (controlId: string, implementationId: string) =>
    api.get(`/api/controls/${controlId}/implementations/${implementationId}/collectors`),
  get: (controlId: string, implementationId: string, collectorId: string) =>
    api.get(`/api/controls/${controlId}/implementations/${implementationId}/collectors/${collectorId}`),
  create: (controlId: string, implementationId: string, data: CreateCollectorData) =>
    api.post(`/api/controls/${controlId}/implementations/${implementationId}/collectors`, data),
  update: (controlId: string, implementationId: string, collectorId: string, data: UpdateCollectorData) =>
    api.put(`/api/controls/${controlId}/implementations/${implementationId}/collectors/${collectorId}`, data),
  delete: (controlId: string, implementationId: string, collectorId: string) =>
    api.delete(`/api/controls/${controlId}/implementations/${implementationId}/collectors/${collectorId}`),
  test: (controlId: string, implementationId: string, collectorId: string, data?: Record<string, unknown>) =>
    api.post(`/api/controls/${controlId}/implementations/${implementationId}/collectors/${collectorId}/test`, data || {}),
  run: (controlId: string, implementationId: string, collectorId: string) =>
    api.post(`/api/controls/${controlId}/implementations/${implementationId}/collectors/${collectorId}/run`),
  getRuns: (controlId: string, implementationId: string, collectorId: string, limit?: number) =>
    api.get(`/api/controls/${controlId}/implementations/${implementationId}/collectors/${collectorId}/runs`, { params: { limit } }),
};

export const evidenceApi = {
  list: (params?: EvidenceListParams): Promise<AxiosResponse<Evidence[]>> => 
    api.get('/api/evidence', { params }),
  get: (id: string): Promise<AxiosResponse<Evidence>> => 
    api.get(`/api/evidence/${id}`),
  upload: (file: File, data: UploadEvidenceData): Promise<{ data: Evidence }> => {
    const formData = new FormData();
    formData.append('file', file);
    Object.keys(data).forEach((key) => {
      const value = (data as unknown as Record<string, unknown>)[key];
      if (value !== undefined && value !== null) {
        // Handle arrays (like controlIds)
        if (Array.isArray(value)) {
          value.forEach((item) => {
            formData.append(key, String(item));
          });
        } else {
          formData.append(key, String(value));
        }
      }
    });
    // Use fetch directly for FormData to avoid axios Content-Type issues
    return fetch('/api/evidence', {
      method: 'POST',
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message || 'Upload failed');
      }
      return { data: await res.json() as Evidence };
    });
  },
  update: (id: string, data: UpdateEvidenceData): Promise<AxiosResponse<Evidence>> => 
    api.put(`/api/evidence/${id}`, data),
  delete: (id: string): Promise<AxiosResponse<void>> => 
    api.delete(`/api/evidence/${id}`),
  getDownloadUrl: (id: string): Promise<AxiosResponse<{ url: string }>> => 
    api.get(`/api/evidence/${id}/download`),
  review: (id: string, data: ReviewEvidenceData): Promise<AxiosResponse<Evidence>> => 
    api.post(`/api/evidence/${id}/review`, data),
  link: (id: string, controlIds: string[]): Promise<AxiosResponse<void>> => 
    api.post(`/api/evidence/${id}/link`, { controlIds }),
  unlink: (id: string, controlId: string): Promise<AxiosResponse<void>> => 
    api.delete(`/api/evidence/${id}/link/${controlId}`),
  getStats: (): Promise<AxiosResponse<{ total: number; pending: number; approved: number; expiring: number; pendingReview?: number; expiringSoon?: number; expired?: number }>> => 
    api.get('/api/evidence/stats'),
  getFolders: (parentId?: string): Promise<AxiosResponse<EvidenceFolder[]>> => 
    api.get('/api/evidence/folders', { params: { parentId } }),
  createFolder: (data: CreateEvidenceFolderData): Promise<AxiosResponse<EvidenceFolder>> => 
    api.post('/api/evidence/folders', data),
};

export const frameworksApi = {
  list: (): Promise<AxiosResponse<Framework[]>> => 
    api.get('/api/frameworks'),
  get: (id: string): Promise<AxiosResponse<Framework>> => 
    api.get(`/api/frameworks/${id}`),
  create: (data: CreateFrameworkData): Promise<AxiosResponse<Framework>> =>
    api.post('/api/frameworks', data),
  update: (id: string, data: UpdateFrameworkData): Promise<AxiosResponse<Framework>> => 
    api.put(`/api/frameworks/${id}`, data),
  delete: (id: string): Promise<AxiosResponse<void>> => 
    api.delete(`/api/frameworks/${id}`),
  getRequirements: (id: string, parentId?: string): Promise<AxiosResponse<FrameworkRequirement[]>> =>
    api.get(`/api/frameworks/${id}/requirements`, { params: { parentId } }),
  getRequirementTree: (id: string): Promise<AxiosResponse<FrameworkRequirement[]>> => 
    api.get(`/api/frameworks/${id}/requirements/tree`),
  getRequirement: (frameworkId: string, requirementId: string): Promise<AxiosResponse<FrameworkRequirement>> =>
    api.get(`/api/frameworks/${frameworkId}/requirements/${requirementId}`),
  createRequirement: (frameworkId: string, data: CreateRequirementData): Promise<AxiosResponse<FrameworkRequirement>> =>
    api.post(`/api/frameworks/${frameworkId}/requirements`, data),
  bulkUploadRequirements: (frameworkId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/api/frameworks/${frameworkId}/requirements/bulk-upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateRequirement: (frameworkId: string, requirementId: string, data: UpdateRequirementData): Promise<AxiosResponse<FrameworkRequirement>> =>
    api.put(`/api/frameworks/${frameworkId}/requirements/${requirementId}`, data),
  getReadiness: (id: string): Promise<AxiosResponse<{ 
    score: number; 
    requirements: number; 
    compliant: number;
    requirementsByStatus?: {
      compliant: number;
      partial: number;
      non_compliant: number;
      not_applicable: number;
      not_assessed: number;
    };
  }>> => 
    api.get(`/api/frameworks/${id}/readiness`),
  // Seed endpoints
  getSeedStatus: (): Promise<AxiosResponse<{ seeded: boolean }>> => 
    api.get('/api/frameworks/seed/status'),
  seed: (): Promise<AxiosResponse<{ message: string }>> => 
    api.post('/api/frameworks/seed'),
};

export const usersApi = {
  list: (params?: UserListParams): Promise<AxiosResponse<{ data: User[]; total: number }>> =>
    api.get('/api/users', { params }),
  get: (id: string): Promise<AxiosResponse<User>> => 
    api.get(`/api/users/${id}`),
  getMe: (): Promise<AxiosResponse<User>> => 
    api.get('/api/users/me'),
  getStats: (): Promise<AxiosResponse<{ total: number; active: number; inactive: number; byRole: Record<string, number> }>> => 
    api.get('/api/users/stats'),
  create: (data: CreateUserData): Promise<AxiosResponse<User>> => 
    api.post('/api/users', data),
  update: (id: string, data: UpdateUserData): Promise<AxiosResponse<User>> => 
    api.put(`/api/users/${id}`, data),
  deactivate: (id: string): Promise<AxiosResponse<User>> => 
    api.post(`/api/users/${id}/deactivate`),
  reactivate: (id: string): Promise<AxiosResponse<User>> => 
    api.post(`/api/users/${id}/reactivate`),
  getPermissions: (id: string): Promise<AxiosResponse<Permission[]>> => 
    api.get(`/api/users/${id}/permissions`),
  getGroups: (id: string): Promise<AxiosResponse<Array<{ id: string; name: string }>>> => 
    api.get(`/api/users/${id}/groups`),
  addToGroup: (userId: string, groupId: string): Promise<AxiosResponse<void>> => 
    api.post(`/api/users/${userId}/groups/${groupId}`),
  removeFromGroup: (userId: string, groupId: string): Promise<AxiosResponse<void>> => 
    api.post(`/api/users/${userId}/groups/${groupId}/remove`),
  sync: (data: { keycloakId: string; email: string; firstName?: string; lastName?: string; roles?: string[] }): Promise<AxiosResponse<User>> =>
    api.post('/api/users/sync', data),
};

export const permissionsApi = {
  // Permission Groups
  listGroups: () => api.get('/api/permissions/groups'),
  getGroup: (id: string) => api.get(`/api/permissions/groups/${id}`),
  createGroup: (data: CreatePermissionGroupData) =>
    api.post('/api/permissions/groups', data),
  updateGroup: (id: string, data: UpdatePermissionGroupData) =>
    api.put(`/api/permissions/groups/${id}`, data),
  deleteGroup: (id: string) => api.delete(`/api/permissions/groups/${id}`),
  getGroupMembers: (id: string): Promise<AxiosResponse<User[]>> => 
    api.get(`/api/permissions/groups/${id}/members`),
  addGroupMember: (groupId: string, userId: string) =>
    api.post(`/api/permissions/groups/${groupId}/members`, { userId }),
  removeGroupMember: (groupId: string, userId: string) =>
    api.delete(`/api/permissions/groups/${groupId}/members/${userId}`),
  
  // User Permissions
  getUserPermissions: (userId: string): Promise<AxiosResponse<UserPermissionsResponse>> => 
    api.get(`/api/permissions/users/${userId}`),
  setUserOverrides: (userId: string, overrides: UserPermissionOverride[]) =>
    api.put(`/api/permissions/users/${userId}/overrides`, { overrides }),
  getUserOverrides: (userId: string): Promise<AxiosResponse<UserPermissionOverride[]>> => 
    api.get(`/api/permissions/users/${userId}/overrides`),
  
  // Check Permission
  checkPermission: (resource: string, action: string, resourceId?: string): Promise<AxiosResponse<{ allowed: boolean }>> =>
    api.get('/api/permissions/check', {
      headers: {
        'x-check-resource': resource,
        'x-check-action': action,
        'x-check-resource-id': resourceId || '',
      },
    }),
  
  // Available permissions
  getAvailable: (): Promise<AxiosResponse<Permission[]>> => 
    api.get('/api/permissions/available'),

  // Module configuration (org-level)
  getModules: (): Promise<AxiosResponse<{ enabledModules: string[] }>> =>
    api.get(`${CONTROLS_API_URL}/api/modules`),
  updateModules: (enabledModules: string[]): Promise<AxiosResponse<{ enabledModules: string[] }>> =>
    api.put(`${CONTROLS_API_URL}/api/modules`, { enabledModules }),
  
  // Seed default groups
  seedDefaults: () => api.post('/api/permissions/seed'),
};

interface PolicyListResponse {
  data: Policy[];
  total?: number;
}

export const policiesApi = {
  list: (params?: PolicyListParams): Promise<AxiosResponse<PolicyListResponse>> => 
    api.get('/api/policies', { params }),
  get: (id: string): Promise<AxiosResponse<Policy>> => 
    api.get(`/api/policies/${id}`),
  getStats: (): Promise<AxiosResponse<{ 
    total: number; 
    byStatus: Record<string, number>; 
    byType: Record<string, number>;
    published?: number;
    approved?: number;
    inReview?: number;
    draft?: number;
    overdueReview?: number;
  }>> => 
    api.get('/api/policies/stats'),
  upload: async (file: File, data: UploadPolicyData): Promise<Policy> => {
    const formData = new FormData();
    formData.append('file', file);
    Object.keys(data).forEach((key) => {
      const value = (data as unknown as Record<string, unknown>)[key];
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((item) => formData.append(key, String(item)));
        } else {
          formData.append(key, String(value));
        }
      }
    });
    const response = await fetch('/api/policies', {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to upload policy');
    }
    return response.json() as Promise<Policy>;
  },
  update: (id: string, data: UpdatePolicyData): Promise<AxiosResponse<Policy>> => 
    api.put(`/api/policies/${id}`, data),
  updateStatus: (id: string, status: string, notes?: string): Promise<AxiosResponse<Policy>> =>
    api.put(`/api/policies/${id}/status`, { status, notes }),
  delete: (id: string): Promise<AxiosResponse<void>> => 
    api.delete(`/api/policies/${id}`),
  getDownloadUrl: (id: string): Promise<AxiosResponse<{ url: string }>> => 
    api.get(`/api/policies/${id}/download`),
  getPreviewUrl: (id: string): string => `/api/policies/${id}/preview`,
  uploadNewVersion: async (id: string, file: File, versionNumber: string, changeNotes?: string): Promise<Policy> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('versionNumber', versionNumber);
    if (changeNotes) formData.append('changeNotes', changeNotes);
    const response = await fetch(`/api/policies/${id}/versions`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to upload new version');
    }
    return response.json() as Promise<Policy>;
  },
  linkToControls: (id: string, controlIds: string[]): Promise<AxiosResponse<void>> =>
    api.post(`/api/policies/${id}/link`, { controlIds }),
  unlinkFromControl: (id: string, controlId: string): Promise<AxiosResponse<void>> =>
    api.delete(`/api/policies/${id}/link/${controlId}`),
};

export const commentsApi = {
  list: (entityType: string, entityId: string) =>
    api.get('/api/comments', { params: { entityType, entityId } }),
  create: (data: CreateCommentData) =>
    api.post('/api/comments', data),
  update: (id: string, data: UpdateCommentData) =>
    api.put(`/api/comments/${id}`, data),
  delete: (id: string) => api.delete(`/api/comments/${id}`),
};

export const tasksApi = {
  list: (params?: TaskListParams) =>
    api.get('/api/tasks', { params }),
  myTasks: (status?: string) => api.get('/api/tasks/my', { params: { status } }),
  create: (data: CreateTaskData) => api.post('/api/tasks', data),
  update: (id: string, data: UpdateTaskData) => api.put(`/api/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/api/tasks/${id}`),
};

export const assessmentsApi = {
  list: (frameworkId?: string): Promise<AxiosResponse<VendorAssessment[]>> => 
    api.get('/api/assessments', { params: { frameworkId } }),
  get: (id: string): Promise<AxiosResponse<VendorAssessment>> => 
    api.get(`/api/assessments/${id}`),
  create: (data: CreateVendorAssessmentData | Record<string, unknown>): Promise<AxiosResponse<VendorAssessment>> => 
    api.post('/api/assessments', data),
  update: (id: string, data: UpdateVendorAssessmentData | Record<string, unknown>): Promise<AxiosResponse<VendorAssessment>> => 
    api.patch(`/api/assessments/${id}`, data),
  delete: (id: string): Promise<AxiosResponse<void>> => 
    api.delete(`/api/assessments/${id}`),
  updateRequirementStatus: (id: string, requirementId: string, data: AssessmentRequirementUpdate) =>
    api.put(`/api/assessments/${id}/requirements/${requirementId}`, data),
  getGaps: (id: string) => api.get(`/api/assessments/${id}/gaps`),
  createGap: (id: string, data: CreateGapData) => api.post(`/api/assessments/${id}/gaps`, data),
  generateGaps: (id: string) => api.post(`/api/assessments/${id}/gaps/generate`),
  createRemediation: (id: string, data: CreateRemediationData) => api.post(`/api/assessments/${id}/remediation`, data),
  updateRemediation: (id: string, taskId: string, data: UpdateRemediationData) =>
    api.put(`/api/assessments/${id}/remediation/${taskId}`, data),
  complete: (id: string) => api.post(`/api/assessments/${id}/complete`),
};

export const mappingsApi = {
  list: (params?: MappingListParams) => api.get('/api/mappings', { params }),
  byControl: (controlId: string) => api.get(`/api/mappings/by-control/${controlId}`),
  byRequirement: (requirementId: string) => api.get(`/api/mappings/by-requirement/${requirementId}`),
  controlCoverage: () => api.get('/api/mappings/control-coverage'),
  requirementCoverage: (frameworkId: string) =>
    api.get(`/api/mappings/requirement-coverage/${frameworkId}`),
  create: (data: CreateMappingData) => api.post('/api/mappings', data),
  bulkCreate: (data: BulkMappingData) => api.post('/api/mappings/bulk', data),
  delete: (id: string) => api.delete(`/api/mappings/${id}`),
};

// Full dashboard response type for consolidated endpoint
export interface FullDashboardResponse {
  summary: {
    complianceScore: { overall: number; byFramework: Record<string, number> };
    controls: { total: number; byStatus: Record<string, number>; byCategory: Record<string, number>; overdue: number };
    evidence: { total: number; pendingReview: number; expiringSoon: number; expired: number };
    upcomingTests: unknown[];
    recentActivity: unknown[];
  };
  frameworks: Array<{
    id: string;
    name: string;
    type: string;
    version: string;
    requirementCount: number;
    readiness: { score: number; total: number; compliant: number };
  }>;
  policyStats: {
    total: number;
    draft: number;
    inReview: number;
    approved: number;
    published: number;
    overdueReview: number;
  };
  riskSummary: {
    risks: Array<{ id: string; riskId: string; title: string; likelihood: string; impact: string; inherentRisk: string }>;
    total: number;
    byLevel: Record<string, number>;
  };
  vendorSummary: {
    total: number;
    recentVendors: Array<{ id: string; name: string; criticality: string; status: string }>;
    byCriticality: Record<string, number>;
    byStatus: Record<string, number>;
    active: number;
    pendingReview: number;
  };
  generatedAt: string;
}

export const dashboardApi = {
  // Consolidated endpoint - use this for initial dashboard load (reduces 6 API calls to 1)
  getFull: (): Promise<AxiosResponse<FullDashboardResponse>> => 
    api.get('/api/dashboard/full'),
  // Individual endpoints (kept for backward compatibility and specific use cases)
  getSummary: () => api.get('/api/dashboard/summary'),
  getComplianceScore: () => api.get('/api/dashboard/compliance-score'),
  getComplianceTrend: (days?: number) =>
    api.get('/api/dashboard/compliance-trend', { params: { days } }),
  getControlStats: () => api.get('/api/dashboard/controls-stats'),
  getEvidenceStats: () => api.get('/api/dashboard/evidence-stats'),
  getUpcomingTests: () => api.get('/api/dashboard/upcoming-tests'),
  getRecentActivity: () => api.get('/api/dashboard/recent-activity'),
};

export const integrationsApi = {
  list: (params?: IntegrationListParams): Promise<AxiosResponse<Integration[]>> =>
    api.get('/api/integrations', { params }),
  get: (id: string): Promise<AxiosResponse<Integration>> => 
    api.get(`/api/integrations/${id}`),
  getStats: (): Promise<AxiosResponse<{ total: number; active: number; byType: Record<string, number>; byStatus?: Record<string, number>; totalEvidenceCollected?: number }>> => 
    api.get('/api/integrations/stats'),
  getTypes: () => api.get('/api/integrations/types'),
  create: (data: CreateIntegrationData): Promise<AxiosResponse<Integration>> =>
    api.post('/api/integrations', data),
  update: (id: string, data: UpdateIntegrationData): Promise<AxiosResponse<Integration>> =>
    api.put(`/api/integrations/${id}`, data),
  delete: (id: string): Promise<AxiosResponse<void>> => 
    api.delete(`/api/integrations/${id}`),
  testConnection: (id: string) => api.post(`/api/integrations/${id}/test`),
  triggerSync: (id: string) => api.post(`/api/integrations/${id}/sync`),
  
  // Custom integration config
  getCustomConfig: (id: string): Promise<AxiosResponse<CustomIntegrationConfig>> => 
    api.get(`/api/integrations/${id}/custom-config`),
  saveCustomConfig: (id: string, config: CustomIntegrationConfig) => 
    api.put(`/api/integrations/${id}/custom-config`, config),
  testCustomEndpoint: (id: string, data?: { endpointIndex?: number; baseUrl?: string; authConfig?: Record<string, unknown> }) =>
    api.post(`/api/integrations/${id}/custom-config/test`, data || {}),
  validateCode: (code: string) => api.post('/api/integrations/custom-config/validate', { code }),
  getCodeTemplate: () => api.get('/api/integrations/custom/template'),
  executeCustomSync: (id: string) => api.post(`/api/integrations/${id}/custom-sync`),
};

export const configAsCodeApi = {
  export: (data: {
    format: 'yaml' | 'json' | 'terraform';
    resources?: string[];
    workspaceId?: string;
  }) => api.post('/api/config-as-code/export', data),
  import: (data: {
    format: 'yaml' | 'json' | 'terraform';
    config: string;
    dryRun?: boolean;
    skipExisting?: boolean;
    updateExisting?: boolean;
  }) => api.post('/api/config-as-code/import', data),
  // File management endpoints
  listFiles: (workspaceId?: string, initialize?: boolean) => 
    api.get('/api/config-as-code/files', { 
      params: { 
        ...(workspaceId ? { workspaceId } : {}),
        ...(initialize ? { initialize: 'true' } : {}),
      } 
    }),
  getFile: (path: string, workspaceId?: string) => 
    api.get(`/api/config-as-code/files/${encodeURIComponent(path)}`, { params: workspaceId ? { workspaceId } : {} }),
  createFile: (data: {
    path: string;
    format: 'terraform' | 'yaml' | 'json';
    content: string;
    workspaceId?: string;
    commitMessage?: string;
  }) => api.post('/api/config-as-code/files', data),
  updateFile: (path: string, data: { content: string; commitMessage?: string }, workspaceId?: string) => 
    api.put(`/api/config-as-code/files/${encodeURIComponent(path)}`, data, { params: workspaceId ? { workspaceId } : {} }),
  deleteFile: (path: string, workspaceId?: string) => 
    api.delete(`/api/config-as-code/files/${encodeURIComponent(path)}`, { params: workspaceId ? { workspaceId } : {} }),
  previewChanges: (data: {
    path: string;
    content: string;
    format: 'terraform' | 'yaml' | 'json';
  }) => api.post('/api/config-as-code/files/preview', data),
  applyChanges: (data: {
    path: string;
    content: string;
    format: 'terraform' | 'yaml' | 'json';
    commitMessage?: string;
  }, workspaceId?: string) => 
    api.post('/api/config-as-code/files/apply', data, { params: workspaceId ? { workspaceId } : {} }),
  getVersionHistory: (path: string, workspaceId?: string) => 
    api.get(`/api/config-as-code/files/${encodeURIComponent(path)}/versions`, { params: workspaceId ? { workspaceId } : {} }),
  refreshFromDatabase: (workspaceId?: string) =>
    api.post('/api/config-as-code/files/refresh', {}, { params: workspaceId ? { workspaceId } : {} }),
};

export const auditApi = {
  list: (params?: AuditLogListParams) => {
    // Filter out empty string values to avoid validation errors
    const cleanParams = params ? Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
    ) : undefined;
    return api.get('/api/audit', { params: cleanParams });
  },
  get: (id: string) => api.get(`/api/audit/${id}`),
  getStats: (startDate?: string, endDate?: string) =>
    api.get('/api/audit/stats', { params: { startDate, endDate } }),
  getFilters: () => api.get('/api/audit/filters'),
  getByEntity: (entityType: string, entityId: string, limit?: number) =>
    api.get(`/api/audit/entity/${entityType}/${entityId}`, { params: { limit } }),
  export: (params?: {
    entityType?: string;
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get('/api/audit/export', { params, responseType: 'blob' }),
};

export const auditsApi = {
  list: (params?: AuditListParams): Promise<AxiosResponse<Audit[]>> =>
    api.get('/api/audits', { params }),
  get: (id: string): Promise<AxiosResponse<Audit>> => 
    api.get(`/api/audits/${id}`),
  create: (data: CreateAuditData): Promise<AxiosResponse<Audit>> => 
    api.post('/api/audits', data),
  update: (id: string, data: UpdateAuditData): Promise<AxiosResponse<Audit>> => 
    api.patch(`/api/audits/${id}`, data),
  delete: (id: string): Promise<AxiosResponse<void>> => 
    api.delete(`/api/audits/${id}`),
};

export const auditRequestsApi = {
  list: (params?: { status?: string; auditId?: string; assigneeId?: string }) =>
    api.get('/api/audit-requests', { params }),
  get: (id: string) => api.get(`/api/audit-requests/${id}`),
  create: (data: { auditId: string; title: string; description?: string; assigneeId?: string; dueDate?: string }) => 
    api.post('/api/audit-requests', data),
  update: (id: string, data: { title?: string; description?: string; status?: string; assigneeId?: string; dueDate?: string }) => 
    api.patch(`/api/audit-requests/${id}`, data),
  delete: (id: string) => api.delete(`/api/audit-requests/${id}`),
};

export const auditFindingsApi = {
  list: (params?: FindingListParams): Promise<AxiosResponse<AuditFinding[]>> =>
    api.get('/api/findings', { params }),
  get: (id: string): Promise<AxiosResponse<AuditFinding>> => 
    api.get(`/api/findings/${id}`),
  getStats: () => api.get('/api/findings/stats'),
  create: (data: CreateFindingData | Record<string, unknown>): Promise<AxiosResponse<AuditFinding>> => 
    api.post('/api/findings', data),
  update: (id: string, data: UpdateFindingData): Promise<AxiosResponse<AuditFinding>> => 
    api.patch(`/api/findings/${id}`, data),
  delete: (id: string): Promise<AxiosResponse<void>> => 
    api.delete(`/api/findings/${id}`),
  bulkUpdateStatus: (ids: string[], status: string) =>
    api.post('/api/findings/bulk/status', { ids, status }),
};

// Audit Templates
export const auditTemplatesApi = {
  list: (params?: { auditType?: string; framework?: string }) =>
    api.get('/api/audit/templates', { params }),
  get: (id: string) => api.get(`/api/audit/templates/${id}`),
  create: (data: Record<string, unknown>) => api.post('/api/audit/templates', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/api/audit/templates/${id}`, data),
  delete: (id: string) => api.delete(`/api/audit/templates/${id}`),
  clone: (id: string, name?: string) => api.post(`/api/audit/templates/${id}/clone`, { name }),
  createAuditFromTemplate: (data: { templateId: string; name: string; description?: string }) =>
    api.post('/api/audit/templates/create-audit', data),
};

// Audit Workpapers
export const auditWorkpapersApi = {
  list: (params?: { auditId?: string }) => api.get('/api/audit/workpapers', { params }),
  get: (id: string) => api.get(`/api/audit/workpapers/${id}`),
  create: (data: Record<string, unknown>) => api.post('/api/audit/workpapers', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/api/audit/workpapers/${id}`, data),
  delete: (id: string) => api.delete(`/api/audit/workpapers/${id}`),
  submit: (id: string) => api.post(`/api/audit/workpapers/${id}/submit`),
  review: (id: string, approved: boolean, notes: string) =>
    api.post(`/api/audit/workpapers/${id}/review`, { approved, notes }),
  approve: (id: string, notes?: string) =>
    api.post(`/api/audit/workpapers/${id}/approve`, { notes }),
};

// Audit Test Procedures
export const auditTestProceduresApi = {
  list: (params?: { auditId?: string; controlId?: string }) =>
    api.get('/api/audit/test-procedures', { params }),
  get: (id: string) => api.get(`/api/audit/test-procedures/${id}`),
  create: (data: Record<string, unknown>) => api.post('/api/audit/test-procedures', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/api/audit/test-procedures/${id}`, data),
  delete: (id: string) => api.delete(`/api/audit/test-procedures/${id}`),
  recordResult: (id: string, data: Record<string, unknown>) =>
    api.post(`/api/audit/test-procedures/${id}/record-result`, data),
  review: (id: string, notes: string) =>
    api.post(`/api/audit/test-procedures/${id}/review`, { notes }),
  getStats: (auditId?: string) =>
    api.get('/api/audit/test-procedures/stats', { params: { auditId } }),
};

// Audit Remediation Plans (POA&M)
export const auditRemediationApi = {
  listPlans: (status?: string) => api.get('/api/audit/remediation', { params: { status } }),
  getPlan: (id: string) => api.get(`/api/audit/remediation/${id}`),
  createPlan: (data: Record<string, unknown>) => api.post('/api/audit/remediation', data),
  updatePlan: (id: string, data: Record<string, unknown>) => api.put(`/api/audit/remediation/${id}`, data),
  completePlan: (id: string) => api.post(`/api/audit/remediation/${id}/complete`),
  addMilestone: (planId: string, data: Record<string, unknown>) =>
    api.post(`/api/audit/remediation/${planId}/milestones`, data),
  updateMilestone: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/audit/remediation/milestones/${id}`, data),
  deleteMilestone: (id: string) => api.delete(`/api/audit/remediation/milestones/${id}`),
  getStats: () => api.get('/api/audit/remediation/stats'),
  exportPOAM: (format?: 'json' | 'csv') =>
    api.get('/api/audit/remediation/export', { params: { format } }),
};

// Audit Analytics
export const auditAnalyticsApi = {
  getDashboard: () => api.get('/api/audit/analytics/dashboard'),
  getTrends: (period?: 'monthly' | 'quarterly' | 'yearly') =>
    api.get('/api/audit/analytics/trends', { params: { period } }),
  getFindings: () => api.get('/api/audit/analytics/findings'),
  getCoverage: (auditId?: string) =>
    api.get('/api/audit/analytics/coverage', { params: { auditId } }),
  createSnapshot: (type?: string) =>
    api.post('/api/audit/analytics/snapshot', null, { params: { type } }),
};

// Audit Planning
export const auditPlanningApi = {
  list: (params?: { year?: number; status?: string }) =>
    api.get('/api/audit/planning', { params }),
  get: (id: string) => api.get(`/api/audit/planning/${id}`),
  create: (data: Record<string, unknown>) => api.post('/api/audit/planning', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/api/audit/planning/${id}`, data),
  delete: (id: string) => api.delete(`/api/audit/planning/${id}`),
  getCalendar: (startYear: number, endYear: number) =>
    api.get('/api/audit/planning/calendar', { params: { startYear, endYear } }),
  getCapacity: (year: number) =>
    api.get('/api/audit/planning/capacity', { params: { year } }),
  convertToAudit: (id: string) => api.post(`/api/audit/planning/${id}/convert-to-audit`),
};

// Audit Reports
export const auditReportsApi = {
  listTypes: () => api.get('/api/audit/reports/types'),
  generate: (auditId: string, type?: string, options?: Record<string, unknown>) =>
    api.post(`/api/audit/reports/${auditId}`, options, { params: { type } }),
  getExecutive: (auditId: string) => api.get(`/api/audit/reports/${auditId}/executive`),
  getManagementLetter: (auditId: string) => api.get(`/api/audit/reports/${auditId}/management-letter`),
  getFindingsSummary: (auditId: string) => api.get(`/api/audit/reports/${auditId}/findings`),
};

// Audit AI
export const auditAIApi = {
  categorizeFinding: (data: { title: string; description: string; context?: string; framework?: string }) =>
    api.post('/api/audit/audit-ai/categorize-finding', data),
  analyzeGaps: (data: { auditId: string; controlIds?: string[] }) =>
    api.post('/api/audit/audit-ai/analyze-gaps', data),
  suggestRemediation: (data: { findingId: string }) =>
    api.post('/api/audit/audit-ai/suggest-remediation', data),
  mapControls: (data: { requestTitle: string; requestDescription: string; framework?: string }) =>
    api.post('/api/audit/audit-ai/map-controls', data),
  generateSummary: (data: { auditId: string; summaryType?: string }) =>
    api.post('/api/audit/audit-ai/generate-summary', data),
};

interface VendorListResponse {
  data: Vendor[];
  total?: number;
}

export const vendorsApi = {
  list: (params?: VendorListParams): Promise<AxiosResponse<VendorListResponse>> => 
    api.get('/api/vendors', { params }),
  get: (id: string): Promise<AxiosResponse<Vendor>> => 
    api.get(`/api/vendors/${id}`),
  create: (data: CreateVendorData): Promise<AxiosResponse<Vendor>> => 
    api.post('/api/vendors', data),
  update: (id: string, data: UpdateVendorData): Promise<AxiosResponse<Vendor>> => 
    api.patch(`/api/vendors/${id}`, data),
  delete: (id: string): Promise<AxiosResponse<void>> => 
    api.delete(`/api/vendors/${id}`),
  // Review scheduling endpoints
  getReviewsDue: (): Promise<AxiosResponse<VendorReviewsDueResponse>> =>
    api.get('/api/vendors/reviews-due'),
  completeReview: (id: string): Promise<AxiosResponse<Vendor>> =>
    api.patch(`/api/vendors/${id}/complete-review`),
  // AI analysis endpoints
  analyzeDocument: (vendorId: string, documentId: string): Promise<AxiosResponse<SOC2AnalysisResult>> =>
    api.post(`/api/vendors/${vendorId}/documents/${documentId}/analyze`),
  // Risk Assessment Wizard endpoints
  submitRiskAssessment: (vendorId: string, data: VendorRiskAssessmentRequest): Promise<AxiosResponse<VendorRiskAssessmentResult>> =>
    api.post(`/api/vendors/${vendorId}/risk-assessment`, data),
  getLatestRiskAssessment: (vendorId: string): Promise<AxiosResponse<VendorRiskAssessmentResult | null>> =>
    api.get(`/api/vendors/${vendorId}/risk-assessment/latest`),
  getRiskAssessmentHistory: (vendorId: string): Promise<AxiosResponse<VendorRiskAssessmentResult[]>> =>
    api.get(`/api/vendors/${vendorId}/risk-assessment/history`),
  // Security Scan endpoints
  initiateSecurityScan: (vendorId: string, targetUrl?: string): Promise<AxiosResponse<VendorSecurityScanResult>> =>
    api.post(`/api/vendors/${vendorId}/security-scan`, { targetUrl }),
  getLatestSecurityScan: (vendorId: string): Promise<AxiosResponse<VendorSecurityScanResult | null>> =>
    api.get(`/api/vendors/${vendorId}/security-scan/latest`),
  getSecurityScan: (vendorId: string, scanId: string): Promise<AxiosResponse<VendorSecurityScanResult>> =>
    api.get(`/api/vendors/${vendorId}/security-scan/${scanId}`),
};

// Types for vendor reviews
export interface VendorReviewsDueResponse {
  overdue: VendorReviewItem[];
  dueThisWeek: VendorReviewItem[];
  dueThisMonth: VendorReviewItem[];
  summary: {
    overdueCount: number;
    dueThisWeekCount: number;
    dueThisMonthCount: number;
    upcomingCount: number;
  };
}

export interface VendorReviewItem {
  id: string;
  name: string;
  vendorId: string;
  tier: string;
  inherentRiskScore?: string;
  nextReviewDue: string;
  lastReviewedAt?: string;
  reviewFrequency?: string;
  daysOverdue?: number;
  daysUntilDue?: number;
}

// Types for SOC 2 analysis
export interface SOC2AnalysisResult {
  documentId: string;
  vendorId: string;
  analyzedAt: string;
  reportPeriod?: {
    startDate: string;
    endDate: string;
  };
  serviceOrganization?: string;
  auditor?: string;
  opinionType?: string;
  exceptions: SOC2Exception[];
  cuecs: CUEC[];
  subserviceOrganizations: SubserviceOrg[];
  controlGaps: ControlGap[];
  suggestedRiskScore: string;
  summary: string;
  confidence: number;
}

export interface SOC2Exception {
  controlId: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  managementResponse?: string;
}

export interface CUEC {
  description: string;
  responsibility: string;
  status: 'implemented' | 'not_implemented' | 'unknown';
}

export interface SubserviceOrg {
  name: string;
  services: string;
  carveOutOrInclusiveMethod: string;
}

export interface ControlGap {
  area: string;
  description: string;
  recommendation: string;
  priority: 'low' | 'medium' | 'high';
}

// Types for Vendor Risk Assessment Wizard
export interface VendorRiskAssessmentRequest {
  title: string;
  description?: string;
  assessor: string;
  assetScore: number;
  threatScore: number;
  likelihood: {
    frequency: number;
    capability: number;
    controlStrength: number;
  };
  impact: {
    productivity: number;
    response: number;
    recovery: number;
    competitive: number;
    legal: number;
    reputation: number;
  };
}

export interface VendorRiskAssessmentResult {
  id: string;
  vendorId: string;
  title: string;
  description?: string;
  assessor: string;
  date: string;
  assetScore: number;
  threatScore: number;
  likelihood: {
    frequency: number;
    capability: number;
    controlStrength: number;
    total: number;
    level: string;
    score: number;
  };
  impact: {
    productivity: number;
    response: number;
    recovery: number;
    competitive: number;
    legal: number;
    reputation: number;
    total: number;
    level: string;
    score: number;
  };
  totalScore: number;
  riskLevel: 'Minimal' | 'Low' | 'Medium' | 'High' | 'Critical';
  recommendedAction: string;
  nextReviewDate: string;
}

// Types for Vendor Security Scan
export interface VendorSecurityFinding {
  id: string;
  category: 'Security' | 'Breach' | 'Reputation' | 'Compliance';
  level: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
  title: string;
  description: string;
  impact: string;
  remediation: string;
}

export interface VendorSecurityScanResult {
  id: string;
  vendorId: string;
  targetUrl: string;
  scannedAt: string;
  status: 'completed' | 'failed' | 'partial';
  ssl: {
    enabled: boolean;
    grade: string;
    issuer?: string;
    expiry?: string;
    daysUntilExpiry?: number;
    httpRedirectsToHttps: boolean;
  };
  securityHeaders: Record<string, string>;
  missingHeaders: string[];
  dns: {
    hasSPF: boolean;
    hasDMARC: boolean;
    hasDNSSEC: boolean;
    hasCAA: boolean;
  };
  webPresence: {
    accessible: boolean;
    statusCode?: number;
    title?: string;
    hasContactInfo: boolean;
    hasPrivacyPolicy: boolean;
  };
  compliance: {
    hasTrustPortal: boolean;
    trustPortalUrl?: string;
    trustPortalProvider?: string;
    hasSOC2: boolean;
    soc2Type?: string;
    hasISO27001: boolean;
    certifications: string[];
    hasBugBounty: boolean;
  };
  categoryScores: {
    security: number;
    breach: number;
    reputation: number;
    compliance: number;
  };
  overallScore: number;
  riskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  findings: VendorSecurityFinding[];
  summary: string;
  keyRisks: string[];
  recommendations: string[];
}

export const contractsApi = {
  list: (): Promise<AxiosResponse<Contract[]>> => 
    api.get('/api/contracts'),
  get: (id: string): Promise<AxiosResponse<Contract>> => 
    api.get(`/api/contracts/${id}`),
  create: (data: CreateContractData): Promise<AxiosResponse<Contract>> => 
    api.post('/api/contracts', data),
  update: (id: string, data: UpdateContractData): Promise<AxiosResponse<Contract>> => 
    api.patch(`/api/contracts/${id}`, data),
  delete: (id: string): Promise<AxiosResponse<void>> => 
    api.delete(`/api/contracts/${id}`),
};

export interface QuestionnaireQueueItem {
  id: string;
  title: string;
  requesterName: string;
  company?: string;
  status: string;
  priority: string;
  dueDate?: string;
  totalQuestions: number;
  answeredQuestions: number;
  progress: number;
}

export interface QuestionnaireDashboardQueue {
  overdue: QuestionnaireQueueItem[];
  dueThisWeek: QuestionnaireQueueItem[];
  dueNextWeek: QuestionnaireQueueItem[];
  highPriority: QuestionnaireQueueItem[];
  summary: {
    overdueCount: number;
    dueThisWeekCount: number;
    dueNextWeekCount: number;
    highPriorityCount: number;
  };
}

export const questionnairesApi = {
  list: (params?: { status?: string; organizationId?: string }): Promise<AxiosResponse<Questionnaire[]>> => 
    api.get('/api/questionnaires', { params }),
  get: (id: string): Promise<AxiosResponse<Questionnaire>> => 
    api.get(`/api/questionnaires/${id}`),
  create: (data: CreateQuestionnaireData): Promise<AxiosResponse<Questionnaire>> => 
    api.post('/api/questionnaires', data),
  update: (id: string, data: UpdateQuestionnaireData): Promise<AxiosResponse<Questionnaire>> => 
    api.patch(`/api/questionnaires/${id}`, data),
  delete: (id: string): Promise<AxiosResponse<void>> => 
    api.delete(`/api/questionnaires/${id}`),
  createQuestion: (data: CreateQuestionData) => api.post('/api/questionnaires/questions', data),
  updateQuestion: (id: string, data: UpdateQuestionData) => api.patch(`/api/questionnaires/questions/${id}`, data),
  deleteQuestion: (id: string) => api.delete(`/api/questionnaires/questions/${id}`),
  getStats: (organizationId: string) => api.get('/api/questionnaires/stats', { params: { organizationId } }),
  getDashboardQueue: (organizationId: string): Promise<AxiosResponse<QuestionnaireDashboardQueue>> => 
    api.get('/api/questionnaires/dashboard-queue', { params: { organizationId } }),
  getMyQueue: (organizationId: string) => api.get('/api/questionnaires/my-queue', { params: { organizationId } }),
  getAnalytics: (organizationId: string, startDate?: string, endDate?: string) => 
    api.get('/api/questionnaires/analytics', { params: { organizationId, startDate, endDate } }),
  findSimilarQuestions: (organizationId: string, questionText: string, excludeId?: string) =>
    api.get('/api/questionnaires/similar-questions', { params: { organizationId, questionText, excludeId } }),
  getAnswerSuggestions: (organizationId: string, questionText: string) =>
    api.get('/api/questionnaires/answer-suggestions', { params: { organizationId, questionText } }),
  findDuplicates: (questionnaireId: string) =>
    api.get(`/api/questionnaires/${questionnaireId}/duplicates`),
  exportQuestionnaire: (id: string, format: 'excel' | 'csv' | 'json' = 'excel') =>
    api.get(`/api/questionnaires/${id}/export`, { 
      params: { format },
      responseType: 'blob' 
    }),
  exportBatch: (ids: string[], format: 'excel' | 'json' = 'excel') =>
    api.post('/api/questionnaires/export-batch', { ids, format }, { responseType: 'blob' }),
};

export const knowledgeBaseApi = {
  list: (params?: KnowledgeBaseListParams): Promise<AxiosResponse<KnowledgeBaseEntry[]>> => 
    api.get('/api/knowledge-base', { params }),
  get: (id: string): Promise<AxiosResponse<KnowledgeBaseEntry>> => 
    api.get(`/api/knowledge-base/${id}`),
  create: (data: CreateKnowledgeBaseData): Promise<AxiosResponse<KnowledgeBaseEntry>> => 
    api.post('/api/knowledge-base', data),
  update: (id: string, data: UpdateKnowledgeBaseData): Promise<AxiosResponse<KnowledgeBaseEntry>> => 
    api.patch(`/api/knowledge-base/${id}`, data),
  delete: (id: string): Promise<AxiosResponse<void>> => 
    api.delete(`/api/knowledge-base/${id}`),
  bulkCreate: (data: { entries: CreateKnowledgeBaseData[] }) => api.post('/api/knowledge-base/bulk', data),
  approve: (id: string) => api.post(`/api/knowledge-base/${id}/approve`),
  incrementUsage: (id: string) => api.post(`/api/knowledge-base/${id}/use`),
  search: (organizationId: string, query: string): Promise<AxiosResponse<KnowledgeBaseEntry[]>> => 
    api.get('/api/knowledge-base/search', { params: { organizationId, q: query } }),
  getStats: (organizationId: string) => api.get('/api/knowledge-base/stats', { params: { organizationId } }),
};

export const trustCenterApi = {
  getConfig: (params?: { organizationId?: string }): Promise<AxiosResponse<TrustCenterConfig>> => 
    api.get('/api/trust-center/config', { params }),
  updateConfig: (data: UpdateTrustCenterConfigData, params?: { organizationId?: string }): Promise<AxiosResponse<TrustCenterConfig>> =>
    api.patch('/api/trust-center/config', data, { params }),
  getContent: (params?: { organizationId?: string; section?: string }): Promise<AxiosResponse<TrustCenterContent[]>> => 
    api.get('/api/trust-center/content', { params }),
  createContent: (data: CreateTrustCenterContentData): Promise<AxiosResponse<TrustCenterContent>> => 
    api.post('/api/trust-center/content', data),
  updateContent: (id: string, data: UpdateTrustCenterContentData): Promise<AxiosResponse<TrustCenterContent>> => 
    api.patch(`/api/trust-center/content/${id}`, data),
  deleteContent: (id: string): Promise<AxiosResponse<void>> => 
    api.delete(`/api/trust-center/content/${id}`),
  getPublic: (params?: { organizationId?: string }) => api.get('/api/trust-center/public', { params }),
};

// Trust Module Configuration
export interface SlaSettings {
  urgent: { targetHours: number; warningHours: number };
  high: { targetHours: number; warningHours: number };
  medium: { targetHours: number; warningHours: number };
  low: { targetHours: number; warningHours: number };
}

export interface TrustConfiguration {
  id: string;
  organizationId: string;
  slaSettings: SlaSettings;
  assignmentSettings: {
    enableAutoAssignment: boolean;
    defaultAssignee: string | null;
    assignByCategory: Record<string, string>;
  };
  kbSettings: {
    requireApprovalForNewEntries: boolean;
    autoSuggestFromKB: boolean;
    trackUsageMetrics: boolean;
  };
  trustCenterSettings: {
    enabled: boolean;
    publicUrl: string | null;
    customDomain: string | null;
    allowAnonymousAccess: boolean;
  };
  aiSettings: {
    enabled: boolean;
    autoCategorizationEnabled: boolean;
    answerSuggestionsEnabled: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export const trustConfigApi = {
  get: (organizationId?: string): Promise<AxiosResponse<TrustConfiguration>> => 
    api.get('/api/trust-config', { params: { organizationId } }),
  update: (data: Partial<TrustConfiguration>, organizationId?: string): Promise<AxiosResponse<TrustConfiguration>> => 
    api.put('/api/trust-config', data, { params: { organizationId } }),
  reset: (organizationId?: string): Promise<AxiosResponse<TrustConfiguration>> => 
    api.post('/api/trust-config/reset', {}, { params: { organizationId } }),
  getReference: () => api.get('/api/trust-config/reference'),
};

// Answer Templates
export interface AnswerTemplate {
  id: string;
  organizationId: string;
  title: string;
  content: string;
  category?: string;
  variables: string[];
  tags: string[];
  usageCount: number;
  lastUsedAt?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnswerTemplateData {
  organizationId: string;
  title: string;
  content: string;
  category?: string;
  variables?: string[];
  tags?: string[];
}

export interface UpdateAnswerTemplateData {
  title?: string;
  content?: string;
  category?: string;
  variables?: string[];
  tags?: string[];
  status?: string;
}

// Trust AI
export interface AnswerSuggestion {
  suggestedAnswer: string;
  confidence: number;
  sources: { id: string; title: string; relevance: number }[];
  reasoning?: string;
}

export interface QuestionCategorization {
  category: string;
  confidence: number;
  suggestedTags: string[];
}

export const trustAiApi = {
  draftAnswer: (organizationId: string, questionText: string): Promise<AxiosResponse<AnswerSuggestion>> => 
    api.post('/api/trust-ai/draft-answer', { questionText }, { params: { organizationId } }),
  categorizeQuestion: (organizationId: string, questionText: string): Promise<AxiosResponse<QuestionCategorization>> => 
    api.post('/api/trust-ai/categorize', { questionText }, { params: { organizationId } }),
  improveAnswer: (organizationId: string, questionText: string, currentAnswer: string): Promise<AxiosResponse<AnswerSuggestion>> => 
    api.post('/api/trust-ai/improve-answer', { questionText, currentAnswer }, { params: { organizationId } }),
};

export const answerTemplatesApi = {
  list: (params?: { organizationId?: string; category?: string; status?: string; search?: string }): Promise<AxiosResponse<AnswerTemplate[]>> => 
    api.get('/api/answer-templates', { params }),
  get: (id: string): Promise<AxiosResponse<AnswerTemplate>> => 
    api.get(`/api/answer-templates/${id}`),
  create: (data: CreateAnswerTemplateData): Promise<AxiosResponse<AnswerTemplate>> => 
    api.post('/api/answer-templates', data),
  update: (id: string, data: UpdateAnswerTemplateData): Promise<AxiosResponse<AnswerTemplate>> => 
    api.patch(`/api/answer-templates/${id}`, data),
  delete: (id: string): Promise<AxiosResponse<void>> => 
    api.delete(`/api/answer-templates/${id}`),
  archive: (id: string): Promise<AxiosResponse<AnswerTemplate>> => 
    api.post(`/api/answer-templates/${id}/archive`),
  unarchive: (id: string): Promise<AxiosResponse<AnswerTemplate>> => 
    api.post(`/api/answer-templates/${id}/unarchive`),
  apply: (id: string, variables: Record<string, string>): Promise<AxiosResponse<{ content: string; templateId: string; templateTitle: string }>> => 
    api.post(`/api/answer-templates/${id}/apply`, { variables }),
  getStats: (organizationId: string) => api.get('/api/answer-templates/stats', { params: { organizationId } }),
  getCategories: (organizationId: string) => api.get('/api/answer-templates/categories', { params: { organizationId } }),
};

export const notificationsApi = {
  list: (params?: NotificationListParams) => api.get('/api/notifications', { params }),
  get: (id: string) => api.get(`/api/notifications/${id}`),
  getUnreadCount: (): Promise<AxiosResponse<{ count: number }>> => 
    api.get('/api/notifications/unread-count'),
  getStats: () => api.get('/api/notifications/stats'),
  markAsRead: (notificationIds?: string[], markAll?: boolean) =>
    api.post('/api/notifications/mark-read', { notificationIds, markAll }),
  markOneAsRead: (id: string) => api.post(`/api/notifications/${id}/read`),
  delete: (id: string) => api.delete(`/api/notifications/${id}`),
  deleteAll: () => api.delete('/api/notifications'),
  getPreferences: (): Promise<AxiosResponse<NotificationPreference[]>> => 
    api.get('/api/notifications/preferences/list'),
  updatePreferences: (preferences: NotificationPreference[]) =>
    api.put('/api/notifications/preferences', { preferences }),
};

// Risk Management APIs
interface RiskListResponse {
  risks: Risk[];
  total: number;
  page: number;
  limit: number;
}

export const risksApi = {
  list: (params?: RiskListParams): Promise<AxiosResponse<RiskListResponse>> => 
    api.get('/api/risks', { params }),
  get: (id: string): Promise<AxiosResponse<RiskDetail>> => 
    api.get(`/api/risks/${id}`),
  create: (data: CreateRiskData): Promise<AxiosResponse<Risk>> => 
    api.post('/api/risks', data),
  update: (id: string, data: UpdateRiskData): Promise<AxiosResponse<Risk>> => 
    api.put(`/api/risks/${id}`, data),
  delete: (id: string): Promise<AxiosResponse<void>> => 
    api.delete(`/api/risks/${id}`),
  markReviewed: (id: string, notes?: string) =>
    api.post(`/api/risks/${id}/review`, { notes }),
  updateTreatment: (id: string, data: RiskTreatmentData) => 
    api.put(`/api/risks/${id}/treatment`, data),
  getDashboard: () => api.get('/api/risks/dashboard'),
  getHeatmap: () => api.get('/api/risks/heatmap'),
  getTrend: (days?: number) => api.get('/api/risks/trend', { params: { days } }),
  
  // Risk Workflow Methods
  validateRisk: (id: string, data: { approved: boolean; reason?: string; riskAssessorId?: string }) =>
    api.post(`/api/risks/${id}/validate`, data),
  startAssessment: (id: string, assessorId: string) =>
    api.post(`/api/risks/${id}/start-assessment`, { assessorId }),
  submitAssessment: (id: string, data: RiskAssessmentData) =>
    api.post(`/api/risks/${id}/submit-assessment`, data),
  reviewAssessment: (id: string, data: { approved: boolean; notes?: string; revisionNotes?: string; declinedReason?: string }) =>
    api.post(`/api/risks/${id}/review-assessment`, data),
  completeRevision: (id: string, data: Record<string, unknown>) =>
    api.post(`/api/risks/${id}/complete-revision`, data),
  submitTreatmentDecision: (id: string, data: Record<string, unknown>) =>
    api.post(`/api/risks/${id}/treatment-decision`, data),
  assignExecutiveApprover: (id: string, approverId: string) =>
    api.post(`/api/risks/${id}/assign-executive`, { approverId }),
  submitExecutiveApproval: (id: string, data: Record<string, unknown>) =>
    api.post(`/api/risks/${id}/executive-approval`, data),
  updateMitigationStatus: (id: string, data: Record<string, unknown>) =>
    api.post(`/api/risks/${id}/mitigation-status`, data),
  
  // Link/Unlink methods
  linkControl: (id: string, data: { controlId: string; effectiveness?: string }) =>
    api.post(`/api/risks/${id}/controls`, data),
  unlinkControl: (id: string, controlId: string) =>
    api.delete(`/api/risks/${id}/controls/${controlId}`),
  linkAssets: (id: string, assetIds: string[]) =>
    api.post(`/api/risks/${id}/assets`, { assetIds }),
  unlinkAsset: (id: string, assetId: string) =>
    api.delete(`/api/risks/${id}/assets/${assetId}`),
  
  // Scenario methods
  createScenario: (id: string, data: Record<string, unknown>) =>
    api.post(`/api/risks/${id}/scenarios`, data),
  deleteScenario: (id: string, scenarioId: string) =>
    api.delete(`/api/risks/${id}/scenarios/${scenarioId}`),
};

// Risk Scenarios API (standalone scenario library)
export const riskScenariosApi = {
  list: (params?: RiskScenarioListParams): Promise<AxiosResponse<RiskScenario[]>> => 
    api.get('/api/risk-scenarios', { params }),
  get: (id: string): Promise<AxiosResponse<RiskScenario>> => 
    api.get(`/api/risk-scenarios/${id}`),
  create: (data: CreateRiskScenarioData): Promise<AxiosResponse<RiskScenario>> => 
    api.post('/api/risk-scenarios', data),
  update: (id: string, data: UpdateRiskScenarioData): Promise<AxiosResponse<RiskScenario>> => 
    api.put(`/api/risk-scenarios/${id}`, data),
  delete: (id: string): Promise<AxiosResponse<void>> => 
    api.delete(`/api/risk-scenarios/${id}`),
  clone: (id: string, newTitle?: string): Promise<AxiosResponse<RiskScenario>> => 
    api.post(`/api/risk-scenarios/${id}/clone`, { newTitle }),
  simulate: (id: string, params: { controlEffectiveness?: number; mitigations?: string[] }) =>
    api.post(`/api/risk-scenarios/${id}/simulate`, params),
  getTemplates: (): Promise<AxiosResponse<RiskScenario[]>> => 
    api.get('/api/risk-scenarios/templates'),
  getLibrary: (): Promise<AxiosResponse<RiskScenario[]>> => 
    api.get('/api/risk-scenarios/library'),
  getLibraryByCategory: (): Promise<AxiosResponse<{ category: string; templates: RiskScenario[] }[]>> => 
    api.get('/api/risk-scenarios/library/by-category'),
  getCategories: (): Promise<AxiosResponse<string[]>> => 
    api.get('/api/risk-scenarios/categories'),
  getStatistics: () => api.get('/api/risk-scenarios/statistics'),
  bulkCreateFromTemplates: (templateIds: string[]) =>
    api.post('/api/risk-scenarios/bulk/from-templates', { templateIds }),
};

// Risk Workflow Tasks API
export interface RiskWorkflowTask {
  id: string;
  riskId: string;
  taskType: string;
  title: string;
  description?: string;
  assigneeId: string;
  assignedById: string;
  assignedAt: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'reassigned';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
  startedAt?: string;
  completedAt?: string;
  completedById?: string;
  workflowStage: string;
  previousStatus?: string;
  resultingAction?: string;
  notes?: string;
  completionNotes?: string;
  isAutoCreated: boolean;
  createdAt: string;
  updatedAt: string;
  risk?: {
    id: string;
    riskId: string;
    title: string;
    inherentRisk?: string;
    status: string;
  };
  assignee?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  assignedBy?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface RiskWorkflowTaskListResponse {
  tasks: RiskWorkflowTask[];
  total: number;
  page: number;
  limit: number;
}

export interface RiskWorkflowTaskStats {
  pending: number;
  inProgress: number;
  overdue: number;
  completedThisWeek: number;
  total: number;
}

export interface CreateRiskWorkflowTaskData {
  taskType: string;
  title: string;
  description?: string;
  assigneeId: string;
  priority?: string;
  dueDate?: string;
  notes?: string;
  workflowStage?: string;
}

export interface UpdateRiskWorkflowTaskData {
  title?: string;
  description?: string;
  priority?: string;
  dueDate?: string;
  notes?: string;
}

export interface RiskTaskFilterParams {
  status?: string;
  taskType?: string;
  priority?: string;
  assigneeId?: string;
  workflowStage?: string;
  overdue?: boolean;
  page?: number;
  limit?: number;
}

export const riskTasksApi = {
  // Get tasks assigned to current user
  getMyTasks: (params?: RiskTaskFilterParams): Promise<AxiosResponse<RiskWorkflowTaskListResponse>> =>
    api.get('/api/risk-tasks/my-tasks', { params }),
  
  // Get task statistics for current user
  getMyStats: (): Promise<AxiosResponse<RiskWorkflowTaskStats>> =>
    api.get('/api/risk-tasks/my-stats'),
  
  // Get all tasks in organization (admin view)
  list: (params?: RiskTaskFilterParams): Promise<AxiosResponse<RiskWorkflowTaskListResponse>> =>
    api.get('/api/risk-tasks', { params }),
  
  // Get organization-wide stats
  getStats: (): Promise<AxiosResponse<RiskWorkflowTaskStats>> =>
    api.get('/api/risk-tasks/stats'),
  
  // Get tasks for a specific risk
  getForRisk: (riskId: string): Promise<AxiosResponse<RiskWorkflowTask[]>> =>
    api.get(`/api/risk-tasks/risk/${riskId}`),
  
  // Create a manual task for a risk
  create: (riskId: string, data: CreateRiskWorkflowTaskData): Promise<AxiosResponse<RiskWorkflowTask>> =>
    api.post(`/api/risk-tasks/risk/${riskId}`, data),
  
  // Get a single task
  get: (taskId: string): Promise<AxiosResponse<RiskWorkflowTask>> =>
    api.get(`/api/risk-tasks/${taskId}`),
  
  // Update a task
  update: (taskId: string, data: UpdateRiskWorkflowTaskData): Promise<AxiosResponse<RiskWorkflowTask>> =>
    api.put(`/api/risk-tasks/${taskId}`, data),
  
  // Start working on a task
  start: (taskId: string): Promise<AxiosResponse<RiskWorkflowTask>> =>
    api.post(`/api/risk-tasks/${taskId}/start`),
  
  // Complete a task
  complete: (taskId: string, data?: { completionNotes?: string; resultingAction?: string }): Promise<AxiosResponse<RiskWorkflowTask>> =>
    api.post(`/api/risk-tasks/${taskId}/complete`, data || {}),
  
  // Reassign a task
  reassign: (taskId: string, data: { newAssigneeId: string; reason?: string }): Promise<AxiosResponse<RiskWorkflowTask>> =>
    api.post(`/api/risk-tasks/${taskId}/reassign`, data),
  
  // Cancel a task
  cancel: (taskId: string, reason: string): Promise<AxiosResponse<RiskWorkflowTask>> =>
    api.post(`/api/risk-tasks/${taskId}/cancel`, { reason }),
};

// Extended risk operations (keep in risksApi object for backwards compat)
Object.assign(risksApi, {
  // Risk-Asset linking
  linkAssets: (id: string, assetIds: string[]) =>
    api.post(`/api/risks/${id}/assets`, { assetIds }),
  unlinkAsset: (id: string, assetId: string) =>
    api.delete(`/api/risks/${id}/assets/${assetId}`),
  // Risk-Control linking
  linkControl: (id: string, data: { controlId: string; effectiveness?: string; notes?: string }) =>
    api.post(`/api/risks/${id}/controls`, data),
  updateControlEffectiveness: (id: string, controlId: string, data: { effectiveness: string; notes?: string }) =>
    api.put(`/api/risks/${id}/controls/${controlId}`, data),
  unlinkControl: (id: string, controlId: string) =>
    api.delete(`/api/risks/${id}/controls/${controlId}`),
  // Risk Scenarios
  getScenarios: (id: string) => api.get(`/api/risks/${id}/scenarios`),
  createScenario: (id: string, data: {
    title: string;
    description: string;
    threatActor?: string;
    attackVector?: string;
    targetAssets?: string[];
    likelihood: string;
    impact: string;
    notes?: string;
  }) => api.post(`/api/risks/${id}/scenarios`, data),
  updateScenario: (id: string, scenarioId: string, data: UpdateRiskScenarioData) =>
    api.put(`/api/risks/${id}/scenarios/${scenarioId}`, data),
  deleteScenario: (id: string, scenarioId: string) =>
    api.delete(`/api/risks/${id}/scenarios/${scenarioId}`),
  // ===========================
  // Workflow API
  // ===========================
  // Risk Intake
  validateRisk: (id: string, data: { approved: boolean; reason?: string; riskAssessorId?: string }) =>
    api.post(`/api/risks/${id}/validate`, data),
  startAssessment: (id: string, riskAssessorId: string) =>
    api.post(`/api/risks/${id}/start-assessment`, { riskAssessorId }),
  // Risk Assessment
  submitAssessment: (id: string, data: RiskAssessmentData) => 
    api.post(`/api/risks/${id}/assessment/submit`, data),
  reviewAssessment: (id: string, data: { approved: boolean; notes?: string; declinedReason?: string }) =>
    api.post(`/api/risks/${id}/assessment/review`, data),
  completeRevision: (id: string, data: Partial<RiskAssessmentData>) => 
    api.post(`/api/risks/${id}/assessment/revision`, data),
  // Risk Treatment
  submitTreatmentDecision: (id: string, data: {
    decision: 'accept' | 'mitigate' | 'transfer' | 'avoid';
    justification: string;
    mitigationDescription?: string;
    mitigationTargetDate?: string;
    transferTo?: string;
    transferCost?: number;
    avoidStrategy?: string;
    acceptanceRationale?: string;
    acceptanceExpiresAt?: string;
  }) => api.post(`/api/risks/${id}/treatment/decision`, data),
  assignExecutiveApprover: (id: string, executiveApproverId: string) =>
    api.post(`/api/risks/${id}/treatment/assign-approver`, { executiveApproverId }),
  submitExecutiveApproval: (id: string, data: { approved: boolean; notes?: string; deniedReason?: string }) =>
    api.post(`/api/risks/${id}/treatment/executive-approval`, data),
  updateMitigationStatus: (id: string, data: {
    status: 'on_track' | 'delayed' | 'cancelled' | 'done';
    progress?: number;
    notes?: string;
    newTargetDate?: string;
    delayReason?: string;
    cancellationReason?: string;
    residualLikelihood?: string;
    residualImpact?: string;
  }) => api.post(`/api/risks/${id}/treatment/mitigation-update`, data),
});

interface AssetListResponse {
  assets: Asset[];
  total: number;
  page?: number;
  limit?: number;
}

export const assetsApi = {
  list: (params?: AssetListParams): Promise<AxiosResponse<AssetListResponse>> => 
    api.get('/api/assets', { params }),
  get: (id: string): Promise<AxiosResponse<Asset>> => 
    api.get(`/api/assets/${id}`),
  create: (data: CreateAssetData): Promise<AxiosResponse<Asset>> => 
    api.post('/api/assets', data),
  update: (id: string, data: UpdateAssetData): Promise<AxiosResponse<Asset>> => 
    api.put(`/api/assets/${id}`, data),
  delete: (id: string): Promise<AxiosResponse<void>> => 
    api.delete(`/api/assets/${id}`),
  getStats: () => api.get('/api/assets/stats'),
  getSources: (): Promise<AxiosResponse<string[]>> => 
    api.get('/api/assets/sources'),
  getDepartments: (): Promise<AxiosResponse<string[]>> => 
    api.get('/api/assets/departments'),
  syncFromSource: (source: string, integrationId: string) =>
    api.post(`/api/assets/sync/${source}`, { integrationId }),
};

export const riskConfigApi = {
  get: () => api.get('/api/risk-config'),
  update: (data: UpdateRiskConfigData) => api.put('/api/risk-config', data),
  reset: () => api.post('/api/risk-config/reset'),
  addCategory: (category: RiskCategory) =>
    api.post('/api/risk-config/categories', category),
  removeCategory: (categoryId: string) =>
    api.delete(`/api/risk-config/categories/${categoryId}`),
  updateAppetite: (category: string, level: string, description?: string) =>
    api.put(`/api/risk-config/appetite/${category}`, { level, description }),
};

// TPRM Configuration types
export interface TierFrequencyMapping {
  tier_1: string;
  tier_2: string;
  tier_3: string;
  tier_4: string;
}

export interface VendorCategoryConfig {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

export interface TprmAssessmentSettings {
  requireDocumentUpload?: boolean;
  autoCreateAssessmentOnNewVendor?: boolean;
  defaultAssessmentType?: string;
  enableAIAnalysis?: boolean;
  notifyOnOverdueReview?: boolean;
  overdueReminderDays?: number;
}

export interface TprmContractSettings {
  expirationWarningDays?: number[];
  requireSecurityAddendum?: boolean;
  autoRenewNotification?: boolean;
}

/**
 * Feature Settings - controls which TPRM features are enabled
 * Note: Disabling a feature hides it from the UI but preserves all data
 */
export interface TprmFeatureSettings {
  enableSecurityScanning?: boolean;
  enableRiskAssessmentWizard?: boolean;
  enableSubdomainSpider?: boolean;
  enableVendorPortal?: boolean;
  enableContractManagement?: boolean;
  enableQuestionnaireAutomation?: boolean;
}

export interface TprmConfiguration {
  id: string;
  organizationId: string;
  tierFrequencyMapping: TierFrequencyMapping;
  vendorCategories: VendorCategoryConfig[];
  riskThresholds: {
    very_low: number;
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  assessmentSettings: TprmAssessmentSettings;
  contractSettings: TprmContractSettings;
  featureSettings: TprmFeatureSettings;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface TprmConfigReferenceData {
  frequencyOptions: { value: string; label: string; months: number }[];
  tierLabels: Record<string, string>;
  defaults: {
    tierFrequencyMapping: TierFrequencyMapping;
    vendorCategories: VendorCategoryConfig[];
    riskThresholds: TprmConfiguration['riskThresholds'];
    assessmentSettings: TprmAssessmentSettings;
    contractSettings: TprmContractSettings;
    featureSettings: TprmFeatureSettings;
  };
}

export const tprmConfigApi = {
  get: () => api.get<TprmConfiguration>('/api/tprm-config'),
  getReference: () => api.get<TprmConfigReferenceData>('/api/tprm-config/reference'),
  update: (data: Partial<TprmConfiguration>) => api.put<TprmConfiguration>('/api/tprm-config', data),
  reset: () => api.post<TprmConfiguration>('/api/tprm-config/reset'),
  addCategory: (category: Omit<VendorCategoryConfig, 'id'>) =>
    api.post<TprmConfiguration>('/api/tprm-config/categories', category),
  removeCategory: (categoryId: string) =>
    api.delete<TprmConfiguration>(`/api/tprm-config/categories/${categoryId}`),
  getTierFrequency: (tier: string) =>
    api.get<{ tier: string; frequency: string }>(`/api/tprm-config/tier-frequency/${tier}`),
};

export const auditLogApi = {
  list: (params?: {
    limit?: number;
    offset?: number;
    entityType?: string;
    entityId?: string;
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get('/api/audit', { params }),
  get: (id: string) => api.get(`/api/audit/${id}`),
};

// Notification Configuration API
export interface EmailStatus {
  isConfigured: boolean;
  provider: string;
  isConsoleMode: boolean;
  consoleReason?: string;
}

export const notificationsConfigApi = {
  get: () => api.get('/api/notifications-config'),
  
  getEmailStatus: async (): Promise<EmailStatus> => {
    try {
      const response = await api.get<{ success: boolean; data: EmailStatus }>('/api/notifications-config/email-status');
      return response.data.data;
    } catch (error: any) {
      // Fallback if endpoint doesn't exist yet
      if (error.response?.status === 404) {
        return {
          isConfigured: false,
          provider: 'unknown',
          isConsoleMode: true,
          consoleReason: 'Email status endpoint not available',
        };
      }
      throw error;
    }
  },
  updateEmail: (data: {
    emailProvider: 'disabled' | 'smtp' | 'sendgrid' | 'ses';
    emailFromAddress?: string;
    emailFromName?: string;
    smtpConfig?: {
      host: string;
      port: number;
      user?: string;
      password?: string;
      secure: boolean;
    };
    sendgridApiKey?: string;
    sesConfig?: {
      region: string;
      accessKeyId?: string;
      secretAccessKey?: string;
    };
  }) => api.put('/api/notifications-config/email', data),
  updateSlack: (data: {
    slackNotificationsEnabled: boolean;
    slackWebhookUrl?: string;
    slackBotToken?: string;
    slackDefaultChannel?: string;
    slackWorkspaceName?: string;
  }) => api.put('/api/notifications-config/slack', data),
  updateDefaults: (data: Record<string, { email: boolean; slack: boolean; inApp: boolean }>) =>
    api.put('/api/notifications-config/defaults', data),
  testEmail: (recipientEmail: string) =>
    api.post('/api/notifications-config/test-email', { recipientEmail }),
  testSlack: (channel?: string) =>
    api.post('/api/notifications-config/test-slack', { channel }),
  disconnectSlack: () => api.delete('/api/notifications-config/slack'),
};

// Employee Compliance API
export const employeeComplianceApi = {
  // List employees with compliance data
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    department?: string;
    status?: string;
    complianceStatus?: 'compliant' | 'at_risk' | 'non_compliant' | string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => api.get('/api/employee-compliance', { params }),

  // Get employee detail
  get: (id: string) => api.get(`/api/employee-compliance/${id}`),

  // Get employee score breakdown
  getScore: (id: string) => api.get(`/api/employee-compliance/${id}/score`),

  // Get compliance dashboard metrics
  getDashboard: () => api.get('/api/employee-compliance/dashboard'),

  // Get unique departments
  getDepartments: () => api.get('/api/employee-compliance/departments'),

  // Find employees missing data from certain systems
  getMissingData: () => api.get('/api/employee-compliance/missing'),

  // Trigger sync from all employee-related integrations
  triggerSync: () => api.post('/api/employee-compliance/sync'),

  // Recalculate compliance scores for all employees
  recalculateScores: () => api.post('/api/employee-compliance/recalculate-scores'),

  // Recalculate score for a single employee
  recalculateEmployeeScore: (id: string) => api.post(`/api/employee-compliance/${id}/recalculate`),

  // Get compliance configuration
  getConfig: () => api.get('/api/employee-compliance/config'),

  // Update compliance configuration
  updateConfig: (data: {
    scoreWeights?: {
      backgroundCheck: number;
      training: number;
      attestation: number;
      deviceCompliance: number;
      accessReview: number;
    };
    thresholds?: {
      compliant: number;
      atRisk: number;
    };
    requirements?: {
      backgroundCheckRequired: boolean;
      backgroundCheckExpiration: number;
      securityTrainingRequired: boolean;
      securityTrainingFrequency: number;
      policyAttestationRequired: boolean;
      accessReviewRequired: boolean;
    };
  }) => api.put('/api/employee-compliance/config', data),
};

// Demo Data / Seed API
export const seedApi = {
  // Get demo data status
  getStatus: () => api.get('/api/seed/status'),

  // Load demo data
  loadDemoData: () => api.post('/api/seed/load-demo'),

  // Reset all data (requires confirmation phrase)
  resetData: (confirmationPhrase: string) =>
    api.post('/api/seed/reset', { confirmationPhrase }),

  // Get data summary for confirmation
  getDataSummary: () => api.get('/api/seed/summary'),
};

// Custom Dashboards API
export const customDashboardsApi = {
  // List all dashboards (user's + templates)
  list: () => api.get('/api/dashboards'),

  // Get available templates
  getTemplates: () => api.get('/api/dashboards/templates'),

  // Get available data sources
  getDataSources: () => api.get('/api/dashboards/data-sources'),

  // Execute a query (preview)
  executeQuery: (query: any, preview = true) =>
    api.post('/api/dashboards/query', { query, preview }),

  // Get a specific dashboard
  get: (id: string) => api.get(`/api/dashboards/${id}`),

  // Create a new dashboard
  create: (data: {
    name: string;
    description?: string;
    isTemplate?: boolean;
    isDefault?: boolean;
    layout?: Record<string, any>;
    widgets?: any[];
  }) => api.post('/api/dashboards', data),

  // Update a dashboard
  update: (id: string, data: {
    name?: string;
    description?: string;
    isDefault?: boolean;
    layout?: Record<string, any>;
    widgets?: any[];
  }) => api.put(`/api/dashboards/${id}`, data),

  // Delete a dashboard
  delete: (id: string) => api.delete(`/api/dashboards/${id}`),

  // Duplicate a dashboard
  duplicate: (id: string, name?: string) =>
    api.post(`/api/dashboards/${id}/duplicate`, { name }),

  // Set as default dashboard
  setDefault: (id: string) =>
    api.post(`/api/dashboards/${id}/set-default`),

  // Widget operations
  addWidget: (dashboardId: string, widget: any) =>
    api.post(`/api/dashboards/${dashboardId}/widgets`, widget),

  updateWidget: (dashboardId: string, widgetId: string, data: any) =>
    api.put(`/api/dashboards/${dashboardId}/widgets/${widgetId}`, data),

  deleteWidget: (dashboardId: string, widgetId: string) =>
    api.delete(`/api/dashboards/${dashboardId}/widgets/${widgetId}`),

  getWidgetData: (dashboardId: string, widgetId: string) =>
    api.get(`/api/dashboards/${dashboardId}/widgets/${widgetId}/data`),
};

// Training API
export const trainingApi = {
  // Progress
  getProgress: () => api.get('/api/training/progress'),
  getModuleProgress: (moduleId: string) => api.get(`/api/training/progress/${moduleId}`),
  startModule: (moduleId: string) => api.post('/api/training/progress/start', { moduleId }),
  updateProgress: (moduleId: string, data: {
    status?: 'not_started' | 'in_progress' | 'completed';
    score?: number;
    slideProgress?: number;
    timeSpent?: number;
  }) => api.put(`/api/training/progress/${moduleId}`, data),
  completeModule: (moduleId: string, score?: number) => 
    api.post('/api/training/progress/complete', { moduleId, score }),
  getStats: () => api.get('/api/training/stats'),
  getOrgStats: () => api.get('/api/training/stats/org'),

  // Assignments
  getAssignments: (userId?: string) => 
    api.get('/api/training/assignments', { params: userId ? { userId } : undefined }),
  getMyAssignments: () => api.get('/api/training/assignments/me'),
  createAssignment: (data: {
    userId: string;
    moduleId: string;
    dueDate?: string;
    isRequired?: boolean;
  }) => api.post('/api/training/assignments', data),
  bulkAssign: (data: {
    userIds: string[];
    moduleIds: string[];
    dueDate?: string;
    isRequired?: boolean;
  }) => api.post('/api/training/assignments/bulk', data),
  updateAssignment: (id: string, data: {
    status?: 'pending' | 'in_progress' | 'completed' | 'overdue';
    dueDate?: string;
    isRequired?: boolean;
  }) => api.put(`/api/training/assignments/${id}`, data),
  deleteAssignment: (id: string) => api.delete(`/api/training/assignments/${id}`),

  // Campaigns
  getCampaigns: () => api.get('/api/training/campaigns'),
  getCampaign: (id: string) => api.get(`/api/training/campaigns/${id}`),
  createCampaign: (data: {
    name: string;
    description?: string;
    moduleIds: string[];
    targetGroups: string[];
    startDate: string;
    endDate?: string;
    isActive?: boolean;
  }) => api.post('/api/training/campaigns', data),
  updateCampaign: (id: string, data: {
    name?: string;
    description?: string;
    moduleIds?: string[];
    targetGroups?: string[];
    endDate?: string;
    isActive?: boolean;
  }) => api.put(`/api/training/campaigns/${id}`, data),
  deleteCampaign: (id: string) => api.delete(`/api/training/campaigns/${id}`),
  launchCampaign: (id: string) => api.post(`/api/training/campaigns/${id}/launch`),

  // All Modules (built-in + custom)
  getAllModules: () => api.get('/api/training/modules'),

  // Custom Modules
  getCustomModules: () => api.get('/api/training/modules/custom'),
  getCustomModule: (id: string) => api.get(`/api/training/modules/custom/${id}`),
  createCustomModule: (data: {
    name: string;
    description?: string;
    category?: string;
    duration?: number;
    difficulty?: string;
    iconType?: string;
    topics?: string[];
  }) => api.post('/api/training/modules/custom', data),
  updateCustomModule: (id: string, data: {
    name?: string;
    description?: string;
    category?: string;
    duration?: number;
    difficulty?: string;
    iconType?: string;
    topics?: string[];
    isActive?: boolean;
  }) => api.put(`/api/training/modules/custom/${id}`, data),
  deleteCustomModule: (id: string) => api.delete(`/api/training/modules/custom/${id}`),
  uploadScormPackage: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/api/training/modules/custom/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // User Role Targeting
  getUsersByRole: (roles: string[]) => 
    api.get('/api/training/users/by-role', { params: { roles } }),
};

// ===========================================
// AI API
// ===========================================

export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'local';
  model: string;
  temperature?: number;
  maxTokens?: number;
  isConfigured: boolean;
}

export interface RiskScoringRequest {
  riskTitle: string;
  riskDescription: string;
  category?: string;
  existingControls?: string[];
  businessContext?: string;
  assets?: string[];
}

export interface RiskScoringResponse {
  suggestedLikelihood: number;
  suggestedImpact: number;
  likelihoodRationale: string;
  impactRationale: string;
  suggestedMitigations: string[];
  relatedRisks: string[];
  confidenceScore: number;
}

export interface CategorizationRequest {
  title: string;
  description: string;
  entityType: 'control' | 'risk' | 'policy' | 'evidence';
  availableCategories?: string[];
}

export interface CategorizationResponse {
  suggestedCategory: string;
  alternativeCategories: Array<{ category: string; confidence: number }>;
  rationale: string;
  suggestedTags?: string[];
  confidenceScore: number;
}

export interface SmartSearchRequest {
  query: string;
  searchIn?: ('controls' | 'risks' | 'policies' | 'vendors' | 'evidence')[];
  limit?: number;
}

export interface SmartSearchInterpretation {
  interpretedQuery: string;
  searchTerms: string[];
  filters: Record<string, string>;
  entityTypes: string[];
}

export interface ControlMappingSuggestionRequest {
  controlTitle: string;
  controlDescription: string;
  controlCategory?: string;
  availableFrameworks: string[];
}

export interface ControlMappingSuggestion {
  frameworkId: string;
  frameworkName: string;
  requirementId: string;
  requirementTitle: string;
  confidenceScore: number;
  rationale: string;
}

export interface PolicyDraftRequest {
  policyType: string;
  companyName: string;
  industry?: string;
  complianceFrameworks?: string[];
  additionalContext?: string;
}

export interface PolicyDraftResponse {
  title: string;
  content: string;
  sections: string[];
  suggestedReviewers: string[];
  complianceNotes: string;
}

export interface RiskTreatmentRequest {
  risk: {
    title: string;
    description: string;
    likelihood: number;
    impact: number;
  };
  existingControls: string[];
}

export interface RiskTreatmentResponse {
  recommendedTreatment: 'mitigate' | 'accept' | 'transfer' | 'avoid';
  rationale: string;
  actions: Array<{
    action: string;
    effort: 'low' | 'medium' | 'high';
    effectiveness: 'low' | 'medium' | 'high';
    timeframe: string;
  }>;
  residualRisk: { likelihood: number; impact: number };
}

export interface ComplianceGapRequest {
  frameworkName: string;
  existingControls: Array<{
    title: string;
    description: string;
    status: string;
  }>;
}

export interface ComplianceGapResponse {
  gaps: Array<{
    requirementId: string;
    requirementTitle: string;
    gapDescription: string;
    priority: 'high' | 'medium' | 'low';
    suggestedActions: string[];
  }>;
  coveragePercentage: number;
  summary: string;
}

export const aiApi = {
  // Configuration
  getConfig: (): Promise<AxiosResponse<AIConfig>> => 
    api.get('/api/ai/config'),
  updateConfig: (data: Partial<AIConfig>) => 
    api.put('/api/ai/config', data),
  getStatus: (): Promise<AxiosResponse<{ 
    available: boolean; 
    config: AIConfig;
    isMockMode?: boolean;
    mockModeReason?: string;
  }>> =>
    api.get('/api/ai/status'),

  // Risk Scoring
  scoreRisk: (data: RiskScoringRequest): Promise<AxiosResponse<{ success: boolean; data: RiskScoringResponse }>> =>
    api.post('/api/ai/risk/score', data),
  recommendRiskTreatment: (data: RiskTreatmentRequest): Promise<AxiosResponse<{ success: boolean; data: RiskTreatmentResponse }>> =>
    api.post('/api/ai/risk/treatment', data),

  // Categorization
  categorize: (data: CategorizationRequest): Promise<AxiosResponse<{ success: boolean; data: CategorizationResponse }>> =>
    api.post('/api/ai/categorize', data),

  // Smart Search
  interpretSearch: (data: SmartSearchRequest): Promise<AxiosResponse<{ success: boolean; data: SmartSearchInterpretation }>> =>
    api.post('/api/ai/search/interpret', data),

  // Control Mapping
  suggestControlMappings: (data: ControlMappingSuggestionRequest): Promise<AxiosResponse<{ success: boolean; data: { suggestions: ControlMappingSuggestion[] } }>> =>
    api.post('/api/ai/controls/mapping-suggestions', data),

  // Policy Generation
  generatePolicyDraft: (data: PolicyDraftRequest): Promise<AxiosResponse<{ success: boolean; data: PolicyDraftResponse }>> =>
    api.post('/api/ai/policies/draft', data),

  // Compliance Gap Analysis
  analyzeComplianceGaps: (data: ComplianceGapRequest): Promise<AxiosResponse<{ success: boolean; data: ComplianceGapResponse }>> =>
    api.post('/api/ai/compliance/gap-analysis', data),
};

// ============================================
// MCP Server API
// ============================================

export interface MCPServer {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  transport: string;
  lastConnected?: string;
  lastError?: string;
  capabilities?: {
    tools: { name: string; description?: string }[];
    resources: { uri: string; name: string }[];
    prompts: { name: string; description?: string }[];
  };
}

export interface MCPServerTemplate {
  id: string;
  name: string;
  description: string;
  transport: string;
  command: string;
  args: string[];
  capabilities: string[];
  requiredEnv?: string[];
}

export interface MCPWorkflow {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'manual' | 'scheduled' | 'event' | 'webhook';
    schedule?: string;
    event?: string;
  };
  stepCount: number;
}

export interface MCPExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  steps: {
    stepId: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    startedAt?: string;
    completedAt?: string;
    output?: unknown;
    error?: string;
  }[];
  output?: Record<string, unknown>;
  error?: string;
}

export const mcpApi = {
  // Server Management
  getServers: (): Promise<AxiosResponse<{ success: boolean; data: MCPServer[] }>> =>
    api.get('/api/mcp/servers'),
  
  getServer: (id: string): Promise<AxiosResponse<{ success: boolean; data: MCPServer }>> =>
    api.get(`/api/mcp/servers/${id}`),
  
  connectServer: (id: string): Promise<AxiosResponse<{ success: boolean; data: MCPServer }>> =>
    api.post(`/api/mcp/servers/${id}/connect`),
  
  disconnectServer: (id: string): Promise<AxiosResponse<{ success: boolean; data: MCPServer }>> =>
    api.post(`/api/mcp/servers/${id}/disconnect`),
  
  deleteServer: (id: string): Promise<AxiosResponse<{ success: boolean }>> =>
    api.delete(`/api/mcp/servers/${id}`),
  
  healthCheck: (id: string): Promise<AxiosResponse<{ success: boolean; data: { isHealthy: boolean; latencyMs?: number } }>> =>
    api.get(`/api/mcp/servers/${id}/health`),

  // Templates
  getTemplates: (): Promise<AxiosResponse<{ success: boolean; data: MCPServerTemplate[] }>> =>
    api.get('/api/mcp/templates'),
  
  deployTemplate: (templateId: string, env: Record<string, string>): Promise<AxiosResponse<{ success: boolean; data: MCPServer }>> =>
    api.post(`/api/mcp/templates/${templateId}/deploy`, { env }),

  // Capabilities
  getCapabilities: (serverId: string): Promise<AxiosResponse<{ success: boolean; data: MCPServer['capabilities'] }>> =>
    api.get(`/api/mcp/servers/${serverId}/capabilities`),
  
  refreshCapabilities: (serverId: string): Promise<AxiosResponse<{ success: boolean; data: MCPServer['capabilities'] }>> =>
    api.post(`/api/mcp/servers/${serverId}/capabilities/refresh`),

  // Tool Execution
  callTool: (serverId: string, toolName: string, args?: Record<string, unknown>): Promise<AxiosResponse<{ success: boolean; data: { result: unknown } }>> =>
    api.post('/api/mcp/tools/call', { serverId, toolName, arguments: args }),
  
  callToolsBatch: (calls: Array<{ serverId: string; toolName: string; arguments?: Record<string, unknown> }>, parallel?: boolean): Promise<AxiosResponse<{ success: boolean; data: { results: unknown[] } }>> =>
    api.post('/api/mcp/tools/batch', { calls, parallel }),

  // Resources
  readResource: (serverId: string, uri: string): Promise<AxiosResponse<{ success: boolean; data: { content: unknown } }>> =>
    api.post('/api/mcp/resources/read', { serverId, uri }),

  // Prompts
  getPrompt: (serverId: string, promptName: string, args?: Record<string, string>): Promise<AxiosResponse<{ success: boolean; data: { messages: unknown[] } }>> =>
    api.post('/api/mcp/prompts/get', { serverId, promptName, arguments: args }),

  // Workflows
  getWorkflows: (): Promise<AxiosResponse<{ success: boolean; data: MCPWorkflow[] }>> =>
    api.get('/api/mcp/workflows'),
  
  getWorkflow: (id: string): Promise<AxiosResponse<{ success: boolean; data: MCPWorkflow }>> =>
    api.get(`/api/mcp/workflows/${id}`),
  
  executeWorkflow: (workflowId: string, input?: Record<string, unknown>): Promise<AxiosResponse<{ success: boolean; data: MCPExecution }>> =>
    api.post(`/api/mcp/workflows/${workflowId}/execute`, { input }),

  // Executions
  getExecutions: (): Promise<AxiosResponse<{ success: boolean; data: MCPExecution[] }>> =>
    api.get('/api/mcp/workflows/executions'),
  
  getExecution: (executionId: string): Promise<AxiosResponse<{ success: boolean; data: MCPExecution }>> =>
    api.get(`/api/mcp/workflows/executions/${executionId}`),
  
  cancelExecution: (executionId: string): Promise<AxiosResponse<{ success: boolean }>> =>
    api.post(`/api/mcp/workflows/executions/${executionId}/cancel`),
};

// ============================================
// Custom Reports API
// ============================================

export interface CustomReportSection {
  id: string;
  type: 'heading' | 'text' | 'table' | 'chart' | 'summary' | 'divider';
  title?: string;
  content?: string;
  dataSource?: string;
  fields?: string[];
  filters?: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'gt' | 'lt' | 'between' | 'in';
    value: string | number | string[];
  }>;
  groupBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  chartType?: 'bar' | 'pie' | 'line' | 'donut';
  chartConfig?: {
    xAxis?: string;
    yAxis?: string;
    colorBy?: string;
  };
}

export interface CustomReportConfig {
  id?: string;
  name: string;
  description?: string;
  sections: CustomReportSection[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export const customReportsApi = {
  /**
   * List all custom reports for the organization
   */
  list: async (): Promise<CustomReportConfig[]> => {
    try {
      const response = await api.get<{ success: boolean; data: CustomReportConfig[] }>('/api/custom-reports');
      return response.data.data || [];
    } catch (error: any) {
      // Fallback to localStorage if API not available (demo mode)
      if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
        console.warn('Custom reports API not available - using localStorage fallback');
        const stored = localStorage.getItem('custom-reports');
        return stored ? JSON.parse(stored) : [];
      }
      throw error;
    }
  },

  /**
   * Get a specific custom report by ID
   */
  get: async (id: string): Promise<CustomReportConfig | null> => {
    try {
      const response = await api.get<{ success: boolean; data: CustomReportConfig }>(`/api/custom-reports/${id}`);
      return response.data.data;
    } catch (error: any) {
      // Fallback to localStorage if API not available
      if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
        const reports = await customReportsApi.list();
        return reports.find(r => r.id === id) || null;
      }
      throw error;
    }
  },

  /**
   * Save a custom report (create or update)
   */
  save: async (config: CustomReportConfig): Promise<CustomReportConfig> => {
    const id = config.id || `report-${Date.now()}`;
    const now = new Date().toISOString();
    
    const updatedConfig: CustomReportConfig = {
      ...config,
      id,
      createdAt: config.createdAt || now,
      updatedAt: now,
    };

    try {
      if (config.id) {
        // Update existing
        const response = await api.put<{ success: boolean; data: CustomReportConfig }>(
          `/api/custom-reports/${config.id}`,
          updatedConfig
        );
        return response.data.data;
      } else {
        // Create new
        const response = await api.post<{ success: boolean; data: CustomReportConfig }>(
          '/api/custom-reports',
          updatedConfig
        );
        return response.data.data;
      }
    } catch (error: any) {
      // Fallback to localStorage if API not available
      if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
        console.warn('Custom reports API not available - using localStorage fallback');
        const reports = await customReportsApi.list();
        const index = reports.findIndex(r => r.id === id);
        
        if (index >= 0) {
          reports[index] = updatedConfig;
        } else {
          reports.push(updatedConfig);
        }
        
        localStorage.setItem('custom-reports', JSON.stringify(reports));
        return updatedConfig;
      }
      throw error;
    }
  },

  /**
   * Delete a custom report
   */
  delete: async (id: string): Promise<void> => {
    try {
      await api.delete(`/api/custom-reports/${id}`);
    } catch (error: any) {
      // Fallback to localStorage if API not available
      if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
        console.warn('Custom reports API not available - using localStorage fallback');
        const reports = await customReportsApi.list();
        const filtered = reports.filter(r => r.id !== id);
        localStorage.setItem('custom-reports', JSON.stringify(filtered));
        return;
      }
      throw error;
    }
  },
};

// ============================================
// Scheduled Reports API
// ============================================

export interface ScheduledReport {
  id: string;
  name: string;
  reportType: string;
  format: 'pdf' | 'csv' | 'xlsx';
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
  };
  recipients: string[];
  filters?: Record<string, string>;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  createdAt: string;
}

export const scheduledReportsApi = {
  /**
   * List all scheduled reports for the organization
   */
  list: async (): Promise<ScheduledReport[]> => {
    try {
      const response = await api.get<{ success: boolean; data: ScheduledReport[] }>('/api/scheduled-reports');
      return response.data.data || [];
    } catch (error: any) {
      // Fallback to localStorage if API not available (demo mode)
      if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
        console.warn('Scheduled reports API not available - using localStorage fallback');
        const stored = localStorage.getItem('scheduled_reports');
        return stored ? JSON.parse(stored) : [];
      }
      throw error;
    }
  },

  /**
   * Get a specific scheduled report by ID
   */
  get: async (id: string): Promise<ScheduledReport | null> => {
    try {
      const response = await api.get<{ success: boolean; data: ScheduledReport }>(`/api/scheduled-reports/${id}`);
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
        const reports = await scheduledReportsApi.list();
        return reports.find(r => r.id === id) || null;
      }
      throw error;
    }
  },

  /**
   * Create a new scheduled report
   */
  create: async (report: Omit<ScheduledReport, 'id' | 'createdAt'>): Promise<ScheduledReport> => {
    const newReport: ScheduledReport = {
      ...report,
      id: `sr-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    try {
      const response = await api.post<{ success: boolean; data: ScheduledReport }>(
        '/api/scheduled-reports',
        newReport
      );
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
        console.warn('Scheduled reports API not available - using localStorage fallback');
        const reports = await scheduledReportsApi.list();
        reports.push(newReport);
        localStorage.setItem('scheduled_reports', JSON.stringify(reports));
        return newReport;
      }
      throw error;
    }
  },

  /**
   * Update a scheduled report
   */
  update: async (id: string, updates: Partial<ScheduledReport>): Promise<ScheduledReport> => {
    try {
      const response = await api.put<{ success: boolean; data: ScheduledReport }>(
        `/api/scheduled-reports/${id}`,
        updates
      );
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
        console.warn('Scheduled reports API not available - using localStorage fallback');
        const reports = await scheduledReportsApi.list();
        const index = reports.findIndex(r => r.id === id);
        if (index >= 0) {
          reports[index] = { ...reports[index], ...updates };
          localStorage.setItem('scheduled_reports', JSON.stringify(reports));
          return reports[index];
        }
        throw new Error('Report not found');
      }
      throw error;
    }
  },

  /**
   * Delete a scheduled report
   */
  delete: async (id: string): Promise<void> => {
    try {
      await api.delete(`/api/scheduled-reports/${id}`);
    } catch (error: any) {
      if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
        console.warn('Scheduled reports API not available - using localStorage fallback');
        const reports = await scheduledReportsApi.list();
        const filtered = reports.filter(r => r.id !== id);
        localStorage.setItem('scheduled_reports', JSON.stringify(filtered));
        return;
      }
      throw error;
    }
  },

  /**
   * Run a scheduled report immediately
   */
  runNow: async (id: string): Promise<{ success: boolean; jobId?: string }> => {
    try {
      const response = await api.post<{ success: boolean; data: { jobId: string } }>(
        `/api/scheduled-reports/${id}/run`
      );
      return { success: true, jobId: response.data.data.jobId };
    } catch (error: any) {
      if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
        console.warn('Scheduled reports API not available - simulating run');
        // Update lastRun in localStorage
        const reports = await scheduledReportsApi.list();
        const index = reports.findIndex(r => r.id === id);
        if (index >= 0) {
          reports[index].lastRun = new Date().toISOString();
          localStorage.setItem('scheduled_reports', JSON.stringify(reports));
        }
        return { success: true };
      }
      throw error;
    }
  },
};

// ============================================
// API Keys API
// ============================================

export interface ApiKey {
  id: string;
  name: string;
  description?: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt?: string;
  expiresAt?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface ApiKeyWithSecret extends ApiKey {
  key: string;
}

export interface CreateApiKeyData {
  name: string;
  description?: string;
  scopes?: string[];
  expiresAt?: string;
}

export interface UpdateApiKeyData {
  name?: string;
  description?: string;
  scopes?: string[];
  expiresAt?: string;
  isActive?: boolean;
}

export interface ApiKeyListResponse {
  keys: ApiKey[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiKeyStats {
  total: number;
  active: number;
  inactive: number;
  expired: number;
  recentlyUsed: number;
}

export const apiKeysApi = {
  list: (params?: { search?: string; isActive?: boolean; page?: number; limit?: number }): Promise<AxiosResponse<ApiKeyListResponse>> =>
    api.get('/api/api-keys', { params }),
  get: (id: string): Promise<AxiosResponse<ApiKey>> =>
    api.get(`/api/api-keys/${id}`),
  getStats: (): Promise<AxiosResponse<ApiKeyStats>> =>
    api.get('/api/api-keys/stats'),
  getScopes: (): Promise<AxiosResponse<{ scopes: string[] }>> =>
    api.get('/api/api-keys/scopes'),
  create: (data: CreateApiKeyData): Promise<AxiosResponse<ApiKeyWithSecret>> =>
    api.post('/api/api-keys', data),
  update: (id: string, data: UpdateApiKeyData): Promise<AxiosResponse<ApiKey>> =>
    api.put(`/api/api-keys/${id}`, data),
  revoke: (id: string): Promise<AxiosResponse<void>> =>
    api.post(`/api/api-keys/${id}/revoke`),
  regenerate: (id: string): Promise<AxiosResponse<ApiKeyWithSecret>> =>
    api.post(`/api/api-keys/${id}/regenerate`),
  delete: (id: string): Promise<AxiosResponse<void>> =>
    api.delete(`/api/api-keys/${id}`),
};

// ============================================
// Calendar API
// ============================================

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  eventType: string;
  startDate: string;
  endDate?: string;
  allDay: boolean;
  isRecurring: boolean;
  recurrenceRule?: string;
  entityId?: string;
  entityType?: string;
  assigneeId?: string;
  priority: string;
  status: string;
  color?: string;
  reminders?: Array<{ type: string; before: number }>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCalendarEventData {
  title: string;
  description?: string;
  eventType?: string;
  startDate: string;
  endDate?: string;
  allDay?: boolean;
  isRecurring?: boolean;
  recurrenceRule?: string;
  entityId?: string;
  entityType?: string;
  assigneeId?: string;
  priority?: string;
  color?: string;
  reminders?: Array<{ type: string; before: number }>;
}

export interface CalendarEventListResponse {
  events: CalendarEvent[];
  total: number;
}

export const calendarApi = {
  list: (params?: {
    startDate?: string;
    endDate?: string;
    eventType?: string;
    status?: string;
    assigneeId?: string;
    includeAutomated?: boolean;
  }): Promise<AxiosResponse<CalendarEventListResponse>> =>
    api.get('/api/calendar/events', { params }),
  get: (id: string): Promise<AxiosResponse<CalendarEvent>> =>
    api.get(`/api/calendar/events/${id}`),
  create: (data: CreateCalendarEventData): Promise<AxiosResponse<CalendarEvent>> =>
    api.post('/api/calendar/events', data),
  update: (id: string, data: Partial<CreateCalendarEventData>): Promise<AxiosResponse<CalendarEvent>> =>
    api.put(`/api/calendar/events/${id}`, data),
  delete: (id: string): Promise<AxiosResponse<void>> =>
    api.delete(`/api/calendar/events/${id}`),
  exportIcal: (params?: {
    startDate?: string;
    endDate?: string;
    eventType?: string;
  }): Promise<AxiosResponse<Blob>> =>
    api.get('/api/calendar/events/export/ical', {
      params,
      responseType: 'blob',
    }),
  getFeedUrl: (): Promise<AxiosResponse<{ feedUrl: string; instructions: string }>> =>
    api.get('/api/calendar/feed'),
};

// ============================================
// Audit Portal API
// ============================================

export interface PortalSession {
  auditId: string;
  auditName: string;
  auditorName: string;
  auditorEmail: string;
  role: string;
  organizationName: string;
  expiresAt: string;
  permissions: {
    canViewAll: boolean;
    canUpload: boolean;
    canComment: boolean;
  };
  portalUserId: string;
}

export interface PortalUser {
  id: string;
  auditId: string;
  name: string;
  email: string;
  role: string;
  accessCode: string;
  isActive: boolean;
  lastLoginAt?: string;
  canViewAll: boolean;
  canUpload: boolean;
  canComment: boolean;
  allowedIpRanges: string[];
  enforceIpRestriction: boolean;
  downloadLimit?: number;
  downloadsUsed: number;
  enableWatermark: boolean;
  watermarkText?: string;
  expiresAt: string;
  createdAt: string;
}

export interface CreatePortalUserData {
  name: string;
  email: string;
  role: string;
  canViewAll?: boolean;
  canUpload?: boolean;
  canComment?: boolean;
  allowedIpRanges?: string[];
  enforceIpRestriction?: boolean;
  downloadLimit?: number;
  enableWatermark?: boolean;
  watermarkText?: string;
  expiresAt?: string;
}

export const auditPortalApi = {
  // Public authentication
  authenticate: (accessCode: string): Promise<AxiosResponse<PortalSession>> =>
    api.post('/api/audit-portal/auth', { accessCode }),
  refreshSession: (accessCode: string): Promise<AxiosResponse<PortalSession>> =>
    api.post('/api/audit-portal/auth/refresh', { accessCode }),

  // Admin: Portal user management
  listUsers: (auditId: string): Promise<AxiosResponse<PortalUser[]>> =>
    api.get(`/api/audits/${auditId}/portal/users`),
  createUser: (auditId: string, data: CreatePortalUserData): Promise<AxiosResponse<PortalUser>> =>
    api.post(`/api/audits/${auditId}/portal/users`, data),
  updateUser: (auditId: string, userId: string, data: Partial<CreatePortalUserData>): Promise<AxiosResponse<PortalUser>> =>
    api.put(`/api/audits/${auditId}/portal/users/${userId}`, data),
  deleteUser: (auditId: string, userId: string): Promise<AxiosResponse<void>> =>
    api.delete(`/api/audits/${auditId}/portal/users/${userId}`),
  bulkCreateUsers: (auditId: string, users: CreatePortalUserData[]): Promise<AxiosResponse<{
    created: number;
    failed: number;
    results: Array<{ success: boolean; user?: PortalUser; email?: string; error?: string }>;
  }>> =>
    api.post(`/api/audits/${auditId}/portal/users/bulk`, users),
  getAccessLogs: (auditId: string, limit?: number): Promise<AxiosResponse<Array<{
    id: string;
    action: string;
    entityType?: string;
    entityId?: string;
    entityName?: string;
    ipAddress: string;
    userAgent?: string;
    success: boolean;
    failureReason?: string;
    timestamp: string;
    portalUser?: { id: string; name: string; email: string };
  }>>> =>
    api.get(`/api/audits/${auditId}/portal/logs`, { params: { limit } }),
};

export default api;

