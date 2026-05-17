import { describe, expect, it } from 'vitest';
import { safeHref } from './safeHref';

describe('safeHref', () => {
  describe('blocks dangerous schemes (XSS sinks)', () => {
    it.each([
      'javascript:alert(1)',
      'JavaScript:alert(1)', // case insensitive parsing
      'jaVaScRiPt:alert(1)',
      'javascript:void(0)',
      'data:text/html,<script>alert(1)</script>',
      'data:application/octet-stream;base64,QQ==',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
      'about:blank',
      'chrome:settings',
    ])('returns null for %s', (input) => {
      expect(safeHref(input)).toBeNull();
    });
  });

  describe('allows http and https', () => {
    it.each([
      'http://example.com',
      'https://example.com',
      'https://vendor.example.com/path?q=1',
      'http://localhost:3000/foo',
      'https://example.com:8443/secure',
      'https://user:pass@example.com', // userinfo allowed by URL parser
    ])('returns the URL for %s', (input) => {
      const result = safeHref(input);
      expect(result).not.toBeNull();
      expect(result).toMatch(/^https?:\/\//);
    });
  });

  describe('handles malformed input', () => {
    it.each([
      '',
      ' ',
      'not a url',
      'example.com', // no scheme — URL constructor rejects
      '//example.com', // protocol-relative — URL constructor rejects
      'http://',
      ':::',
      'http:///',
    ])('returns null for malformed input: %s', (input) => {
      expect(safeHref(input)).toBeNull();
    });
  });

  describe('normalizes the returned URL', () => {
    it('returns the URL as parsed by the URL constructor', () => {
      // The URL constructor canonicalises certain things (e.g., trailing slash on origin).
      const result = safeHref('https://example.com');
      expect(result).toBe('https://example.com/');
    });

    it('preserves path and query', () => {
      expect(safeHref('https://example.com/foo?bar=baz#h')).toBe(
        'https://example.com/foo?bar=baz#h'
      );
    });
  });
});
