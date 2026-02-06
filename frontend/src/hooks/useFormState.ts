/**
 * useFormState Hook
 *
 * A generic hook for managing form state with validation, dirty tracking, and reset functionality.
 */

import { useState, useCallback, useMemo } from 'react';

export interface FormFieldError {
  message: string;
  type?: 'required' | 'pattern' | 'min' | 'max' | 'custom';
}

export interface FormValidationRule<T> {
  validate: (value: T[keyof T], formData: T) => boolean;
  message: string;
  type?: FormFieldError['type'];
}

export interface UseFormStateOptions<T> {
  initialValues: T;
  validationRules?: Partial<Record<keyof T, FormValidationRule<T>[]>>;
  onSubmit?: (data: T) => void | Promise<void>;
}

export interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, FormFieldError>>;
  touched: Partial<Record<keyof T, boolean>>;
  isDirty: boolean;
  isValid: boolean;
  isSubmitting: boolean;
}

export interface FormActions<T> {
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setValues: (values: Partial<T>) => void;
  setError: (field: keyof T, error: FormFieldError | null) => void;
  setTouched: (field: keyof T, touched?: boolean) => void;
  reset: (newValues?: T) => void;
  validate: () => boolean;
  validateField: (field: keyof T) => boolean;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
}

export function useFormState<T extends Record<string, unknown>>(
  options: UseFormStateOptions<T>
): [FormState<T>, FormActions<T>] {
  const {
    initialValues,
    validationRules = {} as Partial<Record<keyof T, FormValidationRule<T>[]>>,
    onSubmit,
  } = options;

  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, FormFieldError>>>({});
  const [touched, setTouchedState] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate if form is dirty
  const isDirty = useMemo(() => {
    return Object.keys(values).some((key) => {
      const k = key as keyof T;
      return values[k] !== initialValues[k];
    });
  }, [values, initialValues]);

  // Calculate if form is valid
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  // Validate a single field
  const validateField = useCallback(
    (field: keyof T): boolean => {
      const rules = validationRules[field];
      if (!rules) return true;

      for (const rule of rules) {
        if (!rule.validate(values[field], values)) {
          setErrors((prev) => ({
            ...prev,
            [field]: { message: rule.message, type: rule.type },
          }));
          return false;
        }
      }

      // Clear error if validation passes
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });

      return true;
    },
    [values, validationRules]
  );

  // Validate all fields
  const validate = useCallback((): boolean => {
    let isFormValid = true;
    const newErrors: Partial<Record<keyof T, FormFieldError>> = {};

    for (const field of Object.keys(validationRules) as Array<keyof T>) {
      const rules = validationRules[field];
      if (!rules) continue;

      for (const rule of rules) {
        if (!rule.validate(values[field], values)) {
          newErrors[field] = { message: rule.message, type: rule.type };
          isFormValid = false;
          break;
        }
      }
    }

    setErrors(newErrors);
    return isFormValid;
  }, [values, validationRules]);

  // Set a single value
  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValuesState((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Set multiple values
  const setValuesAction = useCallback((newValues: Partial<T>) => {
    setValuesState((prev) => ({ ...prev, ...newValues }));
  }, []);

  // Set a field error
  const setError = useCallback((field: keyof T, error: FormFieldError | null) => {
    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, []);

  // Set field touched state
  const setTouched = useCallback(
    (field: keyof T, isTouched = true) => {
      setTouchedState((prev) => ({ ...prev, [field]: isTouched }));
      if (isTouched) {
        validateField(field);
      }
    },
    [validateField]
  );

  // Reset form to initial or new values
  const reset = useCallback(
    (newValues?: T) => {
      setValuesState(newValues || initialValues);
      setErrors({});
      setTouchedState({});
      setIsSubmitting(false);
    },
    [initialValues]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      // Mark all fields as touched
      const allTouched: Partial<Record<keyof T, boolean>> = {};
      for (const key of Object.keys(values) as Array<keyof T>) {
        allTouched[key] = true;
      }
      setTouchedState(allTouched);

      // Validate all fields
      if (!validate()) {
        return;
      }

      if (onSubmit) {
        setIsSubmitting(true);
        try {
          await onSubmit(values);
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [values, validate, onSubmit]
  );

  const state: FormState<T> = {
    values,
    errors,
    touched,
    isDirty,
    isValid,
    isSubmitting,
  };

  const actions: FormActions<T> = {
    setValue,
    setValues: setValuesAction,
    setError,
    setTouched,
    reset,
    validate,
    validateField,
    handleSubmit,
  };

  return [state, actions];
}

// Common validation rules
export const required = <T>(message = 'This field is required'): FormValidationRule<T> => ({
  validate: (value) => value !== undefined && value !== null && value !== '',
  message,
  type: 'required',
});

export const minLength = <T>(min: number, message?: string): FormValidationRule<T> => ({
  validate: (value) => typeof value === 'string' && value.length >= min,
  message: message || `Must be at least ${min} characters`,
  type: 'min',
});

export const maxLength = <T>(max: number, message?: string): FormValidationRule<T> => ({
  validate: (value) => typeof value === 'string' && value.length <= max,
  message: message || `Must be at most ${max} characters`,
  type: 'max',
});

export const email = <T>(message = 'Invalid email address'): FormValidationRule<T> => ({
  validate: (value) => {
    // SECURITY: Use structured validation to prevent ReDoS
    if (typeof value !== 'string' || value.length > 254) return false;
    const parts = value.split('@');
    if (parts.length !== 2) return false;
    const [local, domain] = parts;
    if (!local || local.length > 64 || !domain || domain.length > 255) return false;
    // Safe patterns without overlapping quantifiers
    const localValid = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local);
    const domainValid =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(
        domain
      );
    return localValid && domainValid;
  },
  message,
  type: 'pattern',
});

export const pattern = <T>(regex: RegExp, message = 'Invalid format'): FormValidationRule<T> => ({
  validate: (value) => typeof value === 'string' && regex.test(value),
  message,
  type: 'pattern',
});
