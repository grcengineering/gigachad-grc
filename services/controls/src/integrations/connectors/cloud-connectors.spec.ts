import { SSRFProtectionError } from '@gigachad-grc/shared';
import * as crypto from 'crypto';

// Mock safeFetch BEFORE importing the connector module so the import sees the mock.
const mockSafeFetch = jest.fn();
jest.mock('@gigachad-grc/shared', () => {
  const original = jest.requireActual('@gigachad-grc/shared');
  return {
    ...original,
    safeFetch: (...args: any[]) => mockSafeFetch(...args),
  };
});

import {
  OracleCloudConnector,
  IBMCloudConnector,
  AlibabaCloudConnector,
} from './cloud-connectors';

function mockResponse(status: number, body: any) {
  return {
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

// Generated once per test run; only used as input to the OCI signer in tests.
// safeFetch is mocked, so no real network or external crypto verification happens.
const TEST_PRIVATE_KEY = crypto
  .generateKeyPairSync('rsa', { modulusLength: 2048 })
  .privateKey.export({ type: 'pkcs1', format: 'pem' })
  .toString();

describe('OracleCloudConnector', () => {
  let connector: OracleCloudConnector;

  beforeEach(() => {
    connector = new OracleCloudConnector();
    mockSafeFetch.mockReset();
  });

  it('returns SSRF protection error on blocked request', async () => {
    mockSafeFetch.mockRejectedValueOnce(new SSRFProtectionError('blocked private IP'));

    const result = await connector.testConnection({
      tenancyOcid: 'ocid1.tenancy.oc1..a',
      userOcid: 'ocid1.user.oc1..b',
      fingerprint: 'aa:bb',
      privateKey: TEST_PRIVATE_KEY,
      region: 'us-phoenix-1',
    });

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/SSRF protection blocked request/);
  });

  it('returns success on 200 response', async () => {
    mockSafeFetch.mockResolvedValueOnce(mockResponse(200, []));

    const result = await connector.testConnection({
      tenancyOcid: 'ocid1.tenancy.oc1..a',
      userOcid: 'ocid1.user.oc1..b',
      fingerprint: 'aa:bb',
      privateKey: TEST_PRIVATE_KEY,
      region: 'us-phoenix-1',
    });

    expect(result.success).toBe(true);
  });

  it('returns failure with status on non-2xx', async () => {
    mockSafeFetch.mockResolvedValueOnce(mockResponse(403, { code: 'NotAuthorized' }));

    const result = await connector.testConnection({
      tenancyOcid: 'ocid1.tenancy.oc1..a',
      userOcid: 'ocid1.user.oc1..b',
      fingerprint: 'aa:bb',
      privateKey: TEST_PRIVATE_KEY,
      region: 'us-phoenix-1',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('403');
  });
});

describe('IBMCloudConnector', () => {
  let connector: IBMCloudConnector;

  beforeEach(() => {
    connector = new IBMCloudConnector();
    mockSafeFetch.mockReset();
  });

  it('returns SSRF protection error on blocked token request', async () => {
    mockSafeFetch.mockRejectedValueOnce(new SSRFProtectionError('blocked'));

    const result = await connector.testConnection({ apiKey: 'k' });

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/SSRF protection blocked request/);
  });

  it('reports failure when token response has non-2xx status', async () => {
    mockSafeFetch.mockResolvedValueOnce(mockResponse(401, { error: 'bad apikey' }));

    const result = await connector.testConnection({ apiKey: 'k' });

    expect(result.success).toBe(false);
    expect(result.message).toContain('401');
  });

  it('reports failure when access_token is missing from token response body', async () => {
    mockSafeFetch.mockResolvedValueOnce(mockResponse(200, { not_a_token: true }));

    const result = await connector.testConnection({ apiKey: 'k' });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to obtain access token');
  });
});

describe('AlibabaCloudConnector', () => {
  let connector: AlibabaCloudConnector;

  beforeEach(() => {
    connector = new AlibabaCloudConnector();
    mockSafeFetch.mockReset();
  });

  it('returns SSRF protection error on blocked request', async () => {
    mockSafeFetch.mockRejectedValueOnce(new SSRFProtectionError('blocked private host'));

    const result = await connector.testConnection({
      accessKeyId: 'AKID',
      accessKeySecret: 'secret',
      region: 'cn-hangzhou',
    });

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/SSRF protection blocked request/);
  });

  it('returns success on 200 response', async () => {
    mockSafeFetch.mockResolvedValueOnce(mockResponse(200, { Regions: { Region: [] } }));

    const result = await connector.testConnection({
      accessKeyId: 'AKID',
      accessKeySecret: 'secret',
      region: 'cn-hangzhou',
    });

    expect(result.success).toBe(true);
  });

  it('returns failure with status on non-2xx', async () => {
    mockSafeFetch.mockResolvedValueOnce(mockResponse(400, { Code: 'InvalidAccessKeyId' }));

    const result = await connector.testConnection({
      accessKeyId: 'AKID',
      accessKeySecret: 'secret',
      region: 'cn-hangzhou',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('400');
  });
});
