import { NotFoundException } from '@nestjs/common';
import { ExerciseTemplatesService } from './exercise-templates.service';

describe('ExerciseTemplatesService tenant integrity', () => {
  const prisma = {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  };
  const audit = { log: jest.fn() };
  const service = new ExerciseTemplatesService(prisma as never, audit as never);

  beforeEach(() => jest.clearAllMocks());

  it('rejects foreign template detail reads', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    await expect(service.findOne('template-b', 'org-a')).rejects.toThrow(NotFoundException);
    expect(prisma.$queryRaw.mock.calls[0]).toContain('org-a');
  });

  it('rejects cloning a foreign template before inserting a copy', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    await expect(service.cloneToOrganization('template-b', 'org-a', 'user-a')).rejects.toThrow(
      NotFoundException
    );
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });
});
