import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { userId: string; organizationId: string; email?: string };
}
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { AIService } from './ai.service';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Resource, Action } from '../permissions/dto/permission.dto';
import {
  AIConfigDto,
  UpdateAIConfigDto,
  RiskScoringRequestDto,
  RiskScoringResponseDto,
  CategorizationRequestDto,
  CategorizationResponseDto,
  SmartSearchRequestDto,
  SmartSearchResponseDto,
  PolicyDraftRequestDto,
  PolicyDraftResponseDto,
  ControlSuggestionRequestDto,
  ControlSuggestionResponseDto,
  AICompletionRequestDto,
  AICompletionResponseDto,
} from './dto/ai.dto';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('api/ai')
@UseGuards(DevAuthGuard, PermissionGuard)
export class AIController {
  constructor(private readonly aiService: AIService) {}

  // ============================================
  // Configuration Endpoints
  // ============================================

  @Get('config')
  @ApiOperation({ summary: 'Get AI configuration for the organization' })
  @ApiResponse({ status: 200, description: 'AI configuration', type: AIConfigDto })
  @RequirePermission(Resource.AI, Action.READ)
  async getConfig(@Req() req: AuthenticatedRequest): Promise<AIConfigDto> {
    return this.aiService.getConfig(req.user.organizationId);
  }

  @Put('config')
  @ApiOperation({ summary: 'Update AI configuration' })
  @ApiResponse({ status: 200, description: 'Updated configuration', type: AIConfigDto })
  @ApiBody({ type: UpdateAIConfigDto })
  @RequirePermission(Resource.AI, Action.UPDATE)
  async updateConfig(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateAIConfigDto
  ): Promise<AIConfigDto> {
    return this.aiService.updateConfig(req.user.organizationId, dto);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get AI provider status and available models' })
  @ApiResponse({
    status: 200,
    description: 'Provider status',
    schema: {
      type: 'object',
      properties: {
        available: { type: 'boolean' },
        config: {
          type: 'object',
          properties: {
            provider: { type: 'string' },
            model: { type: 'string' },
          },
        },
        isMockMode: { type: 'boolean' },
        mockModeReason: { type: 'string' },
      },
    },
  })
  @RequirePermission(Resource.AI, Action.READ)
  async getStatus(@Req() req: AuthenticatedRequest) {
    const [providerStatus, config] = await Promise.all([
      this.aiService.getProviderStatus(req.user.organizationId),
      this.aiService.getConfig(req.user.organizationId),
    ]);

    return {
      available: providerStatus.isConfigured || providerStatus.isMockMode,
      config: {
        provider: providerStatus.provider,
        model: config.model,
      },
      isMockMode: providerStatus.isMockMode,
      mockModeReason: providerStatus.mockModeReason,
    };
  }

  // ============================================
  // Risk Scoring
  // ============================================

  @Post('risk-scoring')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'AI-powered risk analysis and scoring',
    description: 'Analyzes a risk description and suggests likelihood, impact scores with rationale',
  })
  @ApiResponse({ status: 200, description: 'Risk scoring result', type: RiskScoringResponseDto })
  @ApiBody({ type: RiskScoringRequestDto })
  @RequirePermission(Resource.AI, Action.CREATE)
  async analyzeRisk(
    @Req() req: AuthenticatedRequest,
    @Body() dto: RiskScoringRequestDto
  ): Promise<RiskScoringResponseDto> {
    return this.aiService.analyzeRisk(req.user.organizationId, dto);
  }

  // ============================================
  // Auto-Categorization
  // ============================================

  @Post('categorize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Auto-categorize an entity',
    description: 'Uses AI to suggest categories, tags, and framework mappings for controls, risks, policies, etc.',
  })
  @ApiResponse({ status: 200, description: 'Categorization result', type: CategorizationResponseDto })
  @ApiBody({ type: CategorizationRequestDto })
  @RequirePermission(Resource.AI, Action.CREATE)
  async categorize(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CategorizationRequestDto
  ): Promise<CategorizationResponseDto> {
    return this.aiService.categorize(req.user.organizationId, dto);
  }

  // ============================================
  // Smart Search
  // ============================================

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Natural language smart search',
    description: 'Search across controls, risks, policies, evidence, and vendors using natural language',
  })
  @ApiResponse({ status: 200, description: 'Search results', type: SmartSearchResponseDto })
  @ApiBody({ type: SmartSearchRequestDto })
  @RequirePermission(Resource.AI, Action.READ)
  async smartSearch(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SmartSearchRequestDto
  ): Promise<SmartSearchResponseDto> {
    return this.aiService.smartSearch(req.user.organizationId, dto);
  }

  // ============================================
  // Policy Drafting
  // ============================================

  @Post('draft-policy')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate policy draft',
    description: 'AI-assisted policy document generation based on requirements and frameworks',
  })
  @ApiResponse({ status: 200, description: 'Policy draft', type: PolicyDraftResponseDto })
  @ApiBody({ type: PolicyDraftRequestDto })
  @RequirePermission(Resource.AI, Action.CREATE)
  async draftPolicy(
    @Req() req: AuthenticatedRequest,
    @Body() dto: PolicyDraftRequestDto
  ): Promise<PolicyDraftResponseDto> {
    return this.aiService.draftPolicy(req.user.organizationId, dto);
  }

  // ============================================
  // Control Suggestions
  // ============================================

  @Post('suggest-controls')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get control recommendations',
    description: 'AI suggests security controls based on risks, framework requirements, or gaps',
  })
  @ApiResponse({ status: 200, description: 'Control suggestions', type: ControlSuggestionResponseDto })
  @ApiBody({ type: ControlSuggestionRequestDto })
  @RequirePermission(Resource.AI, Action.CREATE)
  async suggestControls(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ControlSuggestionRequestDto
  ): Promise<ControlSuggestionResponseDto> {
    return this.aiService.suggestControls(req.user.organizationId, dto);
  }

  // ============================================
  // Generic Completion (Advanced)
  // ============================================

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generic AI completion',
    description: 'Direct AI completion for custom prompts (advanced use)',
  })
  @ApiResponse({ status: 200, description: 'AI completion result', type: AICompletionResponseDto })
  @ApiBody({ type: AICompletionRequestDto })
  @RequirePermission(Resource.AI, Action.CREATE)
  async complete(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AICompletionRequestDto
  ): Promise<AICompletionResponseDto> {
    const startTime = Date.now();
    const result = await this.aiService.complete(
      req.user.organizationId,
      dto.prompt,
      dto.systemPrompt
    );
    
    return {
      content: result.content,
      model: result.model,
      tokensUsed: result.tokensUsed,
      processingTimeMs: Date.now() - startTime,
    };
  }
}
