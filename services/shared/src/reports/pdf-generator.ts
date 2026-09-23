/**
 * PDF Report Generator
 *
 * Generates compliance reports in PDF format for auditors and executives.
 * Uses PDFKit for pure Node.js PDF generation.
 */

import PDFDocument from 'pdfkit';
import { Writable } from 'stream';

// Types
export interface ReportMetadata {
  title: string;
  subtitle?: string;
  organization: string;
  generatedBy: string;
  generatedAt: Date;
  reportType:
    | 'compliance_summary'
    | 'framework_assessment'
    | 'risk_register'
    | 'risk_trends'
    | 'audit_report'
    | 'control_status';
  frameworkName?: string;
  period?: {
    start: Date;
    end: Date;
  };
  confidential?: boolean;
}

export interface ComplianceSummaryData {
  overallScore: number;
  frameworkScores: Array<{
    name: string;
    score: number;
    totalControls: number;
    implementedControls: number;
  }>;
  controlsByStatus: {
    implemented: number;
    in_progress: number;
    not_started: number;
    not_applicable: number;
  };
  riskSummary: {
    total: number;
    byLevel: Record<string, number>;
    openCount: number;
  };
  evidenceSummary: {
    total: number;
    pendingReview: number;
    expiringSoon: number;
    expired: number;
  };
  recentActivity: Array<{
    action: string;
    entityType: string;
    entityName: string;
    timestamp: Date;
    user: string;
  }>;
}

export interface ControlStatusData {
  controls: Array<{
    controlId: string;
    title: string;
    category: string;
    status: string;
    owner?: string;
    lastTested?: Date;
    nextTestDue?: Date;
    evidenceCount: number;
  }>;
}

export interface RiskRegisterData {
  risks: Array<{
    riskId: string;
    title: string;
    category: string;
    status: string;
    inherentRisk: string;
    residualRisk: string;
    owner?: string;
    treatmentPlan?: string;
    lastReviewed?: Date;
  }>;
}

export interface RiskTrendData {
  trends: Array<{
    week: string;
    created: number;
    assessed: number;
    mitigated: number;
    accepted: number;
  }>;
}

export interface FrameworkAssessmentData {
  frameworkName: string;
  frameworkVersion?: string;
  overallScore: number;
  requirements: Array<{
    reference: string;
    title: string;
    status: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable' | 'not_assessed';
    mappedControls: number;
    implementedControls: number;
    gaps?: string[];
  }>;
  gapSummary: {
    compliant: number;
    partial: number;
    nonCompliant: number;
    notAssessed: number;
  };
}

// Color palette
const COLORS = {
  primary: '#2563eb', // Blue
  success: '#16a34a', // Green
  warning: '#ca8a04', // Yellow
  danger: '#dc2626', // Red
  gray: '#6b7280',
  darkGray: '#374151',
  lightGray: '#f3f4f6',
  black: '#111827',
  white: '#ffffff',
};

// Status colors
const STATUS_COLORS: Record<string, string> = {
  implemented: COLORS.success,
  compliant: COLORS.success,
  in_progress: COLORS.warning,
  partial: COLORS.warning,
  not_started: COLORS.gray,
  non_compliant: COLORS.danger,
  not_applicable: COLORS.gray,
  not_assessed: COLORS.gray,
};

/**
 * PDF Report Generator Class
 */
export class PDFReportGenerator {
  private doc: PDFKit.PDFDocument;
  private pageNumber: number = 0;
  private metadata: ReportMetadata;

  constructor(metadata: ReportMetadata) {
    this.metadata = metadata;
    this.doc = new PDFDocument({
      size: 'A4',
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
      info: {
        Title: metadata.title,
        Author: metadata.generatedBy,
        Subject: `${metadata.reportType} Report`,
        Keywords: 'GRC, Compliance, Report',
        Creator: 'GigaChad GRC Platform',
        Producer: 'GigaChad GRC',
        CreationDate: metadata.generatedAt,
      },
    });
  }

