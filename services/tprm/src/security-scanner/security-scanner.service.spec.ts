import { NotFoundException } from '@nestjs/common';
import { SecurityScannerService } from './security-scanner.service';

describe('SecurityScannerService tenant integrity', () => {
  const prisma = {
    vendor: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    vendorAssessment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };
  const audit = { log: jest.fn() };
  const collector = { collect: jest.fn() };
  const analyzer = { analyze: jest.fn() };
  const service = new SecurityScannerService(
    prisma as never,
    audit as never,
    collector as never,
    collector as never,
    collector as never,
    collector as never,
    collector as never,
    collector as never,
    analyzer as never
  );

  beforeEach(() => jest.clearAllMocks());

  it('rejects initiating a scan for an Org B vendor as Org A', async () => {
    prisma.vendor.findFirst.mockResolvedValue(null);

    await expect(
      service.initiateScan('vendor-b', { targetUrl: 'https://example.com' }, 'user-a', 'org-a')
    ).rejects.toThrow(NotFoundException);
    expect(collector.collect).not.toHaveBeenCalled();
    expect(prisma.vendorAssessment.create).not.toHaveBeenCalled();
  });

  it('scopes scan detail reads to both vendor and organization', async () => {
    prisma.vendorAssessment.findFirst.mockResolvedValue(null);

    await expect(service.getScanById('vendor-b', 'scan-b', 'org-a')).resolves.toBeNull();
    expect(prisma.vendorAssessment.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'scan-b',
        vendorId: 'vendor-b',
        organizationId: 'org-a',
        vendor: { organizationId: 'org-a', deletedAt: null },
        assessmentType: 'security_scan_osint',
      },
    });
  });
});
