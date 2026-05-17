import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MappingsService } from './mappings.service';
import { CreateMappingDto, BulkCreateMappingsDto, UpdateMappingDto } from './dto/mapping.dto';
import { Roles, RolesGuard, CurrentUser, UserContext } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@ApiTags('mappings')
@ApiBearerAuth()
@Controller('api/mappings')
@UseGuards(DevAuthGuard, RolesGuard)
export class MappingsController {
  constructor(private readonly mappingsService: MappingsService) {}

  @Get()
  @ApiOperation({ summary: 'List control-to-requirement mappings' })
  async findAll(
    @Query('frameworkId') frameworkId?: string,
    @Query('controlId') controlId?: string
  ) {
    return this.mappingsService.findAll(frameworkId, controlId);
  }

  @Get('by-control/:controlId')
  @ApiOperation({ summary: 'Get mappings for a control' })
  @ApiParam({ name: 'controlId', description: 'Control ID' })
  async findByControl(@Param('controlId') controlId: string) {
    return this.mappingsService.findByControl(controlId);
  }

  @Get('by-requirement/:requirementId')
  @ApiOperation({ summary: 'Get mappings for a requirement' })
  @ApiParam({ name: 'requirementId', description: 'Requirement ID' })
  async findByRequirement(@Param('requirementId') requirementId: string) {
    return this.mappingsService.findByRequirement(requirementId);
  }

  @Get('control-coverage')
  @ApiOperation({ summary: 'Get control coverage statistics' })
  async getControlCoverage(@CurrentUser() user: UserContext) {
    return this.mappingsService.getControlCoverage(user.organizationId);
  }

  @Get('requirement-coverage/:frameworkId')
  @ApiOperation({ summary: 'Get requirement coverage for a framework' })
  @ApiParam({ name: 'frameworkId', description: 'Framework ID' })
  async getRequirementCoverage(@Param('frameworkId') frameworkId: string) {
    return this.mappingsService.getRequirementCoverage(frameworkId);
  }

  @Get('gaps')
  @Roles('admin', 'compliance_manager', 'auditor')
  @ApiOperation({ summary: 'List mapping gaps (requirements/controls without coverage)' })
  @ApiQuery({
    name: 'frameworkId',
    required: false,
    description: 'Filter by framework (ignored for unused-controls)',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['no-controls', 'supporting-only', 'unused-controls'],
    description: 'Gap type filter; omit to return all three concatenated',
  })
  async findGaps(
    @CurrentUser() user: UserContext,
    @Query('frameworkId') frameworkId?: string,
    @Query('type') type?: 'no-controls' | 'supporting-only' | 'unused-controls'
  ) {
    return this.mappingsService.findGaps(user.organizationId, frameworkId, type);
  }

  @Post()
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Create a control-to-requirement mapping' })
  async create(@CurrentUser() user: UserContext, @Body() dto: CreateMappingDto) {
    return this.mappingsService.create(user.userId, user.organizationId, dto);
  }

  @Post('bulk')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Bulk create mappings' })
  async bulkCreate(@CurrentUser() user: UserContext, @Body() dto: BulkCreateMappingsDto) {
    return this.mappingsService.bulkCreate(user.userId, user.organizationId, dto.mappings);
  }

  @Patch(':id')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Update a control-to-requirement mapping' })
  @ApiParam({ name: 'id', description: 'Mapping ID' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMappingDto,
    @CurrentUser() user: UserContext
  ) {
    return this.mappingsService.update(id, dto, user.userId, user.organizationId);
  }

  @Delete(':id')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Delete a mapping' })
  @ApiParam({ name: 'id', description: 'Mapping ID' })
  async delete(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.mappingsService.delete(id, user.userId, user.organizationId);
  }
}