  /**
   * Generate the PDF and return as buffer
   */
  async generate(
    data:
      | ComplianceSummaryData
      | ControlStatusData
      | RiskRegisterData
      | RiskTrendData
      | FrameworkAssessmentData
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      this.doc.on('data', (chunk) => chunks.push(chunk));
      this.doc.on('end', () => resolve(Buffer.concat(chunks)));
      this.doc.on('error', reject);

      // Add content based on report type
      this.addCoverPage();

      switch (this.metadata.reportType) {
        case 'compliance_summary':
          this.generateComplianceSummary(data as ComplianceSummaryData);
          break;
        case 'framework_assessment':
          this.generateFrameworkAssessment(data as FrameworkAssessmentData);
          break;
        case 'risk_register':
          this.generateRiskRegister(data as RiskRegisterData);
          break;
        case 'risk_trends':
          this.generateRiskTrends(data as RiskTrendData);
          break;
        case 'control_status':
          this.generateControlStatus(data as ControlStatusData);
          break;
        default:
          this.generateComplianceSummary(data as ComplianceSummaryData);
      }

      // Finalize
      this.doc.end();
    });
  }

  /**
   * Generate to a writable stream
   */
  generateToStream(
    data:
      | ComplianceSummaryData
      | ControlStatusData
      | RiskRegisterData
      | RiskTrendData
      | FrameworkAssessmentData,
    stream: Writable
  ): void {
    this.doc.pipe(stream);

    this.addCoverPage();

    switch (this.metadata.reportType) {
      case 'compliance_summary':
        this.generateComplianceSummary(data as ComplianceSummaryData);
        break;
      case 'framework_assessment':
        this.generateFrameworkAssessment(data as FrameworkAssessmentData);
        break;
      case 'risk_register':
        this.generateRiskRegister(data as RiskRegisterData);
        break;
      case 'risk_trends':
        this.generateRiskTrends(data as RiskTrendData);
        break;
      case 'control_status':
        this.generateControlStatus(data as ControlStatusData);
        break;
    }

    this.doc.end();
  }

  // ===========================================
  // Cover Page
  // ===========================================

  private addCoverPage(): void {
    this.pageNumber = 1;

    // Background header
    this.doc.rect(0, 0, this.doc.page.width, 200).fill(COLORS.primary);

    // Logo placeholder / Organization name
    this.doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor(COLORS.white)
      .text(this.metadata.organization.toUpperCase(), 72, 50);

    // Main title
    this.doc
      .font('Helvetica-Bold')
      .fontSize(32)
      .fillColor(COLORS.white)
      .text(this.metadata.title, 72, 100, { width: this.doc.page.width - 144 });

    // Subtitle
    if (this.metadata.subtitle) {
      this.doc
        .font('Helvetica')
        .fontSize(16)
        .fillColor(COLORS.white)
        .text(this.metadata.subtitle, 72, 150);
    }

    // Report metadata
    this.doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(COLORS.darkGray)
      .text(`Generated: ${this.formatDate(this.metadata.generatedAt)}`, 72, 250)
      .text(`Generated by: ${this.metadata.generatedBy}`, 72, 268);

    if (this.metadata.period) {
      this.doc.text(
        `Period: ${this.formatDate(this.metadata.period.start)} - ${this.formatDate(this.metadata.period.end)}`,
        72,
        286
      );
    }

    if (this.metadata.frameworkName) {
      this.doc.text(`Framework: ${this.metadata.frameworkName}`, 72, 304);
    }

    // Confidential notice
    if (this.metadata.confidential) {
      this.doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor(COLORS.danger)
        .text('CONFIDENTIAL', 72, 350)
        .font('Helvetica')
        .fontSize(10)
        .fillColor(COLORS.gray)
        .text(
          'This document contains confidential information. Do not distribute without authorization.',
          72,
          368,
          { width: 400 }
        );
    }

    // Footer
    this.addPageFooter();
  }

  // ===========================================
  // Compliance Summary Report
  // ===========================================

  private generateComplianceSummary(data: ComplianceSummaryData): void {
    this.addNewPage('Executive Summary');

    // Overall compliance score
    this.addScoreGauge(data.overallScore, 'Overall Compliance Score', 72, this.doc.y + 20);
    this.doc.moveDown(8);

    // Framework scores
    this.addSectionHeader('Framework Compliance');
    data.frameworkScores.forEach((fw) => {
      this.addProgressBar(fw.name, fw.score, fw.implementedControls, fw.totalControls);
    });

    this.doc.moveDown(2);

    // Control status breakdown
    this.addSectionHeader('Control Implementation Status');
    this.addStatusBreakdown(data.controlsByStatus);

    this.doc.moveDown(2);

    // Risk summary
    this.addNewPage('Risk & Evidence Summary');
    this.addSectionHeader('Risk Overview');
    this.addRiskSummary(data.riskSummary);

    this.doc.moveDown(2);

    // Evidence summary
    this.addSectionHeader('Evidence Status');
    this.addEvidenceSummary(data.evidenceSummary);

    // Recent activity
    if (data.recentActivity.length > 0) {
      this.addNewPage('Recent Activity');
      this.addSectionHeader('Recent Activity Log');
      this.addActivityTable(data.recentActivity);
    }
  }

  // ===========================================
  // Framework Assessment Report
  // ===========================================

  private generateFrameworkAssessment(data: FrameworkAssessmentData): void {
    this.addNewPage(`${data.frameworkName} Assessment`);

    // Overall score
    this.addScoreGauge(data.overallScore, `${data.frameworkName} Readiness`, 72, this.doc.y + 20);
    this.doc.moveDown(8);

    // Gap summary
    this.addSectionHeader('Compliance Gap Summary');
    this.addGapSummary(data.gapSummary);

    this.doc.moveDown(2);

    // Requirements breakdown
    this.addNewPage('Detailed Requirements');
    this.addSectionHeader('Requirements Status');
    this.addRequirementsTable(data.requirements);
  }

  // ===========================================
  // Risk Register Report
  // ===========================================

  private generateRiskRegister(data: RiskRegisterData): void {
    this.addNewPage('Risk Register');

    this.addSectionHeader('Active Risks');
    this.addRisksTable(data.risks);
  }

  private generateRiskTrends(data: RiskTrendData): void {
    this.addNewPage('Risk Trend Analysis');
    this.addSectionHeader('Weekly Risk Activity');

    if (data.trends.length === 0) {
      this.doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(COLORS.gray)
        .text('No risk activity was recorded for the selected period.');
      return;
    }

    const columns = [
      { label: 'Week', width: 120 },
      { label: 'Created', width: 70 },
      { label: 'Assessed', width: 70 },
      { label: 'Mitigated', width: 70 },
      { label: 'Accepted', width: 70 },
    ];
    let y = this.doc.y + 10;

    this.doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.darkGray);
    let x = 72;
    for (const column of columns) {
      this.doc.text(column.label, x, y, { width: column.width });
      x += column.width;
    }
    y += 18;

    this.doc.font('Helvetica').fontSize(9).fillColor(COLORS.black);
    for (const trend of data.trends) {
      if (y > this.doc.page.height - 90) {
        this.addNewPage('Risk Trend Analysis (continued)');
        y = this.doc.y + 10;
      }
      x = 72;
      for (const [value, column] of [
        [this.formatDate(new Date(`${trend.week}T00:00:00Z`)), columns[0]],
        [String(trend.created), columns[1]],
        [String(trend.assessed), columns[2]],
        [String(trend.mitigated), columns[3]],
        [String(trend.accepted), columns[4]],
      ] as Array<[string, { label: string; width: number }]>) {
        this.doc.text(value, x, y, { width: column.width });
        x += column.width;
      }
      y += 17;
    }
  }

  // ===========================================
  // Control Status Report
  // ===========================================

  private generateControlStatus(data: ControlStatusData): void {
    this.addNewPage('Control Status Report');

    this.addSectionHeader('Control Implementation Status');
    this.addControlsTable(data.controls);
  }

  // ===========================================
  // Helper Methods
  // ===========================================

  private addNewPage(title?: string): void {
    this.doc.addPage();
    this.pageNumber++;

    if (title) {
      this.doc.font('Helvetica-Bold').fontSize(24).fillColor(COLORS.primary).text(title, 72, 72);
      this.doc.moveDown(1);
    }

    this.addPageFooter();
  }

  private addPageFooter(): void {
    const y = this.doc.page.height - 50;
    this.doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.gray)
      .text(`Page ${this.pageNumber}`, 72, y)
      .text(this.metadata.organization, this.doc.page.width - 200, y, {
        width: 128,
        align: 'right',
      });
  }

  private addSectionHeader(title: string): void {
    this.doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.darkGray).text(title);

    // Underline
    const y = this.doc.y;
    this.doc
      .moveTo(72, y)
      .lineTo(this.doc.page.width - 72, y)
      .strokeColor(COLORS.lightGray)
      .lineWidth(1)
      .stroke();

    this.doc.moveDown(0.5);
  }

  private addScoreGauge(score: number, label: string, x: number, y: number): void {
    const size = 100;
    const centerX = x + size / 2;
    const centerY = y + size / 2;

    // Background circle
    this.doc
      .circle(centerX, centerY, size / 2)
      .lineWidth(8)
      .strokeColor(COLORS.lightGray)
      .stroke();

    // Score arc
    const color = score >= 80 ? COLORS.success : score >= 60 ? COLORS.warning : COLORS.danger;
    // Note: PDFKit doesn't have arc, so we'll use a filled approach
    this.doc
      .circle(centerX, centerY, size / 2 - 4)
      .lineWidth(8)
      .strokeColor(color)
      .stroke();

    // Score text
    this.doc
      .font('Helvetica-Bold')
      .fontSize(28)
      .fillColor(COLORS.black)
      .text(`${score}%`, centerX - 30, centerY - 15, { width: 60, align: 'center' });

    // Label
    this.doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(COLORS.gray)
      .text(label, x, y + size + 10, { width: size, align: 'center' });
  }

  private addProgressBar(label: string, percentage: number, current: number, total: number): void {
    const barWidth = 300;
    const barHeight = 16;
    const x = 72;
    const y = this.doc.y;

    // Label
    this.doc.font('Helvetica').fontSize(11).fillColor(COLORS.darkGray).text(label, x, y);

    // Stats
    this.doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(COLORS.gray)
      .text(`${current}/${total} (${percentage}%)`, x + barWidth + 20, y);

    // Background bar
    this.doc.rect(x, y + 18, barWidth, barHeight).fill(COLORS.lightGray);

    // Progress bar
    const color =
      percentage >= 80 ? COLORS.success : percentage >= 60 ? COLORS.warning : COLORS.danger;
    const progressWidth = (percentage / 100) * barWidth;
    if (progressWidth > 0) {
      this.doc.rect(x, y + 18, progressWidth, barHeight).fill(color);
    }

    this.doc.y = y + 45;
  }

  private addStatusBreakdown(status: Record<string, number>): void {
    const total = Object.values(status).reduce((a, b) => a + b, 0);
    const x = 72;

    Object.entries(status).forEach(([key, value]) => {
      const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
      const label = this.formatStatusLabel(key);
      const color = STATUS_COLORS[key] || COLORS.gray;

      this.doc.rect(x, this.doc.y, 12, 12).fill(color);

      this.doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor(COLORS.darkGray)
        .text(`${label}: ${value} (${percentage}%)`, x + 20, this.doc.y - 10);

      this.doc.moveDown(0.3);
    });
  }

  private addRiskSummary(summary: ComplianceSummaryData['riskSummary']): void {
    this.doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(COLORS.darkGray)
      .text(`Total Risks: ${summary.total}`)
      .text(`Open Risks: ${summary.openCount}`);

    this.doc.moveDown(0.5);

    Object.entries(summary.byLevel).forEach(([level, count]) => {
      const color =
        level === 'critical' || level === 'very_high'
          ? COLORS.danger
          : level === 'high'
            ? COLORS.warning
            : level === 'medium'
              ? COLORS.warning
              : COLORS.success;

      this.doc.rect(72, this.doc.y, 12, 12).fill(color);

      this.doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor(COLORS.darkGray)
        .text(`${this.formatStatusLabel(level)}: ${count}`, 92, this.doc.y - 10);

      this.doc.moveDown(0.3);
    });
  }

  private addEvidenceSummary(summary: ComplianceSummaryData['evidenceSummary']): void {
    const items = [
      { label: 'Total Evidence', value: summary.total, color: COLORS.primary },
      { label: 'Pending Review', value: summary.pendingReview, color: COLORS.warning },
      { label: 'Expiring Soon', value: summary.expiringSoon, color: COLORS.warning },
      { label: 'Expired', value: summary.expired, color: COLORS.danger },
    ];

    items.forEach(({ label, value, color }) => {
      this.doc.rect(72, this.doc.y, 12, 12).fill(color);

      this.doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor(COLORS.darkGray)
        .text(`${label}: ${value}`, 92, this.doc.y - 10);

      this.doc.moveDown(0.3);
    });
  }

  private addGapSummary(summary: FrameworkAssessmentData['gapSummary']): void {
    const items = [
      { label: 'Compliant', value: summary.compliant, color: COLORS.success },
      { label: 'Partially Compliant', value: summary.partial, color: COLORS.warning },
      { label: 'Non-Compliant', value: summary.nonCompliant, color: COLORS.danger },
      { label: 'Not Assessed', value: summary.notAssessed, color: COLORS.gray },
    ];

    items.forEach(({ label, value, color }) => {
      this.doc.rect(72, this.doc.y, 12, 12).fill(color);

      this.doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor(COLORS.darkGray)
        .text(`${label}: ${value}`, 92, this.doc.y - 10);

      this.doc.moveDown(0.3);
    });
  }

  private addActivityTable(activities: ComplianceSummaryData['recentActivity']): void {
    const colWidths = [100, 80, 150, 120];
    const headers = ['Date', 'Type', 'Description', 'User'];

    // Header row
    let x = 72;
    this.doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.darkGray);
    headers.forEach((header, i) => {
      this.doc.text(header, x, this.doc.y, { width: colWidths[i] });
      x += colWidths[i];
    });
    this.doc.moveDown(0.5);

    // Data rows
    this.doc.font('Helvetica').fontSize(9).fillColor(COLORS.gray);
    activities.slice(0, 20).forEach((activity) => {
      x = 72;
      const y = this.doc.y;

      this.doc.text(this.formatDate(activity.timestamp), x, y, { width: colWidths[0] });
      x += colWidths[0];

      this.doc.text(activity.entityType, x, y, { width: colWidths[1] });
      x += colWidths[1];

      this.doc.text(`${activity.action}: ${activity.entityName}`, x, y, { width: colWidths[2] });
      x += colWidths[2];

      this.doc.text(activity.user, x, y, { width: colWidths[3] });

      this.doc.moveDown(0.8);
    });
  }

  private addRequirementsTable(requirements: FrameworkAssessmentData['requirements']): void {
    const colWidths = [80, 200, 80, 80];
    const headers = ['Reference', 'Title', 'Status', 'Controls'];

    // Header row
    let x = 72;
    this.doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.darkGray);
    headers.forEach((header, i) => {
      this.doc.text(header, x, this.doc.y, { width: colWidths[i] });
      x += colWidths[i];
    });
    this.doc.moveDown(0.5);

    // Data rows
    requirements.forEach((req) => {
      // Check if we need a new page
      if (this.doc.y > this.doc.page.height - 100) {
        this.addNewPage('Detailed Requirements (continued)');
      }

      x = 72;
      const y = this.doc.y;

      this.doc.font('Helvetica').fontSize(9).fillColor(COLORS.darkGray);
      this.doc.text(req.reference, x, y, { width: colWidths[0] });
      x += colWidths[0];

      this.doc.text(req.title, x, y, { width: colWidths[1] });
      x += colWidths[1];

      // Status with color
      const statusColor = STATUS_COLORS[req.status] || COLORS.gray;
      this.doc.fillColor(statusColor);
      this.doc.text(this.formatStatusLabel(req.status), x, y, { width: colWidths[2] });
      x += colWidths[2];

      this.doc.fillColor(COLORS.darkGray);
      this.doc.text(`${req.implementedControls}/${req.mappedControls}`, x, y, {
        width: colWidths[3],
      });

      this.doc.moveDown(0.8);
    });
  }

  private addRisksTable(risks: RiskRegisterData['risks']): void {
    const colWidths = [70, 150, 70, 70, 70];
    const headers = ['ID', 'Title', 'Status', 'Inherent', 'Residual'];

    // Header row
    let x = 72;
    this.doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.darkGray);
    headers.forEach((header, i) => {
      this.doc.text(header, x, this.doc.y, { width: colWidths[i] });
      x += colWidths[i];
    });
    this.doc.moveDown(0.5);

    // Data rows
    risks.forEach((risk) => {
      if (this.doc.y > this.doc.page.height - 100) {
        this.addNewPage('Risk Register (continued)');
      }

      x = 72;
      const y = this.doc.y;

      this.doc.font('Helvetica').fontSize(9).fillColor(COLORS.darkGray);
      this.doc.text(risk.riskId, x, y, { width: colWidths[0] });
      x += colWidths[0];

      this.doc.text(risk.title, x, y, { width: colWidths[1] });
      x += colWidths[1];

      this.doc.text(this.formatStatusLabel(risk.status), x, y, { width: colWidths[2] });
      x += colWidths[2];

      this.doc.text(this.formatStatusLabel(risk.inherentRisk), x, y, { width: colWidths[3] });
      x += colWidths[3];

      this.doc.text(this.formatStatusLabel(risk.residualRisk), x, y, { width: colWidths[4] });

      this.doc.moveDown(0.8);
    });
  }

  private addControlsTable(controls: ControlStatusData['controls']): void {
    const colWidths = [70, 180, 80, 80, 50];
    const headers = ['ID', 'Title', 'Category', 'Status', 'Evidence'];

    // Header row
    let x = 72;
    this.doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.darkGray);
    headers.forEach((header, i) => {
      this.doc.text(header, x, this.doc.y, { width: colWidths[i] });
      x += colWidths[i];
    });
    this.doc.moveDown(0.5);

    // Data rows
    controls.forEach((control) => {
      if (this.doc.y > this.doc.page.height - 100) {
        this.addNewPage('Control Status (continued)');
      }

      x = 72;
      const y = this.doc.y;

      this.doc.font('Helvetica').fontSize(9).fillColor(COLORS.darkGray);
      this.doc.text(control.controlId, x, y, { width: colWidths[0] });
      x += colWidths[0];

      this.doc.text(control.title, x, y, { width: colWidths[1] });
      x += colWidths[1];

      this.doc.text(control.category, x, y, { width: colWidths[2] });
      x += colWidths[2];

      const statusColor = STATUS_COLORS[control.status] || COLORS.gray;
      this.doc.fillColor(statusColor);
      this.doc.text(this.formatStatusLabel(control.status), x, y, { width: colWidths[3] });
      x += colWidths[3];

      this.doc.fillColor(COLORS.darkGray);
      this.doc.text(String(control.evidenceCount), x, y, { width: colWidths[4] });

      this.doc.moveDown(0.8);
    });
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  private formatStatusLabel(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export default PDFReportGenerator;
