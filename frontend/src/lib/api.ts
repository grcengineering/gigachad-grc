import axios, { AxiosError, AxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and user ID
api.interceptors.request.use((config) => {
  // Token will be added by the auth context
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Add user ID for notifications and other user-specific endpoints
  const userId = localStorage.getItem('userId');
  if (userId) {
    config.headers['x-user-id'] = userId;
  }
  // Add organization ID
  const orgId = localStorage.getItem('organizationId');
  if (orgId) {
    config.headers['x-organization-id'] = orgId;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API functions
export const controlsApi = {
  list: (params?: any) => api.get('/api/controls', { params }),
  get: (id: string) => api.get(`/api/controls/${id}`),
  create: (data: any) => api.post('/api/controls', data),
  update: (id: string, data: any) => api.put(`/api/controls/${id}`, data),
  delete: (id: string) => api.delete(`/api/controls/${id}`),
  getCategories: () => api.get('/api/controls/categories'),
  getTags: () => api.get('/api/controls/tags'),
  // Bulk upload endpoints
  bulkUpload: (data: { controls: any[]; skipExisting?: boolean; updateExisting?: boolean }) =>
    api.post('/api/controls/bulk', data),
  bulkUploadCSV: (data: { csv: string; skipExisting?: boolean; updateExisting?: boolean }) =>
    api.post('/api/controls/bulk/csv', data),
  getTemplate: () => api.get('/api/controls/bulk/template', { responseType: 'text' }),
};

export const implementationsApi = {
  list: (params?: any) => api.get('/api/implementations', { params }),
  get: (id: string) => api.get(`/api/implementations/${id}`),
  update: (id: string, data: any) => api.put(`/api/implementations/${id}`, data),
  bulkUpdate: (data: any) => api.post('/api/implementations/bulk-update', data),
  createTest: (id: string, data: any) => api.post(`/api/implementations/${id}/tests`, data),
  getTests: (id: string) => api.get(`/api/implementations/${id}/tests`),
};

export const collectorsApi = {
  list: (controlId: string, implementationId: string) =>
    api.get(`/api/controls/${controlId}/implementations/${implementationId}/collectors`),
  get: (controlId: string, implementationId: string, collectorId: string) =>
    api.get(`/api/controls/${controlId}/implementations/${implementationId}/collectors/${collectorId}`),
  create: (controlId: string, implementationId: string, data: any) =>
    api.post(`/api/controls/${controlId}/implementations/${implementationId}/collectors`, data),
  update: (controlId: string, implementationId: string, collectorId: string, data: any) =>
    api.put(`/api/controls/${controlId}/implementations/${implementationId}/collectors/${collectorId}`, data),
  delete: (controlId: string, implementationId: string, collectorId: string) =>
    api.delete(`/api/controls/${controlId}/implementations/${implementationId}/collectors/${collectorId}`),
  test: (controlId: string, implementationId: string, collectorId: string, data?: any) =>
    api.post(`/api/controls/${controlId}/implementations/${implementationId}/collectors/${collectorId}/test`, data || {}),
  run: (controlId: string, implementationId: string, collectorId: string) =>
    api.post(`/api/controls/${controlId}/implementations/${implementationId}/collectors/${collectorId}/run`),
  getRuns: (controlId: string, implementationId: string, collectorId: string, limit?: number) =>
    api.get(`/api/controls/${controlId}/implementations/${implementationId}/collectors/${collectorId}/runs`, { params: { limit } }),
};

export const evidenceApi = {
  list: (params?: any) => api.get('/api/evidence', { params }),
  get: (id: string) => api.get(`/api/evidence/${id}`),
  upload: (file: File, data: any) => {
    const formData = new FormData();
    formData.append('file', file);
    Object.keys(data).forEach((key) => {
      const value = data[key];
      if (value !== undefined && value !== null) {
        // Handle arrays (like controlIds)
        if (Array.isArray(value)) {
          value.forEach((item) => {
            formData.append(key, item);
          });
        } else {
          formData.append(key, value);
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
      return { data: await res.json() };
    });
  },
  update: (id: string, data: any) => api.put(`/api/evidence/${id}`, data),
  delete: (id: string) => api.delete(`/api/evidence/${id}`),
  getDownloadUrl: (id: string) => api.get(`/api/evidence/${id}/download`),
  review: (id: string, data: any) => api.post(`/api/evidence/${id}/review`, data),
  link: (id: string, controlIds: string[]) => api.post(`/api/evidence/${id}/link`, { controlIds }),
  unlink: (id: string, controlId: string) => api.delete(`/api/evidence/${id}/link/${controlId}`),
  getStats: () => api.get('/api/evidence/stats'),
  getFolders: (parentId?: string) => api.get('/api/evidence/folders', { params: { parentId } }),
  createFolder: (data: any) => api.post('/api/evidence/folders', data),
};

export const frameworksApi = {
  list: () => api.get('/api/frameworks'),
  get: (id: string) => api.get(`/api/frameworks/${id}`),
  create: (data: { name: string; type: string; version?: string; description?: string; isActive?: boolean }) =>
    api.post('/api/frameworks', data),
  getRequirements: (id: string, parentId?: string) =>
    api.get(`/api/frameworks/${id}/requirements`, { params: { parentId } }),
  getRequirementTree: (id: string) => api.get(`/api/frameworks/${id}/requirements/tree`),
  getRequirement: (frameworkId: string, requirementId: string) =>
    api.get(`/api/frameworks/${frameworkId}/requirements/${requirementId}`),
  createRequirement: (frameworkId: string, data: { reference: string; title: string; description: string; guidance?: string; parentId?: string; isCategory?: boolean; order?: number }) =>
    api.post(`/api/frameworks/${frameworkId}/requirements`, data),
  bulkUploadRequirements: (frameworkId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/api/frameworks/${frameworkId}/requirements/bulk-upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateRequirement: (frameworkId: string, requirementId: string, data: any) =>
    api.put(`/api/frameworks/${frameworkId}/requirements/${requirementId}`, data),
  getReadiness: (id: string) => api.get(`/api/frameworks/${id}/readiness`),
  // Seed endpoints
  getSeedStatus: () => api.get('/api/frameworks/seed/status'),
  seed: () => api.post('/api/frameworks/seed'),
};

export const usersApi = {
  list: (params?: { search?: string; status?: string; role?: string; groupId?: string; page?: number; limit?: number }) =>
    api.get('/api/users', { params }),
  get: (id: string) => api.get(`/api/users/${id}`),
  getMe: () => api.get('/api/users/me'),
  getStats: () => api.get('/api/users/stats'),
  create: (data: any) => api.post('/api/users', data),
  update: (id: string, data: any) => api.put(`/api/users/${id}`, data),
  deactivate: (id: string) => api.post(`/api/users/${id}/deactivate`),
  reactivate: (id: string) => api.post(`/api/users/${id}/reactivate`),
  getPermissions: (id: string) => api.get(`/api/users/${id}/permissions`),
  getGroups: (id: string) => api.get(`/api/users/${id}/groups`),
  addToGroup: (userId: string, groupId: string) => api.post(`/api/users/${userId}/groups/${groupId}`),
  removeFromGroup: (userId: string, groupId: string) => api.post(`/api/users/${userId}/groups/${groupId}/remove`),
  sync: (data: { keycloakId: string; email: string; firstName?: string; lastName?: string; roles?: string[] }) =>
    api.post('/api/users/sync', data),
};

export const permissionsApi = {
  // Permission Groups
  listGroups: () => api.get('/api/permissions/groups'),
  getGroup: (id: string) => api.get(`/api/permissions/groups/${id}`),
  createGroup: (data: { name: string; description?: string; permissions: any[] }) =>
    api.post('/api/permissions/groups', data),
  updateGroup: (id: string, data: { name?: string; description?: string; permissions?: any[] }) =>
    api.put(`/api/permissions/groups/${id}`, data),
  deleteGroup: (id: string) => api.delete(`/api/permissions/groups/${id}`),
  getGroupMembers: (id: string) => api.get(`/api/permissions/groups/${id}/members`),
  addGroupMember: (groupId: string, userId: string) =>
    api.post(`/api/permissions/groups/${groupId}/members`, { userId }),
  removeGroupMember: (groupId: string, userId: string) =>
    api.delete(`/api/permissions/groups/${groupId}/members/${userId}`),
  
  // User Permissions
  getUserPermissions: (userId: string) => api.get(`/api/permissions/users/${userId}`),
  setUserOverrides: (userId: string, overrides: any[]) =>
    api.put(`/api/permissions/users/${userId}/overrides`, { overrides }),
  getUserOverrides: (userId: string) => api.get(`/api/permissions/users/${userId}/overrides`),
  
  // Check Permission
  checkPermission: (resource: string, action: string, resourceId?: string) =>
    api.get('/api/permissions/check', {
      headers: {
        'x-check-resource': resource,
        'x-check-action': action,
        'x-check-resource-id': resourceId || '',
      },
    }),
  
  // Available permissions
  getAvailable: () => api.get('/api/permissions/available'),
  
  // Seed default groups
  seedDefaults: () => api.post('/api/permissions/seed'),
};

export const policiesApi = {
  list: (params?: any) => api.get('/api/policies', { params }),
  get: (id: string) => api.get(`/api/policies/${id}`),
  getStats: () => api.get('/api/policies/stats'),
  upload: async (file: File, data: any) => {
    const formData = new FormData();
    formData.append('file', file);
    Object.keys(data).forEach((key) => {
      const value = data[key];
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((item) => formData.append(key, item));
        } else {
          formData.append(key, value);
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
    return response.json();
  },
  update: (id: string, data: any) => api.put(`/api/policies/${id}`, data),
  updateStatus: (id: string, status: string, notes?: string) =>
    api.put(`/api/policies/${id}/status`, { status, notes }),
  delete: (id: string) => api.delete(`/api/policies/${id}`),
  getDownloadUrl: (id: string) => api.get(`/api/policies/${id}/download`),
  getPreviewUrl: (id: string) => `/api/policies/${id}/preview`,
  uploadNewVersion: async (id: string, file: File, versionNumber: string, changeNotes?: string) => {
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
    return response.json();
  },
  linkToControls: (id: string, controlIds: string[]) =>
    api.post(`/api/policies/${id}/link`, { controlIds }),
  unlinkFromControl: (id: string, controlId: string) =>
    api.delete(`/api/policies/${id}/link/${controlId}`),
};

export const commentsApi = {
  list: (entityType: string, entityId: string) =>
    api.get('/api/comments', { params: { entityType, entityId } }),
  create: (data: { entityType: string; entityId: string; content: string; parentId?: string }) =>
    api.post('/api/comments', data),
  update: (id: string, data: { content?: string; isResolved?: boolean }) =>
    api.put(`/api/comments/${id}`, data),
  delete: (id: string) => api.delete(`/api/comments/${id}`),
};

export const tasksApi = {
  list: (params?: { entityType?: string; entityId?: string; status?: string; priority?: string }) =>
    api.get('/api/tasks', { params }),
  myTasks: (status?: string) => api.get('/api/tasks/my', { params: { status } }),
  create: (data: {
    entityType: string;
    entityId: string;
    title: string;
    description?: string;
    priority?: string;
    assigneeId?: string;
    dueDate?: string;
  }) => api.post('/api/tasks', data),
  update: (id: string, data: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    assigneeId?: string | null;
    dueDate?: string | null;
  }) => api.put(`/api/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/api/tasks/${id}`),
};

export const assessmentsApi = {
  list: (frameworkId?: string) => api.get('/api/assessments', { params: { frameworkId } }),
  get: (id: string) => api.get(`/api/assessments/${id}`),
  create: (data: any) => api.post('/api/assessments', data),
  updateRequirementStatus: (id: string, requirementId: string, data: any) =>
    api.put(`/api/assessments/${id}/requirements/${requirementId}`, data),
  getGaps: (id: string) => api.get(`/api/assessments/${id}/gaps`),
  createGap: (id: string, data: any) => api.post(`/api/assessments/${id}/gaps`, data),
  generateGaps: (id: string) => api.post(`/api/assessments/${id}/gaps/generate`),
  createRemediation: (id: string, data: any) => api.post(`/api/assessments/${id}/remediation`, data),
  updateRemediation: (id: string, taskId: string, data: any) =>
    api.put(`/api/assessments/${id}/remediation/${taskId}`, data),
  complete: (id: string) => api.post(`/api/assessments/${id}/complete`),
};

export const mappingsApi = {
  list: (params?: any) => api.get('/api/mappings', { params }),
  byControl: (controlId: string) => api.get(`/api/mappings/by-control/${controlId}`),
  byRequirement: (requirementId: string) => api.get(`/api/mappings/by-requirement/${requirementId}`),
  controlCoverage: () => api.get('/api/mappings/control-coverage'),
  requirementCoverage: (frameworkId: string) =>
    api.get(`/api/mappings/requirement-coverage/${frameworkId}`),
  create: (data: any) => api.post('/api/mappings', data),
  bulkCreate: (data: any) => api.post('/api/mappings/bulk', data),
  delete: (id: string) => api.delete(`/api/mappings/${id}`),
};

export const dashboardApi = {
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
  list: (params?: { type?: string; status?: string; search?: string; page?: number; limit?: number }) =>
    api.get('/api/integrations', { params }),
  get: (id: string) => api.get(`/api/integrations/${id}`),
  getStats: () => api.get('/api/integrations/stats'),
  getTypes: () => api.get('/api/integrations/types'),
  create: (data: { type: string; name: string; description?: string; config?: Record<string, any>; syncFrequency?: string }) =>
    api.post('/api/integrations', data),
  update: (id: string, data: { name?: string; description?: string; status?: string; config?: Record<string, any>; syncFrequency?: string }) =>
    api.put(`/api/integrations/${id}`, data),
  delete: (id: string) => api.delete(`/api/integrations/${id}`),
  testConnection: (id: string) => api.post(`/api/integrations/${id}/test`),
  triggerSync: (id: string) => api.post(`/api/integrations/${id}/sync`),
  
  // Custom integration config
  getCustomConfig: (id: string) => api.get(`/api/integrations/${id}/custom-config`),
  saveCustomConfig: (id: string, config: any) => api.put(`/api/integrations/${id}/custom-config`, config),
  testCustomEndpoint: (id: string, data?: { endpointIndex?: number; baseUrl?: string; authConfig?: any }) =>
    api.post(`/api/integrations/${id}/custom-config/test`, data || {}),
  validateCode: (code: string) => api.post('/api/integrations/custom-config/validate', { code }),
  getCodeTemplate: () => api.get('/api/integrations/custom/template'),
  executeCustomSync: (id: string) => api.post(`/api/integrations/${id}/custom-sync`),
};

export const auditApi = {
  list: (params?: {
    entityType?: string;
    entityId?: string;
    action?: string;
    userId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    // Filter out empty string values to avoid validation errors
    const cleanParams = params ? Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== '' && v !== undefined && v !== null)
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
  list: (params?: { status?: string; auditType?: string }) =>
    api.get('/api/audits', { params }),
  get: (id: string) => api.get(`/api/audits/${id}`),
  create: (data: any) => api.post('/api/audits', data),
  update: (id: string, data: any) => api.put(`/api/audits/${id}`, data),
  delete: (id: string) => api.delete(`/api/audits/${id}`),
};

export const auditRequestsApi = {
  list: (params?: { status?: string; auditId?: string; assigneeId?: string }) =>
    api.get('/api/audit-requests', { params }),
  get: (id: string) => api.get(`/api/audit-requests/${id}`),
  create: (data: any) => api.post('/api/audit-requests', data),
  update: (id: string, data: any) => api.put(`/api/audit-requests/${id}`, data),
  delete: (id: string) => api.delete(`/api/audit-requests/${id}`),
};

export const vendorsApi = {
  list: () => api.get('/api/vendors'),
  get: (id: string) => api.get(`/api/vendors/${id}`),
  create: (data: any) => api.post('/api/vendors', data),
  update: (id: string, data: any) => api.put(`/api/vendors/${id}`, data),
  delete: (id: string) => api.delete(`/api/vendors/${id}`),
};

export const contractsApi = {
  list: () => api.get('/api/contracts'),
  get: (id: string) => api.get(`/api/contracts/${id}`),
  create: (data: any) => api.post('/api/contracts', data),
  update: (id: string, data: any) => api.put(`/api/contracts/${id}`, data),
  delete: (id: string) => api.delete(`/api/contracts/${id}`),
};

export const questionnairesApi = {
  list: (params?: { status?: string }) => api.get('/api/questionnaires', { params }),
  get: (id: string) => api.get(`/api/questionnaires/${id}`),
  create: (data: any) => api.post('/api/questionnaires', data),
  update: (id: string, data: any) => api.put(`/api/questionnaires/${id}`, data),
  delete: (id: string) => api.delete(`/api/questionnaires/${id}`),
};

export const knowledgeBaseApi = {
  list: () => api.get('/api/knowledge-base'),
  get: (id: string) => api.get(`/api/knowledge-base/${id}`),
  create: (data: any) => api.post('/api/knowledge-base', data),
  update: (id: string, data: any) => api.put(`/api/knowledge-base/${id}`, data),
  delete: (id: string) => api.delete(`/api/knowledge-base/${id}`),
};

export const trustCenterApi = {
  getConfig: (params?: { organizationId?: string }) => api.get('/api/trust-center/config', { params }),
  updateConfig: (data: any, params?: { organizationId?: string }) =>
    api.put('/api/trust-center/config', data, { params }),
  getContent: (params?: { organizationId?: string }) => api.get('/api/trust-center/content', { params }),
  createContent: (data: any, params?: { organizationId?: string }) =>
    api.post('/api/trust-center/content', data, { params }),
  updateContent: (id: string, data: any, params?: { organizationId?: string }) =>
    api.put(`/api/trust-center/content/${id}`, data, { params }),
  deleteContent: (id: string, params?: { organizationId?: string }) =>
    api.delete(`/api/trust-center/content/${id}`, { params }),
  publishContent: (id: string, params?: { organizationId?: string }) =>
    api.patch(`/api/trust-center/content/${id}`, {}, { params }),
  getPublic: (params?: { organizationId?: string }) => api.get('/api/trust-center/public', { params }),
};

export const notificationsApi = {
  list: (params?: {
    unreadOnly?: boolean;
    types?: string[];
    severities?: string[];
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) => api.get('/api/notifications', { params }),
  get: (id: string) => api.get(`/api/notifications/${id}`),
  getUnreadCount: () => api.get('/api/notifications/unread-count'),
  getStats: () => api.get('/api/notifications/stats'),
  markAsRead: (notificationIds?: string[], markAll?: boolean) =>
    api.post('/api/notifications/mark-read', { notificationIds, markAll }),
  markOneAsRead: (id: string) => api.post(`/api/notifications/${id}/read`),
  delete: (id: string) => api.delete(`/api/notifications/${id}`),
  deleteAll: () => api.delete('/api/notifications'),
  getPreferences: () => api.get('/api/notifications/preferences/list'),
  updatePreferences: (preferences: Array<{ notificationType: string; inApp: boolean; email: boolean }>) =>
    api.put('/api/notifications/preferences', { preferences }),
};

// Risk Management APIs
export const risksApi = {
  list: (params?: {
    search?: string;
    category?: string;
    status?: string;
    riskLevel?: string;
    ownerId?: string;
    tag?: string;
    page?: number;
    limit?: number;
  }) => api.get('/api/risks', { params }),
  get: (id: string) => api.get(`/api/risks/${id}`),
  create: (data: {
    title: string;
    description: string;
    source?: string;
    initialSeverity?: string;
    smeId?: string;
    documentation?: any[];
    tags?: string[];
  }) => api.post('/api/risks', data),
  update: (id: string, data: any) => api.put(`/api/risks/${id}`, data),
  delete: (id: string) => api.delete(`/api/risks/${id}`),
  markReviewed: (id: string, notes?: string) =>
    api.post(`/api/risks/${id}/review`, { notes }),
  updateTreatment: (id: string, data: {
    treatmentPlan: string;
    treatmentNotes?: string;
    treatmentDueDate?: string;
    residualLikelihood?: string;
    residualImpact?: string;
  }) => api.put(`/api/risks/${id}/treatment`, data),
  getDashboard: () => api.get('/api/risks/dashboard'),
  getHeatmap: () => api.get('/api/risks/heatmap'),
  getTrend: (days?: number) => api.get('/api/risks/trend', { params: { days } }),
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
  updateScenario: (id: string, scenarioId: string, data: any) =>
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
  submitAssessment: (id: string, data: {
    threatDescription: string;
    affectedAssets?: string[];
    existingControls?: string[];
    vulnerabilities?: string;
    likelihoodScore: string;
    likelihoodRationale: string;
    impactScore: string;
    impactRationale: string;
    impactCategories?: { financial?: string; operational?: string; reputational?: string; legal?: string };
    recommendedOwnerId: string;
    assessmentNotes?: string;
    treatmentRecommendation?: string;
  }) => api.post(`/api/risks/${id}/assessment/submit`, data),
  reviewAssessment: (id: string, data: { approved: boolean; notes?: string; declinedReason?: string }) =>
    api.post(`/api/risks/${id}/assessment/review`, data),
  completeRevision: (id: string, data: {
    likelihoodScore?: string;
    likelihoodRationale?: string;
    impactScore?: string;
    impactRationale?: string;
    impactCategories?: any;
    recommendedOwnerId?: string;
    assessmentNotes?: string;
  }) => api.post(`/api/risks/${id}/assessment/revision`, data),
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
};

export const assetsApi = {
  list: (params?: {
    search?: string;
    source?: string;
    type?: string;
    status?: string;
    criticality?: string;
    department?: string;
    page?: number;
    limit?: number;
  }) => api.get('/api/assets', { params }),
  get: (id: string) => api.get(`/api/assets/${id}`),
  create: (data: {
    name: string;
    type: string;
    category?: string;
    criticality?: string;
    owner?: string;
    location?: string;
    department?: string;
    metadata?: any;
  }) => api.post('/api/assets', data),
  update: (id: string, data: any) => api.put(`/api/assets/${id}`, data),
  delete: (id: string) => api.delete(`/api/assets/${id}`),
  getStats: () => api.get('/api/assets/stats'),
  getSources: () => api.get('/api/assets/sources'),
  getDepartments: () => api.get('/api/assets/departments'),
  syncFromSource: (source: string, integrationId: string) =>
    api.post(`/api/assets/sync/${source}`, { integrationId }),
};

export const riskConfigApi = {
  get: () => api.get('/api/risk-config'),
  update: (data: {
    methodology?: string;
    likelihoodScale?: any[];
    impactScale?: any[];
    categories?: any[];
    riskLevelThresholds?: any;
    workflowSettings?: any;
    riskAppetite?: any[];
  }) => api.put('/api/risk-config', data),
  reset: () => api.post('/api/risk-config/reset'),
  addCategory: (category: { name: string; description?: string; color: string }) =>
    api.post('/api/risk-config/categories', category),
  removeCategory: (categoryId: string) =>
    api.delete(`/api/risk-config/categories/${categoryId}`),
  updateAppetite: (category: string, level: string, description?: string) =>
    api.put(`/api/risk-config/appetite/${category}`, { level, description }),
};

export default api;

