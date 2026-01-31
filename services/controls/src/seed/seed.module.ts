 
import { Module } from '@nestjs/common';
import { SeedController } from './seed.controller';
import { SeedDataService } from './seed.service';
import { ResetDataService } from './reset.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SeedController],
  providers: [SeedDataService, ResetDataService],
  exports: [SeedDataService, ResetDataService],
})
export class SeedModule {}




