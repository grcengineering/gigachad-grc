import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, UserRole } from '@prisma/client';
import {
  UpdateProgressDto,
  StartModuleDto,
  CompleteModuleDto,
  CreateAssignmentDto,
  BulkAssignDto,
  UpdateAssignmentDto,
  CreateCampaignDto,
  UpdateCampaignDto,
  CreateCustomModuleDto,
  UpdateCustomModuleDto,
  TrainingStatsResponse,
  TrainingStatus,
  AssignmentStatus,
} from './dto/training.dto';
import { sanitizeFilename, isValidUuid } from '@gigachad-grc/shared';
import { DOMParser } from '@xmldom/xmldom';
import JSZip from 'jszip';
import PDFDocument from 'pdfkit';
import * as path from 'path';
import * as crypto from 'crypto';
import { persistScormPackage, removeScormPackage } from './scorm-storage';

// Static module IDs from frontend catalog
const VALID_MODULE_IDS = [
  'phishing-smishing-vishing',
  'ceo-executive-fraud',
  'watering-hole-attacks',
  'general-cybersecurity',
  'privacy-awareness',
  'secure-coding',
  'combined-training',
];
const MAX_SCORM_ENTRIES = 5000;
const MAX_SCORM_EXPANDED_BYTES = 500 * 1024 * 1024;

@Injectable()
export class TrainingService {
  private readonly logger = new Logger(TrainingService.name);

  constructor(private prisma: PrismaService) {}

  // ==========================================
  // Progress Management
  // ==========================================

