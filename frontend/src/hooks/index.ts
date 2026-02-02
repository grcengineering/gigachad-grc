/**
 * Hooks Index
 * 
 * Re-exports all custom hooks for convenient imports.
 */

// Form management
export { 
  useFormState,
  required,
  minLength,
  maxLength,
  email,
  pattern,
  type FormState,
  type FormActions,
  type FormFieldError,
  type FormValidationRule,
  type UseFormStateOptions,
} from './useFormState';

// Error handling
export {
  useErrorHandler,
  useMutationErrorHandler,
  type ApiError,
  type ErrorHandlerOptions,
  type ErrorHandlerResult,
} from './useErrorHandler';
