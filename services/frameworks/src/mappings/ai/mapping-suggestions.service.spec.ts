import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { MappingSuggestionsService } from './mapping-suggestions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { SuggestMappingsRequestDto } from './dto/mapping-suggestion.dto';
import { buildRequirementToControlsPrompt } from './prompts/requirement-to-controls.prompt';
import { buildControlToRequirementsPrompt } from './prompts/control-to-requirements.prompt';
import {
  sampleControlAnchor,
  sampleControlCandidates,
  sampleRequirementAnchor,
  sampleRequirementCandidates,
} from './prompts/__fixtures__/sample-inputs';

// ============================================================
// Prompt builder snapshots (both directions)
// ============================================================
describe('Prompt builders', () => {
  it('requirement-to-controls snapshot', () => {
    const prompt = buildRequirementToControlsPrompt(
      sampleRequirementAnchor,
      sampleControlCandidates
    );
    expect(prompt).toMatchSnapshot();
  });

  it('control-to-requirements snapshot', () => {
    const prompt = buildControlToRequirementsPrompt(
      sampleControlAnchor,
      sampleRequirementCandidates
    );
    expect(prompt).toMatchSnapshot();
  });
});

// ============================================================
// SuggestMappingsRequestDto validation (XOR + boundaries)
// ============================================================
describe('SuggestMappingsRequestDto validation', () => {
  // Real-looking v4 UUIDs (class-validator's @IsUUID() defaults to "all"
  // but some versions reject the nil UUID — use generated v4s here).
  const fwId = 'aef47e0e-1a3a-4e6e-9f1e-1f2a3b4c5d6e';
  const reqId = 'b4c1f9ee-22b1-4f3a-9a7c-1f2a3b4c5d6f';
  const ctlId = 'c0d1e2f3-3344-4b5a-8c7d-1f2a3b4c5d70';

  const runValidate = (payload: Record<string, unknown>) => {
    const dto = plainToInstance(SuggestMappingsRequestDto, payload);
    return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  };

  it('accepts a payload with requirementId set', async () => {
    const errors = await runValidate({ frameworkId: fwId, requirementId: reqId });
    expect(errors).toHaveLength(0);
  });

  it('accepts a payload with controlId set', async () => {
    const errors = await runValidate({ frameworkId: fwId, controlId: ctlId });
    expect(errors).toHaveLength(0);
  });

  it('rejects a payload with neither requirementId nor controlId', async () => {
    const errors = await runValidate({ frameworkId: fwId });
    // Both ValidateIf branches fire → both isUuid checks fail.
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts limit at boundaries 1 and 50', async () => {
    expect(await runValidate({ frameworkId: fwId, requirementId: reqId, limit: 1 })).toHaveLength(
      0
    );
    expect(await runValidate({ frameworkId: fwId, requirementId: reqId, limit: 50 })).toHaveLength(
      0
    );
  });

  it('rejects limit = 0', async () => {
    const errors = await runValidate({ frameworkId: fwId, requirementId: reqId, limit: 0 });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'limit')).toBe(true);
  });

  it('rejects limit = 51', async () => {
    const errors = await runValidate({ frameworkId: fwId, requirementId: reqId, limit: 51 });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'limit')).toBe(true);
  });
});