  async getProgress(organizationId: string, userId: string) {
    return this.prisma.trainingProgress.findMany({
      where: { organizationId, userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getModuleProgress(organizationId: string, userId: string, moduleId: string) {
    return this.prisma.trainingProgress.findFirst({
      where: { organizationId, userId, moduleId },
    });
  }

  async startModule(organizationId: string, userId: string, dto: StartModuleDto) {
    await this.assertModuleIds(organizationId, [dto.moduleId]);

    // Check if progress already exists
    const existing = await this.prisma.trainingProgress.findFirst({
      where: { userId, moduleId: dto.moduleId },
    });

    if (existing) {
      // Update existing progress
      return this.prisma.trainingProgress.update({
        where: { id: existing.id },
        data: {
          status: TrainingStatus.in_progress,
          startedAt: existing.startedAt || new Date(),
          lastAccessedAt: new Date(),
        },
      });
    }

    // Create new progress record
    return this.prisma.trainingProgress.create({
      data: {
        organizationId,
        userId,
        moduleId: dto.moduleId,
        status: TrainingStatus.in_progress,
        startedAt: new Date(),
        lastAccessedAt: new Date(),
        slideProgress: 0,
        timeSpent: 0,
      },
    });
  }

  async updateProgress(
    organizationId: string,
    userId: string,
    moduleId: string,
    dto: UpdateProgressDto
  ) {
    const progress = await this.prisma.trainingProgress.findFirst({
      where: { userId, moduleId },
    });

    if (!progress) {
      // Create new progress if it doesn't exist
      return this.prisma.trainingProgress.create({
        data: {
          organizationId,
          userId,
          moduleId,
          status: dto.status || TrainingStatus.in_progress,
          slideProgress: dto.slideProgress || 0,
          timeSpent: dto.timeSpent || 0,
          score: dto.score,
          startedAt: new Date(),
          lastAccessedAt: new Date(),
        },
      });
    }

    const updateData: {
      lastAccessedAt: Date;
      status?: string;
      score?: number;
      slideProgress?: number;
      timeSpent?: number;
    } = {
      lastAccessedAt: new Date(),
    };

    if (dto.status) updateData.status = dto.status;
    if (dto.score !== undefined) updateData.score = dto.score;
    if (dto.slideProgress !== undefined) updateData.slideProgress = dto.slideProgress;
    if (dto.timeSpent !== undefined) {
      // Add to existing time spent
      updateData.timeSpent = progress.timeSpent + dto.timeSpent;
    }

    return this.prisma.trainingProgress.update({
      where: { id: progress.id },
      data: updateData,
    });
  }

  async completeModule(organizationId: string, userId: string, dto: CompleteModuleDto) {
    await this.assertModuleIds(organizationId, [dto.moduleId]);

    const progress = await this.prisma.trainingProgress.findFirst({
      where: { userId, moduleId: dto.moduleId },
    });

    if (progress) {
      const updated = await this.prisma.trainingProgress.update({
        where: { id: progress.id },
        data: {
          status: TrainingStatus.completed,
          completedAt: new Date(),
          lastAccessedAt: new Date(),
          slideProgress: 100,
          score: dto.score,
        },
      });

      // Also update any related assignment
      await this.prisma.trainingAssignment.updateMany({
        where: {
          userId,
          moduleId: dto.moduleId,
          status: { not: AssignmentStatus.completed },
        },
        data: {
          status: AssignmentStatus.completed,
          completedAt: new Date(),
        },
      });

      return updated;
    }

    // Create completed progress if it doesn't exist
    const created = await this.prisma.trainingProgress.create({
      data: {
        organizationId,
        userId,
        moduleId: dto.moduleId,
        status: TrainingStatus.completed,
        completedAt: new Date(),
        lastAccessedAt: new Date(),
        slideProgress: 100,
        score: dto.score,
        timeSpent: 0,
      },
    });

    // Update any related assignment
    await this.prisma.trainingAssignment.updateMany({
      where: {
        userId,
        moduleId: dto.moduleId,
        status: { not: AssignmentStatus.completed },
      },
      data: {
        status: AssignmentStatus.completed,
        completedAt: new Date(),
      },
    });

    return created;
  }

  async getStats(organizationId: string, userId: string): Promise<TrainingStatsResponse> {
    const allProgress = await this.prisma.trainingProgress.findMany({
      where: { organizationId, userId },
      select: {
        status: true,
        timeSpent: true,
        score: true,
      },
    });

    const completed = allProgress.filter((p) => p.status === TrainingStatus.completed);
    const inProgress = allProgress.filter((p) => p.status === TrainingStatus.in_progress);
    const totalTime = allProgress.reduce((acc, p) => acc + p.timeSpent, 0);
    const avgScore =
      completed.length > 0
        ? completed.reduce((acc, p) => acc + (p.score || 0), 0) / completed.length
        : 0;

    const xp = completed.length * 100 + inProgress.length * 25;
    const level = Math.floor(xp / 200) + 1;

    return {
      totalModules: VALID_MODULE_IDS.length - 1, // Exclude combined-training from count
      completedModules: completed.length,
      inProgressModules: inProgress.length,
      totalTimeSpent: totalTime,
      averageScore: Math.round(avgScore),
      certificationsEarned: completed.length,
      streak: 0, // Would need date tracking for streaks
      xp,
      level,
    };
  }

  async getMyTraining(organizationId: string, userId: string) {
    await this.updateOverdueAssignments(organizationId);

    const [assignments, progress, certificates] = await Promise.all([
      this.prisma.trainingAssignment.findMany({
        where: { organizationId, userId },
        orderBy: [{ dueDate: 'asc' }, { assignedAt: 'desc' }],
      }),
      this.prisma.trainingProgress.findMany({
        where: { organizationId, userId },
      }),
      this.getUserCertificates(organizationId, userId),
    ]);

    const progressByModule = new Map(progress.map((item) => [item.moduleId, item]));
    const courses = assignments.map((assignment) => {
      const moduleProgress = progressByModule.get(assignment.moduleId);
      const status =
        assignment.status === AssignmentStatus.pending ? 'not_started' : assignment.status;
      return {
        id: assignment.id,
        courseId: assignment.moduleId,
        title: this.getModuleName(assignment.moduleId),
        status:
          moduleProgress?.status === TrainingStatus.completed ? TrainingStatus.completed : status,
        progress:
          moduleProgress?.status === TrainingStatus.completed
            ? 100
            : (moduleProgress?.slideProgress ?? 0),
        dueDate: assignment.dueDate,
      };
    });

    const completed = courses.filter((course) => course.status === TrainingStatus.completed).length;
    const inProgress = courses.filter(
      (course) => course.status === TrainingStatus.in_progress
    ).length;
    const overdue = courses.filter((course) => course.status === AssignmentStatus.overdue).length;

    return {
      summary: {
        assigned: courses.length,
        inProgress,
        completed,
        overdue,
        completionPct: courses.length > 0 ? Math.round((completed / courses.length) * 100) : 0,
      },
      courses,
      certificates: certificates.map((certificate) => ({
        id: certificate.id,
        name: 'Certificate of Completion',
        courseName: certificate.moduleName,
        issuedAt: certificate.issuedAt,
        expiresAt: certificate.expiresAt,
        pdfUrl: `/api/training/certificates/${certificate.id}/pdf`,
      })),
    };
  }

  async getAdminCampaigns(organizationId: string, filters: { search?: string; status?: string }) {
    await this.updateOverdueAssignments(organizationId);
    const [campaigns, assignments] = await Promise.all([
      this.prisma.trainingCampaign.findMany({
        where: { organizationId },
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.trainingAssignment.findMany({
        where: { organizationId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
      }),
    ]);

    const now = new Date();
    const normalized = campaigns.map((campaign) => {
      const moduleIds = campaign.moduleIds as string[];
      const targetGroups = campaign.targetGroups as string[];
      const related = assignments.filter(
        (assignment) =>
          moduleIds.includes(assignment.moduleId) && assignment.assignedAt >= campaign.createdAt
      );
      const completed = related.filter(
        (assignment) => assignment.status === AssignmentStatus.completed
      ).length;
      const overdueAssignments = related.filter(
        (assignment) => assignment.status === AssignmentStatus.overdue
      );
      const status = !campaign.isActive
        ? campaign.endDate && campaign.endDate < now
          ? 'archived'
          : 'draft'
        : campaign.startDate > now
          ? 'scheduled'
          : campaign.endDate && campaign.endDate < now
            ? 'completed'
            : 'active';

      return {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        status,
        audience: targetGroups.join(', '),
        audienceLabel: targetGroups.includes('all') ? 'All employees' : targetGroups.join(', '),
        assigned: related.length,
        completed,
        completionPct: related.length > 0 ? Math.round((completed / related.length) * 100) : 0,
        overdue: overdueAssignments.length,
        dueDate: campaign.endDate,
        startDate: campaign.startDate,
        moduleIds,
        targetGroups,
        isActive: campaign.isActive,
        assignments: related.map((assignment) => ({
          id: assignment.id,
          userId: assignment.user.id,
          name: assignment.user.displayName,
          email: assignment.user.email,
          moduleId: assignment.moduleId,
          moduleName: this.getModuleName(assignment.moduleId),
          status: assignment.status,
          dueDate: assignment.dueDate,
        })),
        overdueUsers: overdueAssignments.map((assignment) => ({
          id: assignment.user.id,
          name: assignment.user.displayName,
          email: assignment.user.email,
          dueDate: assignment.dueDate,
        })),
      };
    });

    const search = filters.search?.trim().toLowerCase();
    const visible = normalized.filter(
      (campaign) =>
        (!search ||
          campaign.name.toLowerCase().includes(search) ||
          campaign.description?.toLowerCase().includes(search)) &&
        (!filters.status || campaign.status === filters.status)
    );
    const totalAssignments = normalized.reduce((sum, item) => sum + item.assigned, 0);
    const totalCompleted = normalized.reduce((sum, item) => sum + item.completed, 0);

    return {
      campaigns: visible,
      total: visible.length,
      summary: {
        activeCampaigns: normalized.filter((item) => item.status === 'active').length,
        totalAssignments,
        completionPct:
          totalAssignments > 0 ? Math.round((totalCompleted / totalAssignments) * 100) : 0,
        overdueCount: normalized.reduce((sum, item) => sum + item.overdue, 0),
      },
    };
  }

  // ==========================================
  // Assignment Management
  // ==========================================

  async getAssignments(organizationId: string, userId?: string) {
    const where: { organizationId: string; userId?: string } = { organizationId };
    if (userId) {
      where.userId = userId;
    }

    // Update overdue assignments
    await this.updateOverdueAssignments(organizationId);

    return this.prisma.trainingAssignment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        assigner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createAssignment(organizationId: string, assignedBy: string, dto: CreateAssignmentDto) {
    await this.assertModuleIds(organizationId, [dto.moduleId]);
    await this.assertUsersBelongToOrganization(organizationId, [dto.userId]);

    // Check for existing assignment
    const existing = await this.prisma.trainingAssignment.findFirst({
      where: { organizationId, userId: dto.userId, moduleId: dto.moduleId },
    });

    if (existing) {
      throw new BadRequestException('This training is already assigned to the user');
    }

    return this.prisma.trainingAssignment.create({
      data: {
        organizationId,
        userId: dto.userId,
        moduleId: dto.moduleId,
        assignedBy,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        isRequired: dto.isRequired ?? true,
        status: AssignmentStatus.pending,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async bulkAssign(organizationId: string, assignedBy: string, dto: BulkAssignDto) {
    await this.assertModuleIds(organizationId, dto.moduleIds);
    await this.assertUsersBelongToOrganization(organizationId, dto.userIds);
    const assignments = [];

    for (const userId of dto.userIds) {
      for (const moduleId of dto.moduleIds) {
        // Check for existing assignment
        const existing = await this.prisma.trainingAssignment.findFirst({
          where: { organizationId, userId, moduleId },
        });

        if (!existing) {
          const assignment = await this.prisma.trainingAssignment.create({
            data: {
              organizationId,
              userId,
              moduleId,
              assignedBy,
              dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
              isRequired: dto.isRequired ?? true,
              status: AssignmentStatus.pending,
            },
          });
          assignments.push(assignment);
        }
      }
    }

    return { count: assignments.length, assignments };
  }

  async updateAssignment(organizationId: string, assignmentId: string, dto: UpdateAssignmentDto) {
    const assignment = await this.prisma.trainingAssignment.findFirst({
      where: { id: assignmentId, organizationId },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }

    const updateData: {
      status?: string;
      dueDate?: Date | null;
      isRequired?: boolean;
      completedAt?: Date;
    } = {};
    if (dto.status) updateData.status = dto.status;
    if (dto.dueDate !== undefined) updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.isRequired !== undefined) updateData.isRequired = dto.isRequired;

    if (dto.status === AssignmentStatus.completed) {
      updateData.completedAt = new Date();
    }

    return this.prisma.trainingAssignment.update({
      where: { id: assignmentId },
      data: updateData,
    });
  }

  async deleteAssignment(organizationId: string, assignmentId: string) {
    const assignment = await this.prisma.trainingAssignment.findFirst({
      where: { id: assignmentId, organizationId },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }

    return this.prisma.trainingAssignment.delete({
      where: { id: assignmentId },
    });
  }

  private async updateOverdueAssignments(organizationId: string) {
    const now = new Date();
    await this.prisma.trainingAssignment.updateMany({
      where: {
        organizationId,
        status: { in: [AssignmentStatus.pending, AssignmentStatus.in_progress] },
        dueDate: { lt: now },
      },
      data: {
        status: AssignmentStatus.overdue,
      },
    });
  }

  // ==========================================
  // Campaign Management
  // ==========================================

  async getCampaigns(organizationId: string) {
    return this.prisma.trainingCampaign.findMany({
      where: { organizationId },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async getCampaign(organizationId: string, campaignId: string) {
    const campaign = await this.prisma.trainingCampaign.findFirst({
      where: { id: campaignId, organizationId },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    return campaign;
  }

  async createCampaign(organizationId: string, createdBy: string, dto: CreateCampaignDto) {
    await this.assertModuleIds(organizationId, dto.moduleIds);
    this.assertTargetGroups(dto.targetGroups);

    return this.prisma.trainingCampaign.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        moduleIds: dto.moduleIds,
        targetGroups: dto.targetGroups,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        isActive: dto.isActive ?? true,
        createdBy,
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async updateCampaign(organizationId: string, campaignId: string, dto: UpdateCampaignDto) {
    const campaign = await this.prisma.trainingCampaign.findFirst({
      where: { id: campaignId, organizationId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    if (dto.moduleIds) {
      await this.assertModuleIds(organizationId, dto.moduleIds);
    }
    if (dto.targetGroups) {
      this.assertTargetGroups(dto.targetGroups);
    }

    const updateData: {
      name?: string;
      description?: string | null;
      moduleIds?: string[];
      targetGroups?: string[];
      startDate?: Date;
      endDate?: Date | null;
      isActive?: boolean;
    } = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.moduleIds) updateData.moduleIds = dto.moduleIds;
    if (dto.targetGroups) updateData.targetGroups = dto.targetGroups;
    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) updateData.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return this.prisma.trainingCampaign.update({
      where: { id: campaignId },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async deleteCampaign(organizationId: string, campaignId: string) {
    const campaign = await this.prisma.trainingCampaign.findFirst({
      where: { id: campaignId, organizationId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    return this.prisma.trainingCampaign.delete({
      where: { id: campaignId },
    });
  }

  // ==========================================
  // Organization-wide Stats
  // ==========================================

  async getOrgStats(organizationId: string) {
    const [
      totalProgress,
      completedProgress,
      totalAssignments,
      completedAssignments,
      overdueAssignments,
      activeCampaigns,
    ] = await Promise.all([
      this.prisma.trainingProgress.count({ where: { organizationId } }),
      this.prisma.trainingProgress.count({
        where: { organizationId, status: TrainingStatus.completed },
      }),
      this.prisma.trainingAssignment.count({ where: { organizationId } }),
      this.prisma.trainingAssignment.count({
        where: { organizationId, status: AssignmentStatus.completed },
      }),
      this.prisma.trainingAssignment.count({
        where: { organizationId, status: AssignmentStatus.overdue },
      }),
      this.prisma.trainingCampaign.count({
        where: { organizationId, isActive: true },
      }),
    ]);

    return {
      totalProgress,
      completedProgress,
      completionRate: totalProgress > 0 ? Math.round((completedProgress / totalProgress) * 100) : 0,
      totalAssignments,
      completedAssignments,
      overdueAssignments,
      assignmentCompletionRate:
        totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0,
      activeCampaigns,
    };
  }

  // ==========================================
  // Custom Module Management
  // ==========================================

  async getCustomModules(organizationId: string) {
    return this.prisma.customTrainingModule.findMany({
      where: { organizationId },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCustomModule(organizationId: string, moduleId: string) {
    const module = await this.prisma.customTrainingModule.findFirst({
      where: { id: moduleId, organizationId },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!module) {
      throw new NotFoundException(`Custom module ${moduleId} not found`);
    }

    return module;
  }

  async createCustomModule(organizationId: string, createdBy: string, dto: CreateCustomModuleDto) {
    return this.prisma.customTrainingModule.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        category: dto.category || 'custom',
        duration: dto.duration || 30,
        difficulty: dto.difficulty || 'beginner',
        iconType: dto.iconType || 'security',
        topics: dto.topics || [],
        createdBy,
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async updateCustomModule(organizationId: string, moduleId: string, dto: UpdateCustomModuleDto) {
    const module = await this.prisma.customTrainingModule.findFirst({
      where: { id: moduleId, organizationId },
    });

    if (!module) {
      throw new NotFoundException(`Custom module ${moduleId} not found`);
    }

    const updateData: {
      name?: string;
      description?: string;
      category?: string;
      duration?: number;
      difficulty?: string;
      iconType?: string;
      topics?: string[];
      isActive?: boolean;
    } = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.duration !== undefined) updateData.duration = dto.duration;
    if (dto.difficulty !== undefined) updateData.difficulty = dto.difficulty;
    if (dto.iconType !== undefined) updateData.iconType = dto.iconType;
    if (dto.topics !== undefined) updateData.topics = dto.topics;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return this.prisma.customTrainingModule.update({
      where: { id: moduleId },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async deleteCustomModule(organizationId: string, moduleId: string) {
    const module = await this.prisma.customTrainingModule.findFirst({
      where: { id: moduleId, organizationId },
    });

    if (!module) {
      throw new NotFoundException(`Custom module ${moduleId} not found`);
    }

    await removeScormPackage(path.resolve(process.cwd(), 'uploads', 'training'), module.scormPath);

    return this.prisma.customTrainingModule.delete({
      where: { id: moduleId },
    });
  }

  /**
   * Handle SCORM file upload for a custom module
   */
  async uploadScormPackage(
    organizationId: string,
    moduleId: string,
    file: { buffer: Buffer; originalname: string }
  ) {
    const module = await this.prisma.customTrainingModule.findFirst({
      where: { id: moduleId, organizationId },
    });

    if (!module) {
      throw new NotFoundException(`Custom module ${moduleId} not found`);
    }

    // SECURITY: Validate moduleId is a valid UUID to prevent path injection
    if (!isValidUuid(moduleId)) {
      throw new BadRequestException('Invalid module ID format');
    }

    if (path.extname(file.originalname).toLowerCase() !== '.zip') {
      throw new BadRequestException('SCORM packages must be uploaded as a .zip file');
    }

    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(file.buffer, {
        checkCRC32: true,
        createFolders: true,
      });
    } catch {
      throw new BadRequestException('The uploaded file is not a valid ZIP archive');
    }

    const entries = Object.values(zip.files);
    if (entries.length === 0 || entries.length > MAX_SCORM_ENTRIES) {
      throw new BadRequestException(
        `SCORM package must contain between 1 and ${MAX_SCORM_ENTRIES} entries`
      );
    }

    let expandedBytes = 0;
    for (const entry of entries) {
      const details = entry as JSZip.JSZipObject & {
        unsafeOriginalName?: string;
        _data?: { uncompressedSize?: number };
      };
      const originalName = details.unsafeOriginalName || entry.name;
      const normalizedName = originalName.replace(/\\/g, '/');
      const pathSegments = normalizedName.split('/').filter(Boolean);
      if (
        normalizedName.startsWith('/') ||
        normalizedName.includes('\0') ||
        pathSegments.some(
          (segment) =>
            segment === '.' || segment === '..' || !/^[A-Za-z0-9._ ()@+-]+$/.test(segment)
        )
      ) {
        throw new BadRequestException(`Unsafe path in SCORM package: ${originalName}`);
      }
      const unixMode =
        typeof entry.unixPermissions === 'number'
          ? entry.unixPermissions
          : parseInt(entry.unixPermissions || '0', 10);
      if ((unixMode & 0o170000) === 0o120000) {
        throw new BadRequestException('SCORM packages may not contain symbolic links');
      }
      expandedBytes += details._data?.uncompressedSize || 0;
      if (expandedBytes > MAX_SCORM_EXPANDED_BYTES) {
        throw new BadRequestException('SCORM package expands beyond the 500 MB safety limit');
      }
    }

    const manifestEntry = zip.file('imsmanifest.xml');
    if (!manifestEntry) {
      throw new BadRequestException(
        'Unsupported SCORM package: imsmanifest.xml is missing at the archive root'
      );
    }
    const manifest = await manifestEntry.async('string');
    const xmlErrors: string[] = [];
    const document = new DOMParser({
      errorHandler: (level, message) => {
        if (level !== 'warning') {
          xmlErrors.push(message);
        }
      },
    }).parseFromString(manifest, 'application/xml');
    if (xmlErrors.length > 0 || document.documentElement?.localName?.toLowerCase() !== 'manifest') {
      throw new BadRequestException('Unsupported SCORM package: imsmanifest.xml is invalid');
    }

    const versionNode =
      document.getElementsByTagName('schemaversion').item(0) ||
      document.getElementsByTagNameNS('*', 'schemaversion').item(0);
    const schemaVersion = versionNode?.textContent?.trim() || '';
    const manifestNamespaces = Array.from({ length: document.documentElement.attributes.length })
      .map((_, index) => document.documentElement.attributes.item(index)?.value || '')
      .join(' ');
    const scormVersion = /1\.2/i.test(schemaVersion)
      ? 'SCORM 1.2'
      : /2004/i.test(schemaVersion) || /adlcp_v1p3/i.test(manifestNamespaces)
        ? 'SCORM 2004'
        : null;
    if (!scormVersion) {
      throw new BadRequestException(
        `Unsupported SCORM version${schemaVersion ? `: ${schemaVersion}` : ''}. Only SCORM 1.2 and SCORM 2004 are supported`
      );
    }

    const resources = [
      ...Array.from(document.getElementsByTagName('resource')),
      ...Array.from(document.getElementsByTagNameNS('*', 'resource')),
    ];
    const launchHref = resources
      .map((resource) => resource.getAttribute('href'))
      .find((href): href is string => Boolean(href));
    if (!launchHref) {
      throw new BadRequestException(
        'Unsupported SCORM package: no launchable resource was declared'
      );
    }
    let decodedLaunchHref: string;
    try {
      decodedLaunchHref = decodeURIComponent(launchHref.split(/[?#]/, 1)[0]);
    } catch {
      throw new BadRequestException('Unsupported SCORM package: launch resource path is invalid');
    }
    const launchPath = path.posix.normalize(decodedLaunchHref.replace(/\\/g, '/'));
    if (
      launchPath.startsWith('/') ||
      launchPath === '..' ||
      launchPath.startsWith('../') ||
      !zip.file(launchPath)
    ) {
      throw new BadRequestException(
        'Unsupported SCORM package: the manifest launch resource is missing or unsafe'
      );
    }

    const folderName = `${moduleId}-${crypto.randomBytes(4).toString('hex')}`;
    const uploadsBasePath = path.resolve(process.cwd(), 'uploads', 'training');
    const safeFilename = sanitizeFilename(file.originalname);
    if (safeFilename.includes('..') || safeFilename.includes('\0')) {
      throw new BadRequestException('Invalid filename');
    }

    try {
      const resolvedUploadDir = await persistScormPackage(entries, uploadsBasePath, folderName, {
        version: scormVersion,
        launchPath,
        originalFileName: safeFilename,
      });

      const updated = await this.prisma.customTrainingModule.update({
        where: { id: moduleId },
        data: {
          scormPath: folderName,
          originalFileName: safeFilename,
        },
        include: {
          creator: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      await removeScormPackage(uploadsBasePath, module.scormPath, resolvedUploadDir);

      this.logger.log(`Validated ${scormVersion} package uploaded for module ${moduleId}`);
      return { ...updated, scorm: { version: scormVersion, launchPath } };
    } catch (error) {
      await removeScormPackage(uploadsBasePath, folderName);
      throw error;
    }
  }

  /**
   * Get all modules (built-in + custom) for campaign selection
   */
  async getAllModules(organizationId: string) {
    const customModules = await this.prisma.customTrainingModule.findMany({
      where: { organizationId, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        duration: true,
        difficulty: true,
        iconType: true,
        topics: true,
        scormPath: true,
      },
    });

    // Built-in modules
    const builtInModules = VALID_MODULE_IDS.map((id) => ({
      id,
      name: this.getModuleName(id),
      description: '',
      category: this.getModuleCategory(id),
      duration: 15,
      difficulty: 'beginner',
      iconType: 'security',
      topics: [],
      isBuiltIn: true,
    }));

    return {
      builtIn: builtInModules,
      custom: customModules.map((m) => ({
        ...m,
        isBuiltIn: false,
      })),
    };
  }

  private getModuleName(moduleId: string): string {
    const names: Record<string, string> = {
      'phishing-smishing-vishing': 'Phishing, Smishing & Vishing',
      'ceo-executive-fraud': 'CEO/Executive Fraud Prevention',
      'watering-hole-attacks': 'Watering Hole Attack Awareness',
      'general-cybersecurity': 'General Cybersecurity Awareness',
      'privacy-awareness': 'Privacy & Data Protection Awareness',
      'secure-coding': 'Secure Coding Practices',
      'combined-training': 'Comprehensive Security Awareness',
    };
    return names[moduleId] || moduleId;
  }

  private getModuleCategory(moduleId: string): string {
    const categories: Record<string, string> = {
      'phishing-smishing-vishing': 'social-engineering',
      'ceo-executive-fraud': 'social-engineering',
      'watering-hole-attacks': 'social-engineering',
      'general-cybersecurity': 'general',
      'privacy-awareness': 'privacy',
      'secure-coding': 'secure-coding',
      'combined-training': 'general',
    };
    return categories[moduleId] || 'general';
  }

  private async assertModuleIds(organizationId: string, moduleIds: string[]): Promise<void> {
    const uniqueIds = [...new Set(moduleIds)];
    if (uniqueIds.length === 0) {
      throw new BadRequestException('At least one training module is required');
    }
    const customIds = uniqueIds.filter((moduleId) => !VALID_MODULE_IDS.includes(moduleId));
    if (customIds.length === 0) return;

    const existing = await this.prisma.customTrainingModule.findMany({
      where: {
        organizationId,
        id: { in: customIds },
        isActive: true,
      },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((item) => item.id));
    const invalid = customIds.find((moduleId) => !existingIds.has(moduleId));
    if (invalid) {
      throw new BadRequestException(`Invalid or inactive module ID: ${invalid}`);
    }
  }

  private async assertUsersBelongToOrganization(
    organizationId: string,
    userIds: string[]
  ): Promise<void> {
    const uniqueIds = [...new Set(userIds)];
    if (uniqueIds.length === 0) {
      throw new BadRequestException('At least one user is required');
    }
    const count = await this.prisma.user.count({
      where: { organizationId, id: { in: uniqueIds }, status: 'active' },
    });
    if (count !== uniqueIds.length) {
      throw new BadRequestException('One or more target users are invalid or inactive');
    }
  }

  private assertTargetGroups(targetGroups: string[]): void {
    const validGroups = new Set<string>(['all', ...Object.values(UserRole)]);
    if (
      targetGroups.length === 0 ||
      targetGroups.some((targetGroup) => !validGroups.has(targetGroup))
    ) {
      throw new BadRequestException('Target groups must contain "all" or valid user roles');
    }
  }

  /**
   * Get users by role for campaign targeting
   */
  async getUsersByRole(organizationId: string, roles: string[]) {
    return this.prisma.user.findMany({
      where: {
        organizationId,
        role: { in: roles as UserRole[] },
        status: 'active',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });
  }

  /**
   * Launch a campaign - create assignments for target users
   */
  async launchCampaign(organizationId: string, campaignId: string, assignedBy: string) {
    const campaign = await this.getCampaign(organizationId, campaignId);

    const moduleIds = campaign.moduleIds as string[];
    const targetGroups = campaign.targetGroups as string[];

    // Get target users based on roles
    let users: { id: string }[];
    if (targetGroups.includes('all')) {
      users = await this.prisma.user.findMany({
        where: { organizationId, status: 'active' },
        select: { id: true },
      });
    } else {
      users = await this.prisma.user.findMany({
        where: {
          organizationId,
          role: { in: targetGroups as UserRole[] },
          status: 'active',
        },
        select: { id: true },
      });
    }

    // Create assignments
    const userIds = users.map((u) => u.id);
    const result = await this.bulkAssign(organizationId, assignedBy, {
      userIds,
      moduleIds,
      dueDate: campaign.endDate?.toISOString(),
      isRequired: true,
    });

    this.logger.log(`Campaign ${campaignId} launched: ${result.count} assignments created`);

    return {
      campaignId,
      usersTargeted: userIds.length,
      modulesAssigned: moduleIds.length,
      assignmentsCreated: result.count,
    };
  }

  // ==========================================
  // Quiz Engine
  // ==========================================

  /**
   * Get quiz questions for a module
   */
  async getQuizQuestions(moduleId: string, count: number = 10): Promise<QuizQuestion[]> {
    if (!VALID_MODULE_IDS.includes(moduleId)) {
      throw new BadRequestException(`Invalid module ID: ${moduleId}`);
    }
    if (!Number.isInteger(count) || count < 1 || count > 25) {
      throw new BadRequestException('Quiz question count must be an integer between 1 and 25');
    }

    const questionBank = this.getQuestionBank(moduleId);
    const shuffled = [...questionBank].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length)).map((question) => ({
      id: question.id,
      question: question.question,
      options: question.options,
    }));
  }

  /**
   * Submit quiz answers and get results
   */
  async submitQuiz(
    organizationId: string,
    userId: string,
    moduleId: string,
    answers: { questionId: string; selectedOption: number }[]
  ): Promise<QuizResult> {
    if (!VALID_MODULE_IDS.includes(moduleId)) {
      throw new BadRequestException(`Invalid module ID: ${moduleId}`);
    }
    const questionBank = this.getQuestionBank(moduleId);
    const questionMap = new Map(questionBank.map((q) => [q.id, q]));
    const seen = new Set<string>();

    let correctCount = 0;
    const results: QuizAnswerResult[] = [];

    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) {
        throw new BadRequestException(`Unknown quiz question: ${answer.questionId}`);
      }
      if (seen.has(answer.questionId)) {
        throw new BadRequestException(`Duplicate quiz answer: ${answer.questionId}`);
      }
      if (
        !Number.isInteger(answer.selectedOption) ||
        answer.selectedOption < 0 ||
        answer.selectedOption >= question.options.length
      ) {
        throw new BadRequestException(
          `Selected option is out of range for question ${answer.questionId}`
        );
      }
      seen.add(answer.questionId);

      const isCorrect = answer.selectedOption === question.correctOption;
      if (isCorrect) correctCount++;

      results.push({
        questionId: answer.questionId,
        selectedOption: answer.selectedOption,
        isCorrect,
        explanation: question.explanation,
      });
    }

    const score = Math.round((correctCount / answers.length) * 100);
    const passed = score >= 70; // 70% passing threshold

    // Update progress with quiz score
    await this.updateProgress(organizationId, userId, moduleId, {
      score,
      status: passed ? TrainingStatus.completed : TrainingStatus.in_progress,
    });

    // If passed, mark as completed
    if (passed) {
      await this.completeModule(organizationId, userId, { moduleId, score });
    }

    return {
      moduleId,
      totalQuestions: answers.length,
      correctAnswers: correctCount,
      score,
      passed,
      passingScore: 70,
      results,
      completedAt: new Date(),
    };
  }

  /**
   * Get question bank for a module
   */
  private getQuestionBank(moduleId: string): PrivateQuizQuestion[] {
    const questionBanks: Record<string, PrivateQuizQuestion[]> = {
      'phishing-smishing-vishing': [
        {
          id: 'ph-1',
          question: 'What is the primary goal of a phishing attack?',
          options: [
            'To crash your computer',
            'To steal credentials or sensitive information',
            'To speed up your internet connection',
            'To install updates',
          ],
          correctOption: 1,
          explanation:
            'Phishing attacks aim to trick users into revealing sensitive information like passwords, credit card numbers, or personal data.',
        },
        {
          id: 'ph-2',
          question: 'Which of the following is a red flag in a suspicious email?',
          options: [
            'Email is from a known colleague',
            'Email contains proper grammar and spelling',
            'Urgent request for immediate action',
            'Email includes your name correctly',
          ],
          correctOption: 2,
          explanation:
            'Creating urgency is a common social engineering tactic to pressure victims into acting without thinking.',
        },
        {
          id: 'ph-3',
          question:
            'What should you do if you receive a suspicious email asking for your password?',
          options: [
            'Reply with your password',
            'Click the link to verify your account',
            'Report it to IT and delete it',
            'Forward it to your colleagues',
          ],
          correctOption: 2,
          explanation:
            'Always report suspicious emails to your IT or security team and delete them without clicking any links.',
        },
        {
          id: 'ph-4',
          question: 'What is "smishing"?',
          options: [
            'Phishing via social media',
            'Phishing via SMS/text messages',
            'Phishing via phone calls',
            'Phishing via video conferencing',
          ],
          correctOption: 1,
          explanation:
            'Smishing is phishing conducted via SMS (text messages), using the same deceptive tactics.',
        },
        {
          id: 'ph-5',
          question: 'What is "vishing"?',
          options: [
            'Phishing via video calls',
            'Phishing via virtual reality',
            'Phishing via voice calls',
            'Phishing via VPN',
          ],
          correctOption: 2,
          explanation:
            'Vishing (voice phishing) uses phone calls to trick victims into revealing information.',
        },
      ],
      'general-cybersecurity': [
        {
          id: 'gc-1',
          question: 'What is two-factor authentication (2FA)?',
          options: [
            'Using two different passwords',
            'Logging in from two devices',
            'Using two forms of verification to access an account',
            'Having two email accounts',
          ],
          correctOption: 2,
          explanation:
            '2FA adds an extra layer of security by requiring two different forms of verification.',
        },
        {
          id: 'gc-2',
          question: 'What is a strong password characteristic?',
          options: [
            'Your birthday',
            'Common dictionary words',
            'A mix of letters, numbers, and symbols',
            'Your pet name',
          ],
          correctOption: 2,
          explanation:
            'Strong passwords should be complex, using a mix of uppercase, lowercase, numbers, and special characters.',
        },
        {
          id: 'gc-3',
          question: 'What should you do before clicking a link in an email?',
          options: [
            'Click immediately if it looks interesting',
            'Hover over it to verify the actual URL',
            'Forward it to others first',
            'Save the email for later',
          ],
          correctOption: 1,
          explanation:
            'Hovering over links reveals the actual destination URL, which may differ from the displayed text.',
        },
        {
          id: 'gc-4',
          question: 'Why is it important to keep software updated?',
          options: [
            'To get new features only',
            'Updates fix security vulnerabilities',
            'To use more disk space',
            'Updates are optional and not important',
          ],
          correctOption: 1,
          explanation:
            'Software updates often patch security vulnerabilities that attackers could exploit.',
        },
        {
          id: 'gc-5',
          question: 'What is ransomware?',
          options: [
            'Software that speeds up your computer',
            'Malware that encrypts files and demands payment',
            'A type of antivirus software',
            'A legitimate backup service',
          ],
          correctOption: 1,
          explanation:
            'Ransomware encrypts your files and demands payment (ransom) for the decryption key.',
        },
      ],
      'privacy-awareness': [
        {
          id: 'pa-1',
          question: 'What is PII (Personally Identifiable Information)?',
          options: [
            'Public company data',
            'Information that can identify an individual',
            'Product inventory information',
            'Programming interface information',
          ],
          correctOption: 1,
          explanation:
            'PII is any data that could be used to identify a specific individual, such as SSN, email, or address.',
        },
        {
          id: 'pa-2',
          question: 'Which of the following is considered sensitive PII?',
          options: ['Company name', 'Product prices', 'Social Security Number', 'Weather data'],
          correctOption: 2,
          explanation:
            'Social Security Numbers, along with financial data and health records, are considered sensitive PII.',
        },
        {
          id: 'pa-3',
          question: 'What principle states you should only collect data that is necessary?',
          options: ['Data hoarding', 'Data maximization', 'Data minimization', 'Data expansion'],
          correctOption: 2,
          explanation:
            'Data minimization means collecting only the data necessary for a specific purpose.',
        },
      ],
      'ceo-executive-fraud': [
        {
          id: 'ceo-1',
          question: 'What is Business Email Compromise (BEC)?',
          options: [
            'A legitimate business transaction',
            'When executives send company updates',
            'Scam where attackers impersonate executives to defraud',
            'Email marketing campaigns',
          ],
          correctOption: 2,
          explanation:
            'BEC is a scam where criminals impersonate executives or trusted partners to trick employees into transferring money or data.',
        },
        {
          id: 'ceo-2',
          question:
            'A request from your "CEO" asks you to buy gift cards urgently. What should you do?',
          options: [
            'Buy them immediately',
            'Ask for the CEO exact amount',
            'Verify the request through a different channel',
            'Email back asking for more details',
          ],
          correctOption: 2,
          explanation:
            'Always verify unusual requests, especially involving money or gift cards, through a separate communication channel.',
        },
      ],
      'secure-coding': [
        {
          id: 'sc-1',
          question: 'What is SQL injection?',
          options: [
            'A database optimization technique',
            'An attack that inserts malicious SQL code',
            'A method to backup databases',
            'A SQL learning exercise',
          ],
          correctOption: 1,
          explanation:
            'SQL injection is an attack where malicious SQL code is inserted into application queries to manipulate the database.',
        },
        {
          id: 'sc-2',
          question: 'What is the best way to prevent SQL injection?',
          options: [
            'Use longer SQL queries',
            'Use parameterized queries/prepared statements',
            'Remove all SQL from the application',
            'Use plain text passwords',
          ],
          correctOption: 1,
          explanation:
            'Parameterized queries ensure user input is treated as data, not executable code.',
        },
      ],
    };

    const bank = questionBanks[moduleId];
    if (!bank) {
      throw new BadRequestException(`Module ${moduleId} does not provide a quiz`);
    }
    return bank;
  }

  // ==========================================
  // Certificate Generation
  // ==========================================

  /**
   * Generate a certificate for completed training
   */
  async generateCertificate(
    organizationId: string,
    userId: string,
    moduleId: string
  ): Promise<Certificate> {
    // Verify completion
    const progress = await this.prisma.trainingProgress.findFirst({
      where: {
        organizationId,
        userId,
        moduleId,
        status: TrainingStatus.completed,
      },
    });

    if (!progress) {
      throw new BadRequestException('Training has not been completed');
    }

    // Get user and organization info
    const [user, org] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, firstName: true, lastName: true, displayName: true },
      }),
      this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true },
      }),
    ]);

    if (!user || !org) {
      throw new NotFoundException('User or organization not found');
    }

    const settings =
      ((
        await this.prisma.organization.findUnique({
          where: { id: organizationId },
          select: { settings: true },
        })
      )?.settings as Record<string, unknown>) || {};
    const certificates = (settings.trainingCertificates as Certificate[]) || [];
    const existing = certificates.find(
      (certificate) =>
        certificate.moduleId === moduleId &&
        (certificate.userId === userId || certificate.recipientEmail === user.email)
    );
    if (existing) {
      return existing;
    }

    // Generate certificate ID
    const certificateId = `CERT-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

    const moduleNames: Record<string, string> = {
      'phishing-smishing-vishing': 'Phishing, Smishing & Vishing Awareness',
      'ceo-executive-fraud': 'CEO/Executive Fraud Prevention',
      'watering-hole-attacks': 'Watering Hole Attack Awareness',
      'general-cybersecurity': 'General Cybersecurity Awareness',
      'privacy-awareness': 'Privacy & Data Protection Awareness',
      'secure-coding': 'Secure Coding Practices',
      'combined-training': 'Comprehensive Security Awareness',
    };

    const certificate: Certificate = {
      id: certificateId,
      userId,
      recipientName: user.displayName || `${user.firstName} ${user.lastName}`,
      recipientEmail: user.email,
      moduleName: moduleNames[moduleId] || moduleId,
      moduleId,
      organizationName: org.name,
      completedAt: progress.completedAt || new Date(),
      score: progress.score,
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year validity
      verificationUrl: `${process.env.PUBLIC_APP_URL || ''}/api/training/certificates/${certificateId}/verify`,
    };

    certificates.push(certificate);

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...settings,
          trainingCertificates: certificates,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`Certificate ${certificateId} generated for user ${userId}`);

    return certificate;
  }

  /**
   * Get all certificates for a user
   */
  async getUserCertificates(organizationId: string, userId: string): Promise<Certificate[]> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as Record<string, unknown>) || {};
    const certificates = (settings.trainingCertificates as Certificate[]) || [];

    // Get user email
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    return certificates.filter(
      (certificate) => certificate.userId === userId || certificate.recipientEmail === user?.email
    );
  }

  /**
   * Verify a certificate
   */
  async verifyCertificate(certificateId: string): Promise<{
    valid: boolean;
    certificate?: Certificate;
    message: string;
  }> {
    // Search all organizations for the certificate
    const orgs = await this.prisma.organization.findMany({
      select: { settings: true },
    });

    for (const org of orgs) {
      const settings = (org.settings as Record<string, unknown>) || {};
      const certificates = (settings.trainingCertificates as Certificate[]) || [];

      const certificate = certificates.find((c) => c.id === certificateId);
      if (certificate) {
        const isExpired = new Date(certificate.expiresAt) < new Date();
        return {
          valid: !isExpired,
          certificate: {
            ...certificate,
            recipientEmail: undefined,
            userId: undefined,
          },
          message: isExpired ? 'Certificate has expired' : 'Certificate is valid',
        };
      }
    }

    return {
      valid: false,
      message: 'Certificate not found',
    };
  }

  async getCertificatePDF(
    organizationId: string,
    userId: string,
    certificateId: string
  ): Promise<Buffer> {
    const certificates = await this.getUserCertificates(organizationId, userId);
    const certificate = certificates.find((item) => item.id === certificateId);
    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    return new Promise<Buffer>((resolve, reject) => {
      const document = new PDFDocument({
        size: 'LETTER',
        layout: 'landscape',
        margins: { top: 54, bottom: 54, left: 54, right: 54 },
        info: {
          Title: `Certificate of Completion - ${certificate.moduleName}`,
          Author: certificate.organizationName,
          Subject: certificate.id,
        },
      });
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);

      const width = document.page.width;
      const height = document.page.height;
      document
        .lineWidth(4)
        .strokeColor('#B08D2F')
        .rect(28, 28, width - 56, height - 56)
        .stroke();
      document
        .lineWidth(1)
        .strokeColor('#334155')
        .rect(38, 38, width - 76, height - 76)
        .stroke();
      document
        .fillColor('#0F172A')
        .font('Helvetica-Bold')
        .fontSize(30)
        .text('Certificate of Completion', 60, 82, { align: 'center' });
      document
        .fillColor('#475569')
        .font('Helvetica')
        .fontSize(14)
        .text(certificate.organizationName, { align: 'center' })
        .moveDown(2)
        .fontSize(13)
        .text('This certifies that', { align: 'center' })
        .moveDown(0.8)
        .fillColor('#0F172A')
        .font('Helvetica-Bold')
        .fontSize(28)
        .text(certificate.recipientName, { align: 'center' })
        .moveDown(0.8)
        .fillColor('#475569')
        .font('Helvetica')
        .fontSize(13)
        .text('successfully completed', { align: 'center' })
        .moveDown(0.8)
        .fillColor('#8A6B1F')
        .font('Helvetica-Bold')
        .fontSize(22)
        .text(certificate.moduleName, { align: 'center' });

      const details = [
        `Completed: ${new Date(certificate.completedAt).toLocaleDateString('en-US')}`,
        certificate.score !== null && certificate.score !== undefined
          ? `Score: ${certificate.score}%`
          : null,
        `Valid until: ${new Date(certificate.expiresAt).toLocaleDateString('en-US')}`,
      ]
        .filter(Boolean)
        .join('   •   ');
      document
        .moveDown(1.5)
        .fillColor('#334155')
        .font('Helvetica')
        .fontSize(11)
        .text(details, { align: 'center' })
        .moveDown(2)
        .fontSize(9)
        .fillColor('#64748B')
        .text(`Certificate ID: ${certificate.id}`, { align: 'center' });
      if (certificate.verificationUrl) {
        document.text(`Verify: ${certificate.verificationUrl}`, { align: 'center' });
      }
      document.end();
    });
  }
}

// ==========================================
// Types
// ==========================================

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
}

interface PrivateQuizQuestion extends QuizQuestion {
  correctOption: number;
  explanation: string;
}

interface QuizAnswerResult {
  questionId: string;
  selectedOption: number;
  isCorrect: boolean;
  explanation: string;
}

export interface QuizResult {
  moduleId: string;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  passed: boolean;
  passingScore: number;
  results: QuizAnswerResult[];
  completedAt: Date;
}

export interface Certificate {
  id: string;
  userId?: string;
  recipientName: string;
  recipientEmail: string;
  moduleName: string;
  moduleId: string;
  organizationName: string;
  completedAt: Date;
  score?: number;
  issuedAt: Date;
  expiresAt: Date;
  verificationUrl: string;
}
