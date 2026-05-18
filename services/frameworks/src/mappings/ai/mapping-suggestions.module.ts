import { Module } from '@nestjs/common';
import { MappingSuggestionsController } from './mapping-suggestions.controller';
import { MappingSuggestionsService } from './mapping-suggestions.service';

@Module({
  controllers: [MappingSuggestionsController],
  providers: [MappingSuggestionsService],
  exports: [MappingSuggestionsService],
})
export class MappingSuggestionsModule {}
