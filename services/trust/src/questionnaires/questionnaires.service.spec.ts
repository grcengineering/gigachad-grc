import { Test, TestingModule } from '@nestjs/testing';
import { QuestionnairesService } from './questionnaires.service';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { CacheService } from '@gigachad-grc/shared';
import { NotFoundException } from '@nestjs/common';
import { QuestionnaireStatus } from '@prisma/client';

describe('QuestionnairesService', () => {
  let service: QuestionnairesService;

  const mockPrismaService = {
    questionnaireRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    questionnaireQuestion: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    knowledgeBase: {
      findMany: jest.fn(),
    },
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionnairesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<QuestionnairesService>(QuestionnairesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const mockCreateDto = {
      organizationId: 'org-123',
      title: 'Security Questionnaire',
      requesterName: 'John Doe',
      requesterEmail: 'john@example.com',
      company: 'Acme Corp',
    };

    const mockCreatedQuestionnaire = {
      id: 'quest-123',
      ...mockCreateDto,
      status: 'pending',
      priority: 'medium',
      questions: [],
    };

    it('should create a questionnaire', async () => {
      mockPrismaService.questionnaireRequest.create.mockResolvedValue(mockCreatedQuestionnaire);

      const result = await service.create(mockCreateDto, 'user-123');

      expect(mockPrismaService.questionnaireRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Security Questionnaire',
            requesterName: 'John Doe',
          }),
        })
      );
      expect(mockAuditService.log).toHaveBeenCalled();
      expect(result).toEqual(mockCreatedQuestionnaire);
    });

    it('should set default status and priority', async () => {
      mockPrismaService.questionnaireRequest.create.mockResolvedValue(mockCreatedQuestionnaire);

      await service.create(mockCreateDto, 'user-123');

      expect(mockPrismaService.questionnaireRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'pending',
            priority: 'medium',
          }),
        })
      );
    });
  });

  describe('findAll', () => {
    const mockQuestionnaires = [
      {
        id: 'quest-1',
        title: 'Questionnaire 1',
        status: 'pending',
        priority: 'high',
        questions: [{ id: 'q-1', status: 'pending' }],
      },
      {
        id: 'quest-2',
        title: 'Questionnaire 2',
        status: 'in_progress',
        priority: 'medium',
        questions: [{ id: 'q-2', status: 'answered' }],
      },
    ];

    it('should return all questionnaires for an organization', async () => {
      mockPrismaService.questionnaireRequest.findMany.mockResolvedValue(mockQuestionnaires);

      const result = await service.findAll('org-123');

      expect(mockPrismaService.questionnaireRequest.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-123', deletedAt: null },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
      expect(result).toEqual(mockQuestionnaires);
    });

    it('should filter by status', async () => {
      mockPrismaService.questionnaireRequest.findMany.mockResolvedValue([mockQuestionnaires[0]]);

      await service.findAll('org-123', { status: 'pending' });

      expect(mockPrismaService.questionnaireRequest.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-123', deletedAt: null, status: 'pending' },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });

    it('should filter by assignedTo', async () => {
      mockPrismaService.questionnaireRequest.findMany.mockResolvedValue([]);

      await service.findAll('org-123', { assignedTo: 'user-123' });

      expect(mockPrismaService.questionnaireRequest.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-123', deletedAt: null, assignedTo: 'user-123' },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });

    it('should filter by priority', async () => {
      mockPrismaService.questionnaireRequest.findMany.mockResolvedValue([mockQuestionnaires[0]]);

      await service.findAll('org-123', { priority: 'high' });

      expect(mockPrismaService.questionnaireRequest.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-123', deletedAt: null, priority: 'high' },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });
  });

  describe('findOne', () => {
    const mockQuestionnaire = {
      id: 'quest-123',
      title: 'Test Questionnaire',
      status: 'in_progress',
      questions: [],
    };

    it('should return a questionnaire by id', async () => {
      mockPrismaService.questionnaireRequest.findFirst.mockResolvedValue(mockQuestionnaire);

      const result = await service.findOne('quest-123', 'org-123');

      expect(mockPrismaService.questionnaireRequest.findFirst).toHaveBeenCalledWith({
        where: { id: 'quest-123', organizationId: 'org-123', deletedAt: null },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockQuestionnaire);
    });

    it('should throw NotFoundException if questionnaire not found', async () => {
      mockPrismaService.questionnaireRequest.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', 'org-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const mockUpdateDto = {
      title: 'Updated Questionnaire',
      status: QuestionnaireStatus.answered,
    };

    const mockUpdatedQuestionnaire = {
      id: 'quest-123',
      ...mockUpdateDto,
    };

    it('should update a questionnaire', async () => {
      mockPrismaService.questionnaireRequest.findFirst.mockResolvedValue({
        id: 'quest-123',
        organizationId: 'org-123',
      });
      mockPrismaService.questionnaireRequest.update.mockResolvedValue(mockUpdatedQuestionnaire);

      const result = await service.update('quest-123', mockUpdateDto, 'user-123', 'org-123');

      expect(mockPrismaService.questionnaireRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'quest-123' },
          data: expect.objectContaining({
            title: 'Updated Questionnaire',
          }),
        })
      );
      expect(result.title).toBe('Updated Questionnaire');
    });

    it('should throw NotFoundException if questionnaire not found', async () => {
      mockPrismaService.questionnaireRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', mockUpdateDto, 'user-123', 'org-123')
      ).rejects.toThrow(NotFoundException);
    });
  });
});
