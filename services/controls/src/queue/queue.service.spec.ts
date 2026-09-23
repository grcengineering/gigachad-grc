import { ServiceUnavailableException } from '@nestjs/common';
import { QUEUE_NAMES, QueueService } from './queue.service';

describe('QueueService fail-closed behavior', () => {
  it('rejects job submission when Redis is unavailable', async () => {
    const service = new QueueService({
      redisUrl: 'redis://127.0.0.1:6379',
      defaultJobOptions: {},
    });

    await expect(
      service.addJob(QUEUE_NAMES.NOTIFICATIONS, 'send-notification', { notificationId: 'test' })
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
