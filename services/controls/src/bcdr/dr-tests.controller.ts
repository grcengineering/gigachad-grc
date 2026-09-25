import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { DRTestsService } from './dr-tests.service';
import {
  CreateDRTestDto,
  UpdateDRTestDto,
  DRTestFilterDto,
  RecordTestResultDto,
  CreateTestFindingDto,
} from './dto/bcdr.dto';
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@ApiTags('bcdr/tests')
@ApiBearerAuth()
@Controller('api/bcdr/tests')
@UseGuards(DevAuthGuard)
export class DRTestsController {
  constructor(private readonly testsService: DRTestsService) {}

  @Get()
  @ApiOperation({ summary: 'List DR tests' })
  @ApiResponse({ status: 200, description: 'List of DR tests' })
  async findAll(@CurrentUser() user: UserContext, @Query() filters: DRTestFilterDto) {
    return this.testsService.findAll(user.organizationId, filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get DR test statistics' })
  async getStats(@CurrentUser() user: UserContext) {
    return this.testsService.getStats(user.organizationId);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming DR tests' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getUpcoming(@CurrentUser() user: UserContext, @Query('days') days?: number) {
    return this.testsService.getUpcomingTests(user.organizationId, days || 30);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get DR test details' })
  @ApiParam({ name: 'id', description: 'Test ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.testsService.findOne(id, user.organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a DR test' })
  @ApiResponse({ status: 201, description: 'Test created' })
  async create(@CurrentUser() user: UserContext, @Body() dto: CreateDRTestDto) {
    return this.testsService.create(user.organizationId, user.userId, dto, user.email, user.name);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a DR test' })
  @ApiParam({ name: 'id', description: 'Test ID' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Body() dto: UpdateDRTestDto
  ) {
    return this.testsService.update(
      id,
      user.organizationId,
      user.userId,
      dto,
      user.email,
      user.name
    );
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start a DR test' })
  @ApiParam({ name: 'id', description: 'Test ID' })
  async startTest(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.testsService.startTest(id, user.organizationId, user.userId);
  }

  @Post(':id/results')
  @ApiOperation({ summary: 'Record DR test results' })
  @ApiParam({ name: 'id', description: 'Test ID' })
  async recordResults(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Body() dto: RecordTestResultDto
  ) {
    return this.testsService.recordResults(
      id,
      user.organizationId,
      user.userId,
      dto,
      user.email,
      user.name
    );
  }

  @Post(':id/findings')
  @ApiOperation({ summary: 'Add a finding to a DR test' })
  @ApiParam({ name: 'id', description: 'Test ID' })
  async addFinding(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Body() dto: CreateTestFindingDto
  ) {
    return this.testsService.addFinding(id, user.organizationId, user.userId, dto);
  }

  @Put(':id/findings/:findingId')
  @ApiOperation({ summary: 'Update a DR test finding' })
  @ApiParam({ name: 'id', description: 'Test ID' })
  @ApiParam({ name: 'findingId', description: 'Finding ID' })
  async updateFinding(
    @Param('id') id: string,
    @Param('findingId') findingId: string,
    @CurrentUser() user: UserContext,
    @Body()
    updates: Partial<CreateTestFindingDto> & {
      remediationStatus?: string;
      remediationNotes?: string;
    }
  ) {
    return this.testsService.updateFinding(id, findingId, user.userId, updates);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a DR test' })
  @ApiParam({ name: 'id', description: 'Test ID' })
  async delete(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.testsService.delete(id, user.organizationId, user.userId, user.email, user.name);
  }
}
