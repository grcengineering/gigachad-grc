import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { QuestionnairesService } from './questionnaires.service';
import { SimilarQuestionsService } from './similar-questions.service';
import { QuestionnaireExportService } from './export.service';
import { Response } from 'express';
import { Res } from '@nestjs/common';
import { CreateQuestionnaireDto } from './dto/create-questionnaire.dto';
import { UpdateQuestionnaireDto } from './dto/update-questionnaire.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@Controller('questionnaires')
@UseGuards(DevAuthGuard)
export class QuestionnairesController {
  constructor(
    private readonly questionnairesService: QuestionnairesService,
    private readonly similarQuestionsService: SimilarQuestionsService,
    private readonly exportService: QuestionnaireExportService,
  ) {}

  @Post()
  create(
    @Body() createQuestionnaireDto: CreateQuestionnaireDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.questionnairesService.create(createQuestionnaireDto, user.userId);
  }

  @Get()
  findAll(
    @CurrentUser() user: UserContext,
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('priority') priority?: string,
  ) {
    // SECURITY: Organization ID extracted from authenticated context, not query param
    return this.questionnairesService.findAll(user.organizationId, {
      status,
      assignedTo,
      priority,
    });
  }

  @Get('stats')
  getStats(@CurrentUser() user: UserContext) {
    // SECURITY: Organization ID extracted from authenticated context, not query param
    return this.questionnairesService.getStats(user.organizationId);
  }

  @Get('analytics')
  getAnalytics(
    @CurrentUser() user: UserContext,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // SECURITY: Organization ID extracted from authenticated context, not query param
    const dateRange = startDate && endDate
      ? { start: new Date(startDate), end: new Date(endDate) }
      : undefined;
    return this.questionnairesService.getAnalytics(user.organizationId, dateRange);
  }

  @Get('dashboard-queue')
  getDashboardQueue(
    @CurrentUser() user: UserContext,
  ) {
    // SECURITY: Organization ID extracted from authenticated context, not query param
    return this.questionnairesService.getDashboardQueue(user.organizationId, user.userId);
  }

  @Get('my-queue')
  getMyQueue(
    @CurrentUser() user: UserContext,
  ) {
    // SECURITY: Organization ID extracted from authenticated context, not query param
    return this.questionnairesService.getMyQueue(user.userId, user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UserContext) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.questionnairesService.findOne(id, user.organizationId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateQuestionnaireDto: UpdateQuestionnaireDto,
    @CurrentUser() user: UserContext,
  ) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.questionnairesService.update(id, updateQuestionnaireDto, user.userId, user.organizationId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.questionnairesService.remove(id, user.userId, user.organizationId);
  }

  // Question endpoints
  @Post('questions')
  createQuestion(
    @Body() createQuestionDto: CreateQuestionDto,
    @CurrentUser() user: UserContext,
  ) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.questionnairesService.createQuestion(createQuestionDto, user.userId, user.organizationId);
  }

  @Patch('questions/:id')
  updateQuestion(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
    @CurrentUser() user: UserContext,
  ) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.questionnairesService.updateQuestion(id, updateQuestionDto, user.userId, user.organizationId);
  }

  @Delete('questions/:id')
  removeQuestion(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.questionnairesService.removeQuestion(id, user.userId, user.organizationId);
  }

  // Similar Questions Endpoints
  @Get('similar-questions')
  findSimilarQuestions(
    @CurrentUser() user: UserContext,
    @Query('questionText') questionText: string,
    @Query('excludeId') excludeId?: string,
    @Query('limit') limit?: string,
  ) {
    // SECURITY: Organization ID extracted from authenticated context, not query param
    return this.similarQuestionsService.findSimilarQuestions(
      user.organizationId,
      questionText,
      excludeId,
      limit ? parseInt(limit) : undefined,
    );
  }

  @Get(':id/duplicates')
  findDuplicatesInQuestionnaire(@Param('id') id: string) {
    return this.similarQuestionsService.findDuplicatesInQuestionnaire(id);
  }

  @Get('answer-suggestions')
  getAnswerSuggestions(
    @CurrentUser() user: UserContext,
    @Query('questionText') questionText: string,
    @Query('limit') limit?: string,
  ) {
    // SECURITY: Organization ID extracted from authenticated context, not query param
    return this.similarQuestionsService.getAnswerSuggestions(
      user.organizationId,
      questionText,
      limit ? parseInt(limit) : undefined,
    );
  }

  // Export Endpoints
  @Get(':id/export')
  async exportQuestionnaire(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Res() res: Response,
    @Query('format') format: 'excel' | 'csv' | 'json' = 'excel',
    @Query('includeMetadata') includeMetadata?: string,
    @Query('includePending') includePending?: string,
  ) {
    const options = {
      format,
      includeMetadata: includeMetadata !== 'false',
      includePending: includePending !== 'false',
    };

    const result = await this.exportService.exportQuestionnaire(id, options);
    
    // SECURITY: Pass organizationId to ensure tenant isolation
    const questionnaire = await this.questionnairesService.findOne(id, user.organizationId);
    const filename = `${questionnaire.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}`;

    switch (format) {
      case 'excel':
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
        res.send(result);
        break;
      case 'csv':
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send(result);
        break;
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
        res.send(result);
        break;
    }
  }

  @Post('export-batch')
  async exportMultiple(
    @Body() body: { ids: string[]; format: 'excel' | 'json' },
    @Res() res: Response,
  ) {
    const result = await this.exportService.exportMultiple(body.ids, { format: body.format });
    
    const filename = `questionnaires_export_${new Date().toISOString().split('T')[0]}`;

    if (body.format === 'excel') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      res.send(result);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.send(result);
    }
  }
}
