import { Module, Provider, Type } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma.health';
import { RedisHealthIndicator } from './redis.health';

export const PRISMA_HEALTH_INITIALIZER = Symbol('PRISMA_HEALTH_INITIALIZER');

export function createPrismaHealthProvider(
  prismaToken: string | symbol | Type<unknown>
): Provider {
  return {
    provide: PRISMA_HEALTH_INITIALIZER,
    useFactory: (indicator: PrismaHealthIndicator, prisma: object) => {
      indicator.setPrismaClient(prisma as Parameters<PrismaHealthIndicator['setPrismaClient']>[0]);
      return true;
    },
    inject: [PrismaHealthIndicator, prismaToken],
  };
}

@Module({
  controllers: [HealthController],
  providers: [PrismaHealthIndicator, RedisHealthIndicator],
  exports: [PrismaHealthIndicator, RedisHealthIndicator],
})
export class HealthModule {
}
