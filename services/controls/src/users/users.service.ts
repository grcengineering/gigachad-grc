import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { GroupsService } from '../permissions/groups.service';
import { UserStatus, UserRole } from '@prisma/client';
import {
  CreateUserDto,
  UpdateUserDto,
  SyncUserFromKeycloakDto,
  UserFilterDto,
  UserResponseDto,
  UserListResponseDto,
} from './dto/user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private groupsService: GroupsService,
  ) {}

  /**
   * Get all users with filters
   */
  async findAll(
    organizationId: string,
    filters: UserFilterDto,
    page: number = 1,
    limit: number = 50,
  ): Promise<UserListResponseDto> {
    const where: Record<string, unknown> = { organizationId };

    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { displayName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.groupId) {
      where.groupMemberships = {
        some: { groupId: filters.groupId },
      };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          groupMemberships: {
            include: {
              group: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { displayName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map(user => this.toResponseDto(user)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get a single user by ID
   */
  async findOne(id: string, organizationId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
      include: {
        groupMemberships: {
          include: {
            group: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toResponseDto(user);
  }

  /**
   * Get user by Keycloak ID (for login sync)
   */
  async findByKeycloakId(keycloakId: string): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { keycloakId },
      include: {
        groupMemberships: {
          include: {
            group: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return user ? this.toResponseDto(user) : null;
  }

  /**
   * Sync user from Keycloak on login
   * Creates user if doesn't exist, updates if does
   */
  async syncFromKeycloak(
    organizationId: string,
    dto: SyncUserFromKeycloakDto,
  ): Promise<UserResponseDto> {
    const displayName = dto.firstName && dto.lastName
      ? `${dto.firstName} ${dto.lastName}`
      : dto.email.split('@')[0];

    let user = await this.prisma.user.findUnique({
      where: { keycloakId: dto.keycloakId },
    });

    if (user) {
      // Update existing user
      user = await this.prisma.user.update({
        where: { keycloakId: dto.keycloakId },
        data: {
          email: dto.email,
          firstName: dto.firstName || '',
          lastName: dto.lastName || '',
          displayName: displayName,
          lastLoginAt: new Date(),
        },
      });

      this.logger.log(`Synced existing user: ${user.email}`);
    } else {
      // Create new user
      user = await this.prisma.user.create({
        data: {
          keycloakId: dto.keycloakId,
          organizationId,
          email: dto.email,
          firstName: dto.firstName || '',
          lastName: dto.lastName || '',
          displayName: displayName,
          role: dto.roles?.includes('admin') ? UserRole.admin : UserRole.viewer,
          lastLoginAt: new Date(),
        },
      });

      // Assign default permission group based on role
      try {
        const groups = await this.groupsService.findAll(organizationId);
        const defaultGroup = groups.find(g => 
          g.name === (dto.roles?.includes('admin') ? 'Administrator' : 'Viewer')
        );
        
        if (defaultGroup) {
          await this.groupsService.addMember(defaultGroup.id, user.id, organizationId);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`Failed to assign default group for user ${user.email}: ${errorMessage}`);
      }

      this.logger.log(`Created new user from Keycloak: ${user.email}`);

      // Audit log
      await this.auditService.log({
        organizationId,
        userId: user.id,
        userEmail: user.email,
        action: 'created',
        entityType: 'user',
        entityId: user.id,
        entityName: user.displayName,
        description: `User "${user.displayName}" created via Keycloak sync`,
      });
    }

    return this.findOne(user.id, organizationId);
  }

  /**
   * Create a new user manually
   */
  async create(
    organizationId: string,
    dto: CreateUserDto,
    actorId?: string,
    actorEmail?: string,
  ): Promise<UserResponseDto> {
    const existing = await this.prisma.user.findFirst({
      where: {
        organizationId,
        OR: [
          { keycloakId: dto.keycloakId },
          { email: dto.email },
        ],
      },
    });

    if (existing) {
      throw new ConflictException('User with this email or Keycloak ID already exists');
    }

    const displayName = dto.displayName || `${dto.firstName} ${dto.lastName}`;

    const user = await this.prisma.user.create({
      data: {
        keycloakId: dto.keycloakId,
        organizationId,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        displayName: displayName,
        role: (dto.role || UserRole.viewer) as UserRole,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId: actorId,
      userEmail: actorEmail,
      action: 'created',
      entityType: 'user',
      entityId: user.id,
      entityName: user.displayName,
      description: `Created user "${user.displayName}"`,
    });

    return this.findOne(user.id, organizationId);
  }

  /**
   * Update a user
   */
  async update(
    id: string,
    organizationId: string,
    dto: UpdateUserDto,
    actorId?: string,
    actorEmail?: string,
  ): Promise<UserResponseDto> {
    const existing = await this.prisma.user.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const displayName = dto.firstName && dto.lastName
      ? `${dto.firstName} ${dto.lastName}`
      : dto.displayName;

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        displayName: displayName || existing.displayName,
        role: dto.role as UserRole | undefined,
        status: dto.status as UserStatus | undefined,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId: actorId,
      userEmail: actorEmail,
      action: 'updated',
      entityType: 'user',
      entityId: user.id,
      entityName: user.displayName,
      description: `Updated user "${user.displayName}"`,
      changes: {
        before: { firstName: existing.firstName, lastName: existing.lastName, role: existing.role, status: existing.status },
        after: { firstName: user.firstName, lastName: user.lastName, role: user.role, status: user.status },
      },
    });

    return this.findOne(user.id, organizationId);
  }

  /**
   * Deactivate a user
   */
  async deactivate(
    id: string,
    organizationId: string,
    actorId?: string,
    actorEmail?: string,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.inactive },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId: actorId,
      userEmail: actorEmail,
      action: 'deactivated',
      entityType: 'user',
      entityId: id,
      entityName: user.displayName,
      description: `Deactivated user "${user.displayName}"`,
    });
  }

  /**
   * Reactivate a user
   */
  async reactivate(
    id: string,
    organizationId: string,
    actorId?: string,
    actorEmail?: string,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.active },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId: actorId,
      userEmail: actorEmail,
      action: 'reactivated',
      entityType: 'user',
      entityId: id,
      entityName: user.displayName,
      description: `Reactivated user "${user.displayName}"`,
    });
  }

  /**
   * Get user statistics
   */
  async getStats(organizationId: string) {
    const [total, active, inactive, byRole] = await Promise.all([
      this.prisma.user.count({ where: { organizationId } }),
      this.prisma.user.count({ where: { organizationId, status: UserStatus.active } }),
      this.prisma.user.count({ where: { organizationId, status: UserStatus.inactive } }),
      this.prisma.user.groupBy({
        by: ['role'],
        where: { organizationId },
        _count: true,
      }),
    ]);

    return {
      total,
      active,
      inactive,
      byRole: byRole.map(r => ({ role: r.role, count: r._count })),
    };
  }

  /**
   * Convert user entity to response DTO
   */
  private toResponseDto(user: Record<string, unknown>): UserResponseDto {
    const groupMemberships = user.groupMemberships as Array<Record<string, unknown>> | undefined;
    return {
      id: user.id as string,
      keycloakId: user.keycloakId as string,
      email: user.email as string,
      firstName: user.firstName as string,
      lastName: user.lastName as string,
      displayName: user.displayName as string,
      role: user.role as string,
      status: user.status as string,
      lastLoginAt: (user.lastLoginAt as Date) || undefined,
      groups: groupMemberships?.map((m) => {
        const group = m.group as Record<string, unknown>;
        return {
          id: group.id as string,
          name: group.name as string,
        };
      }) || [],
      createdAt: user.createdAt as Date,
      updatedAt: user.updatedAt as Date,
    };
  }
}



