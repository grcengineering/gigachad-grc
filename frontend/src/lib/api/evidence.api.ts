/**
 * Evidence API Module
 * 
 * Handles all API calls related to evidence management.
 */

import { api, buildQueryString, createFormData } from './client';
import type {
  Evidence,
  UploadEvidenceData,
  UpdateEvidenceData,
  EvidenceListParams,
  EvidenceFolder,
  CreateEvidenceFolderData,
  ReviewEvidenceData,
} from '../apiTypes';

export const evidenceApi = {
  /**
   * List all evidence with optional filtering
   */
  list: async (params?: EvidenceListParams) => {
    const queryString = params ? buildQueryString(params as Record<string, string | number | boolean | undefined>) : '';
    const response = await api.get<Evidence[]>(`/api/evidence${queryString}`);
    return response.data;
  },

  /**
   * Get a single evidence item by ID
   */
  get: async (id: string) => {
    const response = await api.get<Evidence>(`/api/evidence/${id}`);
    return response.data;
  },

  /**
   * Upload new evidence
   */
  upload: async (file: File, data: Omit<UploadEvidenceData, 'file'>) => {
    const formData = createFormData(file, data as Record<string, string | number | boolean>);
    const response = await api.post<Evidence>('/api/evidence', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Update evidence metadata
   */
  update: async (id: string, data: UpdateEvidenceData) => {
    const response = await api.patch<Evidence>(`/api/evidence/${id}`, data);
    return response.data;
  },

  /**
   * Delete evidence
   */
  delete: async (id: string) => {
    const response = await api.delete(`/api/evidence/${id}`);
    return response.data;
  },

  /**
   * Download evidence file
   */
  download: async (id: string) => {
    const response = await api.get(`/api/evidence/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Review evidence (approve/reject)
   */
  review: async (id: string, data: ReviewEvidenceData) => {
    const response = await api.post<Evidence>(`/api/evidence/${id}/review`, data);
    return response.data;
  },

  /**
   * Get evidence statistics
   */
  getStats: async () => {
    const response = await api.get<{
      total: number;
      byStatus: Record<string, number>;
      byType: Record<string, number>;
      totalSize: number;
    }>('/api/evidence/stats');
    return response.data;
  },

  /**
   * Link evidence to a control
   */
  linkToControl: async (evidenceId: string, controlId: string) => {
    const response = await api.post(`/api/evidence/${evidenceId}/controls`, { controlId });
    return response.data;
  },

  /**
   * Unlink evidence from a control
   */
  unlinkFromControl: async (evidenceId: string, controlId: string) => {
    const response = await api.delete(`/api/evidence/${evidenceId}/controls/${controlId}`);
    return response.data;
  },

  // Evidence Folders
  folders: {
    /**
     * List all folders
     */
    list: async () => {
      const response = await api.get<EvidenceFolder[]>('/api/evidence/folders');
      return response.data;
    },

    /**
     * Create a new folder
     */
    create: async (data: CreateEvidenceFolderData) => {
      const response = await api.post<EvidenceFolder>('/api/evidence/folders', data);
      return response.data;
    },

    /**
     * Update a folder
     */
    update: async (id: string, data: Partial<CreateEvidenceFolderData>) => {
      const response = await api.patch<EvidenceFolder>(`/api/evidence/folders/${id}`, data);
      return response.data;
    },

    /**
     * Delete a folder
     */
    delete: async (id: string) => {
      const response = await api.delete(`/api/evidence/folders/${id}`);
      return response.data;
    },
  },
};
