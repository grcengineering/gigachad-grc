import { Controller, Get, Post, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AnalyticsService } from './analytics.service';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { Roles, RolesGuard } from '@gigachad-grc/shared';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    organizationId: string;
  };
}

@ApiTags('Audit Analytics')
@ApiBearerAuth()
@UseGuards(DevAuthGuard, RolesGuard)
@Roles('admin', 'auditor', 'compliance_manager')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get audit dashboard metrics' })
  getDashboard(@Req() req: AuthenticatedRequest) {
    return this.analyticsService.getDashboard(req.user.organizationId);
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get audit trends over time' })
  getTrends(@Query('period') period: 'monthly' | 'quarterly' | 'yearly', @Req() req: AuthenticatedRequest) {
    return this.analyticsService.getTrends(req.user.organizationId, period);
  }

  @Get('findings')
  @ApiOperation({ summary: 'Get finding analytics' })
  getFindingAnalytics(@Req() req: AuthenticatedRequest) {
    return this.analyticsService.getFindingAnalytics(req.user.organizationId);
  }

  @Get('coverage')
  @ApiOperation({ summary: 'Get test coverage metrics' })
  getCoverageMetrics(@Query('auditId') auditId: string, @Req() req: AuthenticatedRequest) {
    return this.analyticsService.getCoverageMetrics(req.user.organizationId, auditId);
  }

  @Post('snapshot')
  @ApiOperation({ summary: 'Create analytics snapshot' })
  createSnapshot(@Query('type') type: string, @Req() req: AuthenticatedRequest) {
    return this.analyticsService.createSnapshot(req.user.organizationId, type || 'daily');
  }
}

