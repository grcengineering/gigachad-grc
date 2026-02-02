/**
 * Core API Client Module
 * 
 * This module provides the shared axios instance and interceptors for all API calls.
 * Import this module in other API modules to make HTTP requests.
 */

import axios, { AxiosError, AxiosResponse } from 'axios';
import { secureStorage, STORAGE_KEYS, migrateLegacyStorage } from '../secureStorage';
import { isApiError } from '../apiTypes';

// Migrate legacy storage on module load
migrateLegacyStorage();

// API URL configuration
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Retry configuration for API requests
 */
export const RETRY_CONFIG = {
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
export function shouldRetry(error: AxiosError, attempt: number): boolean {
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
  if (!RETRY_CONFIG.retryableMethods.includes(method)) {
    return false;
  }

  return true;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateRetryDelay(attempt: number): number {
  const exponentialDelay = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, RETRY_CONFIG.maxDelayMs);
  // Add 10% jitter to prevent thundering herd
  const jitter = cappedDelay * 0.1 * Math.random();
  return Math.floor(cappedDelay + jitter);
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Core API client instance with default configuration
 */
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      secureStorage.remove(STORAGE_KEYS.TOKEN);
      secureStorage.remove(STORAGE_KEYS.USER_ID);
      secureStorage.remove(STORAGE_KEYS.ORGANIZATION_ID);
      
      // Also clear legacy storage
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('organizationId');
      
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Transform error response to standard format
    if (error.response?.data && isApiError(error.response.data)) {
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

/**
 * Make a request with automatic retry on failure
 */
export async function requestWithRetry<T>(
  requestFn: () => Promise<AxiosResponse<T>>
): Promise<AxiosResponse<T>> {
  let lastError: AxiosError | null = null;
  
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error as AxiosError;
      
      if (shouldRetry(lastError, attempt)) {
        const delay = calculateRetryDelay(attempt);
        console.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1})`);
        await sleep(delay);
      } else {
        throw error;
      }
    }
  }
  
  throw lastError;
}

/**
 * Helper to build query string from params object
 */
export function buildQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Create FormData from file and metadata
 */
export function createFormData(
  file: File,
  metadata?: Record<string, string | number | boolean>
): FormData {
  const formData = new FormData();
  formData.append('file', file);
  
  if (metadata) {
    Object.entries(metadata).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
  }
  
  return formData;
}
