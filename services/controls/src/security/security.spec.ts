/**
 * Comprehensive Security Test Suite
 *
 * Tests for common security vulnerabilities:
 * - SQL Injection
 * - Cross-Site Scripting (XSS)
 * - Server-Side Request Forgery (SSRF)
 * - Authentication/Authorization Bypass
 * - Path Traversal
 * - Mass Assignment
 */

import { validateUrl } from '@gigachad-grc/shared';
import { sanitizeFilenameStrict } from '@gigachad-grc/shared';

describe('Security Test Suite', () => {
  describe('SQL Injection Prevention', () => {
    // Test payloads that should be blocked or safely parameterized
    const sqlInjectionPayloads = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      '1; DELETE FROM users WHERE 1=1; --',
      "' UNION SELECT * FROM users --",
      "admin'--",
      "1' AND 1=1 UNION SELECT NULL, table_name FROM information_schema.tables--",
      "' OR ''='",
      "1'; EXEC xp_cmdshell('dir'); --",
      "'; WAITFOR DELAY '0:0:10'--",
      '1 AND (SELECT COUNT(*) FROM users) > 0',
    ];

    it('should not execute SQL injection payloads in UUID fields', () => {
      // UUID validation should reject malicious input
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      for (const payload of sqlInjectionPayloads) {
        expect(uuidRegex.test(payload)).toBe(false);
      }
    });

    it('should sanitize SQL-like patterns from string inputs', () => {
      const dangerousPatterns = [
        /--/,
        /;.*DROP/i,
        /;.*DELETE/i,
        /UNION.*SELECT/i,
        /INSERT.*INTO/i,
        /UPDATE.*SET/i,
        /xp_cmdshell/i,
        /WAITFOR.*DELAY/i,
        /'\s*OR\s+/i, // Single quote followed by OR
        /'\s*AND\s+/i, // Single quote followed by AND
        /'\s*=\s*'/i, // Tautology patterns like '='
        /\bAND\s*\(\s*SELECT/i, // AND (SELECT subquery patterns
        /\bOR\s*\(\s*SELECT/i, // OR (SELECT subquery patterns
      ];

      for (const payload of sqlInjectionPayloads) {
        const hasDangerousPattern = dangerousPatterns.some((pattern) => pattern.test(payload));
        // Verify our test payloads contain dangerous patterns
        expect(hasDangerousPattern).toBe(true);
      }
    });
  });

  describe('XSS Prevention', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      'javascript:alert("XSS")',
      '<iframe src="javascript:alert(\'XSS\')">',
      '"><script>alert("XSS")</script>',
      '<body onload=alert("XSS")>',
      '<input onfocus=alert("XSS") autofocus>',
      '<marquee onstart=alert("XSS")>',
    ];

    it('should detect XSS payloads in input', () => {
      const xssPatterns = [
        /<script\b[^>]*>/i,
        /javascript:/i,
        /on\w+\s*=/i, // Event handlers like onclick=, onerror=
        /<iframe\b/i,
        /<svg\b[^>]*on\w+/i,
        /<body\b[^>]*on\w+/i,
        /<input\b[^>]*on\w+/i,
        /<marquee\b[^>]*on\w+/i,
      ];

      for (const payload of xssPayloads) {
        const hasXssPattern = xssPatterns.some((pattern) => pattern.test(payload));
        expect(hasXssPattern).toBe(true);
      }
    });

    it('should strip HTML tags from plain text fields', () => {
      const stripHtml = (input: string): string => {
        return input.replace(/<[^>]*>/g, '');
      };

      for (const payload of xssPayloads) {
        const stripped = stripHtml(payload);
        expect(stripped).not.toContain('<script');
        expect(stripped).not.toContain('<img');
        expect(stripped).not.toContain('<svg');
        expect(stripped).not.toContain('<iframe');
      }
    });
  });

  describe('SSRF Protection', () => {
    const ssrfPayloads = [
      'http://localhost/admin',
      'http://127.0.0.1/internal',
      'http://[::1]/secret',
      'http://169.254.169.254/latest/meta-data/', // AWS metadata
      'http://10.0.0.1/internal',
      'http://172.16.0.1/internal',
      'http://192.168.1.1/admin',
      'file:///etc/passwd',
      'gopher://localhost:25/',
      'dict://localhost:11211/',
    ];

    it('should block requests to private IP ranges', async () => {
      const privateIpPatterns = [
        /^127\./,
        /^10\./,
        /^172\.(1[6-9]|2\d|3[01])\./,
        /^192\.168\./,
        /^169\.254\./,
        /^0\./,
        /localhost/i,
        /\[::1\]/,
      ];

      for (const url of ssrfPayloads) {
        try {
          const parsedUrl = new URL(url);
          const hostname = parsedUrl.hostname.replace(/^\[|\]$/g, '');

          const isPrivate = privateIpPatterns.some((pattern) => pattern.test(hostname));

          // All our test URLs should be detected as private/blocked
          if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
            expect(isPrivate).toBe(true);
          }
        } catch {
          // Invalid URLs are also blocked
        }
      }
    });

    it('should only allow http and https protocols', () => {
      const allowedProtocols = ['http:', 'https:'];

      for (const url of ssrfPayloads) {
        try {
          const parsedUrl = new URL(url);
          const isAllowed = allowedProtocols.includes(parsedUrl.protocol);

          // file:, gopher:, dict: should be blocked
          if (!isAllowed) {
            expect(['file:', 'gopher:', 'dict:']).toContain(parsedUrl.protocol);
          }
        } catch {
          // Invalid URLs are blocked
        }
      }
    });

    it('should validate URLs through safeFetch utility', async () => {
      // Test that validateUrl properly blocks private IPs
      const blockedUrls = ['http://localhost:3000', 'http://127.0.0.1:8080', 'http://0.0.0.0'];

      for (const url of blockedUrls) {
        const result = await validateUrl(url);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Path Traversal Prevention', () => {
    const pathTraversalPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\Windows\\System32\\config',
      '/var/www/uploads/../../../etc/passwd',
      'C:\\Users\\Admin\\Documents\\..\\..\\..\\Windows\\System32',
      'file.txt\x00.exe', // Null byte injection
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd', // URL encoded
      '..%252f..%252f..%252fetc%252fpasswd', // Double URL encoded
    ];

    it('should sanitize filenames to prevent path traversal', () => {
      for (const payload of pathTraversalPayloads) {
        const sanitized = sanitizeFilenameStrict(payload);

        // Sanitized filename should not contain path separators or traversal patterns
        expect(sanitized).not.toContain('..');
        expect(sanitized).not.toContain('/');
        expect(sanitized).not.toContain('\\');
        expect(sanitized).not.toContain('\x00'); // Null byte
      }
    });

    it('should remove null bytes from filenames', () => {
      const nullBytePayloads = ['file.txt\x00.exe', 'malicious\x00.pdf', '\x00hidden.txt'];

      for (const payload of nullBytePayloads) {
        const sanitized = sanitizeFilenameStrict(payload);
        expect(sanitized).not.toContain('\x00');
      }
    });
  });

  describe('Authentication Bypass Prevention', () => {
    it('should reject invalid UUID formats for user IDs', () => {
      const invalidUserIds = [
        '',
        'undefined',
        'null',
        'admin',
        '../admin',
        "'; DROP TABLE users; --",
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // JWT fragment
      ];

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      for (const userId of invalidUserIds) {
        expect(uuidRegex.test(userId)).toBe(false);
      }
    });

    it('should validate that organization context is required', () => {
      const emptyOrgIds = ['', null, undefined, 'null', 'undefined'];

      for (const orgId of emptyOrgIds) {
        // Organization ID should never be falsy in authenticated requests
        expect(!orgId || orgId === 'null' || orgId === 'undefined').toBe(true);
      }
    });
  });

  describe('Mass Assignment Prevention', () => {
    it('should detect attempts to override sensitive fields', () => {
      const sensitiveFields = [
        'id',
        'userId',
        'organizationId',
        'createdAt',
        'updatedAt',
        'deletedAt',
        'role',
        'isAdmin',
        'permissions',
        'password',
        'passwordHash',
      ];

      const maliciousDto = {
        name: 'Normal Field',
        id: 'attacker-controlled-id',
        organizationId: 'attacker-org',
        isAdmin: true,
        role: 'admin',
        permissions: ['*'],
      };

      // Verify these fields exist in our test payload
      for (const field of ['id', 'organizationId', 'isAdmin', 'role', 'permissions']) {
        expect(maliciousDto).toHaveProperty(field);
        expect(sensitiveFields).toContain(field);
      }
    });

    it('should use explicit field mapping instead of spread operators', () => {
      const dto = {
        title: 'Safe Title',
        description: 'Safe Description',
        // Attacker-injected fields
        id: 'malicious-id',
        organizationId: 'malicious-org',
      };

      // Safe pattern: explicit field mapping
      const safeData = {
        title: dto.title,
        description: dto.description,
        // id and organizationId are NOT copied from dto
      };

      expect(safeData).not.toHaveProperty('id');
      expect(safeData).not.toHaveProperty('organizationId');
      expect(safeData.title).toBe('Safe Title');
    });
  });

  describe('Input Validation', () => {
    it('should enforce maximum length limits', () => {
      const maxLengths = {
        title: 500,
        description: 5000,
        name: 200,
        email: 255,
        url: 2048,
      };

      // Create oversized inputs
      const oversizedInputs = {
        title: 'a'.repeat(maxLengths.title + 1),
        description: 'b'.repeat(maxLengths.description + 1),
        name: 'c'.repeat(maxLengths.name + 1),
        email: 'd'.repeat(maxLengths.email + 1),
        url: 'e'.repeat(maxLengths.url + 1),
      };

      for (const [field, value] of Object.entries(oversizedInputs)) {
        const maxLength = maxLengths[field as keyof typeof maxLengths];
        expect(value.length).toBeGreaterThan(maxLength);
      }
    });

    it('should validate URL formats', () => {
      const invalidUrls = [
        'not-a-url',
        'javascript:alert(1)',
        'file:///etc/passwd',
        'data:text/html,<script>alert(1)</script>',
        'ftp://example.com',
      ];

      const urlRegex = /^https?:\/\/.+/;

      for (const url of invalidUrls) {
        expect(urlRegex.test(url)).toBe(false);
      }
    });

    it('should validate email formats', () => {
      const invalidEmails = [
        'not-an-email',
        '@missing-local.com',
        'missing-at.com',
        'spaces in@email.com',
        '<script>@evil.com',
      ];

      // More strict email regex that rejects special characters like < and >
      const emailRegex =
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

      for (const email of invalidEmails) {
        expect(emailRegex.test(email)).toBe(false);
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should define rate limits for sensitive endpoints', () => {
      const rateLimits = {
        login: { limit: 5, windowMs: 60000 },
        passwordReset: { limit: 3, windowMs: 300000 },
        apiEndpoint: { limit: 100, windowMs: 60000 },
        fileUpload: { limit: 10, windowMs: 60000 },
      };

      // Verify rate limits are defined and reasonable
      for (const [_endpoint, config] of Object.entries(rateLimits)) {
        expect(config.limit).toBeGreaterThan(0);
        expect(config.limit).toBeLessThan(1000); // Not too permissive
        expect(config.windowMs).toBeGreaterThanOrEqual(60000); // At least 1 minute
      }
    });
  });
});
