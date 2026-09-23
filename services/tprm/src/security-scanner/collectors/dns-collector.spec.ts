import { DNSCollector } from './dns-collector';

describe('DNSCollector DNSSEC validation', () => {
  const originalFetch = global.fetch;
  let collector: DNSCollector;

  beforeEach(() => {
    collector = new DNSCollector();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('reports a DNSSEC-validated DNSKEY response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ Status: 0, AD: true, Answer: [{ type: 48 }] }),
    }) as typeof fetch;

    await expect((collector as any).checkDNSSEC('example.com')).resolves.toEqual({
      hasDNSSEC: true,
      status: 'validated',
    });
  });

  it('distinguishes an unsigned domain from an unavailable check', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ Status: 0, AD: false, Answer: [] }),
    }) as typeof fetch;

    await expect((collector as any).checkDNSSEC('example.com')).resolves.toEqual({
      hasDNSSEC: false,
      status: 'unsigned',
    });
  });

  it('returns unknown rather than a false negative when validation fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network unavailable')) as typeof fetch;

    await expect((collector as any).checkDNSSEC('example.com')).resolves.toEqual({
      hasDNSSEC: null,
      status: 'unknown',
    });
  });
});
