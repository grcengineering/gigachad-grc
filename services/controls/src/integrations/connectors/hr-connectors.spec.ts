import { SSRFProtectionError } from '@gigachad-grc/shared';

// Mock safeFetch BEFORE importing the connector module so the import sees the mock.
const mockSafeFetch = jest.fn();
jest.mock('@gigachad-grc/shared', () => {
  const original = jest.requireActual('@gigachad-grc/shared');
  return {
    ...original,
    safeFetch: (...args: any[]) => mockSafeFetch(...args),
  };
});

import { ADPConnector } from './hr-connectors';

function mockResponse(status: number, body: any) {
  return {
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

describe('ADPConnector', () => {
  let connector: ADPConnector;

  beforeEach(() => {
    connector = new ADPConnector();
    mockSafeFetch.mockReset();
  });

  it('reports SSRF block as a structured failure', async () => {
    mockSafeFetch.mockRejectedValueOnce(
      new SSRFProtectionError('Blocked private/internal IP: 169.254.169.254')
    );

    const result = await connector.testConnection({
      baseUrl: 'http://169.254.169.254',
      clientId: 'cid',
      clientSecret: 'csecret',
    });

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/SSRF protection blocked request/);
  });

  it('returns success when token endpoint returns a valid access token', async () => {
    mockSafeFetch.mockResolvedValueOnce(
      mockResponse(200, { access_token: 'tk_123', expires_in: 3600 })
    );

    const result = await connector.testConnection({
      clientId: 'cid',
      clientSecret: 'csecret',
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('ADP');
  });

  it('returns success=false with status on non-2xx token response', async () => {
    mockSafeFetch.mockResolvedValueOnce(mockResponse(401, { error: 'invalid_client' }));

    const result = await connector.testConnection({
      clientId: 'cid',
      clientSecret: 'csecret',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('401');
  });

  it('records SSRF block in sync errors array', async () => {
    mockSafeFetch.mockRejectedValueOnce(new SSRFProtectionError('blocked'));

    const result = await connector.sync({
      baseUrl: 'http://10.0.0.1',
      clientId: 'cid',
      clientSecret: 'csecret',
    });

    expect(result.errors.some((e: string) => /SSRF protection blocked/.test(e))).toBe(true);
  });
});
