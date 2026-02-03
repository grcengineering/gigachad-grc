import {
  Controller,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { TrustAiService } from './trust-ai.service';
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@Controller('trust-ai')
@UseGuards(DevAuthGuard)
export class TrustAiController {
  constructor(private readonly aiService: TrustAiService) {}

  @Post('draft-answer')
  draftAnswer(
    @Body() body: { questionText: string },
    @CurrentUser() user: UserContext,
  ) {
    // SECURITY: Organization ID extracted from authenticated context, not query param
    return this.aiService.generateAnswerDraft(
      user.organizationId,
      body.questionText,
      user.userId,
    );
  }

  @Post('categorize')
  categorizeQuestion(
    @Body() body: { questionText: string },
    @CurrentUser() user: UserContext,
  ) {
    // SECURITY: Organization ID extracted from authenticated context, not query param
    return this.aiService.categorizeQuestion(
      user.organizationId,
      body.questionText,
      user.userId,
    );
  }

  @Post('improve-answer')
  improveAnswer(
    @Body() body: { questionText: string; currentAnswer: string },
    @CurrentUser() user: UserContext,
  ) {
    // SECURITY: Organization ID extracted from authenticated context, not query param
    return this.aiService.improveAnswer(
      user.organizationId,
      body.questionText,
      body.currentAnswer,
      user.userId,
    );
  }
}

