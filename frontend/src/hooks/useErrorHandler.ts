/**
 * useErrorHandler Hook
 * 
 * Standardized error handling for API mutations with toast notifications and error tracking.
 */

import { useCallback, useState } from 'react';
import { useToast } from '@/components/Toast';
import { trackError } from '@/lib/errorTracking';
import type { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  code?: string;
  correlationId?: string;
  details?: Record<string, unknown>;
}

export interface ErrorHandlerOptions {
  /** Default error message when specific message is not available */
  defaultMessage?: string;
  /** Whether to show toast notification */
  showToast?: boolean;
  /** Whether to track error for monitoring */
  trackErrors?: boolean;
  /** Context for error tracking */
  context?: string;
  /** Callback when error is handled */
  onError?: (error: ApiError) => void;
}

export interface ErrorHandlerResult {
  error: ApiError | null;
  isError: boolean;
  handleError: (error: unknown) => ApiError;
  clearError: () => void;
  withErrorHandling: <T>(
    fn: () => Promise<T>,
    options?: { successMessage?: string }
  ) => Promise<T | null>;
}

/**
 * Extract error information from various error types
 */
function extractError(error: unknown): ApiError {
  // Handle Axios errors
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; code?: string; correlationId?: string }>;
    const responseData = axiosError.response?.data;
    
    return {
      message: responseData?.message || axiosError.message || 'An error occurred',
      code: responseData?.code || `HTTP_${axiosError.response?.status || 'UNKNOWN'}`,
      correlationId: responseData?.correlationId,
    };
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'ERROR',
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      message: error,
      code: 'ERROR',
    };
  }

  // Handle object errors with message property
  if (error && typeof error === 'object' && 'message' in error) {
    const objError = error as { message: string; code?: string; correlationId?: string };
    return {
      message: String(objError.message),
      code: objError.code,
      correlationId: objError.correlationId,
    };
  }

  // Fallback
  return {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
  };
}

/**
 * Type guard for Axios errors
 */
function isAxiosError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'isAxiosError' in error &&
    (error as { isAxiosError: boolean }).isAxiosError === true
  );
}

/**
 * Hook for standardized error handling in components
 */
export function useErrorHandler(options: ErrorHandlerOptions = {}): ErrorHandlerResult {
  const {
    defaultMessage = 'An error occurred',
    showToast = true,
    trackErrors = true,
    context,
    onError,
  } = options;

  const { showToast: displayToast } = useToast();
  const [error, setError] = useState<ApiError | null>(null);

  /**
   * Handle an error with notifications and tracking
   */
  const handleError = useCallback(
    (rawError: unknown): ApiError => {
      const extractedError = extractError(rawError);
      const finalError = {
        ...extractedError,
        message: extractedError.message || defaultMessage,
      };

      setError(finalError);

      // Show toast notification
      if (showToast) {
        displayToast({
          title: 'Error',
          message: finalError.message,
          type: 'error',
        });
      }

      // Track error for monitoring
      if (trackErrors) {
        trackError(rawError instanceof Error ? rawError : new Error(finalError.message), {
          context,
          code: finalError.code,
          correlationId: finalError.correlationId,
        });
      }

      // Call custom error handler
      if (onError) {
        onError(finalError);
      }

      return finalError;
    },
    [defaultMessage, showToast, trackErrors, context, onError, displayToast]
  );

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Wrap an async function with error handling
   */
  const withErrorHandling = useCallback(
    async <T>(
      fn: () => Promise<T>,
      fnOptions?: { successMessage?: string }
    ): Promise<T | null> => {
      clearError();
      
      try {
        const result = await fn();
        
        // Show success toast if provided
        if (fnOptions?.successMessage) {
          displayToast({
            title: 'Success',
            message: fnOptions.successMessage,
            type: 'success',
          });
        }
        
        return result;
      } catch (err) {
        handleError(err);
        return null;
      }
    },
    [handleError, clearError, displayToast]
  );

  return {
    error,
    isError: error !== null,
    handleError,
    clearError,
    withErrorHandling,
  };
}

/**
 * Hook for handling mutation errors (for use with React Query)
 */
export function useMutationErrorHandler(options?: ErrorHandlerOptions) {
  const { handleError } = useErrorHandler(options);

  return {
    onError: handleError,
  };
}
