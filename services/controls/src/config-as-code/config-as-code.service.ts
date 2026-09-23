import { Injectable, Logger, BadRequestException, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ResourceMapper } from './resources/resource-mapper';
import { YamlExporter } from './exporters/yaml-exporter';
import { JsonExporter } from './exporters/json-exporter';
import { TerraformExporter } from './exporters/terraform-exporter';
import {
  ExportConfigDto,
  ExportConfigResponseDto,
  ConfigFormat,
  ResourceType,
} from './dto/export-config.dto';
import { ImportConfigDto, ImportConfigResponseDto } from './dto/import-config.dto';
import { Exporter } from './exporters/exporter.interface';

@Injectable()
export class ConfigAsCodeService {
  private readonly logger = new Logger(ConfigAsCodeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly resourceMapper: ResourceMapper,
    private readonly yamlExporter: YamlExporter,
    private readonly jsonExporter: JsonExporter,
    private readonly terraformExporter: TerraformExporter
  ) {}

  /**
   * Export current GRC state to configuration format
   */
  async exportConfig(
    organizationId: string,
    userId: string,
    dto: ExportConfigDto
  ): Promise<ExportConfigResponseDto> {
    this.logger.log(`Exporting config for organization ${organizationId} in format ${dto.format}`);

    // Determine which resources to export
    const resourceTypes = dto.resources || Object.values(ResourceType);

    // Map resources from database
    const resourceData = await this.resourceMapper.mapResources(
      organizationId,
      resourceTypes,
      dto.workspaceId
    );

    // Get exporter for the requested format
    const exporter = this.getExporter(dto.format);

    // Export to string
    const content = exporter.export(resourceData, dto.format);

    // Calculate resource counts
    const resourceBreakdown: Record<string, number> = {};
    for (const [key, value] of Object.entries(resourceData)) {
      resourceBreakdown[key] = Array.isArray(value) ? value.length : 0;
    }
    const resourceCount = Object.values(resourceBreakdown).reduce((a, b) => a + b, 0);

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `grc-config-${timestamp}.${exporter.getFileExtension()}`;

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      action: 'export',
      entityType: 'config_as_code',
      entityId: 'export',
      description: `Exported GRC configuration in ${dto.format} format`,
      metadata: {
        format: dto.format,
        resourceTypes,
        resourceCount,
      },
    });

    return {
      content,
      format: dto.format,
      mimeType: exporter.getMimeType(),
      filename,
      resourceCount,
      resourceBreakdown,
    };
  }

  /**
   * Import configuration and apply changes
   */
  async importConfig(
    _organizationId: string,
    _userId: string,
    dto: ImportConfigDto
  ): Promise<ImportConfigResponseDto> {
    throw new NotImplementedException(
      `Generic ${dto.format} import is not supported. Use the validated /api/config-as-code/files preview and apply workflow.`
    );
  }

  /**
   * Get the appropriate exporter for the format
   */
  private getExporter(format: ConfigFormat): Exporter {
    switch (format) {
      case ConfigFormat.YAML:
        return this.yamlExporter;
      case ConfigFormat.JSON:
        return this.jsonExporter;
      case ConfigFormat.TERRAFORM:
        return this.terraformExporter;
      default:
        throw new BadRequestException(`Unsupported format: ${format}`);
    }
  }
}
