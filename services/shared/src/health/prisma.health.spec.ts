import { PrismaHealthIndicator } from './prisma.health';

describe('PrismaHealthIndicator', () => {
  it('fails closed when no database client is registered', async () => {
    const indicator = new PrismaHealthIndicator();
    await expect(indicator.isHealthy('database')).resolves.toEqual({
      database: {
        status: 'down',
        message: 'Database health client is not configured',
      },
    });
  });

  it('executes a real query through the registered client', async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    const indicator = new PrismaHealthIndicator();
    indicator.setPrismaClient({ $queryRaw: queryRaw });

    await expect(indicator.isHealthy('database')).resolves.toEqual({
      database: { status: 'up' },
    });
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it('reports query failures as down', async () => {
    const indicator = new PrismaHealthIndicator();
    indicator.setPrismaClient({
      $queryRaw: jest.fn().mockRejectedValue(new Error('database unavailable')),
    });

    await expect(indicator.isHealthy('database')).resolves.toEqual({
      database: { status: 'down', message: 'database unavailable' },
    });
  });
});
