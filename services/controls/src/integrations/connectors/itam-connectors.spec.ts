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

import { SnowSoftwareConnector } from './itam-connectors';

function mockResponse(status: number, body: any) {
  return {
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

describe('SnowSoftwareConnector', () => {
  let connector: SnowSoftwareConnector;

  beforeEach(() => {
    connector = new SnowSoftwareConnector();
    mockSafeFetch.mockReset();
  });

  it('reports SSRF block as a structured failure', async () => {
    mockSafeFetch.mockRejectedValueOnce(
      new SSRFProtectionError('Blocked private/internal IP: 10.0.0.1')
    );

    const result = await connector.testConnection({
      apiUrl: 'http://10.0.0.1',
      clientId: 'cid',
      clientSecret: 'csecret',
    });

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/SSRF protection blocked request/);
    const calledUrl = mockSafeFetch.mock.calls[0][0];
    expect(calledUrl).toContain('10.0.0.1');
    expect(calledUrl).toContain('/oauth/token');
  });

  it('returns success=false with status when token endpoint returns non-2xx', async () => {
    mockSafeFetch.mockResolvedValueOnce(mockResponse(401, { error: 'invalid_client' }));

    const result = await connector.testConnection({
      apiUrl: 'https://snow.example.com',
      clientId: 'cid',
      clientSecret: 'csecret',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('401');
  });

  it('returns failure when token response is 200 but lacks access_token', async () => {
    mockSafeFetch.mockResolvedValueOnce(mockResponse(200, { not_a_token: true }));

    const result = await connector.testConnection({
      apiUrl: 'https://snow.example.com',
      clientId: 'cid',
      clientSecret: 'csecret',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to obtain access token');
  });

  it('records SSRF block in sync errors array', async () => {
    mockSafeFetch.mockRejectedValueOnce(new SSRFProtectionError('blocked'));

    const result = await connector.sync({
      apiUrl: 'http://127.0.0.1',
      clientId: 'cid',
      clientSecret: 'csecret',
    });

    expect(result.errors.some((e: string) => /SSRF protection blocked/.test(e))).toBe(true);
  });
});
