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

import { CheckmarxConnector } from './devops-connectors';

function mockResponse(status: number, body: any) {
  return {
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

describe('CheckmarxConnector', () => {
  let connector: CheckmarxConnector;

  beforeEach(() => {
    connector = new CheckmarxConnector();
    mockSafeFetch.mockReset();
  });

  it('reports SSRF block as a structured failure', async () => {
    mockSafeFetch.mockRejectedValueOnce(new SSRFProtectionError('blocked'));

    const result = await connector.testConnection({
      baseUrl: 'http://10.0.0.1',
      username: 'u',
      password: 'p',
      clientSecret: 'cs',
    });

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/SSRF protection blocked request/);
  });

  it('returns failure with status on non-2xx token response', async () => {
    mockSafeFetch.mockResolvedValueOnce(mockResponse(400, { error: 'invalid_grant' }));

    const result = await connector.testConnection({
      baseUrl: 'https://cxsast.example.com',
      username: 'u',
      password: 'p',
      clientSecret: 'cs',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('400');
  });

  it('returns failure when token response lacks access_token', async () => {
    mockSafeFetch.mockResolvedValueOnce(mockResponse(200, {}));

    const result = await connector.testConnection({
      baseUrl: 'https://cxsast.example.com',
      username: 'u',
      password: 'p',
      clientSecret: 'cs',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to authenticate');
  });

  it('records SSRF block in sync errors array', async () => {
    mockSafeFetch.mockRejectedValueOnce(new SSRFProtectionError('blocked'));

    const result = await connector.sync({
      baseUrl: 'http://127.0.0.1',
      username: 'u',
      password: 'p',
      clientSecret: 'cs',
    });

    expect(result.errors.some((e: string) => /SSRF protection blocked/.test(e))).toBe(true);
  });
});
