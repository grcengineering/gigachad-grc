import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { RunbooksService } from './runbooks.service';
import {
  CreateRunbookDto,
  UpdateRunbookDto,
  CreateRunbookStepDto,
  RunbookStatus,
} from './dto/bcdr.dto';
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@ApiTags('bcdr/runbooks')
@ApiBearerAuth()
@Controller('api/bcdr/runbooks')
@UseGuards(DevAuthGuard)
export class RunbooksController {
  constructor(private readonly runbooksService: RunbooksService) {}

  @Get()
  @ApiOperation({ summary: 'List runbooks' })
  @ApiResponse({ status: 200, description: 'List of runbooks' })
  async findAll(
    @CurrentUser() user: UserContext,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: RunbookStatus,
    @Query('processId') processId?: string
  ) {
    return this.runbooksService.findAll(user.organizationId, {
      search,
      category,
      status,
      processId,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get runbook statistics' })
  async getStats(@CurrentUser() user: UserContext) {
    return this.runbooksService.getStats(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get runbook details' })
  @ApiParam({ name: 'id', description: 'Runbook ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.runbooksService.findOne(id, user.organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a runbook' })
  @ApiResponse({ status: 201, description: 'Runbook created' })
  async create(@CurrentUser() user: UserContext, @Body() dto: CreateRunbookDto) {
    return this.runbooksService.create(
      user.organizationId,
      user.userId,
      dto,
      user.email,
      user.name
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a runbook' })
  @ApiParam({ name: 'id', description: 'Runbook ID' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Body() dto: UpdateRunbookDto
  ) {
    return this.runbooksService.update(
      id,
      user.organizationId,
      user.userId,
      dto,
      user.email,
      user.name
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a runbook' })
  @ApiParam({ name: 'id', description: 'Runbook ID' })
  async delete(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.runbooksService.delete(id, user.organizationId, user.userId, user.email, user.name);
  }

  // Steps
  @Post(':id/steps')
  @ApiOperation({ summary: 'Add a step to a runbook' })
  @ApiParam({ name: 'id', description: 'Runbook ID' })
  async addStep(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Body() dto: CreateRunbookStepDto
  ) {
    return this.runbooksService.addStep(id, user.userId, dto);
  }

  @Put(':id/steps/:stepNumber')
  @ApiOperation({ summary: 'Update a runbook step' })
  @ApiParam({ name: 'id', description: 'Runbook ID' })
  @ApiParam({ name: 'stepNumber', description: 'Step number' })
  async updateStep(
    @Param('id') id: string,
    @Param('stepNumber') stepNumber: number,
    @Body() updates: Partial<CreateRunbookStepDto>
  ) {
    return this.runbooksService.updateStep(id, stepNumber, updates);
  }

  @Delete(':id/steps/:stepNumber')
  @ApiOperation({ summary: 'Delete a runbook step' })
  @ApiParam({ name: 'id', description: 'Runbook ID' })
  @ApiParam({ name: 'stepNumber', description: 'Step number' })
  async deleteStep(@Param('id') id: string, @Param('stepNumber') stepNumber: number) {
    return this.runbooksService.deleteStep(id, stepNumber);
  }

  @Put(':id/steps/reorder')
  @ApiOperation({ summary: 'Reorder runbook steps' })
  @ApiParam({ name: 'id', description: 'Runbook ID' })
  async reorderSteps(@Param('id') id: string, @Body() body: { stepIds: string[] }) {
    return this.runbooksService.reorderSteps(id, body.stepIds);
  }
}
