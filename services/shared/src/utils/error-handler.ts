import { Logger, HttpException, InternalServerErrorException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

/**
 * Standard error response structure.
 */
export interface ErrorDetails {
  message: string;
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
  stack?: string;
  correlationId?: string;
}

/**
 * Standard API error response.
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    correlationId: string;
    timestamp: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Custom error class for domain-specific errors.
 */
export class DomainError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = 'DOMAIN_ERROR',
    statusCode: number = 400,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, DomainError);
  }
}

/**
 * Error type guard to check if an error is a standard Error object.
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Error type guard to check if an error is a DomainError.
 */
export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

/**
 * Error type guard for Prisma errors.
 */
export function isPrismaError(error: unknown): error is Error & { code?: string } {
  return isError(error) && 'code' in error;
}

/**
 * Error type guard for Axios errors.
 */
export function isAxiosError(error: unknown): error is Error & { response?: { status: number; data?: unknown }; code?: string } {
  return isError(error) && ('response' in error || 'code' in error);
}

/**
 * Safely extract error message from unknown error.
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  if (isError(error)) {
    return error.message;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'An unknown error occurred';
}

/**
 * Safely extract error code from unknown error.
 */
export function getErrorCode(error: unknown): string | undefined {
  if (isDomainError(error)) {
    return error.code;
  }
  if (isPrismaError(error)) {
    return error.code;
  }
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code: unknown }).code);
  }
  return undefined;
}

/**
 * Safely extract status code from unknown error.
 */
export function getStatusCode(error: unknown): number {
  if (isDomainError(error)) {
    return error.statusCode;
  }
  if (isAxiosError(error) && error.response?.status) {
    return error.response.status;
  }
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const statusCode = (error as { statusCode: unknown }).statusCode;
    if (typeof statusCode === 'number') {
      return statusCode;
    }
  }
  return 500;
}

/**
 * Convert unknown error to structured ErrorDetails object.
 */
export function toErrorDetails(error: unknown, includeStack = false): ErrorDetails {
  return {
    message: getErrorMessage(error),
    code: getErrorCode(error),
    statusCode: getStatusCode(error),
    details: isDomainError(error) ? error.details : undefined,
    stack: includeStack && isError(error) ? error.stack : undefined,
  };
}

/**
 * Centralized error handler for async operations.
 * Logs the error and returns a standardized error response.
 * 
 * @example
 * ```typescript
 * try {
 *   await someOperation();
 * } catch (error: unknown) {
 *   return handleError(error, this.logger, 'Failed to perform operation');
 * }
 * ```
 */
export function handleError(
  error: unknown,
  logger: Logger,
  context?: string,
  includeStack = process.env.NODE_ENV !== 'production',
): ErrorDetails {
  const errorDetails = toErrorDetails(error, includeStack);
  
  // Log the error with context
  const logMessage = context
    ? `${context}: ${errorDetails.message}`
    : errorDetails.message;

  if (errorDetails.statusCode >= 500) {
    logger.error(logMessage, isError(error) ? error.stack : undefined);
  } else {
    logger.warn(logMessage);
  }

  return errorDetails;
}

/**
 * Wrap an async function with error handling.
 * 
 * @example
 * ```typescript
 * const result = await withErrorHandling(
 *   async () => await riskyOperation(),
 *   this.logger,
 *   'Failed to perform risky operation'
 * );
 * ```
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  logger: Logger,
  context?: string,
): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    throw new DomainError(
      getErrorMessage(error),
      getErrorCode(error) || 'OPERATION_FAILED',
      getStatusCode(error),
      { context, originalError: getErrorMessage(error) },
    );
  }
}

/**
 * Create a safe async wrapper that catches errors and returns null.
 * Useful for non-critical operations that shouldn't block the main flow.
 * 
 * @example
 * ```typescript
 * const result = await safeAsync(
 *   () => fetchOptionalData(),
 *   this.logger,
 *   'Optional data fetch failed'
 * );
 * // result is null if operation failed
 * ```
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  logger: Logger,
  context?: string,
): Promise<T | null> {
  try {
    return await fn();
  } catch (error: unknown) {
    handleError(error, logger, context);
    return null;
  }
}

/**
 * Retry an async operation with exponential backoff.
 * 
 * @example
 * ```typescript
 * const result = await retryAsync(
 *   () => unreliableOperation(),
 *   { maxRetries: 3, baseDelayMs: 1000 },
 *   this.logger,
 *   'Unreliable operation'
 * );
 * ```
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: { maxRetries: number; baseDelayMs: number; maxDelayMs?: number },
  logger: Logger,
  context?: string,
): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs = 30000 } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const delayMs = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        logger.warn(`${context || 'Operation'} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new DomainError(
    getErrorMessage(lastError),
    'RETRY_EXHAUSTED',
    getStatusCode(lastError),
    { context, attempts: maxRetries + 1 },
  );
}

/**
 * Create a standardized API error response.
 */
