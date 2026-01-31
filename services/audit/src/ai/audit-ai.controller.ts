import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuditAIService } from './audit-ai.service';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import {
  CategorizeFindingDto,
  FindingCategorizationResult,
  AnalyzeGapsDto,
  GapAnalysisResult,
  SuggestRemediationDto,
  RemediationSuggestion,
  MapControlsDto,
  ControlMappingResult,
  GenerateSummaryDto,
  AuditSummary,
} from './dto/audit-ai.dto';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    organizationId: string;
  };
}

@ApiTags('Audit AI')
@ApiBearerAuth()
@UseGuards(DevAuthGuard)
@Controller('audit-ai')
export class AuditAIController {
  constructor(private readonly auditAIService: AuditAIService) {}

  @Post('categorize-finding')
  @ApiOperation({ summary: 'AI-categorize an audit finding' })
  async categorizeFinding(
    @Body() dto: CategorizeFindingDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<FindingCategorizationResult> {
    return this.auditAIService.categorizeFinding(
      req.user.organizationId,
      dto,
      req.user.userId,
    );
  }

  @Post('analyze-gaps')
  @ApiOperation({ summary: 'Analyze evidence gaps for an audit' })
  async analyzeGaps(
    @Body() dto: AnalyzeGapsDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<GapAnalysisResult> {
    return this.auditAIService.analyzeGaps(
      req.user.organizationId,
      dto,
      req.user.userId,
    );
  }

  @Post('suggest-remediation')
  @ApiOperation({ summary: 'Generate AI remediation suggestions for a finding' })
  async suggestRemediation(
    @Body() dto: SuggestRemediationDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<RemediationSuggestion> {
    return this.auditAIService.suggestRemediation(
      req.user.organizationId,
      dto,
      req.user.userId,
    );
  }

  @Post('map-controls')
  @ApiOperation({ summary: 'Map audit requests to relevant controls' })
  async mapControls(
    @Body() dto: MapControlsDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ControlMappingResult> {
    return this.auditAIService.mapControls(
      req.user.organizationId,
      dto,
      req.user.userId,
    );
  }

  @Post('generate-summary')
  @ApiOperation({ summary: 'Generate an AI audit summary' })
  async generateSummary(
    @Body() dto: GenerateSummaryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<AuditSummary> {
    return this.auditAIService.generateSummary(
      req.user.organizationId,
      dto,
      req.user.userId,
    );
  }
}

