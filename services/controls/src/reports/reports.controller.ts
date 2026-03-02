import { Controller, Get, Post, Body, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService, GenerateReportDto } from './reports.service';
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Resource, Action } from '../permissions/dto/permission.dto';

/**
 * SECURITY: Sanitize filename for Content-Disposition header
 * Prevents header injection attacks via malicious filenames
 */
function sanitizeFilename(filename: string): string {
  return (
    filename
      // eslint-disable-next-line no-control-regex
      .replace(/[\r\n\u0000-\u001F\u007F]/g, '') // Remove control chars
      .replace(/["\\/]/g, '_')
  ); // Replace problematic chars
}

@ApiTags('reports')
@ApiBearerAuth()
@Controller('api/reports')
@UseGuards(DevAuthGuard, PermissionGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('types')
  @ApiOperation({ summary: 'Get available report types' })
  @ApiResponse({ status: 200, description: 'List of available report types' })
  @RequirePermission(Resource.REPORTS, Action.READ)
  getReportTypes() {
    return this.reportsService.getReportTypes();
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate a compliance report' })
  @ApiResponse({ status: 200, description: 'PDF report generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid report parameters' })
  @RequirePermission(Resource.REPORTS, Action.EXPORT)
  async generateReport(
    @CurrentUser() user: UserContext,
    @Body() dto: GenerateReportDto,
    @Res() res: Response
  ) {
    const { buffer, filename } = await this.reportsService.generateReport(
      user.organizationId,
      user.userId,
      dto,
      user.email,
      user.name
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${sanitizeFilename(filename)}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Get('generate/compliance-summary')
  @ApiOperation({ summary: 'Generate compliance summary report (quick access)' })
  @ApiQuery({ name: 'confidential', required: false, type: Boolean })
  @RequirePermission(Resource.REPORTS, Action.EXPORT)
  async generateComplianceSummary(
    @CurrentUser() user: UserContext,
    @Query('confidential') confidential: string,
    @Res() res: Response
  ) {
    const { buffer, filename } = await this.reportsService.generateReport(
      user.organizationId,
      user.userId,
      {
        reportType: 'compliance_summary',
        confidential: confidential !== 'false',
      },
      user.email,
      user.name
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${sanitizeFilename(filename)}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Get('generate/framework-assessment')
  @ApiOperation({ summary: 'Generate framework assessment report' })
  @ApiQuery({ name: 'frameworkId', required: true })
  @ApiQuery({ name: 'confidential', required: false, type: Boolean })
  @RequirePermission(Resource.REPORTS, Action.EXPORT)
  async generateFrameworkAssessment(
    @CurrentUser() user: UserContext,
    @Query('frameworkId') frameworkId: string,
    @Query('confidential') confidential: string,
    @Res() res: Response
  ) {
    const { buffer, filename } = await this.reportsService.generateReport(
      user.organizationId,
      user.userId,
      {
        reportType: 'framework_assessment',
        frameworkId,
        confidential: confidential !== 'false',
      },
      user.email,
      user.name
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${sanitizeFilename(filename)}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Get('generate/risk-register')
  @ApiOperation({ summary: 'Generate risk register report' })
  @ApiQuery({ name: 'confidential', required: false, type: Boolean })
  @RequirePermission(Resource.REPORTS, Action.EXPORT)
  async generateRiskRegister(
    @CurrentUser() user: UserContext,
    @Query('confidential') confidential: string,
    @Res() res: Response
  ) {
    const { buffer, filename } = await this.reportsService.generateReport(
      user.organizationId,
      user.userId,
      {
        reportType: 'risk_register',
        confidential: confidential !== 'false',
      },
      user.email,
      user.name
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${sanitizeFilename(filename)}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Get('generate/control-status')
  @ApiOperation({ summary: 'Generate control status report' })
  @ApiQuery({ name: 'confidential', required: false, type: Boolean })
  @RequirePermission(Resource.REPORTS, Action.EXPORT)
  async generateControlStatus(
    @CurrentUser() user: UserContext,
    @Query('confidential') confidential: string,
    @Res() res: Response
  ) {
    const { buffer, filename } = await this.reportsService.generateReport(
      user.organizationId,
      user.userId,
      {
        reportType: 'control_status',
        confidential: confidential !== 'false',
      },
      user.email,
      user.name
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${sanitizeFilename(filename)}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}
