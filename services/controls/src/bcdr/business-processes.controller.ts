import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { BusinessProcessesService } from './business-processes.service';
import {
  CreateBusinessProcessDto,
  UpdateBusinessProcessDto,
  BusinessProcessFilterDto,
  AddProcessDependencyDto,
  LinkProcessAssetDto,
} from './dto/bcdr.dto';
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@ApiTags('bcdr/processes')
@ApiBearerAuth()
@Controller('api/bcdr/processes')
@UseGuards(DevAuthGuard)
export class BusinessProcessesController {
  constructor(private readonly processesService: BusinessProcessesService) {}

  @Get()
  @ApiOperation({ summary: 'List business processes' })
  @ApiResponse({ status: 200, description: 'List of business processes' })
  async findAll(@CurrentUser() user: UserContext, @Query() filters: BusinessProcessFilterDto) {
    return this.processesService.findAll(user.organizationId, filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get business process statistics' })
  async getStats(@CurrentUser() user: UserContext) {
    return this.processesService.getStats(user.organizationId);
  }

  @Get('dependency-graph')
  @ApiOperation({ summary: 'Get dependency graph data for visualization' })
  async getDependencyGraph(@CurrentUser() user: UserContext) {
    return this.processesService.getDependencyGraph(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get business process details' })
  @ApiParam({ name: 'id', description: 'Business process ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.processesService.findOne(id, user.organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a business process' })
  @ApiResponse({ status: 201, description: 'Business process created' })
  async create(@CurrentUser() user: UserContext, @Body() dto: CreateBusinessProcessDto) {
    return this.processesService.create(
      user.organizationId,
      user.userId,
      dto,
      user.email,
      user.name
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a business process' })
  @ApiParam({ name: 'id', description: 'Business process ID' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Body() dto: UpdateBusinessProcessDto
  ) {
    return this.processesService.update(
      id,
      user.organizationId,
      user.userId,
      dto,
      user.email,
      user.name
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a business process' })
  @ApiParam({ name: 'id', description: 'Business process ID' })
  async delete(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.processesService.delete(
      id,
      user.organizationId,
      user.userId,
      user.email,
      user.name
    );
  }

  @Post(':id/mark-reviewed')
  @ApiOperation({ summary: 'Mark process as reviewed' })
  @ApiParam({ name: 'id', description: 'Business process ID' })
  async markReviewed(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.processesService.markReviewed(id, user.organizationId, user.userId);
  }

  // Dependencies
  @Post(':id/dependencies')
  @ApiOperation({ summary: 'Add a dependency to a process' })
  @ApiParam({ name: 'id', description: 'Business process ID' })
  async addDependency(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Body() dto: AddProcessDependencyDto
  ) {
    return this.processesService.addDependency(id, user.organizationId, user.userId, dto);
  }

  @Delete(':id/dependencies/:dependencyId')
  @ApiOperation({ summary: 'Remove a dependency from a process' })
  @ApiParam({ name: 'id', description: 'Business process ID' })
  @ApiParam({ name: 'dependencyId', description: 'Dependency process ID' })
  async removeDependency(@Param('id') id: string, @Param('dependencyId') dependencyId: string) {
    return this.processesService.removeDependency(id, dependencyId);
  }

  // Assets
  @Post(':id/assets')
  @ApiOperation({ summary: 'Link an asset to a process' })
  @ApiParam({ name: 'id', description: 'Business process ID' })
  async linkAsset(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Body() dto: LinkProcessAssetDto
  ) {
    return this.processesService.linkAsset(id, user.organizationId, user.userId, dto);
  }

  @Delete(':id/assets/:assetId')
  @ApiOperation({ summary: 'Unlink an asset from a process' })
  @ApiParam({ name: 'id', description: 'Business process ID' })
  @ApiParam({ name: 'assetId', description: 'Asset ID' })
  async unlinkAsset(@Param('id') id: string, @Param('assetId') assetId: string) {
    return this.processesService.unlinkAsset(id, assetId);
  }

  // Risks
  @Post(':id/risks')
  @ApiOperation({ summary: 'Link a risk to a process' })
  @ApiParam({ name: 'id', description: 'Business process ID' })
  async linkRisk(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Body() body: { riskId: string; notes?: string }
  ) {
    return this.processesService.linkRisk(id, body.riskId, user.userId, body.notes);
  }

  @Delete(':id/risks/:riskId')
  @ApiOperation({ summary: 'Unlink a risk from a process' })
  @ApiParam({ name: 'id', description: 'Business process ID' })
  @ApiParam({ name: 'riskId', description: 'Risk ID' })
  async unlinkRisk(@Param('id') id: string, @Param('riskId') riskId: string) {
    return this.processesService.unlinkRisk(id, riskId);
  }
}
