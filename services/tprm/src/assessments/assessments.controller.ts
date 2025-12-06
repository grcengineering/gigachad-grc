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
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@Controller('assessments')
@UseGuards(DevAuthGuard)
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
    @Query('vendorId') vendorId?: string,
    @Query('assessmentType') assessmentType?: string,
    @Query('status') status?: string,
  ) {
    return this.assessmentsService.findAll({ vendorId, assessmentType, status });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assessmentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAssessmentDto: UpdateAssessmentDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.assessmentsService.update(id, updateAssessmentDto, user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.assessmentsService.remove(id, user.userId);
  }
}
