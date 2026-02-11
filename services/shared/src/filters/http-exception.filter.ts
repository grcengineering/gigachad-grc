import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Patterns to sanitize from error messages
 * SECURITY: Use bounded quantifiers to prevent ReDoS attacks
 */
const SENSITIVE_PATTERNS = [
  // Database connection strings - bounded to reasonable URL lengths
  /postgresql:\/\/[^@]{1,100}@[^\s]{1,200}/gi,
  /mysql:\/\/[^@]{1,100}@[^\s]{1,200}/gi,
  /mongodb(\+srv)?:\/\/[^@]{1,100}@[^\s]{1,200}/gi,
  /redis:\/\/[^@]{1,100}@[^\s]{1,200}/gi,

  // File paths - bounded lengths
  /\/Users\/[^\s:]{1,200}/gi,
  /\/home\/[^\s:]{1,200}/gi,
  /C:\\Users\\[^\s:]{1,200}/gi,
  /\/app\/[^\s:]{1,200}/gi,
  /\/var\/[^\s:]{1,200}/gi,

  // IP addresses (internal) - already bounded by digit limits
  /\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  /\b172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}\b/g,
  /\b192\.168\.\d{1,3}\.\d{1,3}\b/g,

  // API keys and tokens - bounded lengths
  /api[_-]?key[=:]\s{0,5}["']?[a-zA-Z0-9_-]{1,200}["']?/gi,
  /bearer\s{1,5}[a-zA-Z0-9_.-]{1,500}/gi,
  /token[=:]\s{0,5}["']?[a-zA-Z0-9_.-]{1,200}["']?/gi,

  // Environment variable values - bounded lengths
  /process\.env\.[A-Z_]{1,50}\s{0,5}=\s{0,5}["'][^"']{1,500}["']/gi,
];

/**
 * Generic error messages for production
 */
const GENERIC_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input.',
  401: 'Authentication required. Please log in.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  405: 'This action is not allowed.',
  409: 'A conflict occurred. Please try again.',
  422: 'The request could not be processed. Please check your input.',
  429: 'Too many requests. Please slow down.',
  500: 'An unexpected error occurred. Please try again later.',
  502: 'Service temporarily unavailable. Please try again later.',
  503: 'Service temporarily unavailable. Please try again later.',
  504: 'The request took too long. Please try again.',
};

/**
 * Error response structure
 */
interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  // Only included in development
  details?: string;
  stack?: string;
}

/**
 * Global exception filter that sanitizes error messages in production
 *
 * Features:
 * - Removes sensitive information (paths, connection strings, tokens)
 * - Uses generic messages in production
 * - Includes detailed debugging info in development
 * - Logs errors with request context
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Extract error details
    const { status, message, error } = this.extractErrorDetails(exception);

    // Build error response
    const errorResponse: ErrorResponse = {
      statusCode: status,
      message: this.sanitizeMessage(message, status),
      error: error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Add debugging info in development only
    // SECURITY: Stack traces are never included in production responses
    if (!this.isProduction) {
      errorResponse.details = this.getDetailedMessage(exception);
      if (exception instanceof Error) {
        errorResponse.stack = exception.stack;
      }
    }

    // Log the error
    this.logError(exception, request, status);

    response.status(status).json(errorResponse);
  }

  /**
   * Extract status code, message, and error name from exception
   */
  private extractErrorDetails(exception: unknown): {
    status: number;
    message: string;
    error: string;
  } {
    // Use duck-typing to handle HttpException from different @nestjs/common instances
    // (e.g., shared library vs service may have separate copies in node_modules)
    if (exception instanceof HttpException || (exception instanceof Error && typeof (exception as any).getStatus === 'function' && typeof (exception as any).getResponse === 'function')) {
      const httpException = exception as HttpException;
      const response = httpException.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : (response as { message?: string | string[] }).message || httpException.message;

      return {
        status: httpException.getStatus(),
        message: Array.isArray(message) ? message.join(', ') : message,
        error: httpException.name || 'Error',
      };
    }

    if (exception instanceof Error) {
      // Prisma errors
      if (exception.name === 'PrismaClientKnownRequestError') {
        return this.handlePrismaError(exception as Error & { code?: string });
      }

      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: exception.message,
        error: exception.name,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      error: 'Internal Server Error',
    };
  }

  /**
   * Handle Prisma-specific errors
   */
  private handlePrismaError(error: Error & { code?: string }): {
    status: number;
    message: string;
    error: string;
  } {
    const code = error.code;

    switch (code) {
      case 'P2002': // Unique constraint violation
        return {
          status: HttpStatus.CONFLICT,
          message: 'A record with this value already exists',
          error: 'Conflict',
        };
      case 'P2025': // Record not found
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'The requested record was not found',
          error: 'Not Found',
        };
      case 'P2003': // Foreign key constraint
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid reference to related record',
          error: 'Bad Request',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database operation failed',
          error: 'Internal Server Error',
        };
    }
  }

  /**
   * Sanitize error message for production
   */
  private sanitizeMessage(message: string, status: number): string {
    if (!this.isProduction) {
      return message;
    }

    // Use generic message for server errors
    if (status >= 500) {
      return GENERIC_MESSAGES[status] || GENERIC_MESSAGES[500];
    }

    // For client errors, sanitize but try to keep useful info
    let sanitized = message;

    // Remove sensitive patterns
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    // If message was heavily redacted, use generic
    if (sanitized.includes('[REDACTED]') && sanitized.length < 20) {
      return GENERIC_MESSAGES[status] || message;
    }

    return sanitized;
  }

  /**
   * Get detailed message for development
   */
  private getDetailedMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      return typeof response === 'object' ? JSON.stringify(response, null, 2) : String(response);
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return String(exception);
  }

  /**
   * Log the error with context
   */
  private logError(exception: unknown, request: Request, status: number): void {
    const authenticatedRequest = request as Request & {
      user?: { userId?: string; organizationId?: string };
    };
    const userId = authenticatedRequest.user?.userId || 'anonymous';
    const orgId = authenticatedRequest.user?.organizationId || 'unknown';
    const method = request.method;
    const url = request.url;
    const ip = request.ip || request.headers['x-forwarded-for'];

    const logContext = {
      statusCode: status,
      path: url,
      method,
      userId,
      organizationId: orgId,
      ip,
    };

    if (status >= 500) {
      // Server errors - log error message only in production, include stack in development
      const errorMessage = exception instanceof Error ? exception.message : String(exception);
      if (this.isProduction) {
        // SECURITY: Don't log full stack traces in production
        this.logger.error(`${method} ${url} - ${status}: ${errorMessage}`);
      } else {
        this.logger.error(
          `${method} ${url} - ${status}`,
          exception instanceof Error ? exception.stack : String(exception)
        );
      }
    } else if (status >= 400) {
      // Client errors - warn level
      this.logger.warn(`${method} ${url} - ${status}`, JSON.stringify(logContext));
    }
  }
}

/**
 * Export alias for backward compatibility
 */
export { GlobalExceptionFilter as HttpExceptionFilter };
