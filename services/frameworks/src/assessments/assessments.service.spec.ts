import { NotFoundException } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';

describe('AssessmentsService tenant integrity', () => {
  const prisma = {
    framework: { findFirst: jest.fn() },
    frameworkRequirement: { findFirst: jest.fn(), findMany: jest.fn() },
    readinessAssessment: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    requirementStatus: { upsert: jest.fn(), findMany: jest.fn() },
    requirementStatusEvidence: { deleteMany: jest.fn(), createMany: jest.fn() },
    requirementStatusControl: { deleteMany: jest.fn(), createMany: jest.fn() },
    evidence: { count: jest.fn() },
    control: { count: jest.fn() },
    user: { findFirst: jest.fn() },
    gap: { findFirst: jest.fn(), create: jest.fn() },
    remediationTask: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    remediationTaskControl: { deleteMany: jest.fn(), createMany: jest.fn() },
  };

  const service = new AssessmentsService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.readinessAssessment.findFirst.mockResolvedValue({
      id: 'assessment-a',
      organizationId: 'org-a',
      frameworkId: 'framework-a',
      requirementStatuses: [],
      gaps: [],
      remediationTasks: [],
    });
    prisma.frameworkRequirement.findFirst.mockResolvedValue({ id: 'requirement-a' });
    prisma.evidence.count.mockResolvedValue(1);
    prisma.control.count.mockResolvedValue(1);
    prisma.user.findFirst.mockResolvedValue({ id: 'user-a' });
  });

  it('rejects creating an assessment for Org B framework', async () => {
    prisma.framework.findFirst.mockResolvedValue(null);

    await expect(
      service.create('org-a', 'user-a', {
        frameworkId: 'framework-b',
        name: 'Injected assessment',
      })
    ).rejects.toThrow(NotFoundException);
    expect(prisma.readinessAssessment.create).not.toHaveBeenCalled();
  });

  it('rejects a requirement outside the assessment framework', async () => {
    prisma.frameworkRequirement.findFirst.mockResolvedValue(null);

    await expect(
      service.updateRequirementStatus('assessment-a', 'requirement-b', 'org-a', 'user-a', {
        status: 'compliant',
      })
    ).rejects.toThrow(NotFoundException);
    expect(prisma.requirementStatus.upsert).not.toHaveBeenCalled();
  });

  it('rejects evidence from another organization before changing links', async () => {
    prisma.evidence.count.mockResolvedValue(0);

    await expect(
      service.updateRequirementStatus('assessment-a', 'requirement-a', 'org-a', 'user-a', {
        status: 'compliant',
        evidenceIds: ['evidence-b'],
      })
    ).rejects.toThrow(NotFoundException);
    expect(prisma.requirementStatusEvidence.deleteMany).not.toHaveBeenCalled();
  });

  it('rejects assigning an Org B user to an Org A gap', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.createGap('assessment-a', 'org-a', {
        requirementId: 'requirement-a',
        severity: 'high',
        description: 'Gap',
        recommendation: 'Fix it',
        assignedTo: 'user-b',
      })
    ).rejects.toThrow(NotFoundException);
    expect(prisma.gap.create).not.toHaveBeenCalled();
  });
});
