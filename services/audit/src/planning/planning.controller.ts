import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { PlanningService, CreatePlanEntryDto, UpdatePlanEntryDto } from './planning.service';
import { DevAuthGuard } from '../auth/dev-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    organizationId: string;
  };
}

@ApiTags('Audit Planning')
@ApiBearerAuth()
@UseGuards(DevAuthGuard)
@Controller('planning')
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  @Post()
  @ApiOperation({ summary: 'Create a plan entry' })
  create(@Body() dto: CreatePlanEntryDto, @Req() req: AuthenticatedRequest) {
    return this.planningService.create(req.user.organizationId, dto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List plan entries' })
  findAll(@Query('year') year: string, @Query('status') status: string, @Req() req: AuthenticatedRequest) {
    return this.planningService.findAll(req.user.organizationId, year ? parseInt(year) : undefined, status);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Get calendar view' })
  getCalendarView(
    @Query('startYear') startYear: string,
    @Query('endYear') endYear: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const currentYear = new Date().getFullYear();
    return this.planningService.getCalendarView(
      req.user.organizationId,
      startYear ? parseInt(startYear) : currentYear,
      endYear ? parseInt(endYear) : currentYear + 2,
    );
  }

  @Get('capacity')
  @ApiOperation({ summary: 'Get capacity analysis' })
  getCapacityAnalysis(@Query('year') year: string, @Req() req: AuthenticatedRequest) {
    return this.planningService.getCapacityAnalysis(
      req.user.organizationId,
      year ? parseInt(year) : new Date().getFullYear(),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a plan entry' })
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.planningService.findOne(id, req.user.organizationId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a plan entry' })
  update(@Param('id') id: string, @Body() dto: UpdatePlanEntryDto, @Req() req: AuthenticatedRequest) {
    return this.planningService.update(id, req.user.organizationId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a plan entry' })
  delete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.planningService.delete(id, req.user.organizationId);
  }

  @Post(':id/convert-to-audit')
  @ApiOperation({ summary: 'Convert plan entry to audit' })
  convertToAudit(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.planningService.convertToAudit(id, req.user.organizationId, req.user.userId);
  }
}

