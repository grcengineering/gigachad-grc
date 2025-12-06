import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateKnowledgeBaseDto } from './create-knowledge-base.dto';

export class BulkCreateKnowledgeBaseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateKnowledgeBaseDto)
  entries: CreateKnowledgeBaseDto[];
}
