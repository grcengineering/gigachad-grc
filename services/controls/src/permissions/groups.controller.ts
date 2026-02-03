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
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Roles, RolesGuard } from '@gigachad-grc/shared';

@Controller('api/permissions')
@UseGuards(DevAuthGuard)
export class PermissionsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly permissionsService: PermissionsService,
  ) {}

  // ===========================
  // Permission Groups
  // ===========================

  @Get('groups')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.PERMISSIONS, Action.READ)
  async listGroups(
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    return this.groupsService.findAll(orgId);
  }

  @Get('groups/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.PERMISSIONS, Action.READ)
  async getGroup(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    return this.groupsService.findOne(id, orgId);
  }

  @Post('groups')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.PERMISSIONS, Action.CREATE)
  async createGroup(
    @Body() dto: CreatePermissionGroupDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-email') userEmail?: string,
  ) {
    return this.groupsService.create(orgId, dto, userId, userEmail);
  }

  @Put('groups/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.PERMISSIONS, Action.UPDATE)
  async updateGroup(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePermissionGroupDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-email') userEmail?: string,
  ) {
    return this.groupsService.update(id, orgId, dto, userId, userEmail);
  }

  @Delete('groups/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.PERMISSIONS, Action.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGroup(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-email') userEmail?: string,
  ) {
    await this.groupsService.delete(id, orgId, userId, userEmail);
  }

  // ===========================
  // Group Members
  // ===========================

  @Get('groups/:id/members')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.PERMISSIONS, Action.READ)
  async getGroupMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    return this.groupsService.getMembers(id, orgId);
  }

  @Post('groups/:id/members')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.PERMISSIONS, Action.UPDATE)
  @HttpCode(HttpStatus.CREATED)
  async addGroupMember(
    @Param('id', ParseUUIDPipe) groupId: string,
    @Body() dto: AddGroupMemberDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') actorId?: string,
    @Headers('x-user-email') actorEmail?: string,
  ) {
    await this.groupsService.addMember(groupId, dto.userId, orgId, actorId, actorEmail);
    return { success: true };
  }

  @Delete('groups/:groupId/members/:userId')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.PERMISSIONS, Action.UPDATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeGroupMember(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') actorId?: string,
    @Headers('x-user-email') actorEmail?: string,
  ) {
    await this.groupsService.removeMember(groupId, userId, orgId, actorId, actorEmail);
  }

  // ===========================
  // User Permissions
  // ===========================

  @Get('users/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.PERMISSIONS, Action.READ)
  async getUserPermissions(
    @Param('id', ParseUUIDPipe) userId: string,
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    return this.permissionsService.getUserPermissions(userId, orgId);
  }

  @Put('users/:id/overrides')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.PERMISSIONS, Action.UPDATE)
  async setUserOverrides(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: SetUserOverridesDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') actorId?: string,
    @Headers('x-user-email') actorEmail?: string,
  ) {
    await this.groupsService.setUserOverrides(userId, orgId, dto.overrides, actorId, actorEmail);
    return { success: true };
  }

  @Get('users/:id/overrides')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.PERMISSIONS, Action.READ)
  async getUserOverrides(@Param('id', ParseUUIDPipe) userId: string) {
    return this.groupsService.getUserOverrides(userId);
  }

  // ===========================
  // Permission Check
  // ===========================

  @Get('check')
  async checkPermission(
    @Headers('x-user-id') userId: string = 'default-user',
    @Headers('x-organization-id') _orgId: string = 'default',
    @Headers() headers: Record<string, string>,
  ) {
    const resource = headers['x-check-resource'] as Resource;
    const action = headers['x-check-action'] as Action;
    const resourceId = headers['x-check-resource-id'];

    if (!resource || !action) {
      return { allowed: false, reason: 'Missing resource or action in headers' };
    }

    if (resourceId) {
      switch (resource) {
        case Resource.CONTROLS:
          return this.permissionsService.canAccessControl(userId, resourceId, action);
        case Resource.EVIDENCE:
          return this.permissionsService.canAccessEvidence(userId, resourceId, action);
        case Resource.POLICIES:
          return this.permissionsService.canAccessPolicy(userId, resourceId, action);
        default:
          return this.permissionsService.hasPermission(userId, resource, action);
      }
    }

    return this.permissionsService.hasPermission(userId, resource, action);
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
  async seedDefaultGroups(
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    await this.groupsService.seedDefaultGroups(orgId);
    return { success: true, message: 'Default permission groups seeded' };
  }
}

