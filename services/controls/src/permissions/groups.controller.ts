import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { PermissionsService } from './permissions.service';
import {
  CreatePermissionGroupDto,
  UpdatePermissionGroupDto,
  AddGroupMemberDto,
  SetUserOverridesDto,
  Resource,
  Action,
} from './dto/permission.dto';
import { DevAuthGuard, User } from '../auth/dev-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Roles, RolesGuard } from '@gigachad-grc/shared';
import type { UserContext } from '@gigachad-grc/shared';

@Controller('api/permissions')
@UseGuards(DevAuthGuard)
export class PermissionsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly permissionsService: PermissionsService
  ) {}

  // ===========================
  // Permission Groups
  // ===========================

  @Get('groups')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.PERMISSIONS, Action.READ)
  async listGroups(@User() user: UserContext) {
    return this.groupsService.findAll(user.organizationId);
  }

  @Get('groups/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.PERMISSIONS, Action.READ)
  async getGroup(@Param('id', ParseUUIDPipe) id: string, @User() user: UserContext) {
    return this.groupsService.findOne(id, user.organizationId);
  }

  @Post('groups')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.PERMISSIONS, Action.CREATE)
  async createGroup(@Body() dto: CreatePermissionGroupDto, @User() user: UserContext) {
    return this.groupsService.create(user.organizationId, dto, user.userId, user.email);
  }

  @Put('groups/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.PERMISSIONS, Action.UPDATE)
  async updateGroup(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePermissionGroupDto,
    @User() user: UserContext
  ) {
    return this.groupsService.update(id, user.organizationId, dto, user.userId, user.email);
  }

  @Delete('groups/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.PERMISSIONS, Action.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGroup(@Param('id', ParseUUIDPipe) id: string, @User() user: UserContext) {
    await this.groupsService.delete(id, user.organizationId, user.userId, user.email);
  }

  // ===========================
  // Group Members
  // ===========================

  @Get('groups/:id/members')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.PERMISSIONS, Action.READ)
  async getGroupMembers(@Param('id', ParseUUIDPipe) id: string, @User() user: UserContext) {
    return this.groupsService.getMembers(id, user.organizationId);
  }

  @Post('groups/:id/members')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.PERMISSIONS, Action.UPDATE)
  @HttpCode(HttpStatus.CREATED)
  async addGroupMember(
    @Param('id', ParseUUIDPipe) groupId: string,
    @Body() dto: AddGroupMemberDto,
    @User() user: UserContext
  ) {
    await this.groupsService.addMember(
      groupId,
      dto.userId,
      user.organizationId,
      user.userId,
      user.email
    );
    return { success: true };
  }

  @Delete('groups/:groupId/members/:userId')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.PERMISSIONS, Action.UPDATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeGroupMember(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @User() user: UserContext
  ) {
    await this.groupsService.removeMember(
      groupId,
      targetUserId,
      user.organizationId,
      user.userId,
      user.email
    );
  }

  // ===========================
  // User Permissions
  // ===========================

  @Get('users/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.PERMISSIONS, Action.READ)
  async getUserPermissions(
    @Param('id', ParseUUIDPipe) targetUserId: string,
    @User() user: UserContext
  ) {
    return this.permissionsService.getUserPermissions(targetUserId, user.organizationId);
  }

  @Put('users/:id/overrides')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.PERMISSIONS, Action.UPDATE)
  async setUserOverrides(
    @Param('id', ParseUUIDPipe) targetUserId: string,
    @Body() dto: SetUserOverridesDto,
    @User() user: UserContext
  ) {
    await this.groupsService.setUserOverrides(
      targetUserId,
      user.organizationId,
      dto.overrides,
      user.userId,
      user.email
    );
    return { success: true };
  }

  @Get('users/:id/overrides')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.PERMISSIONS, Action.READ)
  async getUserOverrides(@Param('id', ParseUUIDPipe) userId: string, @User() caller: UserContext) {
    return this.groupsService.getUserOverrides(userId, caller.organizationId);
  }

  // ===========================
  // Permission Check
  // ===========================

  @Get('check')
  async checkPermission(@User() user: UserContext, @Headers() headers: Record<string, string>) {
    const resource = headers['x-check-resource'] as Resource;
    const action = headers['x-check-action'] as Action;
    const resourceId = headers['x-check-resource-id'];

    if (!resource || !action) {
      return { allowed: false, reason: 'Missing resource or action in headers' };
    }

    if (resourceId) {
      switch (resource) {
        case Resource.CONTROLS:
          return this.permissionsService.canAccessControl(user.userId, resourceId, action);
        case Resource.EVIDENCE:
          return this.permissionsService.canAccessEvidence(user.userId, resourceId, action);
        case Resource.POLICIES:
          return this.permissionsService.canAccessPolicy(user.userId, resourceId, action);
        default:
          return this.permissionsService.hasPermission(user.userId, resource, action);
      }
    }

    return this.permissionsService.hasPermission(user.userId, resource, action);
  }

  // ===========================
  // Available Permissions
  // ===========================

  @Get('available')
  getAvailablePermissions() {
    return this.permissionsService.getAvailablePermissions();
  }

  // ===========================
  // Seed Default Groups
  // ===========================

  @Post('seed')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async seedDefaultGroups(@User() user: UserContext) {
    await this.groupsService.seedDefaultGroups(user.organizationId);
    return { success: true, message: 'Default permission groups seeded' };
  }
}
