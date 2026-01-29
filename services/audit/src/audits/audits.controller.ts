import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuditsService } from './audits.service';
import { CreateAuditDto } from './dto/create-audit.dto';
import { UpdateAuditDto } from './dto/update-audit.dto';
import { DevAuthGuard } from '../auth/dev-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    organizationId: string;
    email: string;
    role: string;
  };
}

@ApiTags('Audits')
@ApiBearerAuth()
@Controller('api/audits')
@UseGuards(DevAuthGuard)
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new audit' })
  @ApiResponse({ status: 201, description: 'Audit created successfully' })
  create(@Body() createAuditDto: CreateAuditDto, @Req() req: AuthenticatedRequest) {
    // Inject organizationId from authenticated user context
    const dtoWithOrg = {
      ...createAuditDto,
      organizationId: req.user.organizationId,
    };
    return this.auditsService.create(dtoWithOrg, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all audits' })
  @ApiResponse({ status: 200, description: 'Returns all audits' })
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('auditType') auditType?: string,
    @Query('isExternal') isExternal?: string,
  ) {
    const { organizationId } = req.user;
    return this.auditsService.findAll(organizationId, {
      status,
      auditType,
      // Only set isExternal if the query param is explicitly provided
      isExternal: isExternal !== undefined ? isExternal === 'true' : undefined,
    });
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get audit dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Returns dashboard stats' })
  getDashboard(@Req() req: AuthenticatedRequest) {
    const { organizationId } = req.user;
    return this.auditsService.getDashboardStats(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit by ID' })
  @ApiResponse({ status: 200, description: 'Returns the audit' })
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const { organizationId } = req.user;
    return this.auditsService.findOne(id, organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an audit' })
  @ApiResponse({ status: 200, description: 'Audit updated successfully' })
  update(
    @Param('id') id: string,
    @Body() updateAuditDto: UpdateAuditDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { organizationId } = req.user;
    return this.auditsService.update(id, organizationId, updateAuditDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an audit' })
  @ApiResponse({ status: 200, description: 'Audit deleted successfully' })
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const { organizationId } = req.user;
    return this.auditsService.delete(id, organizationId);
  }

  @Post(':id/portal/enable')
  @ApiOperation({ summary: 'Enable auditor portal access' })
  @ApiResponse({ status: 200, description: 'Portal enabled successfully' })
  enablePortal(@Param('id') id: string, @Req() req: AuthenticatedRequest, @Query('days') days?: string) {
    const { organizationId } = req.user;
    const expiresInDays = days ? parseInt(days) : 90;
    return this.auditsService.enablePortal(id, organizationId, expiresInDays);
  }

  @Post(':id/portal/disable')
  @ApiOperation({ summary: 'Disable auditor portal access' })
  @ApiResponse({ status: 200, description: 'Portal disabled successfully' })
  disablePortal(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const { organizationId } = req.user;
    return this.auditsService.disablePortal(id, organizationId);
  }
}
