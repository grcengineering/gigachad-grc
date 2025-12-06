import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuditService } from './audit.service';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { AuditLogFilterDto } from './dto/audit.dto';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    organizationId: string;
    email: string;
    role: string;
  };
}

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('api/audit')
@UseGuards(DevAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs with filters' })
  @ApiResponse({ status: 200, description: 'Returns paginated audit logs' })
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query() filters: AuditLogFilterDto,
  ) {
    const { organizationId } = req.user;
    return this.auditService.findAll(organizationId, filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get audit log statistics' })
  @ApiResponse({ status: 200, description: 'Returns audit statistics' })
  async getStats(
    @Req() req: AuthenticatedRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { organizationId } = req.user;
    return this.auditService.getStats(organizationId, startDate, endDate);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export audit logs as CSV' })
  @ApiResponse({ status: 200, description: 'Returns CSV file' })
  async exportLogs(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
    @Query() filters: AuditLogFilterDto,
  ) {
    const { organizationId } = req.user;
    const logs = await this.auditService.exportLogs(organizationId, filters);

    if (logs.length === 0) {
      res.status(HttpStatus.OK).json({ message: 'No logs to export' });
      return;
    }

    // Generate CSV
    const headers = Object.keys(logs[0]);
    const csvRows = [
      headers.join(','),
      ...logs.map((log) =>
        headers
          .map((h) => {
            const value = log[h as keyof typeof log];
            // Escape quotes and wrap in quotes if contains comma or newline
            if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(','),
      ),
    ];
    const csv = csvRows.join('\n');

    const filename = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(csv);
  }

  @Get('filters')
  @ApiOperation({ summary: 'Get available filter options' })
  @ApiResponse({ status: 200, description: 'Returns filter options' })
  async getFilterOptions(@Req() req: AuthenticatedRequest) {
    const { organizationId } = req.user;
    return this.auditService.getFilterOptions(organizationId);
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Get audit logs for a specific entity' })
  @ApiResponse({ status: 200, description: 'Returns entity audit history' })
  async findByEntity(
    @Req() req: AuthenticatedRequest,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('limit') limit?: number,
  ) {
    const { organizationId } = req.user;
    return this.auditService.findByEntity(
      organizationId,
      entityType,
      entityId,
      limit || 50,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single audit log entry' })
  @ApiResponse({ status: 200, description: 'Returns the audit log entry' })
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const { organizationId } = req.user;
    return this.auditService.findOne(id, organizationId);
  }
}

