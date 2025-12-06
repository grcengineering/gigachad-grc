import { PaginationParams, PaginatedResponse } from '../types';

export interface PaginationOptions {
  defaultLimit?: number;
  maxLimit?: number;
}

const DEFAULT_OPTIONS: PaginationOptions = {
  defaultLimit: 20,
  maxLimit: 100,
};

/**
 * Parse and validate pagination parameters
 */
export function parsePaginationParams(
  params: Partial<PaginationParams>,
  options: PaginationOptions = {}
): Required<PaginationParams> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  let page = params.page ?? 1;
  let limit = params.limit ?? opts.defaultLimit!;
  const sortBy = params.sortBy ?? 'createdAt';
  const sortOrder = params.sortOrder ?? 'desc';

  // Validate and clamp values
  page = Math.max(1, Math.floor(page));
  limit = Math.min(opts.maxLimit!, Math.max(1, Math.floor(limit)));

  return { page, limit, sortBy, sortOrder };
}

/**
 * Calculate offset from page and limit
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: Required<PaginationParams>
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / params.limit);

  return {
    data,
    meta: {
      total,
      page: params.page,
      limit: params.limit,
      totalPages,
    },
  };
}

/**
 * Build SQL ORDER BY clause
 */
export function buildOrderByClause(
  sortBy: string,
  sortOrder: 'asc' | 'desc',
  allowedFields: string[]
): string {
  // Validate sortBy against allowed fields to prevent SQL injection
  const field = allowedFields.includes(sortBy) ? sortBy : allowedFields[0];
  const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
  
  return `"${field}" ${order}`;
}

/**
 * Prisma-specific pagination helper
 */
export function getPrismaSkipTake(params: Required<PaginationParams>): {
  skip: number;
  take: number;
} {
  return {
    skip: calculateOffset(params.page, params.limit),
    take: params.limit,
  };
}

/**
 * Prisma-specific ordering helper
 */
export function getPrismaOrderBy(
  params: Required<PaginationParams>,
  allowedFields: string[]
): Record<string, 'asc' | 'desc'> {
  const field = allowedFields.includes(params.sortBy)
    ? params.sortBy
    : allowedFields[0];
  
  return { [field]: params.sortOrder };
}

/**
 * Common sortable fields for different entity types
 */
export const SortableFields = {
  controls: ['createdAt', 'updatedAt', 'controlId', 'title', 'category'],
  evidence: ['createdAt', 'updatedAt', 'title', 'type', 'validFrom', 'validUntil'],
  frameworks: ['createdAt', 'name', 'type'],
  policies: ['createdAt', 'updatedAt', 'title', 'category', 'status'],
  users: ['createdAt', 'email', 'firstName', 'lastName', 'role'],
};



