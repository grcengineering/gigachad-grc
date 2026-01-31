import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceStatus, WorkspaceRole, UserRole } from '@prisma/client';
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  AddWorkspaceMemberDto,
  UpdateWorkspaceMemberDto,
  WorkspaceFilterDto,
} from './dto/workspace.dto';

@Injectable()
export class WorkspaceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate a URL-safe slug from a name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  /**
   * Check if multi-workspace mode is enabled for an organization
   */
  async isMultiWorkspaceEnabled(organizationId: string): Promise<boolean> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { multiWorkspaceEnabled: true },
    });
    return org?.multiWorkspaceEnabled ?? false;
  }

  /**
   * Enable or disable multi-workspace mode for an organization
   * When enabling, creates a default workspace if none exists
   */
  async toggleMultiWorkspace(organizationId: string, enabled: boolean, userId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { workspaces: true },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // If disabling, check if there's only one workspace
    if (!enabled && org.workspaces.length > 1) {
      throw new BadRequestException(
        'Cannot disable multi-workspace mode when more than one workspace exists. ' +
        'Please archive or delete other workspaces first.'
      );
    }

    // If enabling and no workspaces exist, create default workspace
    if (enabled && org.workspaces.length === 0) {
      await this.createDefaultWorkspace(organizationId, userId);
    }

    // Update the organization
    return this.prisma.organization.update({
      where: { id: organizationId },
      data: { multiWorkspaceEnabled: enabled },
    });
  }

  /**
   * Create a default workspace for an organization and migrate existing data
   */
  async createDefaultWorkspace(organizationId: string, _userId: string) {
    // Create the default workspace
    const workspace = await this.prisma.workspace.create({
      data: {
        organizationId,
        name: 'Default',
        slug: 'default',
        description: 'Default workspace for existing data',
        status: WorkspaceStatus.active,
        settings: {},
      },
    });

    // Add all org users as workspace members
    const orgUsers = await this.prisma.user.findMany({
      where: { organizationId },
      select: { id: true, role: true },
    });

    await this.prisma.workspaceMember.createMany({
      data: orgUsers.map(user => ({
        workspaceId: workspace.id,
        userId: user.id,
        role: user.role === UserRole.admin ? WorkspaceRole.owner : WorkspaceRole.contributor,
      })),
    });

    // Migrate existing data to the default workspace
    await this.migrateDataToWorkspace(organizationId, workspace.id);

    return workspace;
  }

  /**
   * Migrate existing org-level data to a workspace
   */
  private async migrateDataToWorkspace(organizationId: string, workspaceId: string) {
    // Update all entities with null workspaceId to use the new workspace
    await Promise.all([
      this.prisma.controlImplementation.updateMany({
        where: { organizationId, workspaceId: null },
        data: { workspaceId },
      }),
      this.prisma.evidence.updateMany({
        where: { organizationId, workspaceId: null },
        data: { workspaceId },
      }),
      this.prisma.risk.updateMany({
        where: { organizationId, workspaceId: null },
        data: { workspaceId },
      }),
      this.prisma.vendor.updateMany({
        where: { organizationId, workspaceId: null },
        data: { workspaceId },
      }),
      this.prisma.asset.updateMany({
        where: { organizationId, workspaceId: null },
        data: { workspaceId },
      }),
      this.prisma.audit.updateMany({
        where: { organizationId, workspaceId: null },
        data: { workspaceId },
      }),
    ]);
  }

  /**
   * List workspaces for an organization (filtered by user access if not admin)
   */
  async findAll(organizationId: string, userId: string, userRole: UserRole, filters?: WorkspaceFilterDto) {
    // Org admins can see all workspaces
    if (userRole === UserRole.admin) {
      const workspaces = await this.prisma.workspace.findMany({
        where: {
          organizationId,
          ...(filters?.status && { status: filters.status }),
        },
        include: {
          _count: {
            select: { members: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      return workspaces.map(w => ({
        ...w,
        memberCount: w._count.members,
      }));
    }

    // Non-admins see only workspaces they're members of
    const workspaces = await this.prisma.workspace.findMany({
      where: {
        organizationId,
        members: {
          some: { userId },
        },
        ...(filters?.status && { status: filters.status }),
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return workspaces.map(w => ({
      ...w,
      memberCount: w._count.members,
    }));
  }

  /**
   * Get a single workspace by ID
   */
  async findOne(id: string, organizationId: string, userId: string, userRole: UserRole) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id, organizationId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                displayName: true,
              },
            },
          },
        },
        _count: {
          select: {
            implementations: true,
            evidence: true,
            risks: true,
            vendors: true,
            assets: true,
            audits: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Check access for non-admins
    if (userRole !== UserRole.admin) {
      const isMember = workspace.members.some(m => m.userId === userId);
      if (!isMember) {
        throw new ForbiddenException('You do not have access to this workspace');
      }
    }

    return workspace;
  }

  /**
   * Create a new workspace
   */
  async create(organizationId: string, userId: string, dto: CreateWorkspaceDto) {
    // Generate slug if not provided
    const slug = dto.slug || this.generateSlug(dto.name);

    // Check for duplicate slug
    const existing = await this.prisma.workspace.findFirst({
      where: { organizationId, slug },
    });

    if (existing) {
      throw new BadRequestException(`Workspace with slug "${slug}" already exists`);
    }

    // Create workspace
    const workspace = await this.prisma.workspace.create({
      data: {
        organizationId,
        name: dto.name,
        slug,
        description: dto.description,
        status: WorkspaceStatus.active,
        settings: {},
      },
    });

    // Add creator as owner
    await this.prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        role: WorkspaceRole.owner,
      },
    });

    return workspace;
  }

  /**
   * Update a workspace
   */
  async update(id: string, organizationId: string, dto: UpdateWorkspaceDto) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id, organizationId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Extract settings and handle JSON serialization
    const { settings, ...restDto } = dto;
    return this.prisma.workspace.update({
      where: { id },
      data: {
        ...restDto,
        ...(settings !== undefined && { settings: JSON.parse(JSON.stringify(settings)) }),
      },
    });
  }

  /**
   * Delete (archive) a workspace
   */
  async remove(id: string, organizationId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id, organizationId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Check if this is the last active workspace
    const activeCount = await this.prisma.workspace.count({
      where: { organizationId, status: WorkspaceStatus.active },
    });

    if (activeCount <= 1 && workspace.status === WorkspaceStatus.active) {
      throw new BadRequestException('Cannot delete the last active workspace');
    }

    // Archive the workspace instead of hard delete
    return this.prisma.workspace.update({
      where: { id },
      data: { status: WorkspaceStatus.archived },
    });
  }

  /**
   * Add a member to a workspace
   */
  async addMember(workspaceId: string, organizationId: string, dto: AddWorkspaceMemberDto) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, organizationId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Verify user belongs to same organization
    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, organizationId },
    });

    if (!user) {
      throw new NotFoundException('User not found in organization');
    }

    // Check if already a member
    const existing = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: dto.userId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('User is already a member of this workspace');
    }

    return this.prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: dto.userId,
        role: dto.role || WorkspaceRole.viewer,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            displayName: true,
          },
        },
      },
    });
  }

  /**
   * Update a member's role
   */
  async updateMember(workspaceId: string, userId: string, organizationId: string, dto: UpdateWorkspaceMemberDto) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, organizationId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in workspace');
    }

    return this.prisma.workspaceMember.update({
      where: { id: member.id },
      data: { role: dto.role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            displayName: true,
          },
        },
      },
    });
  }

  /**
   * Remove a member from a workspace
   */
  async removeMember(workspaceId: string, userId: string, organizationId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, organizationId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in workspace');
    }

    // Check if this is the last owner
    if (member.role === WorkspaceRole.owner) {
      const ownerCount = await this.prisma.workspaceMember.count({
        where: { workspaceId, role: WorkspaceRole.owner },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot remove the last owner of a workspace');
      }
    }

    return this.prisma.workspaceMember.delete({
      where: { id: member.id },
    });
  }

  /**
   * Get workspace dashboard stats
   */
  async getDashboard(workspaceId: string, organizationId: string, userId: string, userRole: UserRole) {
    const workspace = await this.findOne(workspaceId, organizationId, userId, userRole);

    const [
      totalControls,
      implementedControls,
      totalRisks,
      openRisks,
      totalEvidence,
      pendingEvidence,
      vendorCount,
      assetCount,
    ] = await Promise.all([
      this.prisma.controlImplementation.count({ where: { workspaceId } }),
      this.prisma.controlImplementation.count({ where: { workspaceId, status: 'implemented' } }),
      this.prisma.risk.count({ where: { workspaceId } }),
      this.prisma.risk.count({
        where: {
          workspaceId,
          status: { in: ['risk_identified', 'actual_risk', 'risk_analysis_in_progress', 'risk_analyzed'] },
        },
      }),
      this.prisma.evidence.count({ where: { workspaceId } }),
      this.prisma.evidence.count({ where: { workspaceId, status: 'pending_review' } }),
      this.prisma.vendor.count({ where: { workspaceId } }),
      this.prisma.asset.count({ where: { workspaceId } }),
    ]);

    const complianceScore = totalControls > 0 
      ? Math.round((implementedControls / totalControls) * 100) 
      : 0;

    return {
      workspace,
      stats: {
        totalControls,
        implementedControls,
        totalRisks,
        openRisks,
        totalEvidence,
        pendingEvidence,
        vendorCount,
        assetCount,
      },
      complianceScore,
    };
  }

  /**
   * Get consolidated org-level dashboard (admin only)
   */
  async getOrgDashboard(organizationId: string) {
    const workspaces = await this.prisma.workspace.findMany({
      where: { organizationId, status: WorkspaceStatus.active },
      include: {
        _count: {
          select: {
            implementations: true,
            evidence: true,
            risks: true,
            vendors: true,
            assets: true,
          },
        },
      },
    });

    const workspaceStats = await Promise.all(
      workspaces.map(async (ws) => {
        const implementedCount = await this.prisma.controlImplementation.count({
          where: { workspaceId: ws.id, status: 'implemented' },
        });

        const complianceScore = ws._count.implementations > 0
          ? Math.round((implementedCount / ws._count.implementations) * 100)
          : 0;

        return {
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          complianceScore,
          stats: {
            controls: ws._count.implementations,
            evidence: ws._count.evidence,
            risks: ws._count.risks,
            vendors: ws._count.vendors,
            assets: ws._count.assets,
          },
        };
      })
    );

    // Calculate org-wide totals
    const totals = workspaceStats.reduce(
      (acc, ws) => ({
        controls: acc.controls + ws.stats.controls,
        evidence: acc.evidence + ws.stats.evidence,
        risks: acc.risks + ws.stats.risks,
        vendors: acc.vendors + ws.stats.vendors,
        assets: acc.assets + ws.stats.assets,
      }),
      { controls: 0, evidence: 0, risks: 0, vendors: 0, assets: 0 }
    );

    const avgComplianceScore = workspaceStats.length > 0
      ? Math.round(workspaceStats.reduce((sum, ws) => sum + ws.complianceScore, 0) / workspaceStats.length)
      : 0;

    return {
      workspaces: workspaceStats,
      totals,
      avgComplianceScore,
    };
  }

  /**
   * Check if user has access to a workspace
   */
  async checkAccess(workspaceId: string, userId: string, userRole: UserRole): Promise<WorkspaceRole | null> {
    // Org admins have implicit owner access
    if (userRole === UserRole.admin) {
      return WorkspaceRole.owner;
    }

    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    return member?.role ?? null;
  }
}




