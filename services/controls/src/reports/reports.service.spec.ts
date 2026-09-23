import { ReportsService } from './reports.service';

describe('ReportsService mapping gaps', () => {
  const prisma = {
    frameworkRequirement: { findMany: jest.fn() },
    control: { findMany: jest.fn() },
    evidence: { findMany: jest.fn() },
  };
  const audit = { log: jest.fn() };
  const service = new ReportsService(prisma as never, audit as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('aggregates tenant-backed requirement, control, and evidence gaps', async () => {
    prisma.frameworkRequirement.findMany.mockResolvedValue([
      {
        id: 'requirement-1',
        reference: 'CC1.1',
        title: 'Control environment',
        framework: { name: 'SOC 2' },
        _count: { mappings: 0 },
      },
    ]);
    prisma.control.findMany.mockResolvedValue([
      {
        id: 'control-1',
        controlId: 'AC-001',
        title: 'Access review',
        evidenceLinks: [],
        implementations: [
          {
            lastTestedAt: new Date('2026-08-01T00:00:00.000Z'),
            updatedAt: new Date('2026-08-02T00:00:00.000Z'),
          },
        ],
      },
    ]);
    prisma.evidence.findMany.mockResolvedValue([
      {
        id: 'evidence-1',
        title: 'Quarterly access review',
        type: 'document',
        status: 'pending_review',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    ]);

    const result = await service.getMappingGaps('org-1');

    expect(result.totals).toEqual({
      totalGaps: 3,
      requirementsWithoutControls: 1,
      controlsWithoutEvidence: 1,
      evidenceWithoutApproval: 1,
    });
    expect(result.requirementGaps[0]).toMatchObject({
      framework: 'SOC 2',
      requirementCode: 'CC1.1',
      mappedControlCount: 0,
    });
    expect(result.controlGaps[0]).toMatchObject({
      controlCode: 'AC-001',
      evidenceCount: 0,
    });
    expect(result.evidenceGaps[0].daysPending).toBeGreaterThanOrEqual(2);
  });
});
