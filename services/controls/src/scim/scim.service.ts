import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import {
  ScimUserResource,
  ScimGroupResource,
  ScimListResponse,
  CreateScimUserDto,
  UpdateScimUserDto,
  CreateScimGroupDto,
  UpdateScimGroupDto,
  PatchScimDto,
  ScimQueryDto,
} from './dto/scim.dto';

@Injectable()
export class ScimService {
  private readonly logger = new Logger(ScimService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== Users ====================

  async listUsers(organizationId: string, query: ScimQueryDto): Promise<ScimListResponse<ScimUserResource>> {
    const startIndex = query.startIndex || 1;
    const count = Math.min(query.count || 100, 100);
    const skip = startIndex - 1;

    let where: any = { organizationId };

    // Parse simple SCIM filter (userName eq "value")
    if (query.filter) {
      const filterMatch = query.filter.match(/(\w+)\s+eq\s+"([^"]+)"/i);
      if (filterMatch) {
        const [, field, value] = filterMatch;
        if (field.toLowerCase() === 'username') {
          where.email = value;
        } else if (field.toLowerCase() === 'externalid') {
          where.keycloakId = value;
        }
      }
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: count,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: total,
      startIndex,
      itemsPerPage: users.length,
      Resources: users.map(u => this.toScimUser(u)),
    };
  }

  async getUser(organizationId: string, userId: string): Promise<ScimUserResource> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get group memberships separately
    const memberships = await this.prisma.userGroupMembership.findMany({
      where: { userId },
      include: { group: true },
    });

