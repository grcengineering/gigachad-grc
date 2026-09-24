import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Writable } from 'stream';
import { ExportJob, Prisma } from '@prisma/client';
import { auditMutation } from '../common/audit-mutation';
import {
  CreateExportJobDto,
  ExportJobDto,
  ExportJobListQueryDto,
  ExportFormat,
  ExportEntityType,
  ExportStatus,
} from './dto/export.dto';
import { 
  parsePaginationParams, 
  createPaginatedResponse,
} from '@gigachad-grc/shared';

interface ExportJobRecord {
  id: string;
  organizationId: string;
  entityType: ExportEntityType;
  format: ExportFormat;
  status: ExportStatus;
  filters?: Record<string, any>;
  fields?: string[];
  includeRelations: boolean;
  fileName?: string;
  fileSize?: number;
  fileContent?: Buffer;
  expiresAt?: Date;
  errorMessage?: string;
  recordCount?: number;
  requestedBy: string;
  createdAt: Date;
  completedAt?: Date;
}

@Injectable()
export class ExportsService implements OnModuleInit {
  private readonly logger = new Logger(ExportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const interrupted = await this.prisma.exportJob.findMany({
      where: { status: { in: [ExportStatus.PENDING, ExportStatus.PROCESSING] } },
      select: { id: true, organizationId: true },
    });
    for (const job of interrupted) {
      this.processExportJob(job.id, job.organizationId).catch((error) => {
        this.logger.error(`Failed to resume export job ${job.id}: ${error.message}`);
      });
    }
  }

  async createExportJob(
    organizationId: string,
    userId: string,
    dto: CreateExportJobDto,
  ): Promise<ExportJobDto> {
    if (dto.format === ExportFormat.PPTX) {
      throw new BadRequestException('PPTX export is not supported; use PDF, XLSX, CSV, or JSON');
    }
    const created = await this.prisma.exportJob.create({
      data: {
        organizationId,
        entityType: dto.entityType,
        format: dto.format || ExportFormat.JSON,
        status: ExportStatus.PENDING,
        config: {
          filters: dto.filters || {},
          fields: dto.fields || [],
          includeRelations: dto.includeRelations || false,
        } as Prisma.InputJsonValue,
        requestedBy: userId,
      },
    });
    await auditMutation(this.prisma, {
      organizationId,
      userId,
      action: 'CREATE',
      entityType: 'ExportJob',
      entityId: created.id,
      description: `Created ${created.entityType} export job`,
      metadata: { format: created.format },
    });
    this.logger.log(`Created export job ${created.id} for ${dto.entityType}`);

    // Process asynchronously
    this.processExportJob(created.id, organizationId).catch(err => {
      this.logger.error(`Export job ${created.id} failed: ${err.message}`);
    });

    return this.toDto(this.toRecord(created));
  }

  async getExportJob(organizationId: string, id: string): Promise<ExportJobDto> {
    const job = await this.prisma.exportJob.findFirst({ where: { id, organizationId } });
    if (!job) {
      throw new NotFoundException(`Export job ${id} not found`);
    }
    return this.toDto(this.toRecord(job));
  }

  async listExportJobs(
    organizationId: string,
    query: ExportJobListQueryDto,
  ) {
    const pagination = parsePaginationParams({
      page: query.page,
      limit: query.limit,
    });

    const where = {
      organizationId,
      status: query.status,
      entityType: query.entityType,
    };
    const [jobs, total] = await Promise.all([
      this.prisma.exportJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.exportJob.count({ where }),
    ]);

    return createPaginatedResponse(
      jobs.map(j => this.toDto(this.toRecord(j))),
      total,
      pagination,
    );
  }

  async downloadExport(
    organizationId: string,
    id: string,
  ): Promise<{ content: Buffer; contentType: string; fileName: string }> {
    const row = await this.prisma.exportJob.findFirst({ where: { id, organizationId } });
    if (!row) {
      throw new NotFoundException(`Export job ${id} not found`);
    }
    const job = this.toRecord(row);

    if (job.status !== ExportStatus.COMPLETED) {
      throw new BadRequestException(`Export job is not completed (status: ${job.status})`);
    }

    if (job.expiresAt && job.expiresAt < new Date()) {
      throw new BadRequestException('Export has expired');
    }

    const contentType = this.getContentType(job.format);
    
    return {
      content: job.fileContent || Buffer.alloc(0),
      contentType,
      fileName: job.fileName || `export.${job.format}`,
    };
  }

