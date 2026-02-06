import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { safePropertySet, isSafePropertyName } from '@gigachad-grc/shared';
import { ConfigAsCodeService } from './config-as-code.service';
import { ConfigStateService } from './state/config-state.service';
import { ControlImplementationStatus, Prisma, ConfigFile } from '@prisma/client';
import {
  CreateConfigFileDto,
  UpdateConfigFileDto,
  ConfigFileResponseDto,
  ConfigFileListResponseDto,
  PreviewChangesDto,
  PreviewChangesResponseDto,
  ApplyChangesDto,
  ApplyChangesResponseDto,
  ConfigFileVersionDto,
  ConflictResolution,
} from './dto/config-file.dto';
import { ConfigFileFormat } from './dto/config-file.dto';
import { ConfigFormat, ResourceType } from './dto/export-config.dto';

@Injectable()
export class ConfigFilesService {
  private readonly logger = new Logger(ConfigFilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => ConfigAsCodeService))
    private readonly configAsCodeService: ConfigAsCodeService,
    private readonly stateService: ConfigStateService
  ) {}

  /**
   * Initialize default Terraform files from current platform state
   */
  async initializeDefaultFiles(
    organizationId: string,
    userId: string,
    workspaceId?: string
  ): Promise<void> {
    this.logger.log(
      `Initializing default config files for organization ${organizationId}, user ${userId}, workspace ${workspaceId || 'none'}`
    );

    // Validate inputs
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    try {
      // Check if files already exist
      this.logger.log('Checking for existing config files...');
      const existingFiles = await this.prisma.configFile.findMany({
        where: {
          organizationId,
          workspaceId: workspaceId || null,
          deletedAt: null,
        },
        take: 1,
      });

      this.logger.log(`Found ${existingFiles.length} existing files`);
      if (existingFiles.length > 0) {
        this.logger.log('Config files already exist, skipping initialization');
        return;
      }
    } catch (error: unknown) {
      // If table doesn't exist, throw a helpful error
      const err = error as { code?: string; message?: string };
      if (
        err.code === '42P01' ||
        err.message?.includes('does not exist') ||
        (err.message?.includes('relation') && err.message?.includes('does not exist'))
      ) {
        this.logger.error('ConfigFile table does not exist. Please run Prisma migrations.');
        throw new BadRequestException(
          'Database tables not initialized. Please run: ./scripts/migrate-config-as-code.sh or cd services/shared && npx prisma migrate dev'
        );
      }
      this.logger.error('Error checking for existing files:', error);
      throw error;
    }

    try {
      this.logger.log('Starting export of current platform state...');
      // Export current state as Terraform
      const exportData = await this.configAsCodeService.exportConfig(organizationId, userId, {
        format: ConfigFormat.TERRAFORM,
        resources: Object.values(ResourceType),
        workspaceId,
      });

      this.logger.log(
        `Export completed. Content length: ${exportData.content?.length || 0} characters`
      );
      this.logger.log(`Resource breakdown: ${JSON.stringify(exportData.resourceBreakdown || {})}`);

      // Split the Terraform content into organized files
      const files = this.splitTerraformIntoFiles(exportData.content);
      this.logger.log(`Split into ${files.length} files: ${files.map((f) => f.path).join(', ')}`);

      if (files.length === 0) {
        this.logger.warn('No files generated from export - creating empty main.tf');
        files.push({
          path: 'main.tf',
          content:
            'terraform {\n  required_providers {\n    gigachad_grc = {\n      source = "gigachad/grc"\n    }\n  }\n}\n',
        });
      }

      // Create all files in a single batch transaction for better performance
      const createdFiles: string[] = [];
      this.logger.log(`Attempting to create ${files.length} files in batch transaction...`);
      const batchStartTime = Date.now();

      try {
        // Use a single transaction to create all files and versions
        await this.prisma.$transaction(async (tx) => {
          for (const file of files) {
            this.logger.log(`Creating file: ${file.path} (${file.content.length} chars)`);

            const created = await tx.configFile.create({
              data: {
                organizationId,
                workspaceId: workspaceId || null,
                path: file.path,
                format: 'terraform',
                content: file.content,
                version: 1,
                commitMessage: 'Initial export from platform state',
                createdBy: userId,
                updatedBy: userId,
              },
            });

            // Create initial version in the same transaction
            await tx.configFileVersion.create({
              data: {
                configFileId: created.id,
                version: 1,
                content: file.content,
                commitMessage: 'Initial export from platform state',
                createdBy: userId,
                changes: null,
              },
            });

            createdFiles.push(file.path);
          }
        });

        const batchElapsed = Date.now() - batchStartTime;
        this.logger.log(
          `Batch transaction completed in ${batchElapsed}ms for ${createdFiles.length} files`
        );
      } catch (batchError: unknown) {
        this.logger.error('Batch file creation failed:', batchError);
        // Clear created files since transaction rolled back
        createdFiles.length = 0;
      }

      if (createdFiles.length === 0) {
        // If no files were created, try to create at least a basic main.tf
        this.logger.warn('No files were created successfully, attempting to create basic main.tf');
        try {
          const basicContent =
            'terraform {\n  required_providers {\n    gigachad_grc = {\n      source = "gigachad/grc"\n    }\n  }\n}\n';
          await this.prisma.configFile.create({
            data: {
              organizationId,
              workspaceId: workspaceId || null,
              path: 'main.tf',
              format: 'terraform',
              content: basicContent,
              version: 1,
              commitMessage: 'Initial export from platform state (empty)',
              createdBy: userId,
              updatedBy: userId,
            },
          });

          const createdFile = await this.prisma.configFile.findFirst({
            where: {
              organizationId,
              workspaceId: workspaceId || null,
              path: 'main.tf',
            },
          });

          if (createdFile) {
            await this.prisma.configFileVersion.create({
              data: {
                configFileId: createdFile.id,
                version: 1,
                content: basicContent,
                commitMessage: 'Initial export from platform state (empty)',
                createdBy: userId,
              },
            });
            this.logger.log('Created basic main.tf file as fallback');
            return; // Success - exit early
          }
        } catch (fallbackError: unknown) {
          this.logger.error('Failed to create fallback main.tf:', fallbackError);
          const errorMessage =
            fallbackError instanceof Error ? fallbackError.message : 'Unknown error';
          throw new BadRequestException(
            `Failed to create any config files. Last error: ${errorMessage}. Please check backend logs.`
          );
        }

        throw new BadRequestException(
          'Failed to create any config files. Please check logs for details.'
        );
      }

      this.logger.log(
        `Created ${createdFiles.length} initial config files: ${createdFiles.join(', ')}`
      );
    } catch (error: unknown) {
      this.logger.error('Error during initialization:', error);
      // Re-throw with more context
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Failed to initialize config files: ${errorMessage}. Please check backend logs.`
      );
    }
  }

  /**
   * Refresh all config files from current database state
   * This regenerates the Terraform files to match the current platform state
   */
  async refreshFromDatabase(
    organizationId: string,
    userId: string,
    workspaceId?: string
  ): Promise<{ message: string; filesUpdated: number }> {
    const startTime = Date.now();
    this.logger.log(`Refreshing config files from database for org ${organizationId}`);

    try {
      // Export current state as Terraform
      const exportData = await this.configAsCodeService.exportConfig(organizationId, userId, {
        format: ConfigFormat.TERRAFORM,
        resources: Object.values(ResourceType),
        workspaceId,
      });

      const exportElapsed = Date.now() - startTime;
      this.logger.log(`Export completed in ${exportElapsed}ms`);

      // Split into files
      const files = this.splitTerraformIntoFiles(exportData.content);

      // First, fetch all existing files in one query for better performance
      const existingFilesQuery = await this.prisma.configFile.findMany({
        where: {
          organizationId,
          path: { in: files.map((f) => f.path) },
          workspaceId: workspaceId || null,
          deletedAt: null,
        },
        select: {
          id: true,
          path: true,
          version: true,
        },
      });

      const existingFilesMap = new Map(existingFilesQuery.map((f) => [f.path, f]));

      // Process all files in a single batch transaction for better performance
      const txStartTime = Date.now();
      let filesUpdated = 0;

      await this.prisma.$transaction(async (tx) => {
        for (const file of files) {
          const existing = existingFilesMap.get(file.path);

          if (existing) {
            // Update existing file
            const newVersion = existing.version + 1;
            await tx.configFile.update({
              where: { id: existing.id },
              data: {
                content: file.content,
                version: newVersion,
                commitMessage: 'Refreshed from database state',
                updatedBy: userId,
              },
            });

            await tx.configFileVersion.create({
              data: {
                configFileId: existing.id,
                version: newVersion,
                content: file.content,
                commitMessage: 'Refreshed from database state',
                createdBy: userId,
              },
            });

            this.logger.log(`Updated file: ${file.path}`);
          } else {
            // Create new file
            const newFile = await tx.configFile.create({
              data: {
                organizationId,
                workspaceId: workspaceId || null,
                path: file.path,
                format: 'terraform',
                content: file.content,
                version: 1,
                commitMessage: 'Created from database state',
                createdBy: userId,
                updatedBy: userId,
              },
            });

            await tx.configFileVersion.create({
              data: {
                configFileId: newFile.id,
                version: 1,
                content: file.content,
                commitMessage: 'Created from database state',
                createdBy: userId,
              },
            });

            this.logger.log(`Created file: ${file.path}`);
          }

          filesUpdated++;
        }
      });

      const txElapsed = Date.now() - txStartTime;
      const totalElapsed = Date.now() - startTime;
      this.logger.log(
        `Transaction completed in ${txElapsed}ms. Total refresh time: ${totalElapsed}ms`
      );

      // Audit log
      await this.auditService.log({
        organizationId,
        userId,
        action: 'refresh',
        entityType: 'config_as_code',
        entityId: 'refresh',
        description: `Refreshed ${filesUpdated} config files from database state`,
        metadata: { filesUpdated, elapsedMs: totalElapsed },
      });

      return {
        message: `Successfully refreshed ${filesUpdated} file(s) from database state`,
        filesUpdated,
      };
    } catch (error: unknown) {
      this.logger.error('Error refreshing from database:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to refresh: ${errorMessage}`);
    }
  }

  /**
   * Split Terraform content into organized files by resource type
   */
  private splitTerraformIntoFiles(content: string): Array<{ path: string; content: string }> {
    const files: Array<{ path: string; content: string }> = [];

    if (!content || content.trim().length === 0) {
      this.logger.warn('Empty Terraform content received');
      // Return a minimal main.tf file
      files.push({
        path: 'main.tf',
        content:
          'terraform {\n  required_providers {\n    gigachad_grc = {\n      source = "gigachad/grc"\n    }\n  }\n}\n',
      });
      return files;
    }

    // Extract provider block (should be in all files)
    const providerMatch = content.match(/terraform\s*\{[\s\S]*?\n\}/);
    const providerBlock = providerMatch
      ? providerMatch[0]
      : 'terraform {\n  required_providers {\n    gigachad_grc = {\n      source = "gigachad/grc"\n    }\n  }\n}';

    // Split by resource type comments (look for # followed by resource type name)
    const sections = content.split(/(?=#\s+\w+)/);

    const resourceMap: Record<string, string[]> = {
      controls: [],
      frameworks: [],
      policies: [],
      risks: [],
      vendors: [],
    };

    // Categorize resources by comment headers
    sections.forEach((section) => {
      const trimmedSection = section.trim();
      if (!trimmedSection) return;

      if (
        trimmedSection.includes('# Controls') ||
        trimmedSection.includes('gigachad_grc_control')
      ) {
        resourceMap['controls'].push(trimmedSection);
      } else if (
        trimmedSection.includes('# Frameworks') ||
        trimmedSection.includes('gigachad_grc_framework')
      ) {
        resourceMap['frameworks'].push(trimmedSection);
      } else if (
        trimmedSection.includes('# Policies') ||
        trimmedSection.includes('gigachad_grc_policy')
      ) {
        resourceMap['policies'].push(trimmedSection);
      } else if (
        trimmedSection.includes('# Risks') ||
        trimmedSection.includes('gigachad_grc_risk')
      ) {
        resourceMap['risks'].push(trimmedSection);
      } else if (
        trimmedSection.includes('# Vendors') ||
        trimmedSection.includes('gigachad_grc_vendor')
      ) {
        resourceMap['vendors'].push(trimmedSection);
      } else if (trimmedSection.includes('terraform {') && !trimmedSection.includes('resource')) {
        // This is just the provider block, skip it (we'll add it to each file)
      } else if (trimmedSection.length > 0) {
        // Unknown section - add to controls as fallback
        this.logger.warn(
          `Unknown section in Terraform content: ${trimmedSection.substring(0, 100)}`
        );
        resourceMap['controls'].push(trimmedSection);
      }
    });

    // Create files for each resource type that has content
    Object.entries(resourceMap).forEach(([type, sections]) => {
      if (sections.length > 0) {
        // Combine provider block with resource sections
        const combinedSections = sections.join('\n\n');
        const fileContent = providerBlock + '\n\n' + combinedSections;
        files.push({
          path: `${type}/main.tf`,
          content: fileContent.trim(),
        });
        this.logger.log(`Created file ${type}/main.tf with ${sections.length} sections`);
      }
    });

    // If no organized files were created, create a single main.tf with all content
    if (files.length === 0) {
      this.logger.warn('No resource sections found, creating single main.tf file');
      files.push({
        path: 'main.tf',
        content: content.trim() || providerBlock,
      });
    }

    this.logger.log(`Split Terraform content into ${files.length} files`);
    return files;
  }

  /**
   * List all config files for an organization
   */
  async listFiles(
    organizationId: string,
    workspaceId?: string
  ): Promise<ConfigFileListResponseDto> {
    const where: Prisma.ConfigFileWhereInput = {
      organizationId,
      deletedAt: null,
      workspaceId: workspaceId || null,
    };

    const [files, total] = await Promise.all([
      this.prisma.configFile.findMany({
        where,
        orderBy: { path: 'asc' },
      }),
      this.prisma.configFile.count({ where }),
    ]);

    return {
      files: files.map(this.mapToResponseDto),
      total,
    };
  }

  /**
   * Get a specific config file
   */
  async getFile(
    organizationId: string,
    path: string,
    workspaceId?: string
  ): Promise<ConfigFileResponseDto> {
    const where: Prisma.ConfigFileWhereInput = {
      organizationId,
      path,
      deletedAt: null,
      workspaceId: workspaceId || null,
    };

    const file = await this.prisma.configFile.findFirst({
      where,
    });

    if (!file) {
      throw new NotFoundException(`Config file not found: ${path}`);
    }

    return this.mapToResponseDto(file);
  }

  /**
   * Create a new config file
   */
  async createFile(
    organizationId: string,
    userId: string,
    dto: CreateConfigFileDto
  ): Promise<ConfigFileResponseDto> {
    // Check if file already exists
    const existing = await this.prisma.configFile.findFirst({
      where: {
        organizationId,
        workspaceId: dto.workspaceId || null,
        path: dto.path,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new BadRequestException(`Config file already exists: ${dto.path}`);
    }

    const file = await this.prisma.configFile.create({
      data: {
        organizationId,
        workspaceId: dto.workspaceId || null,
        path: dto.path,
        format: dto.format,
        content: dto.content,
        version: 1,
        commitMessage: dto.commitMessage,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // Create initial version
    await this.prisma.configFileVersion.create({
      data: {
        configFileId: file.id,
        version: 1,
        content: dto.content,
        commitMessage: dto.commitMessage,
        createdBy: userId,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      action: 'create',
      entityType: 'config_file',
      entityId: file.id,
      description: `Created config file: ${dto.path}`,
      metadata: {
        path: dto.path,
        format: dto.format,
      },
    });

    return this.mapToResponseDto(file);
  }

  /**
   * Update an existing config file
   */
  async updateFile(
    organizationId: string,
    userId: string,
    path: string,
    dto: UpdateConfigFileDto,
    workspaceId?: string
  ): Promise<ConfigFileResponseDto> {
    const where: Prisma.ConfigFileWhereInput = {
      organizationId,
      path,
      deletedAt: null,
      workspaceId: workspaceId || null,
    };

    const existing = await this.prisma.configFile.findFirst({ where });

    if (!existing) {
      throw new NotFoundException(`Config file not found: ${path}`);
    }

    const newVersion = existing.version + 1;

    const file = await this.prisma.configFile.update({
      where: { id: existing.id },
      data: {
        content: dto.content,
        version: newVersion,
        commitMessage: dto.commitMessage,
        updatedBy: userId,
      },
    });

    // Create version snapshot
    await this.prisma.configFileVersion.create({
      data: {
        configFileId: file.id,
        version: newVersion,
        content: dto.content,
        commitMessage: dto.commitMessage,
        createdBy: userId,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      action: 'update',
      entityType: 'config_file',
      entityId: file.id,
      description: `Updated config file: ${path} (v${newVersion})`,
      metadata: {
        path,
        version: newVersion,
      },
    });

    return this.mapToResponseDto(file);
  }

  /**
   * Delete a config file (soft delete)
   */
  async deleteFile(
    organizationId: string,
    userId: string,
    path: string,
    workspaceId?: string
  ): Promise<void> {
    const where: Prisma.ConfigFileWhereInput = {
      organizationId,
      path,
      deletedAt: null,
      workspaceId: workspaceId || null,
    };

    const file = await this.prisma.configFile.findFirst({ where });

    if (!file) {
      throw new NotFoundException(`Config file not found: ${path}`);
    }

    await this.prisma.configFile.update({
      where: { id: file.id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      action: 'delete',
      entityType: 'config_file',
      entityId: file.id,
      description: `Deleted config file: ${path}`,
      metadata: { path },
    });
  }

  /**
   * Preview changes before applying - with conflict detection
   */
  async previewChanges(
    organizationId: string,
    dto: PreviewChangesDto,
    workspaceId?: string
  ): Promise<PreviewChangesResponseDto> {
    this.logger.log(`Previewing changes for ${dto.path}`);

    const result: PreviewChangesResponseDto = {
      toCreate: 0,
      toUpdate: 0,
      toDelete: 0,
      noChange: 0,
      hasConflicts: false,
      conflictCount: 0,
      conflicts: [],
      warnings: [],
      errors: [],
      diff: {},
      safeToApply: [],
      newResources: [],
    };

    try {
      // Parse the Terraform content
      const resources = this.parseTerraformContent(dto.content);
      this.logger.log(`Parsed ${resources.length} resources for preview`);

      if (resources.length === 0) {
        result.warnings.push('No resources found in the configuration file');
        return result;
      }

      // Detect conflicts using state service
      const conflictReport = await this.stateService.detectConflicts(
        organizationId,
        resources.map((r) => ({
          type: r.type,
          id: this.getResourceBusinessId(r),
          attributes: r.attributes,
        })),
        workspaceId
      );

      // Map conflict report to response
      result.hasConflicts = conflictReport.hasConflicts;
      result.conflictCount = conflictReport.conflictCount;
      result.conflicts = conflictReport.conflicts.map((c) => ({
        resourceType: c.resourceType,
        resourceId: c.resourceId,
        field: c.field,
        terraformValue: c.terraformValue,
        databaseValue: c.databaseValue,
        lastAppliedValue: c.lastAppliedValue,
        severity: c.severity,
        recommendation: c.recommendation,
      }));

      result.safeToApply = conflictReport.safeToApply;
      result.newResources = conflictReport.newResources;

      // Count actions
      result.toCreate = conflictReport.newResources.length;
      result.toUpdate = conflictReport.safeToApply.filter((s) => s.action === 'update').length;
      result.noChange = conflictReport.safeToApply.filter((s) => s.action === 'no_change').length;

      // Add warnings for conflicts
      if (result.hasConflicts) {
        const errorConflicts = result.conflicts.filter((c) => c.severity === 'error');
        const warningConflicts = result.conflicts.filter((c) => c.severity === 'warning');

        if (errorConflicts.length > 0) {
          result.errors.push(
            `${errorConflicts.length} resource(s) have conflicting changes that require manual resolution`
          );
        }
        if (warningConflicts.length > 0) {
          result.warnings.push(
            `${warningConflicts.length} resource(s) have been modified in the UI and will be overwritten`
          );
        }
      }

      // Build diff summary
      result.diff = {
        summary: {
          create: result.toCreate,
          update: result.toUpdate,
          delete: result.toDelete,
          noChange: result.noChange,
          conflicts: result.conflictCount,
        },
        resources: resources.map((r) => ({
          type: r.type,
          name: r.name,
          id: this.getResourceBusinessId(r),
          action: conflictReport.newResources.some(
            (nr) => nr.resourceId === this.getResourceBusinessId(r)
          )
            ? 'create'
            : conflictReport.safeToApply.find((s) => s.resourceId === this.getResourceBusinessId(r))
                ?.action || 'conflict',
        })),
      };
    } catch (error: unknown) {
      this.logger.error('Failed to preview changes:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Parse error: ${errorMessage}`);
    }

    return result;
  }

  /**
   * Get the business identifier for a resource
   */
  private getResourceBusinessId(resource: {
    type: string;
    name: string;
    attributes: Record<string, unknown>;
  }): string {
    const attrs = resource.attributes;
    switch (resource.type) {
      case 'gigachad_grc_control':
        return (attrs.control_id as string) || resource.name;
      case 'gigachad_grc_framework':
        return (attrs.name as string) || resource.name;
      case 'gigachad_grc_policy':
        return (attrs.title as string) || resource.name;
      case 'gigachad_grc_risk':
        return (attrs.title as string) || resource.name;
      case 'gigachad_grc_vendor':
        return (attrs.name as string) || resource.name;
      default:
        return resource.name;
    }
  }

  /**
   * Apply changes from config file to platform - with conflict detection and state tracking
   */
  async applyChanges(
    organizationId: string,
    userId: string,
    dto: ApplyChangesDto,
    workspaceId?: string
  ): Promise<ApplyChangesResponseDto> {
    const startTime = Date.now();
    this.logger.log(`Applying changes from ${dto.path} for organization ${organizationId}`);

    const conflictResolution = dto.conflictResolution || ConflictResolution.ABORT;
    const dryRun = dto.dryRun || false;

    const result: ApplyChangesResponseDto = {
      created: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
      errors: 0,
      errorDetails: [],
      conflictsDetected: 0,
      conflictsResolved: undefined,
      skippedConflicts: [],
      dryRun,
      historyId: undefined,
      durationMs: undefined,
    };

    // Check for lock (unless dry run)
    if (!dryRun) {
      const lockStatus = await this.stateService.getLockStatus(organizationId, workspaceId);
      if (lockStatus.isLocked) {
        throw new ConflictException(
          `Apply operation is locked by ${lockStatus.lockedBy}. ` +
            `Lock expires at ${lockStatus.expiresAt?.toISOString()}. ` +
            `Reason: ${lockStatus.lockReason || 'No reason provided'}`
        );
      }

      // Acquire lock
      const lockAcquired = await this.stateService.acquireLock(
        organizationId,
        userId,
        `Applying ${dto.path}`,
        workspaceId
      );

      if (!lockAcquired) {
        throw new ConflictException(
          'Failed to acquire apply lock. Another apply operation may be in progress.'
        );
      }
    }

    try {
      // Parse the Terraform content
      const resources = this.parseTerraformContent(dto.content);
      this.logger.log(`Parsed ${resources.length} resources from Terraform content`);

      if (resources.length === 0) {
        result.errorDetails.push('No resources found in the configuration file');
        return result;
      }

      // Detect conflicts
      const conflictReport = await this.stateService.detectConflicts(
        organizationId,
        resources.map((r) => ({
          type: r.type,
          id: this.getResourceBusinessId(r),
          attributes: r.attributes,
        })),
        workspaceId
      );

      result.conflictsDetected = conflictReport.conflictCount;

      // Handle conflicts based on resolution strategy
      if (conflictReport.hasConflicts) {
        this.logger.warn(`Detected ${conflictReport.conflictCount} conflicts`);

        if (conflictResolution === ConflictResolution.ABORT) {
          result.conflictsResolved = 'aborted';
          result.skippedConflicts = conflictReport.conflicts.map((c) => ({
            resourceType: c.resourceType,
            resourceId: c.resourceId,
            field: c.field,
            terraformValue: c.terraformValue,
            databaseValue: c.databaseValue,
            lastAppliedValue: c.lastAppliedValue,
            severity: c.severity,
            recommendation: c.recommendation,
          }));

          throw new ConflictException({
            message: `Apply aborted due to ${conflictReport.conflictCount} conflict(s). Use 'force' to overwrite or 'skip' to skip conflicting resources.`,
            conflicts: result.skippedConflicts,
          });
        }

        result.conflictsResolved = conflictResolution;
      }

      // If dry run, return early
      if (dryRun) {
        result.created = conflictReport.newResources.length;
        result.updated = conflictReport.safeToApply.filter((s) => s.action === 'update').length;
        if (conflictResolution === ConflictResolution.SKIP) {
          result.skipped = conflictReport.conflictCount;
          result.skippedConflicts = conflictReport.conflicts.map((c) => ({
            resourceType: c.resourceType,
            resourceId: c.resourceId,
            field: c.field,
            terraformValue: c.terraformValue,
            databaseValue: c.databaseValue,
            lastAppliedValue: c.lastAppliedValue,
            severity: c.severity,
            recommendation: c.recommendation,
          }));
        }
        result.durationMs = Date.now() - startTime;
        return result;
      }

      // Build set of resources to skip (if using skip mode)
      const resourcesToSkip = new Set<string>();
      if (conflictResolution === ConflictResolution.SKIP) {
        for (const conflict of conflictReport.conflicts) {
          resourcesToSkip.add(`${conflict.resourceType}/${conflict.resourceId}`);
        }
        result.skippedConflicts = conflictReport.conflicts.map((c) => ({
          resourceType: c.resourceType,
          resourceId: c.resourceId,
          field: c.field,
          terraformValue: c.terraformValue,
          databaseValue: c.databaseValue,
          lastAppliedValue: c.lastAppliedValue,
          severity: c.severity,
          recommendation: c.recommendation,
        }));
      }

      // Save the file
      const where: Prisma.ConfigFileWhereInput = {
        organizationId,
        path: dto.path,
        deletedAt: null,
        workspaceId: workspaceId || null,
      };

      const existing = await this.prisma.configFile.findFirst({ where });

      if (existing) {
        await this.updateFile(
          organizationId,
          userId,
          dto.path,
          {
            content: dto.content,
            commitMessage: dto.commitMessage || 'Applied changes',
          },
          workspaceId
        );
      } else {
        await this.createFile(organizationId, userId, {
          path: dto.path,
          format: dto.format,
          content: dto.content,
          workspaceId,
          commitMessage: dto.commitMessage || 'Applied changes',
        });
      }

      // Apply each resource
      for (const resource of resources) {
        const resourceId = this.getResourceBusinessId(resource);
        const resourceKey = `${resource.type}/${resourceId}`;

        // Skip if in skip list
        if (resourcesToSkip.has(resourceKey)) {
          result.skipped++;
          this.logger.log(`Skipping conflicting resource: ${resourceKey}`);
          continue;
        }

        try {
          const applied = await this.applyResource(organizationId, userId, resource, workspaceId);

          if (applied.created) result.created++;
          if (applied.updated) result.updated++;

          // Record the applied state
          await this.stateService.recordAppliedState(
            organizationId,
            userId,
            {
              type: resource.type,
              id: resourceId,
              databaseId: applied.databaseId,
              content: resource.attributes as Prisma.InputJsonValue,
              sourceFile: dto.path,
            },
            workspaceId
          );
        } catch (error: unknown) {
          result.errors++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errorDetails.push(`${resourceKey}: ${errorMessage}`);
          this.logger.error(`Failed to apply ${resourceKey}:`, error);
        }
      }

      // Record apply history
      result.durationMs = Date.now() - startTime;
      result.historyId = await this.stateService.recordApplyHistory(
        organizationId,
        userId,
        {
          sourceFile: dto.path,
          commitMessage: dto.commitMessage,
          resourcesCreated: result.created,
          resourcesUpdated: result.updated,
          resourcesDeleted: result.deleted,
          resourcesSkipped: result.skipped,
          conflictsDetected: result.conflictsDetected,
          conflictsResolved: result.conflictsResolved,
          durationMs: result.durationMs,
          errorCount: result.errors,
          errors: result.errorDetails.length > 0 ? result.errorDetails : undefined,
        },
        workspaceId
      );

      // Log the apply action
      await this.auditService.log({
        organizationId,
        userId,
        action: 'config_as_code.apply',
        entityType: 'config_file',
        entityId: dto.path,
        entityName: dto.path,
        description: `Applied config from ${dto.path}: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors`,
        metadata: {
          path: dto.path,
          result,
          conflictResolution,
          historyId: result.historyId,
        },
      });
    } catch (error: unknown) {
      // Re-throw conflict exceptions as-is
      if (error instanceof ConflictException) {
        throw error;
      }

      this.logger.error('Failed to apply changes:', error);
      result.errors++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errorDetails.push(`Apply error: ${errorMessage}`);
      result.durationMs = Date.now() - startTime;
    } finally {
      // Always release the lock (unless dry run)
      if (!dryRun) {
        await this.stateService.releaseLock(organizationId, userId, workspaceId);
      }
    }

    return result;
  }

  /**
   * Get drift report - shows changes made via UI since last apply
   */
  async getDriftReport(organizationId: string, workspaceId?: string) {
    return this.stateService.detectDrift(organizationId, workspaceId);
  }

  /**
   * Get apply history
   */
  async getApplyHistory(organizationId: string, limit: number = 20, workspaceId?: string) {
    return this.stateService.getApplyHistory(organizationId, limit, workspaceId);
  }

  /**
   * Get current lock status
   */
  async getLockStatus(organizationId: string, workspaceId?: string) {
    return this.stateService.getLockStatus(organizationId, workspaceId);
  }

  /**
   * Force release a lock (admin only)
   */
  async forceReleaseLock(organizationId: string, userId: string, workspaceId?: string) {
    // Delete any existing lock
    await this.prisma.configApplyLock.deleteMany({
      where: {
        organizationId,
        workspaceId: workspaceId || null,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'config_as_code.force_unlock',
      entityType: 'config_apply_lock',
      entityId: organizationId,
      description: 'Force released Config as Code apply lock',
    });

    return { success: true };
  }

  /**
   * Parse Terraform content into resources
   */
  private parseTerraformContent(content: string): Array<{
    type: string;
    name: string;
    attributes: Record<string, unknown>;
  }> {
    const resources: Array<{ type: string; name: string; attributes: Record<string, unknown> }> =
      [];

    // Match resource blocks: resource "type" "name" { ... }
    const resourceRegex = /resource\s+"([^"]+)"\s+"([^"]+)"\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
    let match;

    while ((match = resourceRegex.exec(content)) !== null) {
      const [, resourceType, resourceName, body] = match;
      const attributes = this.parseResourceBody(body);

      resources.push({
        type: resourceType,
        name: resourceName,
        attributes,
      });
    }

    return resources;
  }

  /**
   * Parse resource body into key-value pairs
   */
  private parseResourceBody(body: string): Record<string, unknown> {
    const attributes: Record<string, unknown> = {};

    // Match key = value pairs
    const attrRegex =
      /(\w+)\s*=\s*("([^"\\]*(?:\\.[^"\\]*)*)"|(\[[^\]]*\])|(\d+(?:\.\d+)?)|(\w+))/g;
    let match;

    while ((match = attrRegex.exec(body)) !== null) {
      const key = match[1];
      const value = match[2];

      // SECURITY: Validate key name to prevent prototype pollution from malicious Terraform content
      if (!isSafePropertyName(key)) {
        this.logger.warn(`Skipping blocked property name in parseResourceBody: ${key}`);
        continue;
      }

      if (value.startsWith('"') && value.endsWith('"')) {
        // String value - unescape quotes and newlines
        safePropertySet(
          attributes,
          key,
          value.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n')
        );
      } else if (value.startsWith('[')) {
        // Array value
        try {
          const items = value
            .slice(1, -1)
            .split(',')
            .map((item) => {
              const trimmed = item.trim();
              if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                return trimmed.slice(1, -1);
              }
              return trimmed;
            })
            .filter(Boolean);
          safePropertySet(attributes, key, items);
        } catch {
          safePropertySet(attributes, key, []);
        }
      } else if (value === 'true' || value === 'false') {
        // Boolean value
        safePropertySet(attributes, key, value === 'true');
      } else if (!isNaN(Number(value))) {
        // Numeric value
        safePropertySet(attributes, key, Number(value));
      } else {
        // Other value (variable reference, etc.)
        safePropertySet(attributes, key, value);
      }
    }

    return attributes;
  }

  /**
   * Apply a single resource to the database
   */
  private async applyResource(
    organizationId: string,
    userId: string,
    resource: { type: string; name: string; attributes: Record<string, unknown> },
    workspaceId?: string
  ): Promise<{ created: boolean; updated: boolean; databaseId?: string }> {
    const { type, attributes } = resource;

    switch (type) {
      case 'gigachad_grc_control':
        return this.applyControl(organizationId, userId, attributes, workspaceId);
      case 'gigachad_grc_framework':
        return this.applyFramework(organizationId, userId, attributes);
      case 'gigachad_grc_policy':
        return this.applyPolicy(organizationId, userId, attributes, workspaceId);
      case 'gigachad_grc_risk':
        return this.applyRisk(organizationId, userId, attributes, workspaceId);
      case 'gigachad_grc_vendor':
        return this.applyVendor(organizationId, userId, attributes);
      default:
        this.logger.warn(`Unknown resource type: ${type}`);
        return { created: false, updated: false };
    }
  }

  /**
   * Apply control changes
   */
  private async applyControl(
    organizationId: string,
    userId: string,
    attrs: Record<string, unknown>,
    _workspaceId?: string
  ): Promise<{ created: boolean; updated: boolean; databaseId?: string }> {
    const controlId = attrs.control_id as string | undefined;
    if (!controlId) {
      throw new Error('control_id is required');
    }

    // Find existing control by controlId
    const existing = await this.prisma.control.findFirst({
      where: {
        organizationId,
        controlId,
        deletedAt: null,
      },
      include: {
        implementations: true,
      },
    });

    // Control data (no status - that's in control_implementations)
    const controlUpdateData = {
      title: attrs.title as string | undefined,
      description: attrs.description as string | undefined,
      category: attrs.category as string | undefined,
      subcategory: attrs.subcategory as string | undefined,
      tags: (attrs.tags as string[]) || [],
    };

    // Remove undefined values
    Object.keys(controlUpdateData).forEach((key) => {
      const k = key as keyof typeof controlUpdateData;
      if (controlUpdateData[k] === undefined) delete controlUpdateData[k];
    });

    let controlRecord: { id: string };
    let created = false;

    if (existing) {
      controlRecord = await this.prisma.control.update({
        where: { id: existing.id },
        data: controlUpdateData,
      });
      this.logger.log(`Updated control: ${controlId}`);
    } else {
      controlRecord = await this.prisma.control.create({
        data: {
          ...controlUpdateData,
          controlId,
          organizationId,
          title: (attrs.title as string) || controlId,
        },
      });
      created = true;
      this.logger.log(`Created control: ${controlId}`);
    }

    // Update or create control implementation for status
    if (attrs.status) {
      const mappedStatus = this.mapControlStatus(attrs.status as string);

      // Find existing implementation
      const existingImpl = await this.prisma.controlImplementation.findFirst({
        where: {
          controlId: controlRecord.id,
          organizationId,
        },
      });

      if (existingImpl) {
        await this.prisma.controlImplementation.update({
          where: { id: existingImpl.id },
          data: {
            status: mappedStatus,
            updatedBy: userId,
          },
        });
        this.logger.log(`Updated control implementation status for ${controlId}: ${mappedStatus}`);
      } else {
        await this.prisma.controlImplementation.create({
          data: {
            controlId: controlRecord.id,
            organizationId,
            status: mappedStatus,
            ownerId: userId,
            createdBy: userId,
            updatedBy: userId,
          },
        });
        this.logger.log(`Created control implementation for ${controlId}: ${mappedStatus}`);
      }
    }

    return { created, updated: !created, databaseId: controlRecord.id };
  }

  /**
   * Apply framework changes
   */
  private async applyFramework(
    organizationId: string,
    userId: string,
    attrs: Record<string, unknown>
  ): Promise<{ created: boolean; updated: boolean; databaseId?: string }> {
    const name = attrs.name as string | undefined;
    if (!name) {
      throw new Error('name is required for framework');
    }

    const existing = await this.prisma.framework.findFirst({
      where: {
        organizationId,
        name,
        deletedAt: null,
      },
    });

    const frameworkUpdateData = {
      type: (attrs.type as string) || 'REGULATORY',
      version: (attrs.version as string) || '1.0',
      description: attrs.description as string | undefined,
      isActive: (attrs.is_active as boolean) ?? true,
    };

    Object.keys(frameworkUpdateData).forEach((key) => {
      const k = key as keyof typeof frameworkUpdateData;
      if (frameworkUpdateData[k] === undefined) delete frameworkUpdateData[k];
    });

    if (existing) {
      await this.prisma.framework.update({
        where: { id: existing.id },
        data: frameworkUpdateData,
      });
      this.logger.log(`Updated framework: ${name}`);
      return { created: false, updated: true, databaseId: existing.id };
    } else {
      const created = await this.prisma.framework.create({
        data: {
          ...frameworkUpdateData,
          name,
          organizationId,
        },
      });
      this.logger.log(`Created framework: ${name}`);
      return { created: true, updated: false, databaseId: created.id };
    }
  }

  /**
   * Apply policy changes
   */
  private async applyPolicy(
    organizationId: string,
    userId: string,
    attrs: Record<string, unknown>,
    _workspaceId?: string
  ): Promise<{ created: boolean; updated: boolean; databaseId?: string }> {
    const title = attrs.title as string | undefined;
    if (!title) {
      throw new Error('title is required for policy');
    }

    const existing = await this.prisma.policy.findFirst({
      where: {
        organizationId,
        title,
        deletedAt: null,
      },
    });

    const policyUpdateData = {
      description: attrs.description as string | undefined,
      category: attrs.category as string | undefined,
      version: (attrs.version as string) || '1.0',
      tags: (attrs.tags as string[]) || [],
    };

    Object.keys(policyUpdateData).forEach((key) => {
      const k = key as keyof typeof policyUpdateData;
      if (policyUpdateData[k] === undefined) delete policyUpdateData[k];
    });

    if (existing) {
      await this.prisma.policy.update({
        where: { id: existing.id },
        data: policyUpdateData,
      });
      this.logger.log(`Updated policy: ${title}`);
      return { created: false, updated: true, databaseId: existing.id };
    } else {
      const created = await this.prisma.policy.create({
        data: {
          ...policyUpdateData,
          title,
          organizationId,
          category: (attrs.category as string) || 'general',
          filename: 'config-as-code.tf',
          mimeType: 'text/plain',
          size: 0,
          storagePath: `policies/${organizationId}/${title.replace(/[^a-zA-Z0-9]/g, '_')}`,
          ownerId: userId,
          createdBy: userId,
          updatedBy: userId,
        },
      });
      this.logger.log(`Created policy: ${title}`);
      return { created: true, updated: false, databaseId: created.id };
    }
  }

  /**
   * Apply risk changes
   */
  private async applyRisk(
    organizationId: string,
    userId: string,
    attrs: Record<string, unknown>,
    _workspaceId?: string
  ): Promise<{ created: boolean; updated: boolean; databaseId?: string }> {
    const riskId = attrs.risk_id as string | undefined;
    if (!riskId) {
      throw new Error('risk_id is required');
    }

    const existing = await this.prisma.risk.findFirst({
      where: {
        organizationId,
        riskId,
        deletedAt: null,
      },
    });

    const riskUpdateData = {
      title: attrs.title as string | undefined,
      description: attrs.description as string | undefined,
      category: attrs.category as string | undefined,
      tags: (attrs.tags as string[]) || [],
    };

    Object.keys(riskUpdateData).forEach((key) => {
      const k = key as keyof typeof riskUpdateData;
      if (riskUpdateData[k] === undefined) delete riskUpdateData[k];
    });

    if (existing) {
      await this.prisma.risk.update({
        where: { id: existing.id },
        data: riskUpdateData,
      });
      this.logger.log(`Updated risk: ${riskId}`);
      return { created: false, updated: true, databaseId: existing.id };
    } else {
      const riskTitle = (attrs.title as string) || riskId;
      const riskDescription = (attrs.description as string) || `Risk ${riskId}`;
      const riskCategory = (attrs.category as string) || 'operational';
      const riskTags = (attrs.tags as string[]) || [];

      const riskCreateData: Prisma.RiskUncheckedCreateInput = {
        riskId,
        title: riskTitle,
        description: riskDescription,
        category: riskCategory,
        tags: riskTags,
        organizationId,
        createdBy: userId,
      };

      const created = await this.prisma.risk.create({
        data: riskCreateData,
      });
      this.logger.log(`Created risk: ${riskId}`);
      return { created: true, updated: false, databaseId: created.id };
    }
  }

  /**
   * Apply vendor changes
   */
  private async applyVendor(
    organizationId: string,
    userId: string,
    attrs: Record<string, unknown>
  ): Promise<{ created: boolean; updated: boolean; databaseId?: string }> {
    const name = attrs.name as string | undefined;
    if (!name) {
      throw new Error('name is required for vendor');
    }

    const existing = await this.prisma.vendor.findFirst({
      where: {
        organizationId,
        name,
        deletedAt: null,
      },
    });

    const vendorUpdateData = {
      vendorId: attrs.vendor_id as string | undefined,
      description: attrs.description as string | undefined,
      tags: (attrs.tags as string[]) || [],
    };

    Object.keys(vendorUpdateData).forEach((key) => {
      const k = key as keyof typeof vendorUpdateData;
      if (vendorUpdateData[k] === undefined) delete vendorUpdateData[k];
    });

    if (existing) {
      await this.prisma.vendor.update({
        where: { id: existing.id },
        data: vendorUpdateData,
      });
      this.logger.log(`Updated vendor: ${name}`);
      return { created: false, updated: true, databaseId: existing.id };
    } else {
      const vendorIdValue = (attrs.vendor_id as string) || `VND-${Date.now()}`;
      const vendorDescription = (attrs.description as string) || undefined;
      const vendorTags = (attrs.tags as string[]) || [];

      const vendorCreateData: Prisma.VendorUncheckedCreateInput = {
        name,
        vendorId: vendorIdValue,
        tags: vendorTags,
        organizationId,
        createdBy: userId,
      };

      if (vendorDescription) {
        vendorCreateData.description = vendorDescription;
      }

      const created = await this.prisma.vendor.create({
        data: vendorCreateData,
      });
      this.logger.log(`Created vendor: ${name}`);
      return { created: true, updated: false, databaseId: created.id };
    }
  }

  /**
   * Map status string to database enum
   */
  private mapStatus(status?: string): string | undefined {
    if (!status) return undefined;
    const statusMap: Record<string, string> = {
      implemented: 'IMPLEMENTED',
      in_progress: 'IN_PROGRESS',
      not_started: 'NOT_STARTED',
      not_applicable: 'NOT_APPLICABLE',
      IMPLEMENTED: 'IMPLEMENTED',
      IN_PROGRESS: 'IN_PROGRESS',
      NOT_STARTED: 'NOT_STARTED',
      NOT_APPLICABLE: 'NOT_APPLICABLE',
    };
    return statusMap[status] || status.toUpperCase();
  }

  /**
   * Map control status string to ControlImplementationStatus enum
   */
  private mapControlStatus(status?: string): ControlImplementationStatus {
    if (!status) return ControlImplementationStatus.not_started;
    const statusMap: Record<string, ControlImplementationStatus> = {
      implemented: ControlImplementationStatus.implemented,
      in_progress: ControlImplementationStatus.in_progress,
      not_started: ControlImplementationStatus.not_started,
      not_applicable: ControlImplementationStatus.not_applicable,
      IMPLEMENTED: ControlImplementationStatus.implemented,
      IN_PROGRESS: ControlImplementationStatus.in_progress,
      NOT_STARTED: ControlImplementationStatus.not_started,
      NOT_APPLICABLE: ControlImplementationStatus.not_applicable,
    };
    return statusMap[status] || ControlImplementationStatus.not_started;
  }

  /**
   * Map likelihood string to number
   */
  private mapLikelihood(likelihood?: string): number | undefined {
    if (!likelihood) return undefined;
    const likelihoodMap: Record<string, number> = {
      rare: 1,
      unlikely: 2,
      possible: 3,
      likely: 4,
      almost_certain: 5,
      RARE: 1,
      UNLIKELY: 2,
      POSSIBLE: 3,
      LIKELY: 4,
      ALMOST_CERTAIN: 5,
    };
    return likelihoodMap[likelihood] ?? (parseInt(likelihood, 10) || undefined);
  }

  /**
   * Map impact string to number
   */
  private mapImpact(impact?: string): number | undefined {
    if (!impact) return undefined;
    const impactMap: Record<string, number> = {
      negligible: 1,
      minor: 2,
      moderate: 3,
      significant: 4,
      catastrophic: 5,
      NEGLIGIBLE: 1,
      MINOR: 2,
      MODERATE: 3,
      SIGNIFICANT: 4,
      CATASTROPHIC: 5,
    };
    return impactMap[impact] ?? (parseInt(impact, 10) || undefined);
  }

  /**
   * Get version history for a file
   */
  async getVersionHistory(
    organizationId: string,
    path: string,
    workspaceId?: string
  ): Promise<ConfigFileVersionDto[]> {
    const where: Prisma.ConfigFileWhereInput = {
      organizationId,
      path,
      deletedAt: null,
      workspaceId: workspaceId || null,
    };

    const file = await this.prisma.configFile.findFirst({ where });

    if (!file) {
      throw new NotFoundException(`Config file not found: ${path}`);
    }

    const versions = await this.prisma.configFileVersion.findMany({
      where: { configFileId: file.id },
      orderBy: { version: 'desc' },
    });

    return versions.map((v) => ({
      id: v.id,
      version: v.version,
      content: v.content,
      commitMessage: v.commitMessage || undefined,
      createdAt: v.createdAt,
      createdBy: v.createdBy,
    }));
  }

  /**
   * Map Prisma model to response DTO
   */
  private mapToResponseDto(file: ConfigFile): ConfigFileResponseDto {
    return {
      id: file.id,
      path: file.path,
      format: file.format as ConfigFileFormat,
      content: file.content,
      version: file.version,
      commitMessage: file.commitMessage || undefined,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      workspaceId: file.workspaceId || undefined,
    };
  }
}
