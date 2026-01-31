import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { Prisma } from '@prisma/client';

export interface SlaSettings {
  urgent: { targetHours: number; warningHours: number };
  high: { targetHours: number; warningHours: number };
  medium: { targetHours: number; warningHours: number };
  low: { targetHours: number; warningHours: number };
}

export interface AssignmentSettings {
  enableAutoAssignment: boolean;
  defaultAssignee: string | null;
  assignByCategory: Record<string, string>;
}

export interface KbSettings {
  requireApprovalForNewEntries: boolean;
  autoSuggestFromKB: boolean;
  trackUsageMetrics: boolean;
}

export interface TrustCenterSettings {
  enabled: boolean;
  publicUrl: string | null;
  customDomain: string | null;
  allowAnonymousAccess: boolean;
}

export interface AiSettings {
  enabled: boolean;
  autoCategorizationEnabled: boolean;
  answerSuggestionsEnabled: boolean;
  provider?: string;
  model?: string;
}

export interface TrustConfigurationDto {
  id: string;
  organizationId: string;
  slaSettings: SlaSettings;
  assignmentSettings: AssignmentSettings;
  kbSettings: KbSettings;
  trustCenterSettings: TrustCenterSettings;
  aiSettings: AiSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateTrustConfigDto {
  slaSettings?: Partial<SlaSettings>;
  assignmentSettings?: Partial<AssignmentSettings>;
  kbSettings?: Partial<KbSettings>;
  trustCenterSettings?: Partial<TrustCenterSettings>;
  aiSettings?: Partial<AiSettings>;
}

const DEFAULT_SLA_SETTINGS: SlaSettings = {
  urgent: { targetHours: 24, warningHours: 12 },
  high: { targetHours: 72, warningHours: 48 },
  medium: { targetHours: 168, warningHours: 120 },
  low: { targetHours: 336, warningHours: 240 },
};

const DEFAULT_ASSIGNMENT_SETTINGS: AssignmentSettings = {
  enableAutoAssignment: false,
  defaultAssignee: null,
  assignByCategory: {},
};

const DEFAULT_KB_SETTINGS: KbSettings = {
  requireApprovalForNewEntries: true,
  autoSuggestFromKB: true,
  trackUsageMetrics: true,
};

const DEFAULT_TRUST_CENTER_SETTINGS: TrustCenterSettings = {
  enabled: true,
  publicUrl: null,
  customDomain: null,
  allowAnonymousAccess: false,
};

const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: false,
  autoCategorizationEnabled: false,
  answerSuggestionsEnabled: false,
};

@Injectable()
export class TrustConfigService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async getConfiguration(organizationId: string): Promise<TrustConfigurationDto> {
    let config = await this.prisma.trustConfiguration.findUnique({
      where: { organizationId },
    });

    if (!config) {
      // Create default configuration
      config = await this.prisma.trustConfiguration.create({
        data: {
          organizationId,
          slaSettings: DEFAULT_SLA_SETTINGS as unknown as Prisma.InputJsonValue,
          assignmentSettings: DEFAULT_ASSIGNMENT_SETTINGS as unknown as Prisma.InputJsonValue,
          kbSettings: DEFAULT_KB_SETTINGS as unknown as Prisma.InputJsonValue,
          trustCenterSettings: DEFAULT_TRUST_CENTER_SETTINGS as unknown as Prisma.InputJsonValue,
          aiSettings: DEFAULT_AI_SETTINGS as unknown as Prisma.InputJsonValue,
        },
      });
    }

