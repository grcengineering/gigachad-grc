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

import { MimecastAwarenessConnector } from './additional-connectors';

function mockResponse(status: number, body: any) {
  return {
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

describe('MimecastAwarenessConnector', () => {
  let connector: MimecastAwarenessConnector;
  const validConfig = {
    appId: 'app',
    appKey: 'appkey',
    accessKey: 'akey',
    // Base64-encoded secret key — Mimecast HMAC signing decodes this.
    secretKey: Buffer.from('test-secret').toString('base64'),
  };

  beforeEach(() => {
    connector = new MimecastAwarenessConnector();
    mockSafeFetch.mockReset();
  });

  it('reports SSRF block as a structured failure', async () => {
    mockSafeFetch.mockRejectedValueOnce(new SSRFProtectionError('blocked'));

    const result = await connector.testConnection(validConfig);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/SSRF protection blocked request/);
  });

  it('returns success on 200 response', async () => {
    mockSafeFetch.mockResolvedValueOnce(mockResponse(200, { data: [] }));

    const result = await connector.testConnection(validConfig);

    expect(result.success).toBe(true);
    expect(result.message).toContain('Mimecast');
  });

  it('returns failure with status on non-2xx response', async () => {
    mockSafeFetch.mockResolvedValueOnce(
      mockResponse(401, { fail: [{ errors: [{ message: 'unauthorized' }] }] })
    );

    const result = await connector.testConnection(validConfig);

    expect(result.success).toBe(false);
    expect(result.message).toContain('401');
  });

  it('records SSRF block in sync errors array', async () => {
    mockSafeFetch
      .mockRejectedValueOnce(new SSRFProtectionError('blocked'))
      .mockRejectedValueOnce(new SSRFProtectionError('blocked'));

    const result = await connector.sync(validConfig);

    expect(result.errors.some((e: string) => /SSRF protection blocked/.test(e))).toBe(true);
  });
});