export function createApiErrorResponse(
  error: unknown,
  correlationId?: string,
): ApiErrorResponse {
  const errorDetails = toErrorDetails(error);
  const id = correlationId || uuidv4();

  return {
    success: false,
    error: {
      message: errorDetails.message,
      code: errorDetails.code || 'INTERNAL_ERROR',
      correlationId: id,
      timestamp: new Date().toISOString(),
      details: process.env.NODE_ENV !== 'production' ? errorDetails.details : undefined,
    },
  };
}

/**
 * Options for the CatchErrors decorator.
 */
export interface CatchErrorsOptions {
  /** Context string for logging */
  context?: string;
  /** Whether to rethrow the error after handling */
  rethrow?: boolean;
  /** Default error message if the original is too technical */
  defaultMessage?: string;
  /** Error code to use */
  errorCode?: string;
}

/**
 * Method decorator that wraps async methods with standardized error handling.
 * 
 * Features:
 * - Automatic logging with correlation ID
 * - Converts unknown errors to HttpException
 * - Preserves original HTTP status codes
 * - Adds correlation ID to error response
 * 
 * @example
 * ```typescript
 * @CatchErrors({ context: 'UserService.findById' })
 * async findById(id: string): Promise<User> {
 *   return this.prisma.user.findUniqueOrThrow({ where: { id } });
 * }
 * ```
 */
export function CatchErrors(options: CatchErrorsOptions = {}): MethodDecorator {
  return function (
    _target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const methodName = String(propertyKey);

    descriptor.value = async function (...args: unknown[]) {
      const correlationId = uuidv4();
      const logger = (this as { logger?: Logger }).logger || new Logger(methodName);
      const context = options.context || methodName;

      try {
        return await originalMethod.apply(this, args);
      } catch (error: unknown) {
        // Log the error with correlation ID
        const errorMessage = getErrorMessage(error);
        const statusCode = getStatusCode(error);
        
        if (statusCode >= 500) {
          logger.error(
            `[${correlationId}] ${context}: ${errorMessage}`,
            isError(error) ? error.stack : undefined,
          );
        } else {
          logger.warn(`[${correlationId}] ${context}: ${errorMessage}`);
        }

        // If it's already an HttpException, add correlation ID and rethrow
        if (error instanceof HttpException) {
          const response = error.getResponse();
          if (typeof response === 'object') {
            throw new HttpException(
              { ...response, correlationId },
              error.getStatus(),
            );
          }
          throw error;
        }

        // Convert to appropriate HttpException
        const finalMessage = options.defaultMessage || errorMessage;
        const finalCode = options.errorCode || getErrorCode(error) || 'OPERATION_FAILED';

        if (isDomainError(error)) {
          throw new HttpException(
            {
              message: finalMessage,
              code: error.code,
              correlationId,
              details: error.details,
            },
            error.statusCode,
          );
        }

        // For Prisma errors, map to appropriate status codes
        if (isPrismaError(error)) {
          const prismaCode = error.code;
          let prismaStatusCode = 500;
          let prismaMessage = finalMessage;

          if (prismaCode === 'P2002') {
            prismaStatusCode = 409;
            prismaMessage = 'A record with this value already exists';
          } else if (prismaCode === 'P2025') {
            prismaStatusCode = 404;
            prismaMessage = 'Record not found';
          } else if (prismaCode === 'P2003') {
            prismaStatusCode = 400;
            prismaMessage = 'Related record not found';
          }

          throw new HttpException(
            {
              message: prismaMessage,
              code: `PRISMA_${prismaCode}`,
              correlationId,
            },
            prismaStatusCode,
          );
        }

        // Default to internal server error
        throw new InternalServerErrorException({
          message: process.env.NODE_ENV === 'production' 
            ? 'An internal error occurred' 
            : finalMessage,
          code: finalCode,
          correlationId,
        });
      }
    };

    return descriptor;
  };
}

/**
 * Class decorator that applies CatchErrors to all methods in a service.
 * 
 * @example
 * ```typescript
 * @CatchErrorsClass({ context: 'UserService' })
 * @Injectable()
 * export class UserService {
 *   // All methods automatically get error handling
 * }
 * ```
 */
export function CatchErrorsClass(options: CatchErrorsOptions = {}): ClassDecorator {
  return function (target: Function) {
    const prototype = target.prototype;
    const propertyNames = Object.getOwnPropertyNames(prototype);

    for (const propertyName of propertyNames) {
      if (propertyName === 'constructor') continue;

      const descriptor = Object.getOwnPropertyDescriptor(prototype, propertyName);
      if (!descriptor || typeof descriptor.value !== 'function') continue;

      const methodOptions = {
        ...options,
        context: options.context ? `${options.context}.${propertyName}` : propertyName,
      };

      const decoratedDescriptor = CatchErrors(methodOptions)(
        prototype,
        propertyName,
        descriptor,
      );

      if (decoratedDescriptor) {
        Object.defineProperty(prototype, propertyName, decoratedDescriptor);
      }
    }
  };
}
