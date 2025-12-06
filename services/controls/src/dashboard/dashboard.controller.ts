import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import {
  CurrentUser,
  UserContext,
} from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('api/dashboard')
@UseGuards(DevAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get dashboard summary' })
  @ApiResponse({ status: 200, description: 'Returns dashboard metrics' })
  async getSummary(@CurrentUser() user: UserContext) {
    return this.dashboardService.getSummary(user.organizationId);
  }

  @Get('compliance-score')
  @ApiOperation({ summary: 'Get compliance score' })
  async getComplianceScore(@CurrentUser() user: UserContext) {
    return this.dashboardService.calculateComplianceScore(user.organizationId);
  }

  @Get('compliance-trend')
  @ApiOperation({ summary: 'Get compliance score trend' })
  async getComplianceTrend(
    @CurrentUser() user: UserContext,
    @Query('days') days?: number,
  ) {
    return this.dashboardService.getComplianceTrend(
      user.organizationId,
      days || 30,
    );
  }

  @Get('controls-stats')
  @ApiOperation({ summary: 'Get control statistics' })
  async getControlStats(@CurrentUser() user: UserContext) {
    return this.dashboardService.getControlStats(user.organizationId);
  }

  @Get('evidence-stats')
  @ApiOperation({ summary: 'Get evidence statistics' })
  async getEvidenceStats(@CurrentUser() user: UserContext) {
    return this.dashboardService.getEvidenceStats(user.organizationId);
  }

  @Get('upcoming-tests')
  @ApiOperation({ summary: 'Get upcoming control tests' })
  async getUpcomingTests(@CurrentUser() user: UserContext) {
    return this.dashboardService.getUpcomingTests(user.organizationId);
  }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Get recent activity' })
  async getRecentActivity(@CurrentUser() user: UserContext) {
    return this.dashboardService.getRecentActivity(user.organizationId);
  }

  @Get('controls-by-owner')
  @ApiOperation({ summary: 'Get controls grouped by owner' })
  async getControlsByOwner(@CurrentUser() user: UserContext) {
    return this.dashboardService.getControlsByOwner(user.organizationId);
  }
}

