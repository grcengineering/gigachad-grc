import { JobSchedulerService } from './job-scheduler.service';

describe('JobSchedulerService job contracts', () => {
  function createService() {
    return new JobSchedulerService(
      {} as never,
      {} as never,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    );
  }

  it('fails removed search-index jobs instead of reporting simulated completion', async () => {
    const service = createService();

    await expect(
      (service as any).executeJob({ name: 'refresh-search-indexes', data: {} })
    ).rejects.toThrow('Unknown job type: refresh-search-indexes');
  });
});
