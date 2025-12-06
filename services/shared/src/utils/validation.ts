/**
 * Validate an email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate a UUID
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
 */
export function isValidControlId(controlId: string): boolean {
  // Supports formats like: AC-001, CC1.1, A.5.1.1
  const controlIdRegex = /^[A-Z]{1,3}[-.]?\d+(\.\d+)*$/i;
  return controlIdRegex.test(controlId);
}

/**
 * Sanitize a string for safe display
 */
export function sanitizeString(str: string): string {
  return str
    .replace(/[<>]/g, '')
    .trim();
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
export function isAllowedFileExtension(
  filename: string,
  allowedExtensions: string[]
): boolean {
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
export const ALLOWED_POLICY_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
];

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



