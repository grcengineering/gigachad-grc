/**
 * Helper types for working with Prisma
 * 
 * Note: Prisma generates types in @prisma/client that should be used directly.
 * This file provides additional utility types and re-exports for convenience.
 */

/**
 * Generic type for building dynamic where clauses
 * Use Prisma's generated types instead when possible:
 * - Prisma.ControlWhereInput
 * - Prisma.RiskWhereInput
 * - etc.
 */
export type DynamicWhereClause = Record<string, unknown>;

/**
 * Generic type for building dynamic update data
 * Use Prisma's generated types instead when possible:
 * - Prisma.ControlUpdateInput
 * - Prisma.RiskUpdateInput
 * - etc.
 */
export type DynamicUpdateData = Record<string, unknown>;

/**
 * Generic type for Prisma orderBy clauses
 */
export type OrderByDirection = 'asc' | 'desc';

export interface OrderByClause {
  [field: string]: OrderByDirection | OrderByClause;
}

/**
 * Generic pagination parameters for Prisma queries
 */
export interface PrismaPaginationParams {
  skip?: number;
  take?: number;
}

/**
 * Generic type for Prisma select clauses
 */
export type SelectClause = Record<string, boolean | Record<string, unknown>>;

/**
 * Generic type for Prisma include clauses
 */
export type IncludeClause = Record<string, boolean | { select?: Record<string, boolean>; include?: Record<string, boolean> }>;

/**
 * Helper type for extracting model names from Prisma Client
 */
export type PrismaModelName = 
  | 'control'
  | 'evidence'
  | 'risk'
  | 'policy'
  | 'framework'
  | 'audit'
  | 'user'
  | 'organization'
  | 'vendor'
  | 'questionnaire'
  | string; // Allow other models
