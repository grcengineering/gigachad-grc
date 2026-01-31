import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY = 'cache_key';
export const CACHE_TTL = 'cache_ttl';

/**
 * Decorator to mark a method for caching
 * @param options.key Cache key prefix (default: method name)
 * @param options.ttl Time to live in seconds (default: service default)
 */
export const Cacheable = (options?: { key?: string; ttl?: number }) =>
  (target: object, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY, options?.key || propertyKey)(target, propertyKey, descriptor);
    if (options?.ttl) {
      SetMetadata(CACHE_TTL, options.ttl)(target, propertyKey, descriptor);
    }
    return descriptor;
  };

/**
 * Helper to generate cache keys with consistent formatting
 */
export function cacheKey(prefix: string, ...parts: (string | number | undefined)[]): string {
  const validParts = parts.filter(p => p !== undefined && p !== null);
  return `${prefix}:${validParts.join(':')}`;
}

/**
 * Cache key generators for common entities
 */
export const CacheKeys = {
  // Control cache keys
  control: (id: string) => cacheKey('control', id),
  controlList: (orgId: string, hash?: string) => cacheKey('controls', orgId, hash),
  controlCategories: () => 'control:categories',
  controlTags: (orgId: string) => cacheKey('control:tags', orgId),

  // Framework cache keys
  framework: (id: string) => cacheKey('framework', id),
  frameworkList: (orgId: string) => cacheKey('frameworks', orgId),
  
  // Policy cache keys
  policy: (id: string) => cacheKey('policy', id),
  policyList: (orgId: string) => cacheKey('policies', orgId),

  // Risk cache keys
  risk: (id: string) => cacheKey('risk', id),
  riskList: (orgId: string) => cacheKey('risks', orgId),
  riskMatrix: (orgId: string) => cacheKey('risk:matrix', orgId),

  // Vendor cache keys
  vendor: (id: string) => cacheKey('vendor', id),
  vendorList: (orgId: string) => cacheKey('vendors', orgId),

  // Dashboard cache keys
  dashboard: (orgId: string) => cacheKey('dashboard', orgId),
  dashboardStats: (orgId: string) => cacheKey('dashboard:stats', orgId),

  // User cache keys
  user: (id: string) => cacheKey('user', id),
  userPermissions: (userId: string, orgId: string) => cacheKey('user:permissions', userId, orgId),

  // Organization cache keys
  organization: (id: string) => cacheKey('org', id),
  organizationSettings: (id: string) => cacheKey('org:settings', id),
};





