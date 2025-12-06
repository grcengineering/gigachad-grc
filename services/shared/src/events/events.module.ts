import { Module, Global, OnModuleDestroy } from '@nestjs/common';
import { RedisEventBus, closeEventBus } from './redis-event-bus';

export const EVENT_BUS = 'EVENT_BUS';

@Global()
@Module({
  providers: [
    {
      provide: EVENT_BUS,
      useFactory: () => {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        return new RedisEventBus(redisUrl);
      },
    },
  ],
  exports: [EVENT_BUS],
})
export class EventsModule implements OnModuleDestroy {
  async onModuleDestroy() {
    await closeEventBus();
  }
}