    return this.toScimUser(user, memberships);
  }

  async createUser(organizationId: string, dto: CreateScimUserDto): Promise<ScimUserResource> {
    // Check for existing user
    const existing = await this.prisma.user.findFirst({
      where: { 
        organizationId, 
        email: dto.userName,
      },
    });

    if (existing) {
      throw new ConflictException('User already exists');
    }

    const primaryEmail = dto.emails?.find(e => e.primary)?.value || dto.emails?.[0]?.value || dto.userName;
    const displayName = dto.displayName || 
      (dto.name ? `${dto.name.givenName || ''} ${dto.name.familyName || ''}`.trim() : dto.userName);

    const [firstName, ...lastNameParts] = displayName.split(' ');
    const lastName = lastNameParts.join(' ') || 'User';

    const user = await this.prisma.user.create({
      data: {
        organizationId,
        email: primaryEmail,
        displayName,
        firstName: firstName || 'SCIM',
        lastName: lastName,
        keycloakId: dto.externalId || `scim-${crypto.randomUUID()}`,
        status: dto.active !== false ? 'active' : 'inactive',
        role: 'viewer',
      },
    });

    this.logger.log(`SCIM: Created user ${user.id} (${user.email})`);
    return this.toScimUser(user);
  }

  async updateUser(organizationId: string, userId: string, dto: UpdateScimUserDto): Promise<ScimUserResource> {
    const existing = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const primaryEmail = dto.emails?.find(e => e.primary)?.value || dto.emails?.[0]?.value || dto.userName;
    const displayName = dto.displayName || 
      (dto.name ? `${dto.name.givenName || ''} ${dto.name.familyName || ''}`.trim() : existing.displayName);

    const [firstName, ...lastNameParts] = displayName.split(' ');
    const lastName = lastNameParts.join(' ') || existing.lastName;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: primaryEmail,
        displayName,
        firstName: firstName || existing.firstName,
        lastName,
        status: dto.active !== false ? 'active' : 'inactive',
      },
    });

    this.logger.log(`SCIM: Updated user ${user.id}`);
    return this.toScimUser(user);
  }

  async patchUser(organizationId: string, userId: string, dto: PatchScimDto): Promise<ScimUserResource> {
    const existing = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const updates: any = {};

    for (const op of dto.Operations) {
      if (op.op === 'replace' || op.op === 'add') {
        if (op.path === 'active' || (!op.path && op.value?.active !== undefined)) {
          updates.status = (op.value?.active ?? op.value) ? 'active' : 'inactive';
        }
        if (op.path === 'displayName' || (!op.path && op.value?.displayName)) {
          updates.displayName = op.value?.displayName ?? op.value;
        }
        if (op.path === 'userName' || (!op.path && op.value?.userName)) {
          updates.email = op.value?.userName ?? op.value;
        }
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updates,
    });

    this.logger.log(`SCIM: Patched user ${user.id}`);
    return this.toScimUser(user);
  }

  async deleteUser(organizationId: string, userId: string): Promise<void> {
    const existing = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    // Soft delete - set status to suspended
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'suspended' },
    });

    this.logger.log(`SCIM: Suspended user ${userId}`);
  }

  // ==================== Groups ====================

  async listGroups(organizationId: string, query: ScimQueryDto): Promise<ScimListResponse<ScimGroupResource>> {
    const startIndex = query.startIndex || 1;
    const count = Math.min(query.count || 100, 100);
    const skip = startIndex - 1;

    let where: any = { organizationId };

    if (query.filter) {
      const filterMatch = query.filter.match(/displayName\s+eq\s+"([^"]+)"/i);
      if (filterMatch) {
        where.name = filterMatch[1];
      }
    }

    const [groups, total] = await Promise.all([
      this.prisma.permissionGroup.findMany({
        where,
        skip,
        take: count,
        include: {
          members: {
            include: { user: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.permissionGroup.count({ where }),
    ]);

    return {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: total,
      startIndex,
      itemsPerPage: groups.length,
      Resources: groups.map(g => this.toScimGroup(g)),
    };
  }

  async getGroup(organizationId: string, groupId: string): Promise<ScimGroupResource> {
    const group = await this.prisma.permissionGroup.findFirst({
      where: { id: groupId, organizationId },
      include: {
        members: {
          include: { user: true },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return this.toScimGroup(group);
  }

  async createGroup(organizationId: string, dto: CreateScimGroupDto): Promise<ScimGroupResource> {
    const existing = await this.prisma.permissionGroup.findFirst({
      where: { organizationId, name: dto.displayName },
    });

    if (existing) {
      throw new ConflictException('Group already exists');
    }

    const group = await this.prisma.permissionGroup.create({
      data: {
        organizationId,
        name: dto.displayName,
        description: `SCIM provisioned group`,
        permissions: [],
      },
      include: {
        members: {
          include: { user: true },
        },
      },
    });

    // Add members if provided
    if (dto.members?.length) {
      await this.updateGroupMembers(group.id, dto.members.map(m => m.value));
    }

    this.logger.log(`SCIM: Created group ${group.id} (${group.name})`);
    return this.toScimGroup(group);
  }

  async updateGroup(organizationId: string, groupId: string, dto: UpdateScimGroupDto): Promise<ScimGroupResource> {
    const existing = await this.prisma.permissionGroup.findFirst({
      where: { id: groupId, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('Group not found');
    }

    const group = await this.prisma.permissionGroup.update({
      where: { id: groupId },
      data: {
        name: dto.displayName,
      },
      include: {
        members: {
          include: { user: true },
        },
      },
    });

    // Update members
    if (dto.members !== undefined) {
      await this.updateGroupMembers(groupId, dto.members.map(m => m.value));
    }

    this.logger.log(`SCIM: Updated group ${group.id}`);
    return this.toScimGroup(group);
  }

  async patchGroup(organizationId: string, groupId: string, dto: PatchScimDto): Promise<ScimGroupResource> {
    const existing = await this.prisma.permissionGroup.findFirst({
      where: { id: groupId, organizationId },
      include: {
        members: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Group not found');
    }

    for (const op of dto.Operations) {
      if (op.path === 'displayName' && (op.op === 'replace' || op.op === 'add')) {
        await this.prisma.permissionGroup.update({
          where: { id: groupId },
          data: { name: op.value },
        });
      }

      // Handle member operations
      if (op.path === 'members' || op.path?.startsWith('members[')) {
        const currentMemberIds = existing.members.map(m => m.userId);

        if (op.op === 'add' && op.value) {
          const newMembers = Array.isArray(op.value) ? op.value : [op.value];
          for (const member of newMembers) {
            if (!currentMemberIds.includes(member.value)) {
              await this.prisma.userGroupMembership.create({
                data: {
                  groupId,
                  userId: member.value,
                },
              });
            }
          }
        } else if (op.op === 'remove') {
          if (op.path?.includes('value eq')) {
            const match = op.path.match(/value eq "([^"]+)"/);
            if (match) {
              await this.prisma.userGroupMembership.deleteMany({
                where: { groupId, userId: match[1] },
              });
            }
          } else if (op.value) {
            const toRemove = Array.isArray(op.value) ? op.value : [op.value];
            for (const member of toRemove) {
              await this.prisma.userGroupMembership.deleteMany({
                where: { groupId, userId: member.value },
              });
            }
          }
        } else if (op.op === 'replace' && op.value) {
          // Replace all members
          const newMemberIds = (Array.isArray(op.value) ? op.value : [op.value]).map(m => m.value);
          await this.updateGroupMembers(groupId, newMemberIds);
        }
      }
    }

    const group = await this.prisma.permissionGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: { user: true },
        },
      },
    });

    this.logger.log(`SCIM: Patched group ${groupId}`);
    return this.toScimGroup(group!);
  }

  async deleteGroup(organizationId: string, groupId: string): Promise<void> {
    const existing = await this.prisma.permissionGroup.findFirst({
      where: { id: groupId, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('Group not found');
    }

    // Delete memberships first
    await this.prisma.userGroupMembership.deleteMany({
      where: { groupId },
    });

    // Delete the group
    await this.prisma.permissionGroup.delete({
      where: { id: groupId },
    });

    this.logger.log(`SCIM: Deleted group ${groupId}`);
  }

  // ==================== Helpers ====================

  private async updateGroupMembers(groupId: string, memberIds: string[]): Promise<void> {
    // Remove all existing memberships
    await this.prisma.userGroupMembership.deleteMany({
      where: { groupId },
    });

    // Add new memberships
    if (memberIds.length > 0) {
      await this.prisma.userGroupMembership.createMany({
        data: memberIds.map(userId => ({
          groupId,
          userId,
        })),
        skipDuplicates: true,
      });
    }
  }

  private toScimUser(user: any, memberships?: any[]): ScimUserResource {
    const now = new Date().toISOString();
    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: user.id,
      externalId: user.keycloakId,
      userName: user.email,
      name: {
        formatted: user.displayName,
        givenName: user.firstName,
        familyName: user.lastName,
      },
      displayName: user.displayName,
      emails: [
        {
          value: user.email,
          type: 'work',
          primary: true,
        },
      ],
      active: user.status === 'active',
      groups: memberships?.map((m: any) => ({
        value: m.group.id,
        display: m.group.name,
        $ref: `/scim/v2/Groups/${m.group.id}`,
      })),
      meta: {
        resourceType: 'User',
        created: user.createdAt?.toISOString() || now,
        lastModified: user.updatedAt?.toISOString() || now,
        location: `/scim/v2/Users/${user.id}`,
      },
    };
  }

  private toScimGroup(group: any): ScimGroupResource {
    const now = new Date().toISOString();
    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      id: group.id,
      externalId: group.scimExternalId?.externalId,
      displayName: group.name,
      members: group.members?.map((m: any) => ({
        value: m.user.id,
        display: m.user.displayName,
        type: 'User',
        $ref: `/scim/v2/Users/${m.user.id}`,
      })),
      meta: {
        resourceType: 'Group',
        created: group.createdAt?.toISOString() || now,
        lastModified: group.updatedAt?.toISOString() || now,
        location: `/scim/v2/Groups/${group.id}`,
      },
    };
  }
}