// ============================================================
// Service orchestration
// ============================================================
describe('MappingSuggestionsService', () => {
  let service: MappingSuggestionsService;

  const ORG_ID = 'org-abc';
  const USER_ID = 'user-abc';
  const FW_ID = 'fw-1';
  const REQ_ID = 'req-1';
  const CTL_ID = 'ctl-1';

  const requirementRow = {
    id: REQ_ID,
    frameworkId: FW_ID,
    reference: 'CC6.1',
    title: 'Logical Access Controls',
    description:
      'The entity implements logical access security software, infrastructure, and architectures over protected information assets.',
    guidance: 'Consider role-based access, least privilege, and periodic reviews.',
    isCategory: false,
    order: 0,
    level: 0,
  };

  const controlRows = [
    {
      id: 'ctl-a',
      controlId: 'AC-001',
      title: 'Role-Based Access Control',
      description: 'Access is granted on a least-privilege basis aligned to job role.',
      category: 'access_control',
      organizationId: null,
      guidance: null,
    },
    {
      id: 'ctl-b',
      controlId: 'AC-002',
      title: 'Quarterly Access Review',
      description: 'Owners review user access on a quarterly cadence.',
      category: 'access_control',
      organizationId: ORG_ID,
      guidance: null,
    },
    {
      id: 'ctl-c',
      controlId: 'BC-001',
      title: 'Business Continuity Plan',
      description: 'Annual continuity exercises across critical services.',
      category: 'business_continuity',
      organizationId: null,
      guidance: null,
    },
  ];

  const mockPrisma = {
    frameworkRequirement: { findFirst: jest.fn(), findMany: jest.fn() },
    control: { findFirst: jest.fn(), findMany: jest.fn() },
    framework: { findFirst: jest.fn() },
    controlMapping: { findMany: jest.fn() },
  };
  const mockAudit = { log: jest.fn() };
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    jest.clearAllMocks();
    // Reset env to known state before each test (no AI keys → demo path by default)
    process.env = { ...originalEnv };
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.AI_MOCK_MODE;
    delete process.env.CONTROLS_SERVICE_URL;

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        MappingSuggestionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();
    service = moduleRef.get(MappingSuggestionsService);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  // ------------------------------------------------------------
  // XOR enforcement (service-layer defense-in-depth)
  // ------------------------------------------------------------
  it('throws BadRequestException when neither requirementId nor controlId is supplied', async () => {
    await expect(service.suggest({ frameworkId: FW_ID }, USER_ID, ORG_ID)).rejects.toThrow(
      BadRequestException
    );
  });

  it('throws BadRequestException when both requirementId and controlId are supplied', async () => {
    await expect(
      service.suggest(
        { frameworkId: FW_ID, requirementId: REQ_ID, controlId: CTL_ID },
        USER_ID,
        ORG_ID
      )
    ).rejects.toThrow(BadRequestException);
  });

  // ------------------------------------------------------------
  // Tenant isolation
  // ------------------------------------------------------------
  it('throws NotFoundException when requirement anchor is not visible to caller org', async () => {
    mockPrisma.frameworkRequirement.findFirst.mockResolvedValue(null);
    await expect(
      service.suggest({ frameworkId: FW_ID, requirementId: REQ_ID }, USER_ID, ORG_ID)
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when control anchor is not visible to caller org', async () => {
    mockPrisma.control.findFirst.mockResolvedValue(null);
    await expect(
      service.suggest({ frameworkId: FW_ID, controlId: CTL_ID }, USER_ID, ORG_ID)
    ).rejects.toThrow(NotFoundException);
  });

  // ------------------------------------------------------------
  // Demo-mode happy path (no AI keys configured)
  // ------------------------------------------------------------
  describe('demo mode (no AI keys)', () => {
    beforeEach(() => {
      mockPrisma.frameworkRequirement.findFirst.mockResolvedValue(requirementRow);
      mockPrisma.control.findMany.mockResolvedValue(controlRows);
      mockPrisma.controlMapping.findMany.mockResolvedValue([]);
    });

    it('falls back to demo and returns sorted suggestions with mockModeReason set', async () => {
      const res = await service.suggest(
        { frameworkId: FW_ID, requirementId: REQ_ID, limit: 10 },
        USER_ID,
        ORG_ID
      );

      expect(res.isMockMode).toBe(true);
      expect(res.mockModeReason).toBe('AI provider not configured');
      expect(res.direction).toBe('requirement-to-controls');
      expect(res.suggestions.length).toBe(controlRows.length);
      // Ordering: desc confidence, then reference asc.
      for (let i = 1; i < res.suggestions.length; i++) {
        const prev = res.suggestions[i - 1];
        const cur = res.suggestions[i];
        if (prev.confidence === cur.confidence) {
          expect(prev.candidateReference.localeCompare(cur.candidateReference)).toBeLessThanOrEqual(
            0
          );
        } else {
          expect(prev.confidence).toBeGreaterThan(cur.confidence);
        }
      }
      // Audit log fired with the locked verb + entity type.
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'mapping.suggested',
          entityType: 'mapping_suggestion',
          entityId: REQ_ID,
          metadata: expect.objectContaining({
            direction: 'requirement-to-controls',
            isMockMode: true,
            frameworkId: FW_ID,
            anchorId: REQ_ID,
          }),
        })
      );
    });

    it('demo determinism: same inputs twice → byte-identical suggestions', async () => {
      const first = await service.suggest(
        { frameworkId: FW_ID, requirementId: REQ_ID, limit: 10 },
        USER_ID,
        ORG_ID
      );
      mockAudit.log.mockClear();
      const second = await service.suggest(
        { frameworkId: FW_ID, requirementId: REQ_ID, limit: 10 },
        USER_ID,
        ORG_ID
      );
      expect(first.suggestions).toEqual(second.suggestions);
    });

    it('AI_MOCK_MODE=true → demo path with corresponding mockModeReason', async () => {
      process.env.AI_MOCK_MODE = 'true';
      process.env.OPENAI_API_KEY = 'sk-test'; // would normally enable AI, but mock flag takes precedence
      const res = await service.suggest(
        { frameworkId: FW_ID, requirementId: REQ_ID },
        USER_ID,
        ORG_ID
      );
      expect(res.isMockMode).toBe(true);
      expect(res.mockModeReason).toBe('AI_MOCK_MODE is enabled');
    });

    it('respects limit when demo path returns more rows than requested', async () => {
      const res = await service.suggest(
        { frameworkId: FW_ID, requirementId: REQ_ID, limit: 2 },
        USER_ID,
        ORG_ID
      );
      expect(res.suggestions.length).toBeLessThanOrEqual(2);
    });
  });

  // ------------------------------------------------------------
  // AI path (mocked fetch)
  // ------------------------------------------------------------
  describe('AI path', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'sk-test';
      mockPrisma.frameworkRequirement.findFirst.mockResolvedValue(requirementRow);
      mockPrisma.control.findMany.mockResolvedValue(controlRows);
      mockPrisma.controlMapping.findMany.mockResolvedValue([]);
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('success path: returns AI-enriched suggestions, no mock flag', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          suggestions: [
            { candidateId: 'ctl-a', confidence: 0.91, rationale: 'Direct match on RBAC.' },
            { candidateId: 'ctl-b', confidence: 0.65, rationale: 'Supports periodic reviews.' },
            { candidateId: 'ctl-c', confidence: 0.05, rationale: 'Tangentially related.' },
          ],
        }),
      });

      const res = await service.suggest(
        { frameworkId: FW_ID, requirementId: REQ_ID, limit: 5 },
        USER_ID,
        ORG_ID
      );

      expect(res.isMockMode).toBe(false);
      expect(res.mockModeReason).toBeUndefined();
      expect(res.direction).toBe('requirement-to-controls');
      expect(res.suggestions[0]).toEqual(
        expect.objectContaining({
          candidateId: 'ctl-a',
          candidateReference: 'AC-001',
          confidence: 0.91,
        })
      );
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(init.headers['x-user-id']).toBe(USER_ID);
      expect(init.headers['x-organization-id']).toBe(ORG_ID);
      const body = JSON.parse(init.body as string);
      expect(body.type).toBe('mapping_suggestion');
      expect(body.systemPrompt).toContain('compliance-mapping expert');
    });

    it('falls back to demo on non-200 response', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
      const res = await service.suggest(
        { frameworkId: FW_ID, requirementId: REQ_ID },
        USER_ID,
        ORG_ID
      );
      expect(res.isMockMode).toBe(true);
      expect(res.mockModeReason).toMatch(/AI service call failed/);
    });

    it('falls back to demo on malformed JSON (missing suggestions[])', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ totally: 'wrong shape' }),
      });
      const res = await service.suggest(
        { frameworkId: FW_ID, requirementId: REQ_ID },
        USER_ID,
        ORG_ID
      );
      expect(res.isMockMode).toBe(true);
      expect(res.mockModeReason).toMatch(/AI service call failed/);
    });

    it('falls back to demo when fetch throws', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('econnrefused'));
      const res = await service.suggest(
        { frameworkId: FW_ID, requirementId: REQ_ID },
        USER_ID,
        ORG_ID
      );
      expect(res.isMockMode).toBe(true);
      expect(res.mockModeReason).toMatch(/econnrefused/);
    });

    it('drops AI suggestions referencing candidate ids not in the catalog', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          suggestions: [
            { candidateId: 'ctl-a', confidence: 0.9, rationale: 'real' },
            { candidateId: 'fabricated-id', confidence: 1.0, rationale: 'fake' },
          ],
        }),
      });
      const res = await service.suggest(
        { frameworkId: FW_ID, requirementId: REQ_ID },
        USER_ID,
        ORG_ID
      );
      expect(res.suggestions.map((s) => s.candidateId)).toEqual(['ctl-a']);
    });

    it('clamps confidence to [0, 1]', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          suggestions: [
            { candidateId: 'ctl-a', confidence: 1.5, rationale: 'too high' },
            { candidateId: 'ctl-b', confidence: -0.5, rationale: 'too low' },
          ],
        }),
      });
      const res = await service.suggest(
        { frameworkId: FW_ID, requirementId: REQ_ID },
        USER_ID,
        ORG_ID
      );
      const byId = Object.fromEntries(res.suggestions.map((s) => [s.candidateId, s.confidence]));
      expect(byId['ctl-a']).toBeLessThanOrEqual(1);
      expect(byId['ctl-b']).toBeGreaterThanOrEqual(0);
    });

    it('control-to-requirements direction loads requirement candidates', async () => {
      mockPrisma.control.findFirst.mockResolvedValue(controlRows[0]);
      mockPrisma.framework.findFirst.mockResolvedValue({ id: FW_ID });
      mockPrisma.frameworkRequirement.findMany.mockResolvedValue([
        {
          id: 'req-a',
          reference: 'CC6.1',
          title: 'Logical Access Controls',
          description: 'desc',
        },
        {
          id: 'req-b',
          reference: 'CC6.3',
          title: 'Access Removal',
          description: 'desc',
        },
      ]);
      mockPrisma.controlMapping.findMany.mockResolvedValue([]);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          suggestions: [{ candidateId: 'req-a', confidence: 0.8, rationale: 'match' }],
        }),
      });

      const res = await service.suggest({ frameworkId: FW_ID, controlId: CTL_ID }, USER_ID, ORG_ID);
      expect(res.direction).toBe('control-to-requirements');
      expect(res.suggestions[0].candidateId).toBe('req-a');
    });
  });
});
