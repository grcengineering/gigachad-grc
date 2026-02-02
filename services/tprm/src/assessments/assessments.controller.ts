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
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { CurrentUser, UserContext, Roles, RolesGuard } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@Controller('assessments')
@UseGuards(DevAuthGuard, RolesGuard)
@Roles('admin', 'compliance_manager', 'tprm_manager')
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Post()
  create(
    @Body() createAssessmentDto: CreateAssessmentDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.assessmentsService.create(createAssessmentDto, user.userId);
  }

  @Get()
  findAll(
    @CurrentUser() user: UserContext,
    @Query('vendorId') vendorId?: string,
    @Query('assessmentType') assessmentType?: string,
    @Query('status') status?: string,
  ) {
    return this.assessmentsService.findAll(user.organizationId, { vendorId, assessmentType, status });
  }

  @Get('stats')
  getStats(@CurrentUser() user: UserContext) {
    return this.assessmentsService.getAssessmentStats(user.organizationId);
  }

  @Get('upcoming')
  getUpcoming(@CurrentUser() user: UserContext) {
    return this.assessmentsService.getUpcomingAssessments(user.organizationId);
  }

  @Get('overdue')
  getOverdue(@CurrentUser() user: UserContext) {
    return this.assessmentsService.getOverdueAssessments(user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UserContext) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.assessmentsService.findOne(id, user.organizationId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAssessmentDto: UpdateAssessmentDto,
    @CurrentUser() user: UserContext,
  ) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.assessmentsService.update(id, updateAssessmentDto, user.userId, user.organizationId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: UserContext) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.assessmentsService.remove(id, user.userId, user.organizationId);
  }
}
