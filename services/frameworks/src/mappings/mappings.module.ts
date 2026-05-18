import { Module } from '@nestjs/common';
import { MappingsController } from './mappings.controller';
import { MappingsService } from './mappings.service';
import { MappingHistoryService } from './mapping-history.service';
import { MappingSuggestionsController } from './ai/mapping-suggestions.controller';
import { MappingSuggestionsService } from './ai/mapping-suggestions.service';

@Module({
  controllers: [MappingsController, MappingSuggestionsController],
  providers: [MappingsService, MappingHistoryService, MappingSuggestionsService],
  exports: [MappingsService, MappingHistoryService, MappingSuggestionsService],
})
export class MappingsModule {}
