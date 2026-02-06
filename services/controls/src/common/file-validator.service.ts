import { Injectable, BadRequestException, Logger } from '@nestjs/common';

/**
 * Magic bytes (file signatures) for common file types
 * https://en.wikipedia.org/wiki/List_of_file_signatures
 */
const MAGIC_BYTES: Record<string, { bytes: number[]; offset?: number }[]> = {
  // Documents
  'application/pdf': [{ bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
  'application/msword': [{ bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }], // DOC
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    { bytes: [0x50, 0x4b, 0x03, 0x04] }, // DOCX (ZIP)
  ],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    { bytes: [0x50, 0x4b, 0x03, 0x04] }, // XLSX (ZIP)
  ],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [
    { bytes: [0x50, 0x4b, 0x03, 0x04] }, // PPTX (ZIP)
  ],

  // Images
  'image/jpeg': [
    { bytes: [0xff, 0xd8, 0xff, 0xe0] },
    { bytes: [0xff, 0xd8, 0xff, 0xe1] },
    { bytes: [0xff, 0xd8, 0xff, 0xe8] },
  ],
  'image/png': [{ bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  'image/gif': [
    { bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
    { bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
  ],
  'image/webp': [{ bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }], // RIFF
  'image/svg+xml': [{ bytes: [0x3c, 0x3f, 0x78, 0x6d, 0x6c] }], // <?xml or <svg

  // Archives
  'application/zip': [{ bytes: [0x50, 0x4b, 0x03, 0x04] }],
  'application/x-rar-compressed': [{ bytes: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07] }],
  'application/gzip': [{ bytes: [0x1f, 0x8b] }],
  'application/x-7z-compressed': [{ bytes: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c] }],

  // Text (allow without magic bytes check)
  'text/plain': [],
  'text/csv': [],
  'text/html': [],
  'application/json': [],
  'application/xml': [],
};

/**
 * Allowed file types by category
 */
export const ALLOWED_FILE_TYPES = {
  // Evidence uploads
  evidence: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/json',
    'application/zip',
  ],

  // Logo/branding uploads
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],

  // Policy documents
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],

  // Imports
  imports: [
    'text/csv',
    'application/json',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
};

/**
 * Size limits by category (in bytes)
 */
export const SIZE_LIMITS = {
  evidence: 50 * 1024 * 1024, // 50 MB
  images: 5 * 1024 * 1024, // 5 MB
  documents: 25 * 1024 * 1024, // 25 MB
  imports: 10 * 1024 * 1024, // 10 MB
  default: 25 * 1024 * 1024, // 25 MB
};

/**
 * Dangerous file extensions to always reject
 */
const DANGEROUS_EXTENSIONS = [
  '.exe',
  '.dll',
  '.bat',
  '.cmd',
  '.sh',
  '.ps1',
  '.vbs',
  '.js',
  '.msi',
  '.scr',
  '.com',
  '.pif',
  '.app',
  '.dmg',
  '.pkg',
  '.jar',
  '.war',
  '.ear',
  '.class',
  '.py',
  '.rb',
  '.pl',
  '.php',
  '.asp',
  '.aspx',
  '.jsp',
  '.cgi',
];

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FileValidationOptions {
  category?: keyof typeof ALLOWED_FILE_TYPES;
  maxSize?: number;
  allowedTypes?: string[];
  checkMagicBytes?: boolean;
}

@Injectable()
export class FileValidatorService {
  private readonly logger = new Logger(FileValidatorService.name);

  /**
   * Validate a file upload
   *
   * @param file - The uploaded file (multer file object)
   * @param options - Validation options
   * @returns Validation result with any errors/warnings
   */
  async validateFile(
    file: Express.Multer.File,
    options: FileValidationOptions = {}
  ): Promise<FileValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const { category = 'evidence', maxSize, allowedTypes, checkMagicBytes = true } = options;

    // 1. Check file exists
    if (!file) {
      return { valid: false, errors: ['No file provided'], warnings };
    }

    // 2. Check filename for dangerous extensions
    const filename = file.originalname?.toLowerCase() || '';
    for (const ext of DANGEROUS_EXTENSIONS) {
      if (filename.endsWith(ext)) {
        errors.push(`File type not allowed: ${ext}`);
        this.logger.warn(`Blocked dangerous file upload: ${filename}`);
        return { valid: false, errors, warnings };
      }
    }

    // 3. Check file size
    const sizeLimit = maxSize || SIZE_LIMITS[category] || SIZE_LIMITS.default;
    if (file.size > sizeLimit) {
      const limitMB = (sizeLimit / (1024 * 1024)).toFixed(1);
      const fileMB = (file.size / (1024 * 1024)).toFixed(1);
      errors.push(`File too large: ${fileMB}MB (max ${limitMB}MB)`);
    }

    // 4. Check MIME type
    const allowed = allowedTypes || ALLOWED_FILE_TYPES[category] || [];
    if (allowed.length > 0 && !allowed.includes(file.mimetype)) {
      errors.push(`File type not allowed: ${file.mimetype}`);
    }

