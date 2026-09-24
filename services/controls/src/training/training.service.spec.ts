import { BadRequestException } from '@nestjs/common';
import JSZip from 'jszip';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TrainingService } from './training.service';

describe('TrainingService security and artifacts', () => {
  const organizationId = '8924f0c1-7bb1-4be8-84ee-ad8725c712bf';
  const userId = '8f88a42b-e799-455c-b68a-308d7d2e9aa4';
  const moduleId = '73f41e8a-39f5-4be5-aeb2-b62bcd0bb68d';

  function createService(prismaOverrides: Record<string, unknown> = {}) {
    const prisma = {
      customTrainingModule: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      organization: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      ...prismaOverrides,
    };
    return { service: new TrainingService(prisma as never), prisma };
  }

  it('never includes answer keys in quiz question responses', async () => {
    const { service } = createService();
    const questions = await service.getQuizQuestions('general-cybersecurity', 3);

    expect(questions).toHaveLength(3);
    for (const question of questions) {
      expect(question).not.toHaveProperty('correctOption');
      expect(question).not.toHaveProperty('explanation');
    }
  });

  it('rejects unknown and duplicate quiz answers before scoring', async () => {
    const { service } = createService();

    await expect(
      service.submitQuiz(organizationId, userId, 'general-cybersecurity', [
        { questionId: 'unknown', selectedOption: 0 },
      ])
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.submitQuiz(organizationId, userId, 'general-cybersecurity', [
        { questionId: 'gc-1', selectedOption: 0 },
        { questionId: 'gc-1', selectedOption: 1 },
      ])
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('scores valid submissions server-side without returning answer keys', async () => {
    const progress = {
      id: 'progress-1',
      timeSpent: 0,
      startedAt: new Date(),
    };
    const { service } = createService({
      trainingProgress: {
        findFirst: jest.fn().mockResolvedValue(progress),
        update: jest.fn().mockResolvedValue(progress),
      },
      trainingAssignment: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    });

    const result = await service.submitQuiz(organizationId, userId, 'general-cybersecurity', [
      { questionId: 'gc-1', selectedOption: 2 },
    ]);

    expect(result).toMatchObject({ score: 100, passed: true });
    expect(JSON.stringify(result)).not.toContain('correctOption');
  });

  it('extracts and validates a supported SCORM package', async () => {
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'grc-scorm-'));
    const previousCwd = process.cwd();
    process.chdir(temporaryDirectory);
    try {
      const zip = new JSZip();
      zip.file(
        'imsmanifest.xml',
        `<?xml version="1.0"?>
<manifest xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2">
  <metadata><schemaversion>1.2</schemaversion></metadata>
  <resources><resource identifier="resource-1" href="index.html" /></resources>
</manifest>`
      );
      zip.file('index.html', '<!doctype html><title>Training</title>');
      const buffer = await zip.generateAsync({ type: 'nodebuffer' });

      const { service, prisma } = createService();
      (prisma.customTrainingModule.findFirst as jest.Mock).mockResolvedValue({
        id: moduleId,
        organizationId,
        scormPath: null,
      });
      (prisma.customTrainingModule.update as jest.Mock).mockResolvedValue({
        id: moduleId,
        name: 'Custom course',
      });

      const result = await service.uploadScormPackage(organizationId, moduleId, {
        buffer,
        originalname: 'course.zip',
      });

      expect(result.scorm).toEqual({
        version: 'SCORM 1.2',
        launchPath: 'index.html',
      });
      const update = (prisma.customTrainingModule.update as jest.Mock).mock.calls[0][0];
      expect(
        fs.existsSync(
          path.join(temporaryDirectory, 'uploads', 'training', update.data.scormPath, 'index.html')
        )
      ).toBe(true);
    } finally {
      process.chdir(previousCwd);
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it('rejects ZIP files without a root SCORM manifest', async () => {
    const zip = new JSZip();
    zip.file('index.html', '<title>Not SCORM</title>');
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    const { service, prisma } = createService();
    (prisma.customTrainingModule.findFirst as jest.Mock).mockResolvedValue({
      id: moduleId,
      organizationId,
    });

    await expect(
      service.uploadScormPackage(organizationId, moduleId, {
        buffer,
        originalname: 'not-scorm.zip',
      })
    ).rejects.toThrow('imsmanifest.xml');
  });

  it('renders a real PDF certificate for its owner', async () => {
    const certificate = {
      id: 'CERT-0123456789ABCDEF',
      userId,
      recipientName: 'John Doe',
      recipientEmail: 'john@example.com',
      moduleName: 'General Cybersecurity Awareness',
      moduleId: 'general-cybersecurity',
      organizationName: 'Example, Inc.',
      completedAt: new Date('2026-01-01'),
      score: 90,
      issuedAt: new Date('2026-01-01'),
      expiresAt: new Date('2027-01-01'),
      verificationUrl: '/verify/CERT-0123456789ABCDEF',
    };
    const { service, prisma } = createService();
    (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
      settings: { trainingCertificates: [certificate] },
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      email: certificate.recipientEmail,
    });

    const pdf = await service.getCertificatePDF(organizationId, userId, certificate.id);

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(500);
  });
});
