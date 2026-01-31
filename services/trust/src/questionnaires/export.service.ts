import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as ExcelJS from 'exceljs';

export interface ExportOptions {
  format: 'excel' | 'csv' | 'json';
  includeMetadata?: boolean;
  includePending?: boolean;
}

interface ExportQuestion {
  questionNumber: string | null;
  questionText: string;
  answerText: string | null;
  status: string;
  category: string | null;
}

interface ExportQuestionnaire {
  id: string;
  title: string;
  requesterName: string | null;
  requesterEmail: string;
  company: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  createdAt: Date;
  completedAt: Date | null;
  questions: ExportQuestion[];
}

@Injectable()
export class QuestionnaireExportService {
  constructor(private prisma: PrismaService) {}

  // Export a single questionnaire
  async exportQuestionnaire(id: string, options: ExportOptions): Promise<Buffer | string> {
    const questionnaire = await this.prisma.questionnaireRequest.findFirst({
      where: { id, deletedAt: null },
      include: {
        questions: {
          orderBy: { questionNumber: 'asc' },
        },
      },
    });

    if (!questionnaire) {
      throw new NotFoundException(`Questionnaire with ID ${id} not found`);
    }

    switch (options.format) {
      case 'excel':
        return this.exportToExcel(questionnaire, options);
      case 'csv':
        return this.exportToCsv(questionnaire, options);
      case 'json':
        return this.exportToJson(questionnaire, options);
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  // Export multiple questionnaires
  async exportMultiple(ids: string[], options: ExportOptions): Promise<Buffer | string> {
    const questionnaires = await this.prisma.questionnaireRequest.findMany({
      where: { id: { in: ids }, deletedAt: null },
      include: {
        questions: {
          orderBy: { questionNumber: 'asc' },
        },
      },
    });

    switch (options.format) {
      case 'excel':
        return this.exportMultipleToExcel(questionnaires, options);
      case 'json':
        return JSON.stringify(questionnaires, null, 2);
      default:
        throw new Error(`Format ${options.format} not supported for batch export`);
    }
  }

  // Export to Excel format
  private async exportToExcel(questionnaire: ExportQuestionnaire, options: ExportOptions): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'GigaChad GRC';
    workbook.created = new Date();

    // Main questionnaire sheet
    const sheet = workbook.addWorksheet('Questionnaire');

    // Add metadata header if requested
    if (options.includeMetadata !== false) {
      sheet.addRow(['Questionnaire Export']);
      sheet.getRow(1).font = { bold: true, size: 16 };
      sheet.addRow([]);
      sheet.addRow(['Title:', questionnaire.title]);
      sheet.addRow(['Requester:', questionnaire.requesterName]);
      sheet.addRow(['Company:', questionnaire.company || 'N/A']);
      sheet.addRow(['Status:', questionnaire.status]);
      sheet.addRow(['Priority:', questionnaire.priority]);
      sheet.addRow(['Due Date:', questionnaire.dueDate ? new Date(questionnaire.dueDate).toLocaleDateString() : 'N/A']);
      sheet.addRow(['Created:', new Date(questionnaire.createdAt).toLocaleDateString()]);
      if (questionnaire.completedAt) {
        sheet.addRow(['Completed:', new Date(questionnaire.completedAt).toLocaleDateString()]);
      }
      sheet.addRow([]);
      sheet.addRow([]);
    }

    // Questions header
    const headerRow = sheet.addRow(['#', 'Question', 'Answer', 'Status', 'Category']);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });

    // Set column widths
    sheet.getColumn(1).width = 6;
    sheet.getColumn(2).width = 60;
    sheet.getColumn(3).width = 80;
    sheet.getColumn(4).width = 12;
    sheet.getColumn(5).width = 15;

    // Add questions
    const questions = options.includePending !== false 
      ? questionnaire.questions 
      : questionnaire.questions.filter((q) => q.status === 'answered' || q.status === 'approved');

