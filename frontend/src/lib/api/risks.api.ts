/**
 * Risks API Module
 * 
 * Handles all API calls related to risk management.
 */

import { api, buildQueryString } from './client';
import type {
  Risk,
  RiskDetail,
  CreateRiskData,
  UpdateRiskData,
  RiskListParams,
  RiskTreatmentData,
  RiskAssessmentData,
  RiskScenario,
  CreateRiskScenarioData,
  UpdateRiskScenarioData,
  RiskScenarioListParams,
} from '../apiTypes';

export const risksApi = {
  /**
   * List all risks with optional filtering
   */
  list: async (params?: RiskListParams) => {
    const queryString = params ? buildQueryString(params as Record<string, string | number | boolean | undefined>) : '';
    const response = await api.get<Risk[]>(`/api/risks${queryString}`);
    return response.data;
  },

  /**
   * Get a single risk by ID with full details
   */
  get: async (id: string) => {
    const response = await api.get<RiskDetail>(`/api/risks/${id}`);
    return response.data;
  },

  /**
   * Create a new risk
   */
  create: async (data: CreateRiskData) => {
    const response = await api.post<Risk>('/api/risks', data);
    return response.data;
  },

  /**
   * Update an existing risk
   */
  update: async (id: string, data: UpdateRiskData) => {
    const response = await api.patch<Risk>(`/api/risks/${id}`, data);
    return response.data;
  },

  /**
   * Delete a risk
   */
  delete: async (id: string) => {
    const response = await api.delete(`/api/risks/${id}`);
    return response.data;
  },

  /**
   * Get risk statistics
   */
  getStats: async () => {
    const response = await api.get<{
      total: number;
      bySeverity: Record<string, number>;
      byCategory: Record<string, number>;
      byStatus: Record<string, number>;
      averageScore: number;
    }>('/api/risks/stats');
    return response.data;
  },

  /**
   * Perform risk assessment
   */
  assess: async (id: string, data: RiskAssessmentData) => {
    const response = await api.post<RiskDetail>(`/api/risks/${id}/assess`, data);
    return response.data;
  },

  /**
   * Create risk treatment plan
   */
  createTreatment: async (id: string, data: RiskTreatmentData) => {
    const response = await api.post(`/api/risks/${id}/treatment`, data);
    return response.data;
  },

  /**
   * Update risk treatment
   */
  updateTreatment: async (id: string, treatmentId: string, data: Partial<RiskTreatmentData>) => {
    const response = await api.patch(`/api/risks/${id}/treatment/${treatmentId}`, data);
    return response.data;
  },

  /**
   * Link a risk to a control
   */
  linkToControl: async (riskId: string, controlId: string) => {
    const response = await api.post(`/api/risks/${riskId}/controls`, { controlId });
    return response.data;
  },

  /**
   * Unlink a risk from a control
   */
  unlinkFromControl: async (riskId: string, controlId: string) => {
    const response = await api.delete(`/api/risks/${riskId}/controls/${controlId}`);
    return response.data;
  },

  /**
   * Get risk matrix data
   */
  getMatrix: async () => {
    const response = await api.get('/api/risks/matrix');
    return response.data;
  },

  /**
   * Export risks to CSV
   */
  exportCsv: async () => {
    const response = await api.get('/api/risks/export', {
      responseType: 'blob',
    });
    return response.data;
  },

  // Risk Scenarios
  scenarios: {
    /**
     * List risk scenarios
     */
    list: async (params?: RiskScenarioListParams) => {
      const queryString = params ? buildQueryString(params as Record<string, string | number | boolean | undefined>) : '';
      const response = await api.get<RiskScenario[]>(`/api/risk-scenarios${queryString}`);
      return response.data;
    },

    /**
     * Get a single risk scenario
     */
    get: async (id: string) => {
      const response = await api.get<RiskScenario>(`/api/risk-scenarios/${id}`);
      return response.data;
    },

    /**
     * Create a new risk scenario
     */
    create: async (data: CreateRiskScenarioData) => {
      const response = await api.post<RiskScenario>('/api/risk-scenarios', data);
      return response.data;
    },

    /**
     * Update a risk scenario
     */
    update: async (id: string, data: UpdateRiskScenarioData) => {
      const response = await api.patch<RiskScenario>(`/api/risk-scenarios/${id}`, data);
      return response.data;
    },

    /**
     * Delete a risk scenario
     */
    delete: async (id: string) => {
      const response = await api.delete(`/api/risk-scenarios/${id}`);
      return response.data;
    },
  },
};
