/**
 * Controls API Module
 * 
 * Handles all API calls related to security controls management.
 */

import { api, buildQueryString } from './client';
import type {
  Control,
  CreateControlData,
  UpdateControlData,
  ControlListParams,
  BulkControlUploadData,
  ControlImplementation,
  UpdateImplementationData,
  CreateControlTestData,
} from '../apiTypes';

export const controlsApi = {
  /**
   * List all controls with optional filtering
   */
  list: async (params?: ControlListParams) => {
    const queryString = params ? buildQueryString(params as Record<string, string | number | boolean | undefined>) : '';
    const response = await api.get<Control[]>(`/api/controls${queryString}`);
    return response.data;
  },

  /**
   * Get a single control by ID
   */
  get: async (id: string) => {
    const response = await api.get<Control>(`/api/controls/${id}`);
    return response.data;
  },

  /**
   * Create a new control
   */
  create: async (data: CreateControlData) => {
    const response = await api.post<Control>('/api/controls', data);
    return response.data;
  },

  /**
   * Update an existing control
   */
  update: async (id: string, data: UpdateControlData) => {
    const response = await api.patch<Control>(`/api/controls/${id}`, data);
    return response.data;
  },

  /**
   * Delete a control
   */
  delete: async (id: string) => {
    const response = await api.delete(`/api/controls/${id}`);
    return response.data;
  },

  /**
   * Bulk upload controls
   */
  bulkUpload: async (data: BulkControlUploadData) => {
    const response = await api.post<{ imported: number; errors: string[] }>(
      '/api/controls/bulk',
      data
    );
    return response.data;
  },

  /**
   * Get control statistics
   */
  getStats: async () => {
    const response = await api.get<{
      total: number;
      implemented: number;
      inProgress: number;
      notStarted: number;
      byCategory: Record<string, number>;
      byFramework: Record<string, number>;
    }>('/api/controls/stats');
    return response.data;
  },

  /**
   * Link a control to a framework requirement
   */
  linkToRequirement: async (controlId: string, requirementId: string) => {
    const response = await api.post(`/api/controls/${controlId}/requirements`, {
      requirementId,
    });
    return response.data;
  },

  /**
   * Unlink a control from a framework requirement
   */
  unlinkFromRequirement: async (controlId: string, requirementId: string) => {
    const response = await api.delete(
      `/api/controls/${controlId}/requirements/${requirementId}`
    );
    return response.data;
  },

  /**
   * Get control implementation details
   */
  getImplementation: async (controlId: string) => {
    const response = await api.get<ControlImplementation>(
      `/api/controls/${controlId}/implementation`
    );
    return response.data;
  },

  /**
   * Update control implementation
   */
  updateImplementation: async (controlId: string, data: UpdateImplementationData) => {
    const response = await api.patch<ControlImplementation>(
      `/api/controls/${controlId}/implementation`,
      data
    );
    return response.data;
  },

  /**
   * Create a control test
   */
  createTest: async (controlId: string, data: CreateControlTestData) => {
    const response = await api.post(`/api/controls/${controlId}/tests`, data);
    return response.data;
  },

  /**
   * Get control test history
   */
  getTestHistory: async (controlId: string) => {
    const response = await api.get(`/api/controls/${controlId}/tests`);
    return response.data;
  },

  /**
   * Export controls to CSV
   */
  exportCsv: async () => {
    const response = await api.get('/api/controls/export', {
      responseType: 'blob',
    });
    return response.data;
  },
};
