import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreatePermissionGroupDto,
  UpdatePermissionGroupDto,
  PermissionGroupResponseDto,
  GroupMemberResponseDto,
  UserPermissionOverrideDto,
  DEFAULT_PERMISSION_GROUPS,
} from './dto/permission.dto';

@Injectable()
export class GroupsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Get all permission groups for an organization
   */
  async findAll(organizationId: string): Promise<PermissionGroupResponseDto[]> {
    const groups = await this.prisma.permissionGroup.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: [
        { isSystem: 'desc' },
        { name: 'asc' },
      ],
    });

    return groups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description || undefined,
      permissions: group.permissions as any[],
      isSystem: group.isSystem,
      memberCount: group._count.members,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }));
  }

  /**
   * Get a single permission group by ID
   */
  async findOne(id: string, organizationId: string): Promise<PermissionGroupResponseDto> {
    const group = await this.prisma.permissionGroup.findFirst({
      where: { id, organizationId },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Permission group not found');
    }

    return {
      id: group.id,
      name: group.name,
      description: group.description || undefined,
      permissions: group.permissions as any[],
      isSystem: group.isSystem,
      memberCount: group._count.members,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  }

  /**
   * Create a new permission group
   */
  async create(
    organizationId: string,
    dto: CreatePermissionGroupDto,
    userId?: string,
    userEmail?: string,
  ): Promise<PermissionGroupResponseDto> {
    // Check for duplicate name
    const existing = await this.prisma.permissionGroup.findUnique({
      where: {
        organizationId_name: {
          organizationId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Permission group "${dto.name}" already exists`);
    }

    const group = await this.prisma.permissionGroup.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        permissions: dto.permissions as any,
        isSystem: false,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: 'created',
      entityType: 'permission_group',
      entityId: group.id,
      entityName: group.name,
      description: `Created permission group "${group.name}"`,
    });

    return {
      id: group.id,
      name: group.name,
      description: group.description || undefined,
      permissions: group.permissions as any[],
      isSystem: group.isSystem,
      memberCount: 0,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  }

  /**
   * Update a permission group
   */
  async update(
    id: string,
    organizationId: string,
    dto: UpdatePermissionGroupDto,
    userId?: string,
    userEmail?: string,
  ): Promise<PermissionGroupResponseDto> {
    const existing = await this.prisma.permissionGroup.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('Permission group not found');
    }

    // Check if trying to rename to existing name
    if (dto.name && dto.name !== existing.name) {
      const duplicate = await this.prisma.permissionGroup.findUnique({
        where: {
          organizationId_name: {
            organizationId,
            name: dto.name,
          },
        },
      });

      if (duplicate) {
        throw new ConflictException(`Permission group "${dto.name}" already exists`);
      }
    }

    const group = await this.prisma.permissionGroup.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        permissions: dto.permissions as any,
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: 'updated',
      entityType: 'permission_group',
      entityId: group.id,
      entityName: group.name,
      description: `Updated permission group "${group.name}"`,
      changes: {
        before: { name: existing.name, permissions: existing.permissions },
        after: { name: group.name, permissions: group.permissions },
      },
    });

    return {
      id: group.id,
      name: group.name,
      description: group.description || undefined,
      permissions: group.permissions as any[],
      isSystem: group.isSystem,
      memberCount: group._count.members,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  }

  /**
   * Delete a permission group
   */
  async delete(
    id: string,
    organizationId: string,
    userId?: string,
    userEmail?: string,
  ): Promise<void> {
    const group = await this.prisma.permissionGroup.findFirst({
      where: { id, organizationId },
    });

    if (!group) {
      throw new NotFoundException('Permission group not found');
    }

    if (group.isSystem) {
      throw new BadRequestException('Cannot delete system permission groups');
    }

    await this.prisma.permissionGroup.delete({
      where: { id },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: 'deleted',
      entityType: 'permission_group',
      entityId: id,
      entityName: group.name,
      description: `Deleted permission group "${group.name}"`,
    });
  }

  /**
   * Get members of a permission group
   */
  async getMembers(id: string, organizationId: string): Promise<GroupMemberResponseDto[]> {
    const group = await this.prisma.permissionGroup.findFirst({
      where: { id, organizationId },
    });

    if (!group) {
      throw new NotFoundException('Permission group not found');
    }

    const memberships = await this.prisma.userGroupMembership.findMany({
      where: { groupId: id },
      include: {
        user: {
          select: {
            id: true,
            keycloakId: true,
            email: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return memberships.map(m => ({
      id: m.user.id,
      keycloakId: m.user.keycloakId,
      email: m.user.email,
      displayName: m.user.displayName,
      joinedAt: m.createdAt,
    }));
  }

  /**
   * Add a member to a permission group
   */
  async addMember(
    groupId: string,
    userId: string,
    organizationId: string,
    actorId?: string,
    actorEmail?: string,
  ): Promise<void> {
    const group = await this.prisma.permissionGroup.findFirst({
      where: { id: groupId, organizationId },
    });

    if (!group) {
      throw new NotFoundException('Permission group not found');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already a member
    const existing = await this.prisma.userGroupMembership.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('User is already a member of this group');
    }

    await this.prisma.userGroupMembership.create({
      data: {
        userId,
        groupId,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId: actorId,
      userEmail: actorEmail,
      action: 'member_added',
      entityType: 'permission_group',
      entityId: groupId,
      entityName: group.name,
      description: `Added user "${user.displayName}" to permission group "${group.name}"`,
      metadata: { addedUserId: userId, addedUserEmail: user.email },
    });
  }

  /**
   * Remove a member from a permission group
   */
  async removeMember(
    groupId: string,
    userId: string,
    organizationId: string,
    actorId?: string,
    actorEmail?: string,
  ): Promise<void> {
    const group = await this.prisma.permissionGroup.findFirst({
      where: { id: groupId, organizationId },
    });

    if (!group) {
      throw new NotFoundException('Permission group not found');
    }

    const membership = await this.prisma.userGroupMembership.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
      include: {
        user: {
          select: { displayName: true, email: true },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('User is not a member of this group');
    }

    await this.prisma.userGroupMembership.delete({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId: actorId,
      userEmail: actorEmail,
      action: 'member_removed',
      entityType: 'permission_group',
      entityId: groupId,
      entityName: group.name,
      description: `Removed user "${membership.user.displayName}" from permission group "${group.name}"`,
      metadata: { removedUserId: userId, removedUserEmail: membership.user.email },
    });
  }

  /**
   * Set user permission overrides
   */
  async setUserOverrides(
    userId: string,
    organizationId: string,
    overrides: UserPermissionOverrideDto[],
    actorId?: string,
    actorEmail?: string,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete existing overrides
    await this.prisma.userPermissionOverride.deleteMany({
      where: { userId },
    });

    // Create new overrides
    if (overrides.length > 0) {
      await this.prisma.userPermissionOverride.createMany({
        data: overrides.map(o => ({
          userId,
          permission: o.permission,
          granted: o.granted,
          resourceScope: o.resourceScope as any,
        })),
      });
    }

    // Audit log
    await this.auditService.log({
      organizationId,
      userId: actorId,
      userEmail: actorEmail,
      action: 'permissions_updated',
      entityType: 'user',
      entityId: userId,
      entityName: user.displayName,
      description: `Updated permission overrides for user "${user.displayName}"`,
      metadata: { overridesCount: overrides.length },
    });
  }

  /**
   * Get user's permission overrides
   */
  async getUserOverrides(userId: string): Promise<UserPermissionOverrideDto[]> {
    const overrides = await this.prisma.userPermissionOverride.findMany({
      where: { userId },
    });

    return overrides.map(o => ({
      permission: o.permission,
      granted: o.granted,
      resourceScope: o.resourceScope as any,
    }));
  }

  /**
   * Seed default permission groups for an organization
   */
  async seedDefaultGroups(organizationId: string): Promise<void> {
    for (const [key, group] of Object.entries(DEFAULT_PERMISSION_GROUPS)) {
      const existing = await this.prisma.permissionGroup.findUnique({
        where: {
          organizationId_name: {
            organizationId,
            name: group.name,
          },
        },
      });

      if (!existing) {
        await this.prisma.permissionGroup.create({
          data: {
            organizationId,
            name: group.name,
            description: group.description,
            permissions: group.permissions as any,
            isSystem: true,
          },
        });
      }
    }
  }
}