    questions.forEach((question, index) => {
      const row = sheet.addRow([
        question.questionNumber || (index + 1).toString(),
        question.questionText,
        question.answerText || '',
        question.status,
        question.category || '',
      ]);
      
      // Wrap text for long content
      row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
      row.getCell(3).alignment = { wrapText: true, vertical: 'top' };

      // Color code by status
      if (question.status === 'answered' || question.status === 'approved') {
        row.getCell(4).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD4EDDA' },
        };
      } else if (question.status === 'pending') {
        row.getCell(4).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF3CD' },
        };
      }
    });

    // Add summary at the bottom
    sheet.addRow([]);
    const _totalRow = sheet.addRow(['', `Total Questions: ${questionnaire.questions.length}`]);
    const _answeredRow = sheet.addRow(['', `Answered: ${questionnaire.questions.filter((q) => q.status === 'answered' || q.status === 'approved').length}`]);
    const _pendingRow = sheet.addRow(['', `Pending: ${questionnaire.questions.filter((q) => q.status === 'pending').length}`]);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  // Export to CSV format
  private async exportToCsv(questionnaire: ExportQuestionnaire, options: ExportOptions): Promise<string> {
    const rows: string[] = [];

    // Header
    rows.push('"#","Question","Answer","Status","Category"');

    // Questions
    const questions = options.includePending !== false 
      ? questionnaire.questions 
      : questionnaire.questions.filter((q) => q.status === 'answered' || q.status === 'approved');

    questions.forEach((question, index) => {
      rows.push([
        question.questionNumber || (index + 1).toString(),
        this.escapeCsv(question.questionText),
        this.escapeCsv(question.answerText || ''),
        question.status,
        question.category || '',
      ].map(val => `"${val}"`).join(','));
    });

    return rows.join('\n');
  }

  // Export to JSON format
  private async exportToJson(questionnaire: ExportQuestionnaire, options: ExportOptions): Promise<string> {
    const questions = options.includePending !== false 
      ? questionnaire.questions 
      : questionnaire.questions.filter((q) => q.status === 'answered' || q.status === 'approved');

    const exportData = {
      metadata: options.includeMetadata !== false ? {
        title: questionnaire.title,
        requesterName: questionnaire.requesterName,
        requesterEmail: questionnaire.requesterEmail,
        company: questionnaire.company,
        status: questionnaire.status,
        priority: questionnaire.priority,
        dueDate: questionnaire.dueDate,
        createdAt: questionnaire.createdAt,
        completedAt: questionnaire.completedAt,
      } : undefined,
      questions: questions.map((q, index) => ({
        number: q.questionNumber || (index + 1).toString(),
        question: q.questionText,
        answer: q.answerText,
        status: q.status,
        category: q.category,
      })),
    };

    return JSON.stringify(exportData, null, 2);
  }

  // Export multiple questionnaires to a single Excel file
  private async exportMultipleToExcel(questionnaires: ExportQuestionnaire[], _options: ExportOptions): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'GigaChad GRC';
    workbook.created = new Date();

    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.addRow(['Batch Questionnaire Export']);
    summarySheet.getRow(1).font = { bold: true, size: 16 };
    summarySheet.addRow([]);
    summarySheet.addRow(['Generated:', new Date().toLocaleDateString()]);
    summarySheet.addRow(['Total Questionnaires:', questionnaires.length]);
    summarySheet.addRow([]);
    
    const summaryHeader = summarySheet.addRow(['Title', 'Requester', 'Company', 'Status', 'Questions', 'Completed']);
    summaryHeader.font = { bold: true };

    questionnaires.forEach((q) => {
      const answeredCount = q.questions.filter((question) => 
        question.status === 'answered' || question.status === 'approved'
      ).length;
      summarySheet.addRow([
        q.title,
        q.requesterName,
        q.company || 'N/A',
        q.status,
        `${answeredCount}/${q.questions.length}`,
        q.completedAt ? new Date(q.completedAt).toLocaleDateString() : 'N/A',
      ]);
    });

    // Individual questionnaire sheets
    questionnaires.forEach((questionnaire, idx) => {
      const sheetName = `${(idx + 1).toString().padStart(2, '0')} - ${questionnaire.title.slice(0, 25)}`;
      const sheet = workbook.addWorksheet(sheetName);

      // Header
      sheet.addRow([questionnaire.title]);
      sheet.getRow(1).font = { bold: true, size: 14 };
      sheet.addRow([`${questionnaire.requesterName} - ${questionnaire.company || 'N/A'}`]);
      sheet.addRow([]);

      // Questions table
      const headerRow = sheet.addRow(['#', 'Question', 'Answer', 'Status']);
      headerRow.font = { bold: true };

      sheet.getColumn(1).width = 6;
      sheet.getColumn(2).width = 50;
      sheet.getColumn(3).width = 70;
      sheet.getColumn(4).width = 12;

      questionnaire.questions.forEach((question, qIdx) => {
        const row = sheet.addRow([
          question.questionNumber || (qIdx + 1).toString(),
          question.questionText,
          question.answerText || '',
          question.status,
        ]);
        row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
        row.getCell(3).alignment = { wrapText: true, vertical: 'top' };
      });
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  // Escape CSV special characters
  private escapeCsv(value: string): string {
    if (!value) return '';
    return value.replace(/"/g, '""').replace(/\n/g, ' ');
  }
}

