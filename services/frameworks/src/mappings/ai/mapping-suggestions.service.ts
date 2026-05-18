import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  MappingSuggestionDirection,
  MappingSuggestionDto,
  SuggestMappingsRequestDto,
  SuggestMappingsResponseDto,
} from './dto/mapping-suggestion.dto';
import { AnchorForPrompt, SYSTEM_PROMPT } from './prompts/shared';
import { buildRequirementToControlsPrompt } from './prompts/requirement-to-controls.prompt';
import { buildControlToRequirementsPrompt } from './prompts/control-to-requirements.prompt';
import { buildRationale, jaccard, sharedTokens, tokenize } from './demo/token-overlap';

/** Maximum number of candidates per AI call. Anything larger is chunked. */
const CANDIDATE_BATCH_SIZE = 100;

/** Default `limit` when caller omits it. */
const DEFAULT_LIMIT = 20;

/** Mirrors §4.2 of the contract. */
interface RawAiSuggestion {
  candidateId: string;
  confidence: number;
  rationale: string;
}

interface RawAiResponse {
  suggestions?: RawAiSuggestion[];
}

/**
 * Internal shape we carry around for an enriched candidate that has both its
 * id and the human-facing fields the response DTO needs.
 */
interface EnrichedCandidate {
  id: string;
  reference: string;
  title: string;
  description: string;
  category?: string;
}

@Injectable()
export class MappingSuggestionsService {
  private readonly logger = new Logger(MappingSuggestionsService.name);
  private readonly aiServiceUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {
    this.aiServiceUrl = process.env.CONTROLS_SERVICE_URL || 'http://localhost:3001';
  }

  async suggest(
    dto: SuggestMappingsRequestDto,
    userId: string,
    organizationId: string
  ): Promise<SuggestMappingsResponseDto> {
    // 1. XOR validation (defense-in-depth — ValidateIf already enforces this)
    const hasRequirement = Boolean(dto.requirementId);
    const hasControl = Boolean(dto.controlId);
    if (hasRequirement === hasControl) {
      throw new BadRequestException('Exactly one of requirementId or controlId must be provided.');
    }

    const limit = dto.limit ?? DEFAULT_LIMIT;
    const direction: MappingSuggestionDirection = hasRequirement
      ? 'requirement-to-controls'
      : 'control-to-requirements';

    // 2. Load anchor + candidate catalog (scoped to caller's organization)
    let anchor: AnchorForPrompt;
    let anchorId: string;
    let candidates: EnrichedCandidate[];

    if (direction === 'requirement-to-controls') {
      const loaded = await this.loadRequirementAnchor(
        dto.requirementId as string,
        dto.frameworkId,
        organizationId
      );
      anchor = loaded.anchor;
      anchorId = loaded.id;
      candidates = await this.loadControlCandidates(
        dto.frameworkId,
        dto.requirementId as string,
        organizationId
      );
    } else {
      const loaded = await this.loadControlAnchor(dto.controlId as string, organizationId);
      anchor = loaded.anchor;
      anchorId = loaded.id;
      candidates = await this.loadRequirementCandidates(
        dto.frameworkId,
        dto.controlId as string,
        organizationId
      );
    }

    // 3. Resolve AI vs. demo path
    const skipReason = this.shouldSkipAi();
    let suggestions: MappingSuggestionDto[];
    let isMockMode = false;
    let mockModeReason: string | undefined;

    if (skipReason) {
      isMockMode = true;
      mockModeReason = skipReason;
      suggestions = this.runDemoMode(anchor, candidates, limit);
    } else {
      try {
        suggestions = await this.runAi(
          direction,
          anchor,
          candidates,
          limit,
          userId,
          organizationId
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`AI suggestion call failed, falling back to demo mode: ${message}`);
        isMockMode = true;
        mockModeReason = `AI service call failed: ${message}`;
        suggestions = this.runDemoMode(anchor, candidates, limit);
      }
    }

    // 4. Audit log — fire-and-forget on the AuditService side, but await for
    //    deterministic test assertions.
    await this.audit.log({
      organizationId,
      userId,
      action: 'mapping.suggested',
      entityType: 'mapping_suggestion',
      entityId: anchorId,
      description: `Generated ${suggestions.length} mapping suggestion(s) (${direction})`,
      metadata: {
        direction,
        candidatesReturned: suggestions.length,
        isMockMode,
        frameworkId: dto.frameworkId,
        anchorId,
      },
    });

    return {
      direction,
      suggestions,
      isMockMode,
      ...(mockModeReason ? { mockModeReason } : {}),
    };
  }

