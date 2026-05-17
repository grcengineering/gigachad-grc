import { Module } from '@nestjs/common';
import { MappingsController } from './mappings.controller';
import { MappingsService } from './mappings.service';
import { MappingHistoryService } from './mapping-history.service';

@Module({
  controllers: [MappingsController],
  providers: [MappingsService, MappingHistoryService],
  exports: [MappingsService, MappingHistoryService],
})
export class MappingsModule {}
