import { EvidenceService } from './evidence.service';

describe('EvidenceService deletion lifecycle', () => {
  const evidence = {
    id: 'evidence-1',
    organizationId: 'org-1',
    title: 'Access review',
    filename: 'review.pdf',
    storagePath: 'evidence/org-1/evidence-1/review.pdf',
  };
  const transactionEvidence = {
    findFirst: jest.fn(),
    update: jest.fn(),
  };
  const transactionClient = { evidence: transactionEvidence };
  const prisma = {
    $transaction: jest.fn(
      async (operation: (client: typeof transactionClient) => Promise<unknown>) =>
        operation(transactionClient)
    ),
  };
  const auditService = { log: jest.fn() };
  const storage = { delete: jest.fn() };
  const service = new EvidenceService(
    prisma as never,
    auditService as never,
    {} as never,
    storage as never
  );

  beforeEach(() => {
    jest.clearAllMocks();
    transactionEvidence.findFirst.mockResolvedValue(evidence);
    transactionEvidence.update.mockResolvedValue({ ...evidence, deletedBy: 'user-1' });
    auditService.log.mockResolvedValue(undefined);
    storage.delete.mockResolvedValue(undefined);
  });

  it('commits authenticated deletion metadata before deleting the blob', async () => {
    await expect(service.delete('evidence-1', 'org-1', 'user-1')).resolves.toEqual({
      success: true,
    });
    expect(transactionEvidence.update).toHaveBeenCalledWith({
      where: { id: 'evidence-1' },
      data: { deletedAt: expect.any(Date), deletedBy: 'user-1' },
    });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-1', userId: 'user-1', action: 'deleted' })
    );
    expect(storage.delete).toHaveBeenCalledWith(evidence.storagePath);
    expect(transactionEvidence.update.mock.invocationCallOrder[0]).toBeLessThan(
      storage.delete.mock.invocationCallOrder[0]
    );
  });

  it('does not delete the blob when the metadata transaction fails', async () => {
    transactionEvidence.update.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(service.delete('evidence-1', 'org-1', 'user-1')).rejects.toThrow(
      'database unavailable'
    );
    expect(storage.delete).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });
});
