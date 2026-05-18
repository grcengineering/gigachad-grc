import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, DevAuthGuard, Roles, RolesGuard, UserContext } from '@gigachad-grc/shared';
import { MappingSuggestionsService } from './mapping-suggestions.service';
import {
  SuggestMappingsRequestDto,
  SuggestMappingsResponseDto,
} from './dto/mapping-suggestion.dto';

@ApiTags('mappings')
@ApiBearerAuth()
@Controller('api/mappings')
@UseGuards(DevAuthGuard, RolesGuard)
export class MappingSuggestionsController {
  constructor(private readonly service: MappingSuggestionsService) {}

  @Post('suggest')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'compliance_manager')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'AI mapping suggestions (requirement → controls or inverse)',
  })
  async suggest(
    @Body() dto: SuggestMappingsRequestDto,
    @CurrentUser() user: UserContext
  ): Promise<SuggestMappingsResponseDto> {
    return this.service.suggest(dto, user.userId, user.organizationId);
  }
}
