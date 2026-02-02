/**
 * Audits API Module
 * 
 * Handles all API calls related to audit management.
 */

import { api, buildQueryString } from './client';
import type {
  Audit,
  CreateAuditData,
  UpdateAuditData,
  AuditListParams,
  AuditFinding,
  CreateFindingData,
  UpdateFindingData,
  FindingListParams,
} from '../apiTypes';

export const auditsApi = {
  /**
   * List all audits with optional filtering
   */
  list: async (params?: AuditListParams) => {
    const queryString = params ? buildQueryString(params as Record<string, string | number | boolean | undefined>) : '';
    const response = await api.get<Audit[]>(`/api/audits${queryString}`);
    return response.data;
  },

  /**
   * Get a single audit by ID
   */
  get: async (id: string) => {
    const response = await api.get<Audit>(`/api/audits/${id}`);
    return response.data;
  },

  /**
   * Create a new audit
   */
  create: async (data: CreateAuditData) => {
    const response = await api.post<Audit>('/api/audits', data);
    return response.data;
  },

  /**
   * Update an existing audit
   */
  update: async (id: string, data: UpdateAuditData) => {
    const response = await api.patch<Audit>(`/api/audits/${id}`, data);
    return response.data;
  },

  /**
   * Delete an audit
   */
  delete: async (id: string) => {
    const response = await api.delete(`/api/audits/${id}`);
    return response.data;
  },

  /**
   * Get audit statistics
   */
  getStats: async () => {
    const response = await api.get<{
      total: number;
      byStatus: Record<string, number>;
      byType: Record<string, number>;
      findingsCount: number;
    }>('/api/audits/stats');
    return response.data;
  },

  /**
   * Start an audit
   */
  start: async (id: string) => {
    const response = await api.post<Audit>(`/api/audits/${id}/start`);
    return response.data;
  },

  /**
   * Complete an audit
   */
  complete: async (id: string) => {
    const response = await api.post<Audit>(`/api/audits/${id}/complete`);
    return response.data;
  },

  // Findings
  findings: {
    /**
     * List findings with optional filtering
     */
    list: async (params?: FindingListParams) => {
      const queryString = params ? buildQueryString(params as Record<string, string | number | boolean | undefined>) : '';
      const response = await api.get<AuditFinding[]>(`/api/audit-findings${queryString}`);
      return response.data;
    },

    /**
     * Get findings for a specific audit
     */
    getByAudit: async (auditId: string) => {
      const response = await api.get<AuditFinding[]>(`/api/audits/${auditId}/findings`);
      return response.data;
    },

    /**
     * Get a single finding
     */
    get: async (id: string) => {
      const response = await api.get<AuditFinding>(`/api/audit-findings/${id}`);
      return response.data;
    },

    /**
     * Create a new finding
     */
    create: async (data: CreateFindingData) => {
      const response = await api.post<AuditFinding>('/api/audit-findings', data);
      return response.data;
    },

    /**
     * Update a finding
     */
    update: async (id: string, data: UpdateFindingData) => {
      const response = await api.patch<AuditFinding>(`/api/audit-findings/${id}`, data);
      return response.data;
    },

    /**
     * Delete a finding
     */
    delete: async (id: string) => {
      const response = await api.delete(`/api/audit-findings/${id}`);
      return response.data;
    },

    /**
     * Close a finding
     */
    close: async (id: string, closureNotes: string) => {
      const response = await api.post<AuditFinding>(`/api/audit-findings/${id}/close`, {
        closureNotes,
      });
      return response.data;
    },
  },

  /**
   * Get dashboard data
   */
  getDashboard: async () => {
    const response = await api.get('/api/analytics/dashboard');
    return response.data;
  },

  /**
   * Get audit trends
   */
  getTrends: async (period: 'monthly' | 'quarterly' | 'yearly') => {
    const response = await api.get(`/api/analytics/trends?period=${period}`);
    return response.data;
  },

  /**
   * Export audit report
   */
  exportReport: async (id: string, format: 'pdf' | 'docx' = 'pdf') => {
    const response = await api.get(`/api/audits/${id}/export?format=${format}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
