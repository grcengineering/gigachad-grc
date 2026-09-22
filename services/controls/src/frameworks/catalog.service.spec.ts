import { FrameworkCatalogService } from './catalog.service';

describe('FrameworkCatalogService', () => {
  const prisma = {
    framework: {
      findMany: jest.fn(),
    },
  };

  const service = new FrameworkCatalogService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('returns the bundled catalog without requiring database seed data', () => {
    const catalog = service.listAvailableFrameworks();

    expect(catalog.length).toBeGreaterThanOrEqual(10);
    expect(catalog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'soc2-type2' }),
        expect.objectContaining({ id: 'iso27001-2022' }),
      ])
    );
  });

  it('adds tenant activation status to every bundled framework', async () => {
    prisma.framework.findMany.mockResolvedValue([{ id: 'framework-1', type: 'soc2-type2' }]);

    const catalog = await service.getCatalogStatus('org-1');
    const soc2 = catalog.find((framework) => framework.id === 'soc2-type2');
    const iso = catalog.find((framework) => framework.id === 'iso27001-2022');

    expect(prisma.framework.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: 'org-1' }) })
    );
    expect(soc2).toMatchObject({
      isActivated: true,
      activatedFrameworkId: 'framework-1',
    });
    expect(iso?.isActivated).toBe(false);
  });
});
