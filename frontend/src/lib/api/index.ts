/**
 * API Module Index
 * 
 * This module re-exports all API modules for convenient imports.
 * 
 * Usage:
 * ```typescript
 * import { controlsApi, risksApi, vendorsApi } from '@/lib/api';
 * 
 * // Or import specific APIs
 * import { controlsApi } from '@/lib/api/controls.api';
 * ```
 */

// Core client exports
export { api, API_URL, requestWithRetry, buildQueryString, createFormData } from './client';

// Domain API exports
export { controlsApi } from './controls.api';
export { risksApi } from './risks.api';
export { evidenceApi } from './evidence.api';
export { vendorsApi } from './vendors.api';
export { auditsApi } from './audits.api';
export { frameworksApi } from './frameworks.api';

// Re-export all types from apiTypes for convenience
export * from '../apiTypes';
