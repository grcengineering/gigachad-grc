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
import { CreateQuestionnaireDto } from './dto/create-questionnaire.dto';
import { UpdateQuestionnaireDto } from './dto/update-questionnaire.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@Controller('questionnaires')
@UseGuards(DevAuthGuard)
export class QuestionnairesController {
  constructor(private readonly questionnairesService: QuestionnairesService) {}

  @Post()
  create(
    @Body() createQuestionnaireDto: CreateQuestionnaireDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.questionnairesService.create(createQuestionnaireDto, user.userId);
  }

  @Get()
  findAll(
    @Query('organizationId') organizationId: string,
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('priority') priority?: string,
  ) {
    return this.questionnairesService.findAll(organizationId, {
      status,
      assignedTo,
      priority,
    });
  }

  @Get('stats')
  getStats(@Query('organizationId') organizationId: string) {
    return this.questionnairesService.getStats(organizationId);
  }

  @Get('my-queue')
  getMyQueue(
    @CurrentUser() user: UserContext,
    @Query('organizationId') organizationId: string,
  ) {
    return this.questionnairesService.getMyQueue(user.userId, organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.questionnairesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateQuestionnaireDto: UpdateQuestionnaireDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.questionnairesService.update(id, updateQuestionnaireDto, user.userId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.questionnairesService.remove(id, user.userId);
  }

  // Question endpoints
  @Post('questions')
  createQuestion(
    @Body() createQuestionDto: CreateQuestionDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.questionnairesService.createQuestion(createQuestionDto, user.userId);
  }

  @Patch('questions/:id')
  updateQuestion(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.questionnairesService.updateQuestion(id, updateQuestionDto, user.userId);
  }

  @Delete('questions/:id')
  removeQuestion(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.questionnairesService.removeQuestion(id, user.userId);
  }
}
