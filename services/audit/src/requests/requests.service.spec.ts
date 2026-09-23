import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestsService } from './requests.service';

describe('RequestsService tenant isolation', () => {
  const prisma = { auditRequest: { findFirst: jest.fn() } };
  let service: RequestsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RequestsService(prisma as unknown as PrismaService);
  });

  it('returns 404 when a request is outside the caller tenant', async () => {
    prisma.auditRequest.findFirst.mockResolvedValue(null);
    await expect(service.findOne('other-tenant-request', 'org-a')).rejects.toBeInstanceOf(
      NotFoundException
    );
    expect(prisma.auditRequest.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'other-tenant-request',
          organizationId: 'org-a',
          deletedAt: null,
        },
      })
    );
  });
});
