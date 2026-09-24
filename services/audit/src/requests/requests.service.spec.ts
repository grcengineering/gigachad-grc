import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestsService } from './requests.service';

describe('RequestsService tenant isolation', () => {
  const prisma = {
    auditRequest: { findFirst: jest.fn() },
    auditRequestComment: { create: jest.fn() },
  };
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

  it('does not add a comment to another tenant request', async () => {
    prisma.auditRequest.findFirst.mockResolvedValue(null);
    await expect(
      service.addComment(
        'other-tenant-request',
        {
          content: 'cross-tenant comment',
          authorType: 'internal_user',
          authorName: 'auditor@example.com',
        },
        'org-a'
      )
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.auditRequestComment.create).not.toHaveBeenCalled();
  });
});
