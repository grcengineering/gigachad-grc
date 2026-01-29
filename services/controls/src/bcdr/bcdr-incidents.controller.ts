import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
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
import { DevAuthGuard } from '../auth/dev-auth.guard';

/**
 * Controller for BC/DR incident endpoints.
 *
 * Provides REST API for declaring, managing, and resolving
 * BC/DR incidents.
 */
@ApiTags('BC/DR Incidents')
@ApiBearerAuth()
@Controller('api/bcdr/incidents')
@UseGuards(DevAuthGuard)
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
    @CurrentUser() user: UserContext,
  ) {
    return this.incidentsService.findAll(user.organizationId, filters);
  }

  /**
   * Get active incidents
   */
  @Get('active')
  @ApiOperation({ summary: 'Get active incidents' })
  @ApiResponse({ status: 200, description: 'Active incidents' })
  async getActiveIncidents(@CurrentUser() user: UserContext) {
    return this.incidentsService.getActiveIncidents(user.organizationId);
  }

  /**
   * Get incident statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get incident statistics' })
  @ApiResponse({ status: 200, description: 'Incident statistics' })
  async getStats(@CurrentUser() user: UserContext) {
    return this.incidentsService.getStats(user.organizationId);
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
    @CurrentUser() user: UserContext,
  ) {
    return this.incidentsService.findOne(id, user.organizationId);
  }

  /**
   * Declare a new incident
   */
  @Post()
  @ApiOperation({ summary: 'Declare new BC/DR incident' })
  @ApiResponse({ status: 201, description: 'Incident declared' })
  async declareIncident(
    @Body() dto: DeclareIncidentDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.incidentsService.declareIncident(
      user.organizationId,
      user.userId,
      dto,
      user.email,
      user.name,
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
    @CurrentUser() user: UserContext,
  ) {
    return this.incidentsService.updateStatus(
      id,
      user.organizationId,
      user.userId,
      dto,
      user.email,
      user.name,
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
    @CurrentUser() user: UserContext,
  ) {
    return this.incidentsService.addTimelineEntry(
      id,
      user.organizationId,
      user.userId,
      dto,
      user.email,
      user.name,
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
    @CurrentUser() user: UserContext,
  ) {
    return this.incidentsService.activatePlan(
      id,
      user.organizationId,
      user.userId,
      dto,
      user.email,
      user.name,
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
    @CurrentUser() user: UserContext,
  ) {
    return this.incidentsService.activateTeam(
      id,
      user.organizationId,
      user.userId,
      dto,
      user.email,
      user.name,
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
    @CurrentUser() user: UserContext,
  ) {
    return this.incidentsService.closeIncident(
      id,
      user.organizationId,
      user.userId,
      dto,
      user.email,
      user.name,
    );
  }
}
