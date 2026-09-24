import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserDelegation } from '@prisma/client';
import { auditMutation } from '../common/audit-mutation';
import {
  CreateDelegationDto,
  UpdateDelegationDto,
  DelegationDto,
  DelegationListQueryDto,
  DelegationScope,
  DelegationStatus,
  ActiveDelegationsDto,
} from './dto/delegation.dto';
import { 
  parsePaginationParams, 
  createPaginatedResponse,
} from '@gigachad-grc/shared';

interface DelegationRecord {
  id: string;
  organizationId: string;
  delegatorId: string;
  delegateeId: string;
  startDate: Date;
  endDate: Date;
  scopes: DelegationScope[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  revokedAt?: Date;
}

@Injectable()
export class DelegationService {
  private readonly logger = new Logger(DelegationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createDelegation(
    organizationId: string,
    delegatorId: string,
    dto: CreateDelegationDto,
  ): Promise<DelegationDto> {
    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    const now = new Date();

    if (startDate >= endDate) {
      throw new BadRequestException('End date must be after start date');
    }

    if (endDate <= now) {
      throw new BadRequestException('End date must be in the future');
    }

    // Can't delegate to yourself
    if (delegatorId === dto.delegateeId) {
      throw new BadRequestException('Cannot delegate to yourself');
    }

    // Check if delegatee exists in same org
    const [delegator, delegatee] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: delegatorId, organizationId } }),
      this.prisma.user.findFirst({ where: { id: dto.delegateeId, organizationId } }),
    ]);
    if (!delegator || !delegatee) {
      throw new NotFoundException('Delegatee not found in your organization');
    }

    const candidates = await this.prisma.userDelegation.findMany({
      where: {
        organizationId,
        delegatorId,
        delegateId: dto.delegateeId,
        revokedAt: null,
        endDate: { gt: now },
      },
    });
    const scopes = dto.scopes || [DelegationScope.ALL];
    const existing = candidates.find((candidate) =>
      this.hasOverlappingScopes(candidate.entityTypes as DelegationScope[], scopes),
    );

    if (existing) {
      throw new BadRequestException('Overlapping delegation already exists');
    }

    const created = await this.prisma.userDelegation.create({
      data: {
        organizationId,
        delegatorId,
        delegatorName: delegator.displayName,
        delegateId: dto.delegateeId,
        delegateName: delegatee.displayName,
        startDate,
        endDate,
        scope: scopes.includes(DelegationScope.ALL) ? DelegationScope.ALL : 'specific',
        entityTypes: scopes,
        reason: dto.notes,
        status: startDate > now ? DelegationStatus.PENDING : DelegationStatus.ACTIVE,
      },
    });
    await auditMutation(this.prisma, {
      organizationId,
      userId: delegatorId,
      action: 'CREATE',
      entityType: 'UserDelegation',
      entityId: created.id,
      description: `Created delegation to ${dto.delegateeId}`,
    });
    this.logger.log(`Created delegation ${created.id} from ${delegatorId} to ${dto.delegateeId}`);
    return this.toDto(this.toRecord(created));
  }

  async updateDelegation(
    organizationId: string,
    userId: string,
    delegationId: string,
    dto: UpdateDelegationDto,
  ): Promise<DelegationDto> {
    const delegation = await this.prisma.userDelegation.findFirst({
      where: { id: delegationId, organizationId },
    });
    if (!delegation) {
      throw new NotFoundException(`Delegation ${delegationId} not found`);
    }

    // Only delegator can update
    if (delegation.delegatorId !== userId) {
      throw new ForbiddenException('Only the delegator can update this delegation');
    }

    if (delegation.revokedAt) {
      throw new BadRequestException('Cannot update revoked delegation');
    }

    const updated = await this.prisma.userDelegation.update({
      where: { id: delegationId },
      data: {
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        entityTypes: dto.scopes,
        scope: dto.scopes
          ? dto.scopes.includes(DelegationScope.ALL) ? DelegationScope.ALL : 'specific'
          : undefined,
        reason: dto.notes,
      },
    });
    await auditMutation(this.prisma, {
      organizationId,
      userId,
      action: 'UPDATE',
      entityType: 'UserDelegation',
      entityId: delegationId,
      description: `Updated delegation ${delegationId}`,
    });
    return this.toDto(this.toRecord(updated));
  }

  async revokeDelegation(
    organizationId: string,
    userId: string,
    delegationId: string,
  ): Promise<void> {
    const delegation = await this.prisma.userDelegation.findFirst({
      where: { id: delegationId, organizationId },
    });
    if (!delegation) {
      throw new NotFoundException(`Delegation ${delegationId} not found`);
    }

    // Only delegator can revoke
    if (delegation.delegatorId !== userId) {
      throw new ForbiddenException('Only the delegator can revoke this delegation');
    }

    await this.prisma.userDelegation.update({
      where: { id: delegationId },
      data: {
        revokedAt: new Date(),
        revokedBy: userId,
        status: DelegationStatus.REVOKED,
      },
    });
    await auditMutation(this.prisma, {
      organizationId,
      userId,
      action: 'REVOKE',
      entityType: 'UserDelegation',
      entityId: delegationId,
      description: `Revoked delegation ${delegationId}`,
    });

    this.logger.log(`Revoked delegation ${delegationId}`);
  }

  async getDelegation(
    organizationId: string,
    delegationId: string,
  ): Promise<DelegationDto> {
    const delegation = await this.prisma.userDelegation.findFirst({
      where: { id: delegationId, organizationId },
    });
    if (!delegation) {
      throw new NotFoundException(`Delegation ${delegationId} not found`);
    }
    return this.toDto(this.toRecord(delegation));
  }

  async listDelegations(
    organizationId: string,
    userId: string,
    query: DelegationListQueryDto,
  ) {
    const pagination = parsePaginationParams({
      page: query.page,
      limit: query.limit,
    });

    const roleFilter = query.asDelegator && !query.asDelegatee
      ? { delegatorId: userId }
      : query.asDelegatee && !query.asDelegator
        ? { delegateId: userId }
        : { OR: [{ delegatorId: userId }, { delegateId: userId }] };
    let delegations = (await this.prisma.userDelegation.findMany({
      where: { organizationId, ...roleFilter },
      orderBy: { createdAt: 'desc' },
    })).map((delegation) => this.toRecord(delegation));

    if (query.status) {
      delegations = delegations.filter(d => this.getStatus(d) === query.status);
    }

    const total = delegations.length;
    const offset = (pagination.page - 1) * pagination.limit;
    const paginatedDelegations = delegations.slice(offset, offset + pagination.limit);

    return createPaginatedResponse(
      await Promise.all(paginatedDelegations.map(d => this.toDto(d))),
      total,
      pagination,
    );
  }

  async getActiveDelegations(
    organizationId: string,
    userId: string,
  ): Promise<ActiveDelegationsDto> {
    const now = new Date();

    const allDelegations = (await this.prisma.userDelegation.findMany({
      where: {
        organizationId,
        revokedAt: null,
        startDate: { lte: now },
        endDate: { gt: now },
        OR: [{ delegatorId: userId }, { delegateId: userId }],
      },
    })).map((delegation) => this.toRecord(delegation));

    const outgoing = await Promise.all(
      allDelegations
        .filter(d => d.delegatorId === userId)
        .map(d => this.toDto(d))
    );

    const incoming = await Promise.all(
      allDelegations
        .filter(d => d.delegateeId === userId)
        .map(d => this.toDto(d))
    );

    return { outgoing, incoming };
  }

  async checkDelegation(
    organizationId: string,
    delegatorId: string,
    delegateeId: string,
    scope: DelegationScope,
  ): Promise<boolean> {
    const now = new Date();

    const delegations = await this.prisma.userDelegation.findMany({
      where: {
        organizationId,
        delegatorId,
        delegateId: delegateeId,
        revokedAt: null,
        startDate: { lte: now },
        endDate: { gt: now },
      },
      select: { entityTypes: true },
    });
    return delegations.some((delegation) => {
      const scopes = delegation.entityTypes as DelegationScope[];
      return scopes.includes(DelegationScope.ALL) || scopes.includes(scope);
    });
  }

  private getStatus(delegation: DelegationRecord): DelegationStatus {
    const now = new Date();

    if (delegation.revokedAt) {
      return DelegationStatus.REVOKED;
    }

    if (delegation.endDate <= now) {
      return DelegationStatus.EXPIRED;
    }

    if (delegation.startDate > now) {
      return DelegationStatus.PENDING;
    }

    return DelegationStatus.ACTIVE;
  }

  private hasOverlappingScopes(scopes1: DelegationScope[], scopes2: DelegationScope[]): boolean {
    if (scopes1.includes(DelegationScope.ALL) || scopes2.includes(DelegationScope.ALL)) {
      return true;
    }
    return scopes1.some(s => scopes2.includes(s));
  }

  private toRecord(delegation: UserDelegation): DelegationRecord {
    return {
      id: delegation.id,
      organizationId: delegation.organizationId,
      delegatorId: delegation.delegatorId,
      delegateeId: delegation.delegateId,
      startDate: delegation.startDate,
      endDate: delegation.endDate,
      scopes: delegation.entityTypes as DelegationScope[],
      notes: delegation.reason ?? undefined,
      createdAt: delegation.createdAt,
      updatedAt: delegation.updatedAt,
      revokedAt: delegation.revokedAt ?? undefined,
    };
  }

  private async toDto(delegation: DelegationRecord): Promise<DelegationDto> {
    // Fetch user info
    const [delegator, delegatee] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: delegation.delegatorId },
        select: { displayName: true, email: true },
      }),
      this.prisma.user.findUnique({
        where: { id: delegation.delegateeId },
        select: { displayName: true, email: true },
      }),
    ]);

    return {
      id: delegation.id,
      delegatorId: delegation.delegatorId,
      delegatorName: delegator?.displayName || 'Unknown',
      delegatorEmail: delegator?.email || '',
      delegateeId: delegation.delegateeId,
      delegateeName: delegatee?.displayName || 'Unknown',
      delegateeEmail: delegatee?.email || '',
      startDate: delegation.startDate,
      endDate: delegation.endDate,
      scopes: delegation.scopes,
      status: this.getStatus(delegation),
      notes: delegation.notes,
      createdAt: delegation.createdAt,
      updatedAt: delegation.updatedAt,
    };
  }
}
