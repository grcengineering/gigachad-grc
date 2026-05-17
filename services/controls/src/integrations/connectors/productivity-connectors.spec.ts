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

import { PodioConnector } from './productivity-connectors';

function mockResponse(status: number, body: any) {
  return {
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

describe('PodioConnector', () => {
  let connector: PodioConnector;

  beforeEach(() => {
    connector = new PodioConnector();
    mockSafeFetch.mockReset();
  });

  it('reports SSRF block as a structured failure', async () => {
    mockSafeFetch.mockRejectedValueOnce(new SSRFProtectionError('blocked'));

    const result = await connector.testConnection({
      clientId: 'cid',
      clientSecret: 'csecret',
    });

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/SSRF protection blocked request/);
  });

  it('returns failure with status on non-2xx token response', async () => {
    mockSafeFetch.mockResolvedValueOnce(mockResponse(403, { error: 'forbidden' }));

    const result = await connector.testConnection({
      clientId: 'cid',
      clientSecret: 'csecret',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('403');
  });

  it('returns failure when token response lacks access_token', async () => {
    mockSafeFetch.mockResolvedValueOnce(mockResponse(200, { wrong_field: true }));

    const result = await connector.testConnection({
      clientId: 'cid',
      clientSecret: 'csecret',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to obtain access token');
  });

  it('records SSRF block in sync errors array', async () => {
    mockSafeFetch.mockRejectedValueOnce(new SSRFProtectionError('blocked'));

    const result = await connector.sync({
      clientId: 'cid',
      clientSecret: 'csecret',
    });

    expect(result.errors.some((e: string) => /SSRF protection blocked/.test(e))).toBe(true);
  });
});
