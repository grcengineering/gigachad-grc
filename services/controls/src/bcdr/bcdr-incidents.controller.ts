import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { BCDRIncidentsService } from './bcdr-incidents.service';
import {
  DeclareIncidentDto,
  UpdateIncidentStatusDto,
  AddTimelineEntryDto,
  ActivatePlanDto,
  ActivateTeamDto,
  CloseIncidentDto,
  IncidentFilterDto,
} from './dto/bcdr.dto';
import { AuthGuard } from '../auth/auth.guard';
import { TenantScopeGuard } from '../common/tenant-scope.guard';

/**
 * Controller for BC/DR incident endpoints.
 *
 * Provides REST API for declaring, managing, and resolving
 * BC/DR incidents.
 */
@ApiTags('BC/DR Incidents')
@ApiBearerAuth()
@Controller('bcdr/incidents')
@UseGuards(AuthGuard, TenantScopeGuard)
export class BCDRIncidentsController {
  constructor(private readonly incidentsService: BCDRIncidentsService) {}

  /**
   * List all incidents
   */
  @Get()
  @ApiOperation({ summary: 'List BC/DR incidents' })
  @ApiResponse({ status: 200, description: 'Paginated incident list' })
  async listIncidents(
    @Query() filters: IncidentFilterDto,
    @Req() req: any,
  ) {
    return this.incidentsService.findAll(req.organizationId, filters);
  }

  /**
   * Get active incidents
   */
  @Get('active')
  @ApiOperation({ summary: 'Get active incidents' })
  @ApiResponse({ status: 200, description: 'Active incidents' })
  async getActiveIncidents(@Req() req: any) {
    return this.incidentsService.getActiveIncidents(req.organizationId);
  }

  /**
   * Get incident statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get incident statistics' })
  @ApiResponse({ status: 200, description: 'Incident statistics' })
  async getStats(@Req() req: any) {
    return this.incidentsService.getStats(req.organizationId);
  }

  /**
   * Get single incident with timeline
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get incident details with timeline' })
  @ApiParam({ name: 'id', description: 'Incident ID' })
  @ApiResponse({ status: 200, description: 'Incident details' })
  @ApiResponse({ status: 404, description: 'Incident not found' })
  async getIncident(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.incidentsService.findOne(id, req.organizationId);
  }

  /**
   * Declare a new incident
   */
  @Post()
  @ApiOperation({ summary: 'Declare new BC/DR incident' })
  @ApiResponse({ status: 201, description: 'Incident declared' })
  async declareIncident(
    @Body() dto: DeclareIncidentDto,
    @Req() req: any,
  ) {
    return this.incidentsService.declareIncident(
      req.organizationId,
      req.userId,
      dto,
      req.userEmail,
      req.userName,
    );
  }

  /**
   * Update incident status
   */
  @Put(':id/status')
  @ApiOperation({ summary: 'Update incident status' })
  @ApiParam({ name: 'id', description: 'Incident ID' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentStatusDto,
    @Req() req: any,
  ) {
    return this.incidentsService.updateStatus(
      id,
      req.organizationId,
      req.userId,
      dto,
      req.userEmail,
      req.userName,
    );
  }

  /**
   * Add timeline entry
   */
  @Post(':id/timeline')
  @ApiOperation({ summary: 'Add timeline entry' })
  @ApiParam({ name: 'id', description: 'Incident ID' })
  @ApiResponse({ status: 201, description: 'Entry added' })
  async addTimelineEntry(
    @Param('id') id: string,
    @Body() dto: AddTimelineEntryDto,
    @Req() req: any,
  ) {
    return this.incidentsService.addTimelineEntry(
      id,
      req.organizationId,
      req.userId,
      dto,
      req.userEmail,
      req.userName,
    );
  }

  /**
   * Activate a plan for incident
   */
  @Post(':id/activate-plan')
  @ApiOperation({ summary: 'Activate plan for incident' })
  @ApiParam({ name: 'id', description: 'Incident ID' })
  @ApiResponse({ status: 200, description: 'Plan activated' })
  async activatePlan(
    @Param('id') id: string,
    @Body() dto: ActivatePlanDto,
    @Req() req: any,
  ) {
    return this.incidentsService.activatePlan(
      id,
      req.organizationId,
      req.userId,
      dto,
      req.userEmail,
      req.userName,
    );
  }

  /**
   * Activate a team for incident
   */
  @Post(':id/activate-team')
  @ApiOperation({ summary: 'Activate team for incident' })
  @ApiParam({ name: 'id', description: 'Incident ID' })
  @ApiResponse({ status: 200, description: 'Team activated' })
  async activateTeam(
    @Param('id') id: string,
    @Body() dto: ActivateTeamDto,
    @Req() req: any,
  ) {
    return this.incidentsService.activateTeam(
      id,
      req.organizationId,
      req.userId,
      dto,
      req.userEmail,
      req.userName,
    );
  }

  /**
   * Close incident with post-incident review
   */
  @Post(':id/close')
  @ApiOperation({ summary: 'Close incident with PIR' })
  @ApiParam({ name: 'id', description: 'Incident ID' })
  @ApiResponse({ status: 200, description: 'Incident closed' })
  async closeIncident(
    @Param('id') id: string,
    @Body() dto: CloseIncidentDto,
    @Req() req: any,
  ) {
    return this.incidentsService.closeIncident(
      id,
      req.organizationId,
      req.userId,
      dto,
      req.userEmail,
      req.userName,
    );
  }
}
