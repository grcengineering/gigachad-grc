import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * Request payload for POST /api/mappings/suggest.
 *
 * Exactly one of `requirementId` and `controlId` MUST be supplied; the
 * `@ValidateIf` decorators implement a discriminated XOR — each becomes
 * required when the other is absent, so a payload with neither field set
 * fails validation, and a payload with both fields set is normalized at the
 * service layer (defense-in-depth) but also rejected by the explicit XOR
 * check in the service.
 */
export class SuggestMappingsRequestDto {
  @ApiProperty({ description: 'Framework UUID that scopes the candidate catalog.' })
  @IsUUID()
  frameworkId: string;

  @ApiPropertyOptional({
    description:
      'Requirement UUID to map to candidate controls. Mutually exclusive with controlId.',
  })
  @ValidateIf((o: SuggestMappingsRequestDto) => !o.controlId)
  @IsUUID()
  requirementId?: string;

  @ApiPropertyOptional({
    description:
      'Control UUID to map to candidate requirements. Mutually exclusive with requirementId.',
  })
  @ValidateIf((o: SuggestMappingsRequestDto) => !o.requirementId)
  @IsUUID()
  controlId?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of suggestions to return (1-50, default 20).',
    minimum: 1,
    maximum: 50,
    default: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class MappingSuggestionDto {
  @ApiProperty()
  @IsUUID()
  candidateId: string;

  @ApiProperty()
  @IsString()
  candidateReference: string;

  @ApiProperty()
  @IsString()
  candidateTitle: string;

  @ApiProperty({ minimum: 0, maximum: 1 })
  @IsNumber()
  confidence: number;

  @ApiProperty({ description: 'Short rationale, ≤ 280 chars.' })
  @IsString()
  rationale: string;
}

export type MappingSuggestionDirection = 'requirement-to-controls' | 'control-to-requirements';

export class SuggestMappingsResponseDto {
  @ApiProperty({ enum: ['requirement-to-controls', 'control-to-requirements'] })
  direction: MappingSuggestionDirection;

  @ApiProperty({ type: [MappingSuggestionDto] })
  suggestions: MappingSuggestionDto[];

  @ApiProperty({
    description: 'True when the suggestions came from the heuristic demo fallback.',
  })
  isMockMode: boolean;

  @ApiPropertyOptional({
    description: 'Set when isMockMode is true; explains why the AI path was skipped.',
  })
  mockModeReason?: string;
}
