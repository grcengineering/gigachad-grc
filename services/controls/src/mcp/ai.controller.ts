import { Body, Controller, Post, UseGuards, Logger } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MCPWorkflowService } from './mcp-workflow.service';
import { AIService } from '../ai/ai.service';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Resource, Action } from '../permissions/dto/permission.dto';
import { IsString, IsOptional, IsArray } from 'class-validator';

class AnalyzeRiskDto {
  @ApiProperty({ description: 'Title of the risk' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Detailed description of the risk' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Risk category (if known)' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Affected assets', type: [String] })
  @IsOptional()
  @IsArray()
  affectedAssets?: string[];

  @ApiPropertyOptional({ description: 'Existing controls in place', type: [String] })
  @IsOptional()
  @IsArray()
  existingControls?: string[];

  @ApiPropertyOptional({ description: 'Industry context for the assessment' })
  @IsOptional()
  @IsString()
  industryContext?: string;
}

class AnalyzeRiskResponseDto {
  @ApiProperty({ description: 'Summary of the analysis' })
  summary: string;

  @ApiPropertyOptional({ description: 'Suggested risk category' })
  suggestedCategory?: string;

  @ApiPropertyOptional({ description: 'Suggested likelihood score (1-5)' })
  suggestedLikelihood?: number;

  @ApiPropertyOptional({ description: 'Likelihood rationale' })
  likelihoodRationale?: string;

  @ApiPropertyOptional({ description: 'Suggested impact score (1-5)' })
  suggestedImpact?: number;

  @ApiPropertyOptional({ description: 'Impact rationale' })
  impactRationale?: string;

  @ApiPropertyOptional({ description: 'Recommended controls to mitigate' })
  recommendedControls?: string[];

  @ApiPropertyOptional({ description: 'Confidence level in the assessment (0-100)' })
  confidence?: number;

  @ApiPropertyOptional({ description: 'Whether this response is from mock mode' })
  isMockMode?: boolean;

  @ApiPropertyOptional({ description: 'Reason for mock mode if active' })
  mockModeReason?: string;
}

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(DevAuthGuard, PermissionGuard)
@Controller('api/mcp/ai')
export class AIController {
  private readonly logger = new Logger(AIController.name);

  constructor(
    private readonly workflows: MCPWorkflowService,
    private readonly aiService: AIService,
  ) {}

  @Post('analyze-risk')
  @ApiOperation({ summary: 'Analyze a risk description using the AI assistant' })
  @RequirePermission(Resource.AI, Action.UPDATE)
  async analyzeRisk(
    @CurrentUser() user: UserContext,
    @Body() body: AnalyzeRiskDto,
  ): Promise<AnalyzeRiskResponseDto> {
    this.logger.log(`Risk analysis requested for: ${body.title}`);

    try {
      // Use the AIService to analyze the risk
      const result = await this.aiService.analyzeRisk(user.organizationId, {
        title: body.title,
        description: body.description,
        category: body.category,
        affectedAssets: body.affectedAssets,
        existingControls: body.existingControls,
        industryContext: body.industryContext,
      });

      // Check if we're in mock mode
      const isMockMode = this.aiService.isMockMode();
      const mockModeReason = isMockMode
        ? 'AI provider not configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY for actual AI analysis.'
        : undefined;

      if (isMockMode) {
        this.logger.warn('Risk analysis completed in mock mode - AI provider not configured');
      }

      return {
        summary: `Risk analysis for "${body.title}": Likelihood ${result.likelihood}/5, Impact ${result.impact}/5, Risk Score: ${result.riskScore}`,
        suggestedCategory: result.suggestedCategory,
        suggestedLikelihood: result.likelihood,
        likelihoodRationale: result.likelihoodRationale,
        suggestedImpact: result.impact,
        impactRationale: result.impactRationale,
        recommendedControls: result.recommendedControls,
        confidence: result.confidence,
        isMockMode,
        mockModeReason,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Risk analysis failed: ${err.message}`, err.stack);
      
      // Return a graceful fallback response
      return {
        summary: 'Unable to complete AI analysis at this time.',
        isMockMode: true,
        mockModeReason: `Analysis failed: ${err.message}. Please configure AI provider or try again later.`,
      };
    }
  }
}


