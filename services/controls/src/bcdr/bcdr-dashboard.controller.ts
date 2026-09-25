import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BCDRDashboardService } from './bcdr-dashboard.service';
import { BusinessProcessesService } from './business-processes.service';
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@ApiTags('bcdr/dashboard')
@ApiBearerAuth()
@Controller('api/bcdr/dashboard')
@UseGuards(DevAuthGuard)
export class BCDRDashboardController {
  constructor(
    private readonly dashboardService: BCDRDashboardService,
    private readonly businessProcessesService: BusinessProcessesService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get BC/DR dashboard summary' })
  @ApiResponse({ status: 200, description: 'Dashboard summary data' })
  async getSummary(@CurrentUser() user: UserContext) {
    return this.dashboardService.getSummary(user.organizationId);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get BC/DR readiness metrics and score' })
  async getMetrics(@CurrentUser() user: UserContext) {
    return this.dashboardService.getMetrics(user.organizationId);
  }

  @Get('vendor-gaps')
  @ApiOperation({ summary: 'Get vendor recovery objective gaps' })
  async getVendorGaps(@CurrentUser() user: UserContext): Promise<unknown[]> {
    return this.businessProcessesService.getVendorGaps(user.organizationId);
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue items' })
  async getOverdueItems(@CurrentUser() user: UserContext) {
    return this.dashboardService.getOverdueItems(user.organizationId);
  }

  @Get('criticality')
  @ApiOperation({ summary: 'Get criticality distribution' })
  async getCriticalityDistribution(@CurrentUser() user: UserContext) {
    return this.dashboardService.getCriticalityDistribution(user.organizationId);
  }

  @Get('test-history')
  @ApiOperation({ summary: 'Get DR test history' })
  @ApiQuery({ name: 'months', required: false, type: Number })
  async getTestHistory(@CurrentUser() user: UserContext, @Query('months') months?: number) {
    return this.dashboardService.getTestHistory(user.organizationId, months || 12);
  }

  @Get('rto-analysis')
  @ApiOperation({ summary: 'Get RTO/RPO analysis' })
  async getRTORPOAnalysis(@CurrentUser() user: UserContext) {
    return this.dashboardService.getRTORPOAnalysis(user.organizationId);
  }

  @Get('plan-coverage')
  @ApiOperation({ summary: 'Get plan coverage analysis' })
  async getPlanCoverage(@CurrentUser() user: UserContext) {
    return this.dashboardService.getPlanCoverage(user.organizationId);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get recent BC/DR activity' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecentActivity(@CurrentUser() user: UserContext, @Query('limit') limit?: number) {
    return this.dashboardService.getRecentActivity(user.organizationId, limit || 20);
  }
}
