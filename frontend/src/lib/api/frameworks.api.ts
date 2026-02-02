/**
 * Frameworks API Module
 * 
 * Handles all API calls related to compliance frameworks and mappings.
 */

import { api, buildQueryString } from './client';
import type {
  Framework,
  CreateFrameworkData,
  UpdateFrameworkData,
  FrameworkRequirement,
  CreateRequirementData,
  UpdateRequirementData,
  CreateMappingData,
  BulkMappingData,
  MappingListParams,
} from '../apiTypes';

export const frameworksApi = {
  /**
   * List all frameworks
   */
  list: async () => {
    const response = await api.get<Framework[]>('/api/frameworks');
    return response.data;
  },

  /**
   * Get a single framework by ID
   */
  get: async (id: string) => {
    const response = await api.get<Framework>(`/api/frameworks/${id}`);
    return response.data;
  },

  /**
   * Create a new framework
   */
  create: async (data: CreateFrameworkData) => {
    const response = await api.post<Framework>('/api/frameworks', data);
    return response.data;
  },

  /**
   * Update an existing framework
   */
  update: async (id: string, data: UpdateFrameworkData) => {
    const response = await api.patch<Framework>(`/api/frameworks/${id}`, data);
    return response.data;
  },

  /**
   * Delete a framework
   */
  delete: async (id: string) => {
    const response = await api.delete(`/api/frameworks/${id}`);
    return response.data;
  },

  /**
   * Get framework statistics
   */
  getStats: async (frameworkId: string) => {
    const response = await api.get<{
      totalRequirements: number;
      mappedRequirements: number;
      complianceScore: number;
    }>(`/api/frameworks/${frameworkId}/stats`);
    return response.data;
  },

  // Requirements
  requirements: {
    /**
     * List requirements for a framework
     */
    list: async (frameworkId: string) => {
      const response = await api.get<FrameworkRequirement[]>(
        `/api/frameworks/${frameworkId}/requirements`
      );
      return response.data;
    },

    /**
     * Get a single requirement
     */
    get: async (frameworkId: string, requirementId: string) => {
      const response = await api.get<FrameworkRequirement>(
        `/api/frameworks/${frameworkId}/requirements/${requirementId}`
      );
      return response.data;
    },

    /**
     * Create a new requirement
     */
    create: async (frameworkId: string, data: CreateRequirementData) => {
      const response = await api.post<FrameworkRequirement>(
        `/api/frameworks/${frameworkId}/requirements`,
        data
      );
      return response.data;
    },

    /**
     * Update a requirement
     */
    update: async (frameworkId: string, requirementId: string, data: UpdateRequirementData) => {
      const response = await api.patch<FrameworkRequirement>(
        `/api/frameworks/${frameworkId}/requirements/${requirementId}`,
        data
      );
      return response.data;
    },

    /**
     * Delete a requirement
     */
    delete: async (frameworkId: string, requirementId: string) => {
      const response = await api.delete(
        `/api/frameworks/${frameworkId}/requirements/${requirementId}`
      );
      return response.data;
    },
  },

  // Mappings
  mappings: {
    /**
     * List all mappings with optional filtering
     */
    list: async (params?: MappingListParams) => {
      const queryString = params ? buildQueryString(params as Record<string, string | number | boolean | undefined>) : '';
      const response = await api.get(`/api/mappings${queryString}`);
      return response.data;
    },

    /**
     * Create a mapping between control and requirement
     */
    create: async (data: CreateMappingData) => {
      const response = await api.post('/api/mappings', data);
      return response.data;
    },

    /**
     * Bulk create mappings
     */
    bulkCreate: async (data: BulkMappingData) => {
      const response = await api.post('/api/mappings/bulk', data);
      return response.data;
    },

    /**
     * Delete a mapping
     */
    delete: async (id: string) => {
      const response = await api.delete(`/api/mappings/${id}`);
      return response.data;
    },

    /**
     * Get mappings for a specific control
     */
    getByControl: async (controlId: string) => {
      const response = await api.get(`/api/mappings/by-control/${controlId}`);
      return response.data;
    },

    /**
     * Get mappings for a specific requirement
     */
    getByRequirement: async (requirementId: string) => {
      const response = await api.get(`/api/mappings/by-requirement/${requirementId}`);
      return response.data;
    },

    /**
     * Get control coverage statistics
     */
    getControlCoverage: async () => {
      const response = await api.get('/api/mappings/control-coverage');
      return response.data;
    },

    /**
     * Get requirement coverage for a framework
     */
    getRequirementCoverage: async (frameworkId: string) => {
      const response = await api.get(`/api/mappings/requirement-coverage/${frameworkId}`);
      return response.data;
    },
  },
};
