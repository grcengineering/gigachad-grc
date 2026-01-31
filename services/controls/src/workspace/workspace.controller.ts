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
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { WorkspaceService } from './workspace.service';

/**
 * Request with workspace-specific user context
 */
interface WorkspaceRequest extends Request {
  user: {
    userId: string;
    organizationId: string;
    email?: string;
    id?: string;
    role?: UserRole;
  };
}
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  AddWorkspaceMemberDto,
  UpdateWorkspaceMemberDto,
  WorkspaceFilterDto,
  EnableMultiWorkspaceDto,
} from './dto/workspace.dto';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Resource, Action } from '../permissions/dto/permission.dto';

@Controller('api/workspaces')
@UseGuards(DevAuthGuard, PermissionGuard)
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  /**
   * Check if multi-workspace mode is enabled for the organization
   */
  @Get('status')
  async getMultiWorkspaceStatus(@Req() req: WorkspaceRequest) {
    const enabled = await this.workspaceService.isMultiWorkspaceEnabled(req.user.organizationId);
    return { enabled };
  }

  /**
   * Enable or disable multi-workspace mode (admin only)
   */
  @Post('toggle')
  @RequirePermission(Resource.WORKSPACES, Action.UPDATE)
  async toggleMultiWorkspace(@Req() req: WorkspaceRequest, @Body() dto: EnableMultiWorkspaceDto) {
    return this.workspaceService.toggleMultiWorkspace(
      req.user.organizationId,
      dto.enabled,
      req.user.id || req.user.userId
    );
  }

  /**
   * List all workspaces (filtered by user access for non-admins)
   */
  @Get()
  async findAll(@Req() req: WorkspaceRequest, @Query() filters: WorkspaceFilterDto) {
    return this.workspaceService.findAll(
      req.user.organizationId,
      req.user.id || req.user.userId,
      req.user.role,
      filters
    );
  }

  /**
   * Get org-level consolidated dashboard (admin only)
   */
  @Get('org/dashboard')
  @RequirePermission(Resource.WORKSPACES, Action.READ)
  async getOrgDashboard(@Req() req: WorkspaceRequest) {
    return this.workspaceService.getOrgDashboard(req.user.organizationId);
  }

  /**
   * Get a single workspace by ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: WorkspaceRequest) {
    return this.workspaceService.findOne(id, req.user.organizationId, req.user.id || req.user.userId, req.user.role);
  }

  /**
   * Get workspace dashboard
   */
  @Get(':id/dashboard')
  async getDashboard(@Param('id') id: string, @Req() req: WorkspaceRequest) {
    return this.workspaceService.getDashboard(
      id,
      req.user.organizationId,
      req.user.id || req.user.userId,
      req.user.role
    );
  }

  /**
   * Create a new workspace (admin only)
   */
  @Post()
  @RequirePermission(Resource.WORKSPACES, Action.CREATE)
  async create(@Req() req: WorkspaceRequest, @Body() dto: CreateWorkspaceDto) {
    return this.workspaceService.create(req.user.organizationId, req.user.id || req.user.userId, dto);
  }

  /**
   * Update a workspace
   */
  @Put(':id')
  @RequirePermission(Resource.WORKSPACES, Action.UPDATE)
  async update(@Param('id') id: string, @Req() req: WorkspaceRequest, @Body() dto: UpdateWorkspaceDto) {
    return this.workspaceService.update(id, req.user.organizationId, dto);
  }

  /**
   * Delete (archive) a workspace
   */
  @Delete(':id')
  @RequirePermission(Resource.WORKSPACES, Action.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Req() req: WorkspaceRequest) {
    await this.workspaceService.remove(id, req.user.organizationId);
  }

  /**
   * List workspace members
   */
  @Get(':id/members')
  async listMembers(@Param('id') id: string, @Req() req: WorkspaceRequest) {
    const workspace = await this.workspaceService.findOne(
      id,
      req.user.organizationId,
      req.user.id || req.user.userId,
      req.user.role
    );
    return workspace.members;
  }

  /**
   * Add a member to a workspace
   */
  @Post(':id/members')
  @RequirePermission(Resource.WORKSPACES, Action.ASSIGN)
  async addMember(
    @Param('id') id: string,
    @Req() req: WorkspaceRequest,
    @Body() dto: AddWorkspaceMemberDto
  ) {
    return this.workspaceService.addMember(id, req.user.organizationId, dto);
  }

  /**
   * Update a member's role
   */
  @Put(':id/members/:userId')
  @RequirePermission(Resource.WORKSPACES, Action.ASSIGN)
  async updateMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() req: WorkspaceRequest,
    @Body() dto: UpdateWorkspaceMemberDto
  ) {
    return this.workspaceService.updateMember(id, userId, req.user.organizationId, dto);
  }

  /**
   * Remove a member from a workspace
   */
  @Delete(':id/members/:userId')
  @RequirePermission(Resource.WORKSPACES, Action.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() req: WorkspaceRequest
  ) {
    await this.workspaceService.removeMember(id, userId, req.user.organizationId);
  }
}
