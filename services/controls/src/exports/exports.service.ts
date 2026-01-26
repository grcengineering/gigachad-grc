import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Writable } from 'stream';
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
  fileContent?: string; // Base64 encoded for in-memory storage
  expiresAt?: Date;
  errorMessage?: string;
  recordCount?: number;
  requestedBy: string;
  createdAt: Date;
  completedAt?: Date;
}

// In-memory store for export jobs
const exportJobStore = new Map<string, ExportJobRecord>();

// Cleanup expired jobs every hour
setInterval(() => {
  const now = new Date();
  for (const [id, job] of exportJobStore.entries()) {
    if (job.expiresAt && job.expiresAt < now) {
      exportJobStore.delete(id);
    }
  }
}, 60 * 60 * 1000);

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createExportJob(
    organizationId: string,
    userId: string,
    dto: CreateExportJobDto,
  ): Promise<ExportJobDto> {
    const id = crypto.randomUUID();
    const now = new Date();

    const job: ExportJobRecord = {
      id,
      organizationId,
      entityType: dto.entityType,
      format: dto.format || ExportFormat.JSON,
      status: ExportStatus.PENDING,
      filters: dto.filters,
      fields: dto.fields,
      includeRelations: dto.includeRelations || false,
      requestedBy: userId,
      createdAt: now,
    };

    exportJobStore.set(id, job);
    this.logger.log(`Created export job ${id} for ${dto.entityType}`);

    // Process asynchronously
    this.processExportJob(id).catch(err => {
      this.logger.error(`Export job ${id} failed: ${err.message}`);
    });

    return this.toDto(job);
  }

  async getExportJob(organizationId: string, id: string): Promise<ExportJobDto> {
    const job = exportJobStore.get(id);
    if (!job || job.organizationId !== organizationId) {
      throw new NotFoundException(`Export job ${id} not found`);
    }
    return this.toDto(job);
  }

  async listExportJobs(
    organizationId: string,
    query: ExportJobListQueryDto,
  ) {
    const pagination = parsePaginationParams({
      page: query.page,
      limit: query.limit,
    });

    let jobs = Array.from(exportJobStore.values())
      .filter(j => j.organizationId === organizationId);

    if (query.status) {
      jobs = jobs.filter(j => j.status === query.status);
    }

    if (query.entityType) {
      jobs = jobs.filter(j => j.entityType === query.entityType);
    }

    jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = jobs.length;
    const offset = (pagination.page - 1) * pagination.limit;
    const paginatedJobs = jobs.slice(offset, offset + pagination.limit);

    return createPaginatedResponse(
      paginatedJobs.map(j => this.toDto(j)),
      total,
      pagination,
    );
  }

  async downloadExport(
    organizationId: string,
    id: string,
  ): Promise<{ content: string; contentType: string; fileName: string }> {
    const job = exportJobStore.get(id);
    if (!job || job.organizationId !== organizationId) {
      throw new NotFoundException(`Export job ${id} not found`);
    }

    if (job.status !== ExportStatus.COMPLETED) {
      throw new BadRequestException(`Export job is not completed (status: ${job.status})`);
    }

    if (job.expiresAt && job.expiresAt < new Date()) {
      throw new BadRequestException('Export has expired');
    }

    const contentType = this.getContentType(job.format);
    
    return {
      content: job.fileContent || '',
      contentType,
      fileName: job.fileName || `export.${job.format}`,
    };
  }

  async cancelExportJob(organizationId: string, id: string): Promise<void> {
    const job = exportJobStore.get(id);
    if (!job || job.organizationId !== organizationId) {
      throw new NotFoundException(`Export job ${id} not found`);
    }

    if (job.status === ExportStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed export');
    }

    job.status = ExportStatus.FAILED;
    job.errorMessage = 'Cancelled by user';
    exportJobStore.set(id, job);
  }

  /**
   * Process an export job by ID
   * Can be called by the job scheduler for async processing
   */
  async processExportJob(id: string, _organizationId?: string): Promise<void> {
    const job = exportJobStore.get(id);
    if (!job) return;

    try {
      job.status = ExportStatus.PROCESSING;
      exportJobStore.set(id, job);

      const data = await this.fetchData(job);
      const content = await this.formatData(data, job.format);

      job.status = ExportStatus.COMPLETED;
      job.fileContent = Buffer.from(content).toString('base64');
      job.fileName = `${job.entityType}_export_${new Date().toISOString().split('T')[0]}.${job.format}`;
      job.fileSize = content.length;
      job.recordCount = Array.isArray(data) ? data.length : 1;
      job.completedAt = new Date();
      job.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hour expiry

      exportJobStore.set(id, job);
      this.logger.log(`Export job ${id} completed: ${job.recordCount} records`);
    } catch (error) {
      job.status = ExportStatus.FAILED;
      job.errorMessage = error.message;
      exportJobStore.set(id, job);
      throw error;
    }
  }

  private async fetchData(job: ExportJobRecord): Promise<any[]> {
    const { organizationId, entityType, filters, includeRelations } = job;

    switch (entityType) {
      case ExportEntityType.Controls:
        return this.prisma.control.findMany({
          where: {
            OR: [
              { organizationId: null },
              { organizationId },
            ],
            deletedAt: null,
            ...filters,
          },
          include: includeRelations ? {
            implementations: { where: { organizationId } },
            mappings: true,
          } : undefined,
        });

      case ExportEntityType.Policies:
        return this.prisma.policy.findMany({
          where: { organizationId, deletedAt: null, ...filters },
          include: includeRelations ? {
            versions: true,
            controlLinks: true,
          } : undefined,
        });

      case ExportEntityType.Risks:
        return this.prisma.risk.findMany({
          where: { organizationId, deletedAt: null, ...filters },
          include: includeRelations ? {
            controls: true,
            assessment: true,
          } : undefined,
        });

      case ExportEntityType.Evidence:
        return this.prisma.evidence.findMany({
          where: { organizationId, deletedAt: null, ...filters },
          include: includeRelations ? {
            controlLinks: true,
          } : undefined,
        });

      case ExportEntityType.Tasks:
        return this.prisma.task.findMany({
          where: { organizationId, ...filters },
          include: includeRelations ? {
            assignee: { select: { id: true, displayName: true, email: true } },
          } : undefined,
        });

      case ExportEntityType.AuditLogs:
        return this.prisma.auditLog.findMany({
          where: { organizationId, ...filters },
          orderBy: { timestamp: 'desc' },
          take: 10000, // Limit audit log exports
        });

      case ExportEntityType.Users:
        return this.prisma.user.findMany({
          where: { organizationId, ...filters },
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
            OR: [
              { organizationId: null },
              { organizationId },
            ],
            ...filters,
          },
          include: includeRelations ? {
            requirements: true,
          } : undefined,
        });

      case ExportEntityType.FullOrg:
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

      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
  }

  private async formatData(data: any[], format: ExportFormat): Promise<string> {
    switch (format) {
      case ExportFormat.JSON:
        return JSON.stringify(data, null, 2);

      case ExportFormat.CSV:
        return this.formatAsCsv(data);

      case ExportFormat.XLSX:
        return await this.formatAsExcel(data);

      case ExportFormat.PDF:
        return await this.formatAsPdf(data);

      case ExportFormat.PPTX:
        return await this.formatAsPowerPoint(data);

      default:
        return JSON.stringify(data, null, 2);
    }
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
  private async formatAsExcel(data: any[]): Promise<string> {
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
    return Buffer.from(buffer).toString('base64');
  }

  /**
   * Format data as PDF using PDFKit
   */
  private async formatAsPdf(data: any[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
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
        flatData.forEach((row, rowIndex) => {
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
