import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException, Logger } from '@nestjs/common';

/**
 * Maximum allowed limit for any pagination request.
 * This prevents clients from requesting too many records at once,
 * which could impact performance and memory usage.
 */
export const MAX_PAGINATION_LIMIT = 100;
export const DEFAULT_PAGINATION_LIMIT = 25;

/**
 * Pipe that validates and constrains pagination parameters.
 * 
 * Usage:
 * @Query('limit', PaginationLimitPipe) limit: number
 * 
 * Or with custom defaults:
 * @Query('limit', new PaginationLimitPipe({ default: 50, max: 100 })) limit: number
 */
@Injectable()
export class PaginationLimitPipe implements PipeTransform<string | number, number> {
  private static readonly logger = new Logger(PaginationLimitPipe.name);
  private readonly defaultLimit: number;
  private readonly maxLimit: number;
  private readonly minLimit: number;

  constructor(options?: { default?: number; max?: number; min?: number }) {
    this.defaultLimit = options?.default ?? DEFAULT_PAGINATION_LIMIT;
    this.maxLimit = options?.max ?? MAX_PAGINATION_LIMIT;
    this.minLimit = options?.min ?? 1;
  }

  transform(value: string | number | undefined, _metadata: ArgumentMetadata): number {
    // If no value provided, use default
    if (value === undefined || value === null) {
      return this.defaultLimit;
    }

    // Handle empty strings and NaN which can occur when enableImplicitConversion converts invalid input
    if (value === '' || (typeof value === 'number' && isNaN(value))) {
      const displayValue = value === '' ? 'empty string' : 'NaN';
      PaginationLimitPipe.logger.warn(`Invalid pagination limit provided: ${displayValue}. Using default: ${this.defaultLimit}`);
      return this.defaultLimit;
    }

    // Convert to number
    const limit = typeof value === 'string' ? parseInt(value, 10) : value;

    // Validate it's a valid number
    if (isNaN(limit)) {
      PaginationLimitPipe.logger.warn(`Invalid limit value provided: "${value}". Falling back to default: ${this.defaultLimit}`);
      return this.defaultLimit; // Return default instead of throwing for better UX
    }

    // Enforce minimum
    if (limit < this.minLimit) {
      PaginationLimitPipe.logger.warn(`Limit value ${limit} is below minimum ${this.minLimit}. Clamping to minimum.`);
      return this.minLimit;
    }

    // Enforce maximum
    if (limit > this.maxLimit) {
      PaginationLimitPipe.logger.warn(`Limit value ${limit} exceeds maximum ${this.maxLimit}. Clamping to maximum.`);
      return this.maxLimit;
    }

    return limit;
  }
}

/**
 * Pipe that validates and constrains page number parameter.
 */
@Injectable()
export class PaginationPagePipe implements PipeTransform<string | number, number> {
  private static readonly logger = new Logger(PaginationPagePipe.name);
  private readonly defaultPage: number;
  private readonly minPage: number;

  constructor(options?: { default?: number; min?: number }) {
    this.defaultPage = options?.default ?? 1;
    this.minPage = options?.min ?? 1;
  }

  transform(value: string | number | undefined, _metadata: ArgumentMetadata): number {
    // If no value provided, use default
    if (value === undefined || value === null) {
      return this.defaultPage;
    }

    // Handle empty strings and NaN which can occur when enableImplicitConversion converts invalid input
    if (value === '' || (typeof value === 'number' && isNaN(value))) {
      const displayValue = value === '' ? 'empty string' : 'NaN';
      PaginationPagePipe.logger.warn(`Invalid pagination page provided: ${displayValue}. Using default: ${this.defaultPage}`);
      return this.defaultPage;
    }

    // Convert to number
    const page = typeof value === 'string' ? parseInt(value, 10) : value;

    // Validate it's a valid number
    if (isNaN(page)) {
      PaginationPagePipe.logger.warn(`Invalid page value provided: "${value}". Falling back to default: ${this.defaultPage}`);
      return this.defaultPage; // Return default instead of throwing for better UX
    }

    // Enforce minimum
    if (page < this.minPage) {
      PaginationPagePipe.logger.warn(`Page value ${page} is below minimum ${this.minPage}. Clamping to minimum.`);
      return this.minPage;
    }

    return page;
  }
}

/**
 * Helper function to calculate skip/offset for pagination
 */
export function calculatePaginationOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Helper function to build pagination response metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * DTO for pagination query parameters
 */
export class PaginationDto {
  page: number = 1;
  limit: number = DEFAULT_PAGINATION_LIMIT;
}

/**
 * Utility function to enforce max limit on any limit value
 */
export function enforceMaxLimit(limit: number | undefined, max: number = MAX_PAGINATION_LIMIT): number {
  if (limit === undefined || limit === null) {
    return DEFAULT_PAGINATION_LIMIT;
  }
  return Math.min(Math.max(1, limit), max);
}
