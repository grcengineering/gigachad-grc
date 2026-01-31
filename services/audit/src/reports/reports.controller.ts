import { Controller, Get, Post, Query, Param, Body, UseGuards, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ReportsService, ReportOptions } from './reports.service';
import { DevAuthGuard } from '../auth/dev-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    organizationId: string;
  };
}

@ApiTags('Audit Reports')
@ApiBearerAuth()
@UseGuards(DevAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('types')
  @ApiOperation({ summary: 'List available report types' })
  listReportTypes() {
    return this.reportsService.listReportTypes();
  }

  @Post(':auditId')
  @ApiOperation({ summary: 'Generate an audit report' })
  async generateReport(
    @Param('auditId') auditId: string,
    @Query('type') type: string,
    @Query('format') format: string,
    @Body() options: ReportOptions,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const report = await this.reportsService.generateAuditReport(
      auditId,
      req.user.organizationId,
      type || 'full',
      options,
    );

    if (format === 'download') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=audit-report-${auditId}.json`);
      return res.send(JSON.stringify(report, null, 2));
    }

    return res.json(report);
  }

  @Get(':auditId/executive')
  @ApiOperation({ summary: 'Generate executive summary' })
  async getExecutiveSummary(@Param('auditId') auditId: string, @Req() req: AuthenticatedRequest) {
    return this.reportsService.generateAuditReport(auditId, req.user.organizationId, 'executive');
  }

  @Get(':auditId/management-letter')
  @ApiOperation({ summary: 'Generate management letter' })
  async getManagementLetter(@Param('auditId') auditId: string, @Req() req: AuthenticatedRequest) {
    return this.reportsService.generateAuditReport(auditId, req.user.organizationId, 'management_letter');
  }

  @Get(':auditId/findings')
  @ApiOperation({ summary: 'Generate findings summary' })
  async getFindingsSummary(@Param('auditId') auditId: string, @Req() req: AuthenticatedRequest) {
    return this.reportsService.generateAuditReport(auditId, req.user.organizationId, 'findings_summary');
  }
}

