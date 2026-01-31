import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { RemediationService, CreateRemediationPlanDto, CreateMilestoneDto, UpdateMilestoneDto } from './remediation.service';
import { DevAuthGuard } from '../auth/dev-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    organizationId: string;
  };
}

@ApiTags('Remediation Plans')
@ApiBearerAuth()
@UseGuards(DevAuthGuard)
@Controller('remediation')
export class RemediationController {
  constructor(private readonly remediationService: RemediationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a remediation plan' })
  createPlan(@Body() dto: CreateRemediationPlanDto, @Req() req: AuthenticatedRequest) {
    return this.remediationService.createPlan(req.user.organizationId, dto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List remediation plans' })
  findAllPlans(@Query('status') status: string, @Req() req: AuthenticatedRequest) {
    return this.remediationService.findAllPlans(req.user.organizationId, status);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get remediation statistics' })
  getStats(@Req() req: AuthenticatedRequest) {
    return this.remediationService.getStats(req.user.organizationId);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export POA&M' })
  async exportPOAM(@Query('format') format: 'json' | 'csv', @Req() req: AuthenticatedRequest, @Res() res: Response) {
    const data = await this.remediationService.exportPOAM(req.user.organizationId, format || 'json');
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=poam-export.csv');
      return res.send(data);
    }
    
    return res.json(data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a remediation plan' })
  findOnePlan(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.remediationService.findOnePlan(id, req.user.organizationId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a remediation plan' })
  updatePlan(@Param('id') id: string, @Body() dto: Partial<CreateRemediationPlanDto>, @Req() req: AuthenticatedRequest) {
    return this.remediationService.updatePlan(id, req.user.organizationId, dto);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete a remediation plan' })
  completePlan(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.remediationService.completePlan(id, req.user.organizationId, req.user.userId);
  }

  @Post(':planId/milestones')
  @ApiOperation({ summary: 'Add a milestone' })
  addMilestone(@Param('planId') planId: string, @Body() dto: CreateMilestoneDto, @Req() req: AuthenticatedRequest) {
    return this.remediationService.addMilestone(planId, req.user.organizationId, dto);
  }

  @Put('milestones/:id')
  @ApiOperation({ summary: 'Update a milestone' })
  updateMilestone(@Param('id') id: string, @Body() dto: UpdateMilestoneDto, @Req() req: AuthenticatedRequest) {
    return this.remediationService.updateMilestone(id, req.user.organizationId, dto);
  }

  @Delete('milestones/:id')
  @ApiOperation({ summary: 'Delete a milestone' })
  deleteMilestone(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.remediationService.deleteMilestone(id, req.user.organizationId);
  }
}

