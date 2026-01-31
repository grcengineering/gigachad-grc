/**
 * Application error with additional context
 */
export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

/**
 * Type guard to check if value is an Error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Type guard to check if value is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof Error && ('code' in error || 'statusCode' in error);
}

/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}

/**
 * Safely extract error code from unknown error
 */
export function getErrorCode(error: unknown): string | undefined {
  if (error instanceof Error && 'code' in error) {
    return (error as AppError).code;
  }
  return undefined;
}

/**
 * Check if error has a specific code (e.g., MODULE_NOT_FOUND)
 */
export function hasErrorCode(error: unknown, code: string): boolean {
  return getErrorCode(error) === code;
}
