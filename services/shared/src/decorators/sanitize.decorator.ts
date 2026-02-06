import { Transform, TransformFnParams } from 'class-transformer';

// Simple HTML stripper (avoids external dependency)
const stripHtmlTags = (html: string): string => {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
};

// Safe HTML tags whitelist
const SAFE_TAGS = [
  'b',
  'i',
  'em',
  'strong',
  'a',
  'p',
  'br',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
];

const sanitizeHtmlContent = (html: string, allowedTags: string[] = []): string => {
  if (allowedTags.length === 0) {
    return stripHtmlTags(html);
  }
  // Remove all tags except allowed ones
  const tagPattern = new RegExp(`<(?!/?(${allowedTags.join('|')})\\b)[^>]*>`, 'gi');
  return html.replace(tagPattern, '').trim();
};

/**
 * Sanitization transforms for DTOs
 * These decorators should be applied to DTO fields to prevent XSS and clean input
 */

/**
 * Trim whitespace from string inputs
 */
export function Trim(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  });
}

/**
 * Convert string to lowercase
 */
export function ToLowerCase(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value === 'string') {
      return value.toLowerCase();
    }
    return value;
  });
}

/**
 * Convert string to uppercase
 */
export function ToUpperCase(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value === 'string') {
      return value.toUpperCase();
    }
    return value;
  });
}

/**
 * Normalize email address (trim + lowercase)
 */
export function NormalizeEmail(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value === 'string') {
      return value.trim().toLowerCase();
    }
    return value;
  });
}

/**
 * Strip HTML tags from string (prevent XSS)
 */
export function StripHtml(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value === 'string') {
      return sanitizeHtmlContent(value, []);
    }
    return value;
  });
}

/**
 * Sanitize HTML allowing only safe tags (for rich text)
 */
export function SanitizeHtml(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value === 'string') {
      return sanitizeHtmlContent(value, SAFE_TAGS);
    }
    return value;
  });
}

/**
 * Escape special characters for safe database queries
 */
export function EscapeSpecialChars(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value === 'string') {
      // Escape common SQL special characters
      return value.replace(/[<>'"\\;]/g, '');
    }
    return value;
  });
}

/**
 * Normalize whitespace (collapse multiple spaces to single)
 */
export function NormalizeWhitespace(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value === 'string') {
      return value.trim().replace(/\s+/g, ' ');
    }
    return value;
  });
}

/**
 * Convert to integer
 */
export function ToInt(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams) => {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    const parsed = parseInt(String(value), 10);
    return isNaN(parsed) ? undefined : parsed;
  });
}

/**
 * Convert to boolean
 */
export function ToBoolean(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams) => {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') {
        return true;
      }
      if (lower === 'false' || lower === '0' || lower === 'no') {
        return false;
      }
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    return undefined;
  });
}

/**
 * Convert array of strings, trimming each element
 */
export function TrimArray(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams) => {
    if (Array.isArray(value)) {
      return value
        .filter((item) => item !== null && item !== undefined)
        .map((item) => (typeof item === 'string' ? item.trim() : item))
        .filter((item) => item !== '');
    }
    return value;
  });
}

/**
 * Strip dangerous characters from file names
 */
export function SanitizeFileName(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value === 'string') {
      // Remove path traversal - loop until no more matches
      // This prevents bypass via patterns like '....' which becomes '..' after one pass
      let sanitized = value;
      let previousLength: number;
      do {
        previousLength = sanitized.length;
        sanitized = sanitized.replace(/\.\./g, '');
      } while (sanitized.length !== previousLength);
      // Remove dangerous chars
      sanitized = sanitized.replace(/[<>:"/\\|?*]/g, '');
      // Remove control characters (0x00-0x1F) by filtering
      sanitized = sanitized
        .split('')
        .filter((char) => char.charCodeAt(0) > 31)
        .join('');
      return sanitized.trim();
    }
    return value;
  });
}
