import { Module } from '@nestjs/common';
import { CollectorsController } from './collectors.controller';
import { CollectorsService } from './collectors.service';
import { CollectorsScheduler } from './collectors.scheduler';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CollectorsController],
  providers: [CollectorsService, CollectorsScheduler],
  exports: [CollectorsService],
})
export class CollectorsModule {}

