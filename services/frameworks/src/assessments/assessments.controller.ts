import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AssessmentsService } from './assessments.service';
import {
  CreateAssessmentDto,
  UpdateRequirementStatusDto,
  CreateGapDto,
  CreateRemediationTaskDto,
  UpdateRemediationTaskDto,
} from './dto/assessment.dto';
import {
  Roles,
  CurrentUser,
  UserContext,
} from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@ApiTags('assessments')
@ApiBearerAuth()
@Controller('api/assessments')
@UseGuards(DevAuthGuard)
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List assessments' })
  async findAll(
    @CurrentUser() user: UserContext,
    @Query('frameworkId') frameworkId?: string,
  ) {
    return this.assessmentsService.findAll(user.organizationId, frameworkId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get assessment by ID' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.assessmentsService.findOne(id, user.organizationId);
  }

  @Post()
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Create a new assessment' })
  async create(
    @CurrentUser() user: UserContext,
    @Body() dto: CreateAssessmentDto,
  ) {
    return this.assessmentsService.create(
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Put(':id/requirements/:requirementId')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Update requirement status' })
  async updateRequirementStatus(
    @Param('id') id: string,
    @Param('requirementId') requirementId: string,
    @CurrentUser() user: UserContext,
    @Body() dto: UpdateRequirementStatusDto,
  ) {
    return this.assessmentsService.updateRequirementStatus(
      id,
      requirementId,
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Get(':id/gaps')
  @ApiOperation({ summary: 'Get assessment gaps' })
  async getGaps(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.assessmentsService.getGaps(id, user.organizationId);
  }

  @Post(':id/gaps')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Create a gap' })
  async createGap(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Body() dto: CreateGapDto,
  ) {
    return this.assessmentsService.createGap(id, user.organizationId, dto);
  }

  @Post(':id/gaps/generate')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Auto-generate gaps from assessment' })
  async generateGaps(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.assessmentsService.generateGapsFromAssessment(
      id,
      user.organizationId,
    );
  }

  @Post(':id/remediation')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Create remediation task' })
  async createRemediationTask(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Body() dto: CreateRemediationTaskDto,
  ) {
    return this.assessmentsService.createRemediationTask(
      id,
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Put(':id/remediation/:taskId')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Update remediation task' })
  async updateRemediationTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: UserContext,
    @Body() dto: UpdateRemediationTaskDto,
  ) {
    return this.assessmentsService.updateRemediationTask(
      id,
      taskId,
      user.organizationId,
      dto,
    );
  }

  @Post(':id/complete')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Mark assessment as complete' })
  async complete(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.assessmentsService.completeAssessment(
      id,
      user.organizationId,
      user.userId,
    );
  }
}

