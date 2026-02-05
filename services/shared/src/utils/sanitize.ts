import sanitizeHtml from 'sanitize-html';

/**
 * Configuration for different sanitization levels
 */
const SANITIZE_CONFIGS = {
  /**
   * Strict - remove all HTML tags
   * Use for: usernames, titles, identifiers
   */
  strict: {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard' as const,
  },

  /**
   * Basic - allow minimal formatting
   * Use for: comments, descriptions
   */
  basic: {
    allowedTags: ['b', 'i', 'em', 'strong', 'br'],
    allowedAttributes: {},
    disallowedTagsMode: 'discard' as const,
  },

  /**
   * Rich - allow rich text formatting
   * Use for: policy content, knowledge base articles
   */
  rich: {
    allowedTags: [
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'p',
      'br',
      'hr',
      'b',
      'i',
      'em',
      'strong',
      'u',
      's',
      'strike',
      'ul',
      'ol',
      'li',
      'blockquote',
      'code',
      'pre',
      'a',
      'img',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'div',
      'span',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      '*': ['class', 'id'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
    },
    disallowedTagsMode: 'discard' as const,
    // Transform links to add security attributes
    transformTags: {
      a: (tagName: string, attribs: Record<string, string>) => ({
        tagName,
        attribs: {
          ...attribs,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    },
  },
};

export type SanitizeLevel = keyof typeof SANITIZE_CONFIGS;

/**
 * Sanitize user input to prevent XSS attacks
 *
 * @param input - The string to sanitize
 * @param level - Sanitization level: 'strict', 'basic', or 'rich'
 * @returns Sanitized string
 *
 * @example
 * // Remove all HTML
 * sanitizeInput('<script>alert("xss")</script>Hello', 'strict')
 * // Returns: 'Hello'
 *
 * // Allow basic formatting
 * sanitizeInput('<b>Bold</b> <script>bad</script>', 'basic')
 * // Returns: '<b>Bold</b> '
 */
export function sanitizeInput(input: string, level: SanitizeLevel = 'strict'): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const config = SANITIZE_CONFIGS[level];
  return sanitizeHtml(input, config);
}

/**
 * Sanitize an object's string properties recursively
 *
 * @param obj - Object to sanitize
 * @param level - Sanitization level
 * @param skipFields - Fields to skip sanitization (e.g., passwords, tokens)
 * @returns New object with sanitized string values
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  level: SanitizeLevel = 'strict',
  skipFields: string[] = ['password', 'token', 'secret', 'key', 'hash']
): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized: Record<string, unknown> = Array.isArray(obj)
    ? ([] as unknown as Record<string, unknown>)
    : {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip certain fields
    if (skipFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = value;
      continue;
    }

    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value, level);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'string'
          ? sanitizeInput(item, level)
          : typeof item === 'object' && item !== null
            ? sanitizeObject(item as Record<string, unknown>, level, skipFields)
            : item
      );
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>, level, skipFields);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Escape HTML entities in a string (for display in HTML contexts)
 * Does not remove tags, just escapes them
 */
export function escapeHtml(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };

  return input.replace(/[&<>"'`=/]/g, (char) => escapeMap[char] || char);
}

/**
 * Sanitize a filename to prevent path traversal attacks (extended version)
 * For basic sanitization, use sanitizeFilename from './validation'
 */
export function sanitizeFilenameStrict(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed';
  }

  return (
    filename
      // Remove path traversal patterns (.. sequences)
      .replace(/\.{2,}/g, '')
      // Remove path separators
      .replace(/[\\/]/g, '')
      // Remove null bytes (eslint-disable-next-line no-control-regex)
      // eslint-disable-next-line no-control-regex
      .replace(/\x00/g, '')
      // Remove control characters (eslint-disable-next-line no-control-regex)
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1f\x80-\x9f]/g, '')
      // Remove URL-encoded sequences that could represent traversal
      .replace(/%2e/gi, '')
      .replace(/%2f/gi, '')
      .replace(/%5c/gi, '')
      // Replace other special characters
      .replace(/[<>:"|?*]/g, '_')
      // Limit length
      .slice(0, 255)
      // Trim whitespace
      .trim() ||
    // Default if empty
    'unnamed'
  );
}

/**
 * Sanitize a URL to prevent javascript: and data: injection
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // Trim and lowercase for protocol check
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];

  for (const protocol of dangerousProtocols) {
    if (lower.startsWith(protocol)) {
      return '';
    }
  }

  // Allow relative URLs, http, https, mailto
  const allowedProtocols = ['http://', 'https://', 'mailto:', '/', '#', '?'];

  const isAllowed = allowedProtocols.some((p) => lower.startsWith(p)) || !lower.includes(':'); // Relative URLs without protocol

  return isAllowed ? trimmed : '';
}

/**
 * Sanitize SQL-like input (basic protection, not a replacement for parameterized queries)
 * This is a defense-in-depth measure, NOT primary SQL injection protection
 */
export function sanitizeSqlInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove SQL comment sequences
  let sanitized = input.replace(/--/g, '').replace(/\/\*/g, '').replace(/\*\//g, '');

  // Remove common SQL keywords that shouldn't appear in user input
  const sqlKeywords = [
    'DROP',
    'DELETE',
    'INSERT',
    'UPDATE',
    'TRUNCATE',
    'ALTER',
    'CREATE',
    'EXEC',
    'EXECUTE',
    'UNION',
    'GRANT',
    'REVOKE',
  ];

  for (const keyword of sqlKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    sanitized = sanitized.replace(regex, '');
  }

  return sanitized;
}

/**
 * Create a sanitizing pipe for NestJS validation
 * Use with @Transform decorator in DTOs
 *
 * @example
 * class CreateCommentDto {
 *   @Transform(sanitizeTransform('basic'))
 *   @IsString()
 *   content: string;
 * }
 */
export function sanitizeTransform(level: SanitizeLevel = 'strict') {
  return ({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      return sanitizeInput(value, level);
    }
    return value;
  };
}
