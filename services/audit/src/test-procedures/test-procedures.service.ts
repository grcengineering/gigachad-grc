import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateTestProcedureDto {
  auditId: string;
  title: string;
  description: string;
  testType: string;
  testMethod?: string;
  controlId?: string;
  requirementRef?: string;
  sampleSize?: number;
  sampleSelection?: string;
  populationSize?: number;
  expectedResult?: string;
}

export interface UpdateTestProcedureDto {
  title?: string;
  description?: string;
  testType?: string;
  testMethod?: string;
  sampleSize?: number;
  sampleSelection?: string;
  sampleCriteria?: string;
  expectedResult?: string;
  actualResult?: string;
  deviationsNoted?: string;
  conclusion?: string;
  conclusionRationale?: string;
  status?: string;
}

export interface RecordTestResultDto {
  actualResult: string;
  deviationsNoted?: string;
  conclusion: string;
  conclusionRationale: string;
  evidenceIds?: string[];
}

@Injectable()
export class TestProceduresService {
  private readonly logger = new Logger(TestProceduresService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateTestProcedureDto, _userId: string) {
    const audit = await this.prisma.audit.findFirst({
      where: { id: dto.auditId, organizationId },
    });
    if (!audit) throw new NotFoundException(`Audit ${dto.auditId} not found`);

    const count = await this.prisma.auditTestProcedure.count({ where: { auditId: dto.auditId } });
    const procedureNumber = `TP-${String(count + 1).padStart(3, '0')}`;

    return this.prisma.auditTestProcedure.create({
      data: {
        auditId: dto.auditId,
        organizationId,
        procedureNumber,
        title: dto.title,
        description: dto.description,
        testType: dto.testType,
        testMethod: dto.testMethod,
        controlId: dto.controlId,
        requirementRef: dto.requirementRef,
        sampleSize: dto.sampleSize,
        sampleSelection: dto.sampleSelection,
        populationSize: dto.populationSize,
        expectedResult: dto.expectedResult,
      },
    });
  }

  async findAll(organizationId: string, auditId?: string, controlId?: string) {
    const where: Record<string, unknown> = { organizationId };
    if (auditId) where.auditId = auditId;
    if (controlId) where.controlId = controlId;

    return this.prisma.auditTestProcedure.findMany({
      where,
      include: {
        testedByUser: { select: { id: true, displayName: true } },
        reviewedByUser: { select: { id: true, displayName: true } },
      },
      orderBy: [{ auditId: 'asc' }, { procedureNumber: 'asc' }],
    });
  }

  async findOne(id: string, organizationId: string) {
    const procedure = await this.prisma.auditTestProcedure.findFirst({
      where: { id, organizationId },
      include: {
        audit: { select: { id: true, name: true, auditId: true } },
        testedByUser: { select: { id: true, displayName: true, email: true } },
        reviewedByUser: { select: { id: true, displayName: true, email: true } },
      },
    });
    if (!procedure) throw new NotFoundException(`Test procedure ${id} not found`);
    return procedure;
  }

  async update(id: string, organizationId: string, dto: UpdateTestProcedureDto) {
    await this.findOne(id, organizationId);
    return this.prisma.auditTestProcedure.update({
      where: { id },
      data: dto,
    });
  }

  async recordResult(id: string, organizationId: string, dto: RecordTestResultDto, userId: string) {
    await this.findOne(id, organizationId);

    return this.prisma.auditTestProcedure.update({
      where: { id },
      data: {
        actualResult: dto.actualResult,
        deviationsNoted: dto.deviationsNoted,
        conclusion: dto.conclusion,
        conclusionRationale: dto.conclusionRationale,
        evidenceIds: dto.evidenceIds || [],
        testedBy: userId,
        testedAt: new Date(),
        status: 'completed',
      },
    });
  }

  async review(id: string, organizationId: string, notes: string, userId: string) {
    await this.findOne(id, organizationId);

    return this.prisma.auditTestProcedure.update({
      where: { id },
      data: {
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewNotes: notes,
        status: 'reviewed',
      },
    });
  }

  async delete(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.auditTestProcedure.delete({ where: { id } });
  }

  async getStats(organizationId: string, auditId?: string) {
    const where: Record<string, unknown> = { organizationId };
    if (auditId) where.auditId = auditId;

    const [total, byConclusion, byStatus, byType] = await Promise.all([
      this.prisma.auditTestProcedure.count({ where }),
      this.prisma.auditTestProcedure.groupBy({
        by: ['conclusion'],
        where: { ...where, conclusion: { not: null } },
        _count: { conclusion: true },
      }),
      this.prisma.auditTestProcedure.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      }),
      this.prisma.auditTestProcedure.groupBy({
        by: ['testType'],
        where,
        _count: { testType: true },
      }),
    ]);

    const effective = byConclusion.find(c => c.conclusion === 'effective')?._count.conclusion || 0;
    const effectivenessRate = total > 0 ? Math.round((effective / total) * 100) : 0;

    return {
      total,
      effectivenessRate,
      byConclusion: byConclusion.map(c => ({ conclusion: c.conclusion, count: c._count.conclusion })),
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count.status })),
      byType: byType.map(t => ({ type: t.testType, count: t._count.testType })),
    };
  }
}

