import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { PermissionsService } from '../permissions/permissions.service';
import { GroupsService } from '../permissions/groups.service';
import {
  CreateUserDto,
  UpdateUserDto,
  SyncUserFromKeycloakDto,
  UserFilterDto,
} from './dto/user.dto';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Resource, Action } from '../permissions/dto/permission.dto';

@Controller('api/users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly permissionsService: PermissionsService,
    private readonly groupsService: GroupsService,
  ) {}

  // ===========================
  // User CRUD
  // ===========================

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.USERS, Action.READ)
  async listUsers(
    @Query() filters: UserFilterDto,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    return this.usersService.findAll(
      orgId,
      filters,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Get('stats')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.USERS, Action.READ)
  async getUserStats(
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    return this.usersService.getStats(orgId);
  }

  @Get('me')
  async getCurrentUser(
    @Headers('x-user-id') userId: string,
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    if (!userId) {
      return null;
    }
    
    try {
      const user = await this.usersService.findOne(userId, orgId);
      const permissions = await this.permissionsService.getUserPermissions(userId, orgId);
      return { ...user, permissions };
    } catch {
      return null;
    }
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.USERS, Action.READ)
  async getUser(
    @Param('id') id: string,
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    return this.usersService.findOne(id, orgId);
  }

  @Get(':id/permissions')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.USERS, Action.READ)
  async getUserPermissions(
    @Param('id') id: string,
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    return this.permissionsService.getUserPermissions(id, orgId);
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.USERS, Action.CREATE)
  async createUser(
    @Body() dto: CreateUserDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') actorId?: string,
    @Headers('x-user-email') actorEmail?: string,
  ) {
    return this.usersService.create(orgId, dto, actorId, actorEmail);
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.USERS, Action.UPDATE)
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') actorId?: string,
    @Headers('x-user-email') actorEmail?: string,
  ) {
    return this.usersService.update(id, orgId, dto, actorId, actorEmail);
  }

  @Post(':id/deactivate')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.USERS, Action.UPDATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivateUser(
    @Param('id') id: string,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') actorId?: string,
    @Headers('x-user-email') actorEmail?: string,
  ) {
    await this.usersService.deactivate(id, orgId, actorId, actorEmail);
  }

  @Post(':id/reactivate')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.USERS, Action.UPDATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async reactivateUser(
    @Param('id') id: string,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') actorId?: string,
    @Headers('x-user-email') actorEmail?: string,
  ) {
    await this.usersService.reactivate(id, orgId, actorId, actorEmail);
  }

  // ===========================
  // User Groups
  // ===========================

  @Get(':id/groups')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.USERS, Action.READ)
  async getUserGroups(
    @Param('id') id: string,
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    const user = await this.usersService.findOne(id, orgId);
    return user.groups;
  }

  @Post(':id/groups/:groupId')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.PERMISSIONS, Action.UPDATE)
  @HttpCode(HttpStatus.CREATED)
  async addUserToGroup(
    @Param('id') userId: string,
    @Param('groupId') groupId: string,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') actorId?: string,
    @Headers('x-user-email') actorEmail?: string,
  ) {
    await this.groupsService.addMember(groupId, userId, orgId, actorId, actorEmail);
    return { success: true };
  }

  @Post(':id/groups/:groupId/remove')
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.PERMISSIONS, Action.UPDATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeUserFromGroup(
    @Param('id') userId: string,
    @Param('groupId') groupId: string,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') actorId?: string,
    @Headers('x-user-email') actorEmail?: string,
  ) {
    await this.groupsService.removeMember(groupId, userId, orgId, actorId, actorEmail);
  }

  // ===========================
  // Keycloak Sync
  // ===========================

  @Post('sync')
  async syncFromKeycloak(
    @Body() dto: SyncUserFromKeycloakDto,
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    return this.usersService.syncFromKeycloak(orgId, dto);
  }

  @Get('keycloak/:keycloakId')
  async getUserByKeycloakId(@Param('keycloakId') keycloakId: string) {
    return this.usersService.findByKeycloakId(keycloakId);
  }
}