  async cancelExportJob(organizationId: string, userId: string, id: string): Promise<void> {
    const job = await this.prisma.exportJob.findFirst({ where: { id, organizationId } });
    if (!job) {
      throw new NotFoundException(`Export job ${id} not found`);
    }

    if (job.status === ExportStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed export');
    }

    await this.prisma.exportJob.update({
      where: { id },
      data: { status: ExportStatus.FAILED, errorMessage: 'Cancelled by user' },
    });
    await auditMutation(this.prisma, {
      organizationId,
      userId,
      action: 'CANCEL',
      entityType: 'ExportJob',
      entityId: id,
      description: `Cancelled export job ${id}`,
    });
  }

  /**
   * Process an export job by ID
   * Can be called by the job scheduler for async processing
   */
  async processExportJob(id: string, organizationId?: string): Promise<void> {
    const row = await this.prisma.exportJob.findFirst({
      where: { id, organizationId },
    });
    if (!row) {
      throw new NotFoundException(`Export job ${id} not found`);
    }
    const job = this.toRecord(row);

    try {
      await this.prisma.exportJob.update({
        where: { id },
        data: { status: ExportStatus.PROCESSING, errorMessage: null },
      });

      const data = await this.fetchData(job);
      const content = await this.formatData(data, job.format);
      const fileName = `${job.entityType}_export_${new Date().toISOString().split('T')[0]}.${job.format}`;
      const recordCount = Array.isArray(data) ? data.length : 1;
      await this.prisma.exportJob.update({
        where: { id },
        data: {
          status: ExportStatus.COMPLETED,
          progress: 100,
          fileContent: content,
          fileName,
          fileSize: content.length,
          recordCount,
          completedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      await auditMutation(this.prisma, {
        organizationId: job.organizationId,
        userId: job.requestedBy,
        action: 'COMPLETE',
        entityType: 'ExportJob',
        entityId: id,
        description: `Completed export job ${id}`,
        metadata: { recordCount, fileSize: content.length, format: job.format },
      });
      this.logger.log(`Export job ${id} completed: ${recordCount} records`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.exportJob.update({
        where: { id },
        data: { status: ExportStatus.FAILED, errorMessage: message },
      });
      await auditMutation(this.prisma, {
        organizationId: job.organizationId,
        userId: job.requestedBy,
        action: 'FAIL',
        entityType: 'ExportJob',
        entityId: id,
        description: `Export job ${id} failed`,
        metadata: { error: message },
      });
      throw error;
    }
  }

  private async fetchData(job: ExportJobRecord): Promise<any[]> {
    const { organizationId, entityType, filters, includeRelations } = job;

    switch (entityType) {
      case ExportEntityType.Controls:
        return this.prisma.control.findMany({
          where: {
            ...filters,
            OR: [
              { organizationId: null },
              { organizationId },
            ],
            deletedAt: null,
          },
          include: includeRelations ? {
            implementations: { where: { organizationId } },
            mappings: true,
          } : undefined,
        });

      case ExportEntityType.Policies:
        return this.prisma.policy.findMany({
          where: { ...filters, organizationId, deletedAt: null },
          include: includeRelations ? {
            versions: true,
            controlLinks: true,
          } : undefined,
        });

      case ExportEntityType.Risks:
        return this.prisma.risk.findMany({
          where: { ...filters, organizationId, deletedAt: null },
          include: includeRelations ? {
            controls: true,
            assessment: true,
          } : undefined,
        });

      case ExportEntityType.Evidence:
        return this.prisma.evidence.findMany({
          where: { ...filters, organizationId, deletedAt: null },
          include: includeRelations ? {
            controlLinks: true,
          } : undefined,
        });

      case ExportEntityType.Tasks:
        return this.prisma.task.findMany({
          where: { ...filters, organizationId },
          include: includeRelations ? {
            assignee: { select: { id: true, displayName: true, email: true } },
          } : undefined,
        });

      case ExportEntityType.AuditLogs:
        return this.prisma.auditLog.findMany({
          where: { ...filters, organizationId },
          orderBy: { timestamp: 'desc' },
          take: 10000, // Limit audit log exports
        });

      case ExportEntityType.Users:
        return this.prisma.user.findMany({
          where: { ...filters, organizationId },
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
            status: true,
            lastLoginAt: true,
            createdAt: true,
          },
        });

      case ExportEntityType.Frameworks:
        return this.prisma.framework.findMany({
          where: {
            ...filters,
            OR: [
              { organizationId: null },
              { organizationId },
            ],
          },
          include: includeRelations ? {
            requirements: true,
          } : undefined,
        });

      case ExportEntityType.FullOrg: {
        const [controls, policies, risks, evidence] = await Promise.all([
          this.prisma.control.findMany({
            where: { OR: [{ organizationId: null }, { organizationId }], deletedAt: null },
          }),
          this.prisma.policy.findMany({
            where: { organizationId, deletedAt: null },
          }),
          this.prisma.risk.findMany({
            where: { organizationId, deletedAt: null },
          }),
          this.prisma.evidence.findMany({
            where: { organizationId, deletedAt: null },
          }),
        ]);
        return [{ controls, policies, risks, evidence }];
      }

      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
  }

  private async formatData(data: any[], format: ExportFormat): Promise<Buffer> {
    switch (format) {
      case ExportFormat.JSON:
        return Buffer.from(JSON.stringify(data, null, 2), 'utf8');

      case ExportFormat.CSV:
        return Buffer.from(this.formatAsCsv(data), 'utf8');

      case ExportFormat.XLSX:
        return await this.formatAsExcel(data);

      case ExportFormat.PDF:
        return await this.formatAsPdf(data);

      case ExportFormat.PPTX:
        throw new BadRequestException('PPTX export is not supported');

      default:
        throw new BadRequestException(`Unsupported export format: ${format}`);
    }
  }

  async formatRows(data: unknown[], format: 'pdf' | 'csv' | 'xlsx'): Promise<Buffer> {
    return this.formatData(data as any[], format as ExportFormat);
  }

  getFormatContentType(format: 'pdf' | 'csv' | 'xlsx'): string {
    return this.getContentType(format as ExportFormat);
  }

  /**
   * Format data as CSV
   */
  private formatAsCsv(data: any[]): string {
    if (data.length === 0) return '';
    
    const flatData = data.map(row => this.flattenObject(row));
    const headers = Object.keys(flatData[0]);
    
    const rows = flatData.map(row => 
      headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        const strVal = String(val);
        if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
          return `"${strVal.replace(/"/g, '""')}"`;
        }
        return strVal;
      }).join(',')
    );
    
    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Format data as Excel using ExcelJS
   */
  private async formatAsExcel(data: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'GigaChad GRC';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Export');

    if (data.length === 0) {
      worksheet.addRow(['No data to export']);
    } else {
      const flatData = data.map(row => this.flattenObject(row));
      const headers = Object.keys(flatData[0]);

      // Add header row with styling
      const headerRow = worksheet.addRow(headers);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center' };
      });

      // Add data rows
      flatData.forEach(row => {
        const values = headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') return JSON.stringify(val);
          return val;
        });
        worksheet.addRow(values);
      });

