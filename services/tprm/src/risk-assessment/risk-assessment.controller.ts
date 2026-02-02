import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { RiskAssessmentService } from './risk-assessment.service';
import { CreateRiskAssessmentDto } from './dto/risk-assessment.dto';
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@Controller('vendors/:vendorId/risk-assessment')
@UseGuards(DevAuthGuard)
export class RiskAssessmentController {
  constructor(private readonly riskAssessmentService: RiskAssessmentService) {}

  /**
   * Submit a new risk assessment for a vendor
   */
  @Post()
  async createAssessment(
    @Param('vendorId') vendorId: string,
    @Body() dto: CreateRiskAssessmentDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.riskAssessmentService.createAssessment(
      vendorId,
      dto,
      user.userId,
      user.organizationId,
    );
  }

  /**
   * Get the latest risk assessment for a vendor
   */
  @Get('latest')
  async getLatestAssessment(
    @Param('vendorId') vendorId: string,
    @CurrentUser() user: UserContext,
  ) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.riskAssessmentService.getLatestAssessment(vendorId, user.organizationId);
  }

  /**
   * Get all risk assessments for a vendor
   */
  @Get('history')
  async getAssessmentHistory(
    @Param('vendorId') vendorId: string,
    @CurrentUser() user: UserContext,
  ) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.riskAssessmentService.getAssessmentHistory(vendorId, user.organizationId);
  }
}
