/**
 * Validate an email address
 * SECURITY: Uses linear-time regex to prevent ReDoS attacks
 */
export function isValidEmail(email: string): boolean {
  // Input length limit to prevent DoS
  if (!email || email.length > 254) {
    return false;
  }
  // Linear-time regex: use possessive-like pattern with specific character classes
  // Split into local and domain parts to avoid overlapping quantifiers
  const parts = email.split('@');
  if (parts.length !== 2) {
    return false;
  }
  const [local, domain] = parts;
  // Validate local part (before @) - simple character check
  if (!local || local.length > 64 || !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) {
    return false;
  }
  // Validate domain part (after @) - must have at least one dot
  if (
    !domain ||
    domain.length > 255 ||
    !/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(
      domain
    )
  ) {
    return false;
  }
  return true;
}

/**
 * Validate a UUID
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate a URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate a control ID format (e.g., "AC-001", "CC1.1")
 * SECURITY: Uses length limit and bounded regex to prevent ReDoS attacks
 */
export function isValidControlId(controlId: string): boolean {
  // Input length limit to prevent DoS - control IDs should be short
  if (!controlId || controlId.length > 30) {
    return false;
  }
  // Supports formats like: AC-001, CC1.1, A.5.1.1
  // Use bounded quantifiers to prevent polynomial backtracking
  const controlIdRegex = /^[A-Z]{1,3}[-.]?\d{1,5}(\.\d{1,5}){0,10}$/i;
  return controlIdRegex.test(controlId);
}

/**
 * Sanitize a string for safe display
 */
export function sanitizeString(str: string): string {
  return str.replace(/[<>]/g, '').trim();
}

/**
 * Validate and sanitize a filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
}

/**
 * Validate file extension against allowed list
 */
export function isAllowedFileExtension(filename: string, allowedExtensions: string[]): boolean {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? allowedExtensions.includes(ext) : false;
}

/**
 * Default allowed extensions for evidence files
 */
export const ALLOWED_EVIDENCE_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'csv',
  'txt',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'json',
  'xml',
  'zip',
];

/**
 * Default allowed extensions for policy files
 */
export const ALLOWED_POLICY_EXTENSIONS = ['pdf', 'doc', 'docx'];

/**
 * Validate file size
 */
export function isValidFileSize(size: number, maxSizeMB: number): boolean {
  return size <= maxSizeMB * 1024 * 1024;
}

/**
 * Default max file sizes (in MB)
 */
export const MAX_FILE_SIZES = {
  evidence: 50,
  policy: 25,
  avatar: 5,
};

/**
 * Assert that a value is not null or undefined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message = 'Value is null or undefined'
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

/**
 * Type guard for checking if a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Type guard for checking if a value is a positive number
 */
export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && value > 0 && !isNaN(value);
}

/**
 * Validate date range
 */
export function isValidDateRange(startDate: Date, endDate: Date): boolean {
  return startDate.getTime() <= endDate.getTime();
}

/**
 * Validate that a date is in the future
 */
export function isFutureDate(date: Date): boolean {
  return date.getTime() > Date.now();
}

/**
 * SECURITY: Validate a path is safe and within the expected base directory.
 * Prevents path traversal attacks by:
 * 1. Resolving the full path
 * 2. Ensuring it starts with the expected base directory
 * 3. Blocking path traversal patterns like '..'
 */
export function validatePathWithinBase(
  basePath: string,
  targetPath: string,
  options?: { allowDotFiles?: boolean }
): { isValid: boolean; resolvedPath: string; error?: string } {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('path');

  // Resolve both paths to absolute paths
  const resolvedBase = path.resolve(basePath);
  const resolvedTarget = path.resolve(basePath, targetPath);

  // Check for path traversal patterns in the original input
  if (targetPath.includes('..')) {
    return {
      isValid: false,
      resolvedPath: resolvedTarget,
      error: 'Path contains traversal patterns',
    };
  }

  // Check for null bytes (path truncation attack)
  if (targetPath.includes('\0')) {
    return {
      isValid: false,
      resolvedPath: resolvedTarget,
      error: 'Path contains null bytes',
    };
  }

  // Ensure resolved path is within base directory
  if (!resolvedTarget.startsWith(resolvedBase + path.sep) && resolvedTarget !== resolvedBase) {
    return {
      isValid: false,
      resolvedPath: resolvedTarget,
      error: 'Path escapes base directory',
    };
  }

  // Optionally block dot files/directories
  if (!options?.allowDotFiles) {
    const relativePath = path.relative(resolvedBase, resolvedTarget);
    const segments = relativePath.split(path.sep);
    if (segments.some((seg: string) => seg.startsWith('.') && seg !== '.')) {
      return {
        isValid: false,
        resolvedPath: resolvedTarget,
        error: 'Path contains hidden files or directories',
      };
    }
  }

  return {
    isValid: true,
    resolvedPath: resolvedTarget,
  };
}

/**
 * SECURITY: Maximum iteration limits for batch operations.
 * Prevents loop bound injection attacks by limiting user-controlled iterations.
 */
export const MAX_BATCH_LIMITS = {
  DEFAULT: 1000,
  EVIDENCE_ITEMS: 1000,
  TEMPLATES: 500,
  KNOWLEDGE_BASE_ENTRIES: 500,
  BULK_OPERATIONS: 1000,
} as const;

/**
 * SECURITY: Clamp an array length to prevent loop bound injection.
 * Returns a slice of the array limited to the maximum allowed items.
 */
export function clampArrayForIteration<T>(
  array: T[],
  maxItems: number = MAX_BATCH_LIMITS.DEFAULT
): T[] {
  if (!Array.isArray(array)) {
    return [];
  }
  return array.slice(0, maxItems);
}