    return {
      id: config.id,
      organizationId: config.organizationId,
      slaSettings: config.slaSettings as unknown as SlaSettings,
      assignmentSettings: config.assignmentSettings as unknown as AssignmentSettings,
      kbSettings: config.kbSettings as unknown as KbSettings,
      trustCenterSettings: config.trustCenterSettings as unknown as TrustCenterSettings,
      aiSettings: config.aiSettings as unknown as AiSettings,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  async updateConfiguration(
    organizationId: string,
    dto: UpdateTrustConfigDto,
    userId: string,
  ): Promise<TrustConfigurationDto> {
    const current = await this.getConfiguration(organizationId);

    const updated = await this.prisma.trustConfiguration.update({
      where: { organizationId },
      data: {
        slaSettings: dto.slaSettings
          ? ({ ...current.slaSettings, ...dto.slaSettings } as unknown as Prisma.InputJsonValue)
          : undefined,
        assignmentSettings: dto.assignmentSettings
          ? ({ ...current.assignmentSettings, ...dto.assignmentSettings } as unknown as Prisma.InputJsonValue)
          : undefined,
        kbSettings: dto.kbSettings
          ? ({ ...current.kbSettings, ...dto.kbSettings } as unknown as Prisma.InputJsonValue)
          : undefined,
        trustCenterSettings: dto.trustCenterSettings
          ? ({ ...current.trustCenterSettings, ...dto.trustCenterSettings } as unknown as Prisma.InputJsonValue)
          : undefined,
        aiSettings: dto.aiSettings
          ? ({ ...current.aiSettings, ...dto.aiSettings } as unknown as Prisma.InputJsonValue)
          : undefined,
        updatedBy: userId,
      },
    });

    await this.audit.log({
      organizationId,
      userId,
      action: 'UPDATE_TRUST_CONFIGURATION',
      entityType: 'trust_configuration',
      entityId: updated.id,
      entityName: 'Trust Configuration',
      description: 'Updated trust module configuration',
      changes: dto as unknown as Prisma.InputJsonValue,
    });

    return this.getConfiguration(organizationId);
  }

  async resetToDefaults(organizationId: string, userId: string): Promise<TrustConfigurationDto> {
    const updated = await this.prisma.trustConfiguration.update({
      where: { organizationId },
      data: {
        slaSettings: DEFAULT_SLA_SETTINGS as unknown as Prisma.InputJsonValue,
        assignmentSettings: DEFAULT_ASSIGNMENT_SETTINGS as unknown as Prisma.InputJsonValue,
        kbSettings: DEFAULT_KB_SETTINGS as unknown as Prisma.InputJsonValue,
        trustCenterSettings: DEFAULT_TRUST_CENTER_SETTINGS as unknown as Prisma.InputJsonValue,
        aiSettings: DEFAULT_AI_SETTINGS as unknown as Prisma.InputJsonValue,
        updatedBy: userId,
      },
    });

    await this.audit.log({
      organizationId,
      userId,
      action: 'RESET_TRUST_CONFIGURATION',
      entityType: 'trust_configuration',
      entityId: updated.id,
      entityName: 'Trust Configuration',
      description: 'Reset trust module configuration to defaults',
    });

    return this.getConfiguration(organizationId);
  }

  // Calculate SLA status for a questionnaire
  calculateSlaStatus(
    createdAt: Date,
    priority: string,
    slaSettings: SlaSettings,
    completedAt?: Date | null,
  ): { status: 'on_track' | 'at_risk' | 'breached'; hoursRemaining: number; percentageUsed: number } {
    const priorityKey = priority as keyof SlaSettings;
    const settings = slaSettings[priorityKey] || slaSettings.medium;
    
    const now = completedAt ? new Date(completedAt) : new Date();
    const hoursElapsed = (now.getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    const hoursRemaining = settings.targetHours - hoursElapsed;
    const percentageUsed = Math.min(100, Math.round((hoursElapsed / settings.targetHours) * 100));

    let status: 'on_track' | 'at_risk' | 'breached';
    if (hoursRemaining < 0) {
      status = 'breached';
    } else if (hoursRemaining <= (settings.targetHours - settings.warningHours)) {
      status = 'at_risk';
    } else {
      status = 'on_track';
    }

    return { status, hoursRemaining: Math.max(0, hoursRemaining), percentageUsed };
  }

  // Get reference data for UI
  getReferenceData() {
    return {
      priorities: [
        { value: 'urgent', label: 'Urgent', defaultTargetHours: 24 },
        { value: 'high', label: 'High', defaultTargetHours: 72 },
        { value: 'medium', label: 'Medium', defaultTargetHours: 168 },
        { value: 'low', label: 'Low', defaultTargetHours: 336 },
      ],
      slaStatuses: [
        { value: 'on_track', label: 'On Track', description: 'Within SLA target' },
        { value: 'at_risk', label: 'At Risk', description: 'Approaching SLA deadline' },
        { value: 'breached', label: 'Breached', description: 'SLA deadline exceeded' },
      ],
    };
  }
}