  // ============================================================
  // Anchor / candidate loading
  // ============================================================

  private async loadRequirementAnchor(
    requirementId: string,
    frameworkId: string,
    organizationId: string
  ): Promise<{ id: string; anchor: AnchorForPrompt }> {
    const req = await this.prisma.frameworkRequirement.findFirst({
      where: {
        id: requirementId,
        frameworkId,
        framework: {
          OR: [{ organizationId }, { organizationId: null }],
        },
      },
    });
    if (!req) {
      throw new NotFoundException(`Requirement ${requirementId} not found`);
    }
    return {
      id: req.id,
      anchor: {
        reference: req.reference,
        title: req.title,
        description: req.description,
        guidance: req.guidance,
      },
    };
  }

  private async loadControlAnchor(
    controlId: string,
    organizationId: string
  ): Promise<{ id: string; anchor: AnchorForPrompt }> {
    const ctl = await this.prisma.control.findFirst({
      where: {
        id: controlId,
        OR: [{ organizationId }, { organizationId: null }],
      },
    });
    if (!ctl) {
      throw new NotFoundException(`Control ${controlId} not found`);
    }
    return {
      id: ctl.id,
      anchor: {
        reference: ctl.controlId,
        title: ctl.title,
        description: ctl.description,
        guidance: ctl.guidance,
      },
    };
  }

  private async loadControlCandidates(
    frameworkId: string,
    requirementId: string,
    organizationId: string
  ): Promise<EnrichedCandidate[]> {
    // Pull every control visible to the caller, then exclude any already mapped
    // to this requirement under the given framework.
    const [controls, existingMappings] = await Promise.all([
      this.prisma.control.findMany({
        where: {
          OR: [{ organizationId }, { organizationId: null }],
        },
        orderBy: { controlId: 'asc' },
      }),
      this.prisma.controlMapping.findMany({
        where: { frameworkId, requirementId },
        select: { controlId: true },
      }),
    ]);
    const mapped = new Set(existingMappings.map((m) => m.controlId));
    return controls
      .filter((c) => !mapped.has(c.id))
      .map((c) => ({
        id: c.id,
        reference: c.controlId,
        title: c.title,
        description: c.description,
        category: c.category,
      }));
  }

  private async loadRequirementCandidates(
    frameworkId: string,
    controlId: string,
    organizationId: string
  ): Promise<EnrichedCandidate[]> {
    // Confirm the framework is visible to the caller before we surface its
    // requirements as candidates.
    const framework = await this.prisma.framework.findFirst({
      where: {
        id: frameworkId,
        OR: [{ organizationId }, { organizationId: null }],
      },
      select: { id: true },
    });
    if (!framework) {
      throw new NotFoundException(`Framework ${frameworkId} not found`);
    }
    const [requirements, existingMappings] = await Promise.all([
      this.prisma.frameworkRequirement.findMany({
        where: {
          frameworkId,
          isCategory: false,
        },
        orderBy: { reference: 'asc' },
      }),
      this.prisma.controlMapping.findMany({
        where: { frameworkId, controlId },
        select: { requirementId: true },
      }),
    ]);
    const mapped = new Set(existingMappings.map((m) => m.requirementId));
    return requirements
      .filter((r) => !mapped.has(r.id))
      .map((r) => ({
        id: r.id,
        reference: r.reference,
        title: r.title,
        description: r.description,
      }));
  }

  // ============================================================
  // AI path
  // ============================================================

