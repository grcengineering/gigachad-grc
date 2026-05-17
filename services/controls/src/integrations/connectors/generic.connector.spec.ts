import { SSRFProtectionError } from '@gigachad-grc/shared';

// Mock safeFetch BEFORE importing GenericConnector so the import sees the mock.
const mockSafeFetch = jest.fn();
jest.mock('@gigachad-grc/shared', () => {
  const original = jest.requireActual('@gigachad-grc/shared');
  return {
    ...original,
    safeFetch: (...args: any[]) => mockSafeFetch(...args),
  };
});

import { GenericConnector } from './generic.connector';

function mockResponse(status: number, body: any) {
  return {
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  };
}

describe('GenericConnector', () => {
  let connector: GenericConnector;

  beforeEach(() => {
    connector = new GenericConnector();
    mockSafeFetch.mockReset();
  });

  describe('testConnection', () => {
    it('reports SSRF block as a structured failure rather than swallowing it', async () => {
      mockSafeFetch.mockRejectedValueOnce(
        new SSRFProtectionError('Blocked private/internal IP: 169.254.169.254')
      );

      const result = await connector.testConnection(
        'integration-x',
        { apiKey: 'k', baseUrl: 'http://169.254.169.254' },
        '/status'
      );

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/SSRF protection blocked request/);
      expect(mockSafeFetch).toHaveBeenCalledTimes(1);
      const calledUrl = mockSafeFetch.mock.calls[0][0];
      expect(calledUrl).toContain('169.254.169.254');
    });

    it('passes Bearer auth header through safeFetch on success', async () => {
      mockSafeFetch.mockResolvedValueOnce(mockResponse(200, { ok: true }));

      const result = await connector.testConnection(
        'integration-x',
        { apiKey: 'secret-token', baseUrl: 'https://api.example.com' }
      );

      expect(result.success).toBe(true);
      const callArgs = mockSafeFetch.mock.calls[0][1];
      expect(callArgs.method).toBe('GET');
      expect(callArgs.headers.Authorization).toBe('Bearer secret-token');
    });

    it('returns success=false with response body on non-2xx', async () => {
      mockSafeFetch.mockResolvedValueOnce(mockResponse(401, { error: 'bad token' }));

      const result = await connector.testConnection(
        'integration-x',
        { apiKey: 'k', baseUrl: 'https://api.example.com' }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('401');
    });

    it('does not call safeFetch when required config is missing', async () => {
      const result = await connector.testConnection('integration-x', {});
      expect(result.success).toBe(false);
      expect(mockSafeFetch).not.toHaveBeenCalled();
    });
  });

  describe('sync', () => {
    it('records SSRF blocks per-endpoint and continues processing remaining endpoints', async () => {
      mockSafeFetch
        .mockRejectedValueOnce(new SSRFProtectionError('blocked internal IP'))
        .mockResolvedValueOnce(mockResponse(200, { items: [1, 2, 3] }));

      const result = await connector.sync(
        'integration-x',
        { apiKey: 'k', baseUrl: 'http://10.0.0.1' },
        [
          { name: 'first', path: '/a' },
          { name: 'second', path: '/b' },
        ]
      );

      expect(result.errors.some((e) => /SSRF protection blocked/.test(e))).toBe(true);
      expect(result.errors.some((e) => e.startsWith('first:'))).toBe(true);
      expect(result.data.second).toEqual({ items: [1, 2, 3] });
      expect(result.summary.totalItems).toBe(3);
      expect(mockSafeFetch).toHaveBeenCalledTimes(2);
    });

    it('still surfaces non-SSRF errors per-endpoint without breaking the loop', async () => {
      mockSafeFetch
        .mockRejectedValueOnce(new Error('network timeout'))
        .mockResolvedValueOnce(mockResponse(200, [{ id: 'x' }]));

      const result = await connector.sync(
        'integration-x',
        { apiKey: 'k', baseUrl: 'https://api.example.com' },
        [
          { name: 'first', path: '/a' },
          { name: 'second', path: '/b' },
        ]
      );

      expect(result.errors).toContain('first: network timeout');
      expect(result.data.second).toEqual([{ id: 'x' }]);
      expect(result.summary.totalItems).toBe(1);
    });
  });
});
