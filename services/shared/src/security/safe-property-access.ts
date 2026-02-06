/**
 * Safe Property Access Utilities
 *
 * These utilities prevent prototype pollution attacks by blocking access to
 * dangerous property names like __proto__, constructor, and prototype.
 *
 * Use these functions when working with user-controlled property names
 * to prevent remote property injection vulnerabilities (js/remote-property-injection).
 */

/**
 * Property names that are blocked to prevent prototype pollution attacks.
 * These properties could be used to modify object prototypes or escape sandboxes.
 */
const BLOCKED_PROPERTY_NAMES = ['__proto__', 'constructor', 'prototype'] as const;

/**
 * Check if a property name is safe (not a prototype pollution vector)
 * @param key - The property name to check
 * @returns true if the key is safe to use, false otherwise
 */
export function isSafePropertyName(key: unknown): key is string {
  if (typeof key !== 'string') {
    return false;
  }
  return !BLOCKED_PROPERTY_NAMES.includes(key as (typeof BLOCKED_PROPERTY_NAMES)[number]);
}

/**
 * Validate a property name and throw if it's unsafe
 * @param key - The property name to validate
 * @param context - Optional context for the error message (e.g., "filter field", "sort field")
 * @throws Error if the key is a blocked property name
 */
export function validatePropertyName(key: unknown, context = 'property'): asserts key is string {
  if (typeof key !== 'string') {
    throw new Error(`Invalid ${context}: expected string but got ${typeof key}`);
  }
  if (BLOCKED_PROPERTY_NAMES.includes(key as (typeof BLOCKED_PROPERTY_NAMES)[number])) {
    throw new Error(`Invalid ${context}: "${key}" is not allowed`);
  }
}

/**
 * Safely access a property from an object, blocking prototype pollution vectors
 * @param obj - The object to access
 * @param key - The property name (user-controlled input)
 * @returns The property value, or undefined if the key is blocked or doesn't exist
 */
export function safePropertyAccess<T extends object>(obj: T, key: string): unknown {
  if (!isSafePropertyName(key)) {
    throw new Error(`Invalid property name: "${key}" is not allowed`);
  }

  // Use Object.hasOwn to check if the property exists on the object itself
  // (not inherited from prototype chain)
  if (Object.hasOwn(obj, key)) {
    return (obj as Record<string, unknown>)[key];
  }

  return undefined;
}

/**
 * Safely set a property on an object, blocking prototype pollution vectors
 * @param obj - The object to modify
 * @param key - The property name (user-controlled input)
 * @param value - The value to set
 * @throws Error if the key is a blocked property name
 */
export function safePropertySet<T extends object>(obj: T, key: string, value: unknown): void {
  validatePropertyName(key, 'property name');
  (obj as Record<string, unknown>)[key] = value;
}

/**
 * Create a safe orderBy object for Prisma queries
 * Validates the field name to prevent injection attacks
 * @param field - The field name (user-controlled input)
 * @param direction - The sort direction ('asc' or 'desc')
 * @param allowedFields - Optional whitelist of allowed field names
 * @returns A safe orderBy object
 */
export function safeOrderBy(
  field: string,
  direction: 'asc' | 'desc',
  allowedFields?: readonly string[]
): Record<string, 'asc' | 'desc'> {
  validatePropertyName(field, 'sort field');

  if (allowedFields && !allowedFields.includes(field)) {
    throw new Error(`Invalid sort field: "${field}" is not in the allowed list`);
  }

  const orderBy: Record<string, 'asc' | 'desc'> = {};
  orderBy[field] = direction;
  return orderBy;
}

/**
 * Create a safe where clause entry for Prisma queries
 * Validates the field name to prevent injection attacks
 * @param field - The field name (user-controlled input)
 * @param condition - The query condition
 * @param allowedFields - Optional whitelist of allowed field names
 * @returns A safe where clause entry
 */
export function safeWhereClause<T>(
  field: string,
  condition: T,
  allowedFields?: readonly string[]
): Record<string, T> {
  validatePropertyName(field, 'filter field');

  if (allowedFields && !allowedFields.includes(field)) {
    throw new Error(`Invalid filter field: "${field}" is not in the allowed list`);
  }

  const where: Record<string, T> = {};
  where[field] = condition;
  return where;
}

/**
 * Safely iterate over object entries with a callback, skipping blocked property names
 * This is useful for processing user-provided objects that might contain prototype pollution payloads
 * @param obj - The object to iterate over
 * @param callback - The callback function for each safe entry
 */
export function safeObjectEntries<T extends object>(
  obj: T,
  callback: (key: string, value: unknown) => void
): void {
  for (const [key, value] of Object.entries(obj)) {
    if (isSafePropertyName(key)) {
      callback(key, value);
    }
    // Silently skip blocked property names
  }
}

/**
 * Create a new object from an existing object, filtering out blocked property names
 * @param obj - The source object (potentially containing unsafe keys)
 * @returns A new object with only safe property names
 */
export function sanitizeObjectKeys<T extends Record<string, unknown>>(
  obj: T
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (isSafePropertyName(key)) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Recursively sanitize object keys, including nested objects
 * @param obj - The source object (potentially containing unsafe keys)
 * @returns A new object with only safe property names at all levels
 */
export function deepSanitizeObjectKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepSanitizeObjectKeys(item));
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (isSafePropertyName(key)) {
        result[key] = deepSanitizeObjectKeys(value);
      }
    }

    return result;
  }

  return obj;
}
