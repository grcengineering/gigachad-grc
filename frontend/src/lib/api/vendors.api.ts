/**
 * Vendors API Module
 * 
 * Handles all API calls related to third-party risk management (TPRM).
 */

import { api, buildQueryString, createFormData } from './client';
import type {
  Vendor,
  CreateVendorData,
  UpdateVendorData,
  VendorListParams,
  VendorAssessment,
  CreateVendorAssessmentData,
  UpdateVendorAssessmentData,
  Contract,
  CreateContractData,
  UpdateContractData,
} from '../apiTypes';

export const vendorsApi = {
  /**
   * List all vendors with optional filtering
   */
  list: async (params?: VendorListParams) => {
    const queryString = params ? buildQueryString(params as Record<string, string | number | boolean | undefined>) : '';
    const response = await api.get<Vendor[]>(`/api/vendors${queryString}`);
    return response.data;
  },

  /**
   * Get a single vendor by ID
   */
  get: async (id: string) => {
    const response = await api.get<Vendor>(`/api/vendors/${id}`);
    return response.data;
  },

  /**
   * Create a new vendor
   */
  create: async (data: CreateVendorData) => {
    const response = await api.post<Vendor>('/api/vendors', data);
    return response.data;
  },

  /**
   * Update an existing vendor
   */
  update: async (id: string, data: UpdateVendorData) => {
    const response = await api.patch<Vendor>(`/api/vendors/${id}`, data);
    return response.data;
  },

  /**
   * Delete a vendor
   */
  delete: async (id: string) => {
    const response = await api.delete(`/api/vendors/${id}`);
    return response.data;
  },

  /**
   * Get vendor statistics
   */
  getStats: async () => {
    const response = await api.get<{
      total: number;
      byTier: Record<string, number>;
      byStatus: Record<string, number>;
      byRiskLevel: Record<string, number>;
    }>('/api/vendors/stats');
    return response.data;
  },

  // Vendor Assessments
  assessments: {
    /**
     * List assessments for a vendor
     */
    list: async (vendorId: string) => {
      const response = await api.get<VendorAssessment[]>(`/api/vendors/${vendorId}/assessments`);
      return response.data;
    },

    /**
     * Get a single assessment
     */
    get: async (vendorId: string, assessmentId: string) => {
      const response = await api.get<VendorAssessment>(
        `/api/vendors/${vendorId}/assessments/${assessmentId}`
      );
      return response.data;
    },

    /**
     * Create a new assessment
     */
    create: async (vendorId: string, data: CreateVendorAssessmentData) => {
      const response = await api.post<VendorAssessment>(
        `/api/vendors/${vendorId}/assessments`,
        data
      );
      return response.data;
    },

    /**
     * Update an assessment
     */
    update: async (vendorId: string, assessmentId: string, data: UpdateVendorAssessmentData) => {
      const response = await api.patch<VendorAssessment>(
        `/api/vendors/${vendorId}/assessments/${assessmentId}`,
        data
      );
      return response.data;
    },

    /**
     * Delete an assessment
     */
    delete: async (vendorId: string, assessmentId: string) => {
      const response = await api.delete(
        `/api/vendors/${vendorId}/assessments/${assessmentId}`
      );
      return response.data;
    },
  },

  // Vendor Contracts
  contracts: {
    /**
     * List contracts for a vendor
     */
    list: async (vendorId: string) => {
      const response = await api.get<Contract[]>(`/api/vendors/${vendorId}/contracts`);
      return response.data;
    },

    /**
     * Get a single contract
     */
    get: async (vendorId: string, contractId: string) => {
      const response = await api.get<Contract>(
        `/api/vendors/${vendorId}/contracts/${contractId}`
      );
      return response.data;
    },

    /**
     * Create a new contract
     */
    create: async (vendorId: string, data: CreateContractData) => {
      const response = await api.post<Contract>(
        `/api/vendors/${vendorId}/contracts`,
        data
      );
      return response.data;
    },

    /**
     * Update a contract
     */
    update: async (vendorId: string, contractId: string, data: UpdateContractData) => {
      const response = await api.patch<Contract>(
        `/api/vendors/${vendorId}/contracts/${contractId}`,
        data
      );
      return response.data;
    },

    /**
     * Delete a contract
     */
    delete: async (vendorId: string, contractId: string) => {
      const response = await api.delete(
        `/api/vendors/${vendorId}/contracts/${contractId}`
      );
      return response.data;
    },

    /**
     * Upload contract document
     */
    uploadDocument: async (vendorId: string, contractId: string, file: File) => {
      const formData = createFormData(file);
      const response = await api.post(
        `/api/vendors/${vendorId}/contracts/${contractId}/document`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      return response.data;
    },

    /**
     * Download contract document
     */
    downloadDocument: async (vendorId: string, contractId: string) => {
      const response = await api.get(
        `/api/vendors/${vendorId}/contracts/${contractId}/document`,
        { responseType: 'blob' }
      );
      return response.data;
    },
  },

  /**
   * Export vendors to CSV
   */
  exportCsv: async () => {
    const response = await api.get('/api/vendors/export', {
      responseType: 'blob',
    });
    return response.data;
  },
};