  private shouldSkipAi(): string | undefined {
    if (process.env.AI_MOCK_MODE === 'true') {
      return 'AI_MOCK_MODE is enabled';
    }
    if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      return 'AI provider not configured';
    }
    return undefined;
  }

  private async runAi(
    direction: MappingSuggestionDirection,
    anchor: AnchorForPrompt,
    candidates: EnrichedCandidate[],
    limit: number,
    userId: string,
    organizationId: string
  ): Promise<MappingSuggestionDto[]> {
    const byId = new Map<string, EnrichedCandidate>(candidates.map((c) => [c.id, c]));

    const batches: MappingSuggestionDto[][] = [];
    for (let i = 0; i < candidates.length; i += CANDIDATE_BATCH_SIZE) {
      const chunk = candidates.slice(i, i + CANDIDATE_BATCH_SIZE);
      const prompt =
        direction === 'requirement-to-controls'
          ? buildRequirementToControlsPrompt(anchor, chunk)
          : buildControlToRequirementsPrompt(anchor, chunk);
      const raw = await this.callAiService(prompt, userId, organizationId);
      batches.push(this.parseAiResponse(raw, byId));
    }

    return this.dedupeAndRank(batches, limit);
  }

  private async callAiService(
    prompt: string,
    userId: string,
    organizationId: string
  ): Promise<RawAiResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s
    try {
      const response = await fetch(`${this.aiServiceUrl}/api/ai/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-organization-id': organizationId,
        },
        body: JSON.stringify({
          prompt,
          systemPrompt: SYSTEM_PROMPT,
          organizationId,
          type: 'mapping_suggestion',
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`);
      }
      const body = (await response.json()) as RawAiResponse | string;
      // The controls service may return either a parsed object or a raw JSON
      // string the model emitted. Normalize both shapes.
      if (typeof body === 'string') {
        return JSON.parse(body) as RawAiResponse;
      }
      return body;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Enrich and validate the raw AI response. Any suggestion referencing a
   * candidate id that isn't in the catalog is dropped — the AI does not get
   * to invent IDs.
   */
  private parseAiResponse(
    raw: RawAiResponse,
    byId: Map<string, EnrichedCandidate>
  ): MappingSuggestionDto[] {
    if (!raw || !Array.isArray(raw.suggestions)) {
      throw new Error('Malformed AI response: missing suggestions[]');
    }
    const out: MappingSuggestionDto[] = [];
    for (const s of raw.suggestions) {
      if (!s || typeof s.candidateId !== 'string') continue;
      const cand = byId.get(s.candidateId);
      if (!cand) continue;
      const confidence = Math.max(0, Math.min(1, Number(s.confidence) || 0));
      const rationale =
        typeof s.rationale === 'string' && s.rationale.length > 0
          ? s.rationale.slice(0, 280)
          : 'No rationale provided.';
      out.push({
        candidateId: cand.id,
        candidateReference: cand.reference,
        candidateTitle: cand.title,
        confidence,
        rationale,
      });
    }
    return out;
  }

  /**
   * Merge per-batch suggestion arrays, retaining the maximum confidence per
   * candidate, then sort desc with reference asc as tiebreaker and slice to
   * the request limit. Locked from contract §4.3.
   */
  private dedupeAndRank(batches: MappingSuggestionDto[][], limit: number): MappingSuggestionDto[] {
    const byId = new Map<string, MappingSuggestionDto>();
    for (const batch of batches) {
      for (const s of batch) {
        const existing = byId.get(s.candidateId);
        if (!existing || s.confidence > existing.confidence) byId.set(s.candidateId, s);
      }
    }
    return [...byId.values()]
      .sort(
        (a, b) =>
          b.confidence - a.confidence || a.candidateReference.localeCompare(b.candidateReference)
      )
      .slice(0, limit);
  }

  // ============================================================
  // Demo (Jaccard) path
  // ============================================================

  private runDemoMode(
    anchor: AnchorForPrompt,
    candidates: EnrichedCandidate[],
    limit: number
  ): MappingSuggestionDto[] {
    const anchorText = [anchor.title, anchor.description, anchor.guidance ?? '']
      .filter(Boolean)
      .join(' ');
    const anchorTokens = tokenize(anchorText);

    const scored = candidates.map((c) => {
      const candText = [c.reference, c.title, c.description, c.category ?? '']
        .filter(Boolean)
        .join(' ');
      const candTokens = tokenize(candText);
      const confidence = jaccard(anchorTokens, candTokens);
      const shared = sharedTokens(anchorTokens, candTokens);
      return {
        candidateId: c.id,
        candidateReference: c.reference,
        candidateTitle: c.title,
        confidence,
        rationale: buildRationale(shared),
      } satisfies MappingSuggestionDto;
    });

    return scored
      .sort(
        (a, b) =>
          b.confidence - a.confidence || a.candidateReference.localeCompare(b.candidateReference)
      )
      .slice(0, limit);
  }
}