      // Auto-fit columns
      worksheet.columns.forEach((column, i) => {
        let maxLength = headers[i].length;
        flatData.forEach(row => {
          const val = row[headers[i]];
          const len = val ? String(val).length : 0;
          if (len > maxLength) maxLength = Math.min(len, 50);
        });
        column.width = maxLength + 2;
      });

      // Add filters
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: headers.length },
      };
    }

    // Write to buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Format data as PDF using PDFKit
   */
  private async formatAsPdf(data: any[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
      const chunks: Buffer[] = [];

      const writeStream = new Writable({
        write(chunk, encoding, callback) {
          chunks.push(chunk);
          callback();
        },
      });

      writeStream.on('finish', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });

      writeStream.on('error', reject);
      doc.pipe(writeStream);

      // Title
      doc.fontSize(20).fillColor('#1a1a2e');
      doc.text('GigaChad GRC Export', { align: 'center' });
      doc.moveDown();

      // Export info
      doc.fontSize(10).fillColor('#666666');
      doc.text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
      doc.text(`Total Records: ${data.length}`, { align: 'center' });
      doc.moveDown(2);

      // Divider
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#e0e0e0');
      doc.moveDown();

      if (data.length === 0) {
        doc.fontSize(12).fillColor('#333333');
        doc.text('No data to export.', { align: 'center' });
      } else {
        const flatData = data.map(row => this.flattenObject(row));
        const headers = Object.keys(flatData[0]).slice(0, 8); // Limit columns for PDF

        // Table header
        doc.fontSize(10).fillColor('#1a1a2e');
        let yPos = doc.y;
        const colWidth = (doc.page.width - 100) / headers.length;

        // Header row
        doc.font('Helvetica-Bold');
        headers.forEach((header, i) => {
          doc.text(
            this.truncateText(header, 12),
            50 + i * colWidth,
            yPos,
            { width: colWidth - 5, ellipsis: true }
          );
        });

        doc.font('Helvetica');
        yPos += 20;
        doc.moveTo(50, yPos).lineTo(550, yPos).stroke('#e0e0e0');
        yPos += 10;

        // Data rows
        doc.fontSize(8).fillColor('#333333');
        const maxRows = 50; // Limit rows for PDF
        
        flatData.slice(0, maxRows).forEach((row, rowIndex) => {
          if (yPos > doc.page.height - 100) {
            doc.addPage();
            yPos = 50;
          }

          headers.forEach((header, i) => {
            const val = row[header];
            const displayVal = val === null || val === undefined ? '' : String(val);
            doc.text(
              this.truncateText(displayVal, 15),
              50 + i * colWidth,
              yPos,
              { width: colWidth - 5, ellipsis: true }
            );
          });

          yPos += 15;

          // Alternate row background
          if (rowIndex % 2 === 0) {
            doc.rect(50, yPos - 15, 500, 15).fill('#f8f9fa');
            doc.fillColor('#333333');
          }
        });

        if (data.length > maxRows) {
          doc.moveDown(2);
          doc.fontSize(10).fillColor('#666666');
          doc.text(`... and ${data.length - maxRows} more records (truncated for PDF)`, { align: 'center' });
        }
      }

      // Footer
      doc.fontSize(8).fillColor('#999999');
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.text(
          `Page ${i + 1} of ${pageCount} | Confidential`,
          50,
          doc.page.height - 30,
          { align: 'center', width: doc.page.width - 100 }
        );
      }

      doc.end();
    });
  }

  /**
   * Format data as PowerPoint (basic implementation)
   * Note: For full PPTX support, consider using pptxgenjs
   */
  private async formatAsPowerPoint(data: any[]): Promise<string> {
    // Basic implementation: Create a summary document
    // For full PPTX support, install and use pptxgenjs
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: [960, 540], margin: 40 }); // 16:9 aspect ratio
      const chunks: Buffer[] = [];

      const writeStream = new Writable({
        write(chunk, encoding, callback) {
          chunks.push(chunk);
          callback();
        },
      });

      writeStream.on('finish', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer.toString('base64'));
      });

      writeStream.on('error', reject);
      doc.pipe(writeStream);

      // Title slide
      doc.rect(0, 0, 960, 540).fill('#1a1a2e');
      doc.fontSize(48).fillColor('#ffffff');
      doc.text('GigaChad GRC', 40, 180, { width: 880, align: 'center' });
      doc.fontSize(24).fillColor('#9ca3af');
      doc.text('Data Export Report', 40, 250, { width: 880, align: 'center' });
      doc.fontSize(14).fillColor('#6b7280');
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 40, 320, { width: 880, align: 'center' });
      doc.text(`Total Records: ${data.length}`, 40, 350, { width: 880, align: 'center' });

      // Summary slide
      doc.addPage();
      doc.rect(0, 0, 960, 60).fill('#1a1a2e');
      doc.fontSize(24).fillColor('#ffffff');
      doc.text('Export Summary', 40, 18, { width: 880 });

      doc.fontSize(16).fillColor('#1a1a2e');
      doc.text(`This export contains ${data.length} records.`, 40, 100);

      if (data.length > 0) {
        const flatData = data.map(row => this.flattenObject(row));
        const headers = Object.keys(flatData[0]);

        doc.fontSize(14).fillColor('#4b5563');
        doc.text('Fields included:', 40, 150);
        doc.fontSize(12).fillColor('#6b7280');
        headers.slice(0, 15).forEach((header, i) => {
          doc.text(`• ${header}`, 60, 180 + i * 20);
        });
        if (headers.length > 15) {
          doc.text(`... and ${headers.length - 15} more fields`, 60, 180 + 15 * 20);
        }
      }

      // Data preview slide
      if (data.length > 0) {
        doc.addPage();
        doc.rect(0, 0, 960, 60).fill('#1a1a2e');
        doc.fontSize(24).fillColor('#ffffff');
        doc.text('Data Preview', 40, 18, { width: 880 });

        doc.fontSize(10).fillColor('#4b5563');
        doc.text('First 5 records:', 40, 80);

        const flatData = data.slice(0, 5).map(row => this.flattenObject(row));
        const headers = Object.keys(flatData[0]).slice(0, 4);
        const colWidth = 200;

        // Header
        let yPos = 110;
        doc.fontSize(10).fillColor('#1a1a2e').font('Helvetica-Bold');
        headers.forEach((header, i) => {
          doc.text(this.truncateText(header, 20), 40 + i * colWidth, yPos);
        });

        // Data
        doc.font('Helvetica');
        flatData.forEach((row, _rowIndex) => {
          yPos += 25;
          doc.fillColor('#4b5563');
          headers.forEach((header, i) => {
            const val = row[header];
            const displayVal = val === null || val === undefined ? '' : String(val);
            doc.text(this.truncateText(displayVal, 25), 40 + i * colWidth, yPos);
          });
        });
      }

      doc.end();
    });
  }

  /**
   * Flatten nested object for export
   */
  private flattenObject(obj: any, prefix = ''): Record<string, any> {
    const result: Record<string, any> = {};

    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

      const newKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (value instanceof Date) {
        result[newKey] = value.toISOString();
      } else if (Array.isArray(value)) {
        result[newKey] = JSON.stringify(value);
      } else if (typeof value === 'object' && value !== null) {
        // Only flatten one level to avoid very deep nesting
        result[newKey] = JSON.stringify(value);
      } else {
        result[newKey] = value;
      }
    }

    return result;
  }

  /**
   * Truncate text with ellipsis
   */
  private truncateText(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen - 3) + '...';
  }

  private getContentType(format: ExportFormat): string {
    switch (format) {
      case ExportFormat.JSON:
        return 'application/json';
      case ExportFormat.CSV:
        return 'text/csv';
      case ExportFormat.XLSX:
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case ExportFormat.PDF:
        return 'application/pdf';
      case ExportFormat.PPTX:
        return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      default:
        return 'application/octet-stream';
    }
  }

  private toRecord(job: ExportJob): ExportJobRecord {
    const config = (job.config || {}) as Record<string, unknown>;
    return {
      id: job.id,
      organizationId: job.organizationId,
      entityType: job.entityType as ExportEntityType,
      format: job.format as ExportFormat,
      status: job.status as ExportStatus,
      filters: config.filters as Record<string, unknown> | undefined,
      fields: config.fields as string[] | undefined,
      includeRelations: Boolean(config.includeRelations),
      fileName: job.fileName ?? job.name ?? undefined,
      fileSize: job.fileSize ?? undefined,
      fileContent: job.fileContent ? Buffer.from(job.fileContent) : undefined,
      expiresAt: job.expiresAt ?? undefined,
      errorMessage: job.errorMessage ?? undefined,
      recordCount: job.recordCount ?? undefined,
      requestedBy: job.requestedBy,
      createdAt: job.createdAt,
      completedAt: job.completedAt ?? undefined,
    };
  }

  private toDto(job: ExportJobRecord): ExportJobDto {
    return {
      id: job.id,
      entityType: job.entityType,
      format: job.format,
      status: job.status,
      fileName: job.fileName,
      fileSize: job.fileSize,
      downloadUrl: job.status === ExportStatus.COMPLETED ? `/api/exports/${job.id}/download` : undefined,
      expiresAt: job.expiresAt,
      errorMessage: job.errorMessage,
      recordCount: job.recordCount,
      requestedBy: job.requestedBy,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }
}
