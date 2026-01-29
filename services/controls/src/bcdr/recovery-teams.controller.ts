import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
import { RecoveryTeamsService } from './recovery-teams.service';
import {
  CreateRecoveryTeamDto,
  UpdateRecoveryTeamDto,
  AddTeamMemberDto,
  LinkTeamToPlanDto,
  RecoveryTeamFilterDto,
} from './dto/bcdr.dto';
import { DevAuthGuard } from '../auth/dev-auth.guard';

/**
 * Controller for BC/DR recovery team endpoints.
 *
 * Provides REST API for managing recovery teams, members,
 * and plan linkages.
 */
@ApiTags('BC/DR Recovery Teams')
@ApiBearerAuth()
@Controller('api/bcdr/recovery-teams')
@UseGuards(DevAuthGuard)
export class RecoveryTeamsController {
  constructor(private readonly teamsService: RecoveryTeamsService) {}

  /**
   * List all recovery teams
   */
  @Get()
  @ApiOperation({ summary: 'List recovery teams' })
  @ApiResponse({ status: 200, description: 'Paginated team list' })
  async listTeams(
    @Query() filters: RecoveryTeamFilterDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.teamsService.findAll(user.organizationId, filters);
  }

  /**
   * Get team statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get team statistics' })
  @ApiResponse({ status: 200, description: 'Team statistics' })
  async getStats(@CurrentUser() user: UserContext) {
    return this.teamsService.getStats(user.organizationId);
  }

  /**
   * Get single team with members
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get team details with members' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiResponse({ status: 200, description: 'Team details' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async getTeam(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.teamsService.findOne(id, user.organizationId);
  }

  /**
   * Create a new recovery team
   */
  @Post()
  @ApiOperation({ summary: 'Create recovery team' })
  @ApiResponse({ status: 201, description: 'Created team' })
  async createTeam(
    @Body() dto: CreateRecoveryTeamDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.teamsService.create(
      user.organizationId,
      user.userId,
      dto,
      user.email,
      user.name,
    );
  }

  /**
   * Update a recovery team
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update recovery team' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiResponse({ status: 200, description: 'Updated team' })
  async updateTeam(
    @Param('id') id: string,
    @Body() dto: UpdateRecoveryTeamDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.teamsService.update(
      id,
      user.organizationId,
      user.userId,
      dto,
      user.email,
      user.name,
    );
  }

  /**
   * Delete a recovery team
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete recovery team' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiResponse({ status: 200, description: 'Team deleted' })
  async deleteTeam(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.teamsService.delete(
      id,
      user.organizationId,
      user.userId,
      user.email,
      user.name,
    );
  }

  /**
   * Add a member to a team
   */
  @Post(':id/members')
  @ApiOperation({ summary: 'Add team member' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiResponse({ status: 201, description: 'Added member' })
  async addMember(
    @Param('id') id: string,
    @Body() dto: AddTeamMemberDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.teamsService.addMember(
      id,
      user.organizationId,
      user.userId,
      dto,
      user.email,
      user.name,
    );
  }

  /**
   * Update a team member
   */
  @Put(':id/members/:memberId')
  @ApiOperation({ summary: 'Update team member' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiResponse({ status: 200, description: 'Updated member' })
  async updateMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: Partial<AddTeamMemberDto>,
    @CurrentUser() user: UserContext,
  ) {
    return this.teamsService.updateMember(
      id,
      memberId,
      user.organizationId,
      dto,
    );
  }

  /**
   * Remove a member from a team
   */
  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove team member' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.teamsService.removeMember(
      id,
      memberId,
      user.organizationId,
      user.userId,
      user.email,
      user.name,
    );
  }

  /**
   * Link team to a plan
   */
  @Post(':id/link-plan')
  @ApiOperation({ summary: 'Link team to plan' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiResponse({ status: 201, description: 'Link created' })
  @ApiResponse({ status: 409, description: 'Already linked' })
  async linkToPlan(
    @Param('id') id: string,
    @Body() dto: LinkTeamToPlanDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.teamsService.linkToPlan(
      id,
      user.organizationId,
      user.userId,
      dto,
      user.email,
      user.name,
    );
  }

  /**
   * Unlink team from a plan
   */
  @Delete(':id/link-plan/:planId')
  @ApiOperation({ summary: 'Unlink team from plan' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({ status: 200, description: 'Link removed' })
  async unlinkFromPlan(
    @Param('id') id: string,
    @Param('planId') planId: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.teamsService.unlinkFromPlan(
      id,
      planId,
      user.organizationId,
      user.userId,
      user.email,
      user.name,
    );
  }

  /**
   * Get teams linked to a plan
   */
  @Get('for-plan/:planId')
  @ApiOperation({ summary: 'Get teams for a plan' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({ status: 200, description: 'Teams linked to plan' })
  async getTeamsForPlan(
    @Param('planId') planId: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.teamsService.getTeamsForPlan(planId, user.organizationId);
  }
}