    // 5. Validate magic bytes (file signature)
    if (checkMagicBytes && file.buffer) {
      const magicBytesValid = await this.validateMagicBytes(file.buffer, file.mimetype);

      if (!magicBytesValid) {
        errors.push('File content does not match declared type');
        this.logger.warn(`Magic bytes mismatch for ${filename}: declared ${file.mimetype}`);
      }
    }

    // 6. Check for double extensions (e.g., file.pdf.exe)
    const parts = filename.split('.');
    if (parts.length > 2) {
      for (let i = 1; i < parts.length - 1; i++) {
        const ext = '.' + parts[i];
        if (DANGEROUS_EXTENSIONS.includes(ext)) {
          errors.push(`Suspicious filename pattern detected`);
          break;
        }
      }
    }

    // 7. Check for null bytes in filename
    if (filename.includes('\x00') || filename.includes('%00')) {
      errors.push('Invalid filename');
    }

    // Add warning for very large files
    if (file.size > 10 * 1024 * 1024) {
      warnings.push('Large file may take longer to process');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate magic bytes match the declared MIME type
   */
  async validateMagicBytes(buffer: Buffer, mimeType: string): Promise<boolean> {
    const signatures = MAGIC_BYTES[mimeType];

    // If no signatures defined, skip validation (text files, etc.)
    if (!signatures || signatures.length === 0) {
      return true;
    }

    // Check if any signature matches
    for (const sig of signatures) {
      const offset = sig.offset || 0;
      const bytes = sig.bytes;

      if (buffer.length < offset + bytes.length) {
        continue;
      }

      let matches = true;
      for (let i = 0; i < bytes.length; i++) {
        if (buffer[offset + i] !== bytes[i]) {
          matches = false;
          break;
        }
      }

      if (matches) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get allowed file types for a category
   */
  getAllowedTypes(category: keyof typeof ALLOWED_FILE_TYPES): string[] {
    return ALLOWED_FILE_TYPES[category] || [];
  }

  /**
   * Get size limit for a category
   */
  getSizeLimit(category: keyof typeof SIZE_LIMITS): number {
    return SIZE_LIMITS[category] || SIZE_LIMITS.default;
  }

  /**
   * Sanitize filename to prevent path traversal and special characters
   * SECURITY: Uses iterative sanitization to prevent bypass via nested patterns
   */
  sanitizeFilename(filename: string): string {
    let sanitized = filename;
    let previousLength: number;

    // Loop until no more changes - prevents bypass via nested/encoded patterns
    do {
      previousLength = sanitized.length;

      // Remove path components
      sanitized = sanitized.replace(/^.*[\\/]/, '');

      // Remove URL-encoded dangerous sequences
      sanitized = sanitized
        .replace(/%252e/gi, '') // Double-encoded dot
        .replace(/%252f/gi, '') // Double-encoded forward slash
        .replace(/%255c/gi, '') // Double-encoded backslash
        .replace(/%2e/gi, '') // URL-encoded dot
        .replace(/%2f/gi, '') // URL-encoded forward slash
        .replace(/%5c/gi, '') // URL-encoded backslash
        .replace(/%00/gi, ''); // URL-encoded null byte

      // Remove null bytes
      // eslint-disable-next-line no-control-regex
      sanitized = sanitized.replace(/\x00/g, '');

      // Remove path traversal patterns
      sanitized = sanitized.replace(/\.{2,}/g, '.');
    } while (sanitized.length !== previousLength);

    // Replace special characters
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Limit length
    if (sanitized.length > 255) {
      const ext = sanitized.substring(sanitized.lastIndexOf('.'));
      const name = sanitized.substring(0, 255 - ext.length);
      sanitized = name + ext;
    }

    return sanitized;
  }

  /**
   * Validate multiple files
   */
  async validateFiles(
    files: Express.Multer.File[],
    options: FileValidationOptions & { maxFiles?: number } = {}
  ): Promise<{ valid: boolean; results: Map<string, FileValidationResult> }> {
    const { maxFiles = 10 } = options;
    const results = new Map<string, FileValidationResult>();

    if (files.length > maxFiles) {
      return {
        valid: false,
        results: new Map([
          [
            '_total',
            {
              valid: false,
              errors: [`Too many files: ${files.length} (max ${maxFiles})`],
              warnings: [],
            },
          ],
        ]),
      };
    }

    let allValid = true;

    for (const file of files) {
      const result = await this.validateFile(file, options);
      results.set(file.originalname, result);

      if (!result.valid) {
        allValid = false;
      }
    }

    return { valid: allValid, results };
  }
}

/**
 * Multer file filter factory
 */
export function createFileFilter(
  validator: FileValidatorService,
  options: FileValidationOptions = {}
) {
  return async (
    req: any,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void
  ) => {
    const result = await validator.validateFile(file, options);

    if (result.valid) {
      callback(null, true);
    } else {
      callback(new BadRequestException(result.errors.join(', ')), false);
    }
  };
}
