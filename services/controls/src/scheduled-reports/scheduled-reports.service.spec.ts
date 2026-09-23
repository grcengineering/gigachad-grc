import { BadRequestException } from '@nestjs/common';
import { ScheduledReportsService } from './scheduled-reports.service';

describe('ScheduledReportsService delivery lifecycle', () => {
  const report: any = {
    id: 'report-1',
    organizationId: 'org-a',
    userId: 'user-a',
    name: 'Risk register',
    reportType: 'risk-register',
    format: 'pdf',
    frequency: 'daily',
    dayOfWeek: null,
    dayOfMonth: null,
    time: '09:00',
    timezone: 'UTC',
    recipients: ['grc@example.com'],
    filters: {},
    isEnabled: true,
    lastRunAt: null,
    lastRunStatus: null,
    lastRunError: null,
    nextRunAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const prisma: any = {
    scheduledReport: {
      findFirst: jest.fn(async () => ({ ...report })),
      update: jest.fn(async ({ data }) => ({ ...report, ...data })),
    },
    scheduledReportExecution: {
      create: jest.fn(async ({ data }) => ({
        id: 'execution-1',
        startedAt: new Date(),
        completedAt: null,
        error: null,
        deliveredCount: 0,
        ...data,
      })),
      update: jest.fn(async ({ data }) => ({ id: 'execution-1', ...data })),
    },
    risk: { findMany: jest.fn(async () => [{ id: 'risk-1', title: 'Risk' }]) },
    $transaction: jest.fn(async (operations) => Promise.all(operations)),
  };
  const audit: any = { log: jest.fn(async () => undefined) };
  const email: any = {
    isConfigured: jest.fn(async () => true),
    sendEmail: jest.fn(async () => true),
  };
  const exports: any = {
    formatRows: jest.fn(async () => Buffer.from('%PDF-test')),
    getFormatContentType: jest.fn(() => 'application/pdf'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    email.isConfigured.mockResolvedValue(true);
    email.sendEmail.mockResolvedValue(true);
  });

  it('refuses to queue delivery when email is not configured', async () => {
    email.isConfigured.mockResolvedValue(false);
    const service = new ScheduledReportsService(prisma, audit, email, exports);

    await expect(service.runNow('org-a', 'user-a', 'report-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.scheduledReportExecution.create).not.toHaveBeenCalled();
  });

  it('records generation, attachment delivery, and success', async () => {
    const service = new ScheduledReportsService(prisma, audit, email, exports);
    await expect(service.runNow('org-a', 'user-a', 'report-1')).resolves.toMatchObject({
      status: 'success',
    });

    expect(email.sendEmail).toHaveBeenCalledWith(
      'org-a',
      expect.objectContaining({
        attachments: [
          expect.objectContaining({
            contentType: 'application/pdf',
            content: expect.any(Buffer),
          }),
        ],
      }),
    );
    expect(prisma.scheduledReportExecution.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'success',
          deliveredCount: 1,
          fileContent: expect.any(Buffer),
        }),
      }),
    );
  });
});
