import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { MappingsService } from './mappings.service';
import { CreateMappingDto, BulkCreateMappingsDto } from './dto/mapping.dto';
import {
  Roles,
  RolesGuard,
  CurrentUser,
  UserContext,
} from '@gigachad-grc/shared';
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
    @Query('controlId') controlId?: string,
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

  @Post()
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Create a control-to-requirement mapping' })
  async create(
    @CurrentUser() user: UserContext,
    @Body() dto: CreateMappingDto,
  ) {
    return this.mappingsService.create(user.userId, dto);
  }

  @Post('bulk')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Bulk create mappings' })
  async bulkCreate(
    @CurrentUser() user: UserContext,
    @Body() dto: BulkCreateMappingsDto,
  ) {
    return this.mappingsService.bulkCreate(user.userId, dto.mappings);
  }

  @Delete(':id')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Delete a mapping' })
  @ApiParam({ name: 'id', description: 'Mapping ID' })
  async delete(@Param('id') id: string, @CurrentUser() user: UserContext) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.mappingsService.delete(id, user.organizationId);
  }
}

