 
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { 
  RiskWorkflowService,
  CreateRiskIntakeDto,
  ValidateRiskDto,
  AssignRiskAssessorDto,
  SubmitAssessmentDto,
  GrcReviewDto,
  SubmitTreatmentDecisionDto,
  SetExecutiveApproverDto,
  ExecutiveDecisionDto,
  MitigationUpdateDto,
} from './risk-workflow.service';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Resource, Action } from '../permissions/dto/permission.dto';

const DEFAULT_ORG_ID = 'org-default-001';

@Controller('api/risks/workflow')
@UseGuards(DevAuthGuard, PermissionGuard)
export class RiskWorkflowController {
  constructor(private readonly workflowService: RiskWorkflowService) {}

  // ===========================================
  // Risk Intake
  // ===========================================

  /**
   * Submit a new risk intake
   * POST /api/risks/workflow/intake
   */
  @Post('intake')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(Resource.RISK, Action.CREATE)
  async submitRiskIntake(
    @Body() dto: CreateRiskIntakeDto,
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
    @Headers('x-organization-id') organizationId: string = DEFAULT_ORG_ID,
  ) {
    return this.workflowService.submitRiskIntake(organizationId, dto, userId, userEmail);
  }

  /**
   * Validate risk (GRC SME approves/declines)
   * POST /api/risks/workflow/:id/validate
   */
  @Post(':id/validate')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Resource.RISK, Action.UPDATE)
  async validateRisk(
    @Param('id') id: string,
    @Body() dto: ValidateRiskDto,
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
    @Headers('x-organization-id') organizationId: string = DEFAULT_ORG_ID,
  ) {
    return this.workflowService.validateRisk(id, organizationId, dto, userId, userEmail);
  }

  /**
   * Assign risk assessor (moves to analysis)
   * POST /api/risks/workflow/:id/assign-assessor
   */
  @Post(':id/assign-assessor')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Resource.RISK, Action.UPDATE)
  async assignRiskAssessor(
    @Param('id') id: string,
    @Body() dto: AssignRiskAssessorDto,
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
    @Headers('x-organization-id') organizationId: string = DEFAULT_ORG_ID,
  ) {
    return this.workflowService.assignRiskAssessor(id, organizationId, dto, userId, userEmail);
  }

  // ===========================================
  // Risk Assessment
  // ===========================================

  /**
   * Submit risk assessment (Risk Assessor)
   * POST /api/risks/workflow/:id/assessment/submit
   */
  @Post(':id/assessment/submit')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Resource.RISK, Action.UPDATE)
  async submitAssessment(
    @Param('id') id: string,
    @Body() dto: SubmitAssessmentDto,
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
    @Headers('x-organization-id') organizationId: string = DEFAULT_ORG_ID,
  ) {
    return this.workflowService.submitAssessment(id, organizationId, dto, userId, userEmail);
  }

  /**
   * Review assessment (GRC SME approves/declines)
   * POST /api/risks/workflow/:id/assessment/review
   */
  @Post(':id/assessment/review')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Resource.RISK, Action.UPDATE)
  async reviewAssessment(
    @Param('id') id: string,
    @Body() dto: GrcReviewDto,
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
    @Headers('x-organization-id') organizationId: string = DEFAULT_ORG_ID,
  ) {
    return this.workflowService.reviewAssessment(id, organizationId, dto, userId, userEmail);
  }

  /**
   * Submit GRC revision (GRC SME revises assessment)
   * POST /api/risks/workflow/:id/assessment/revision
   */
  @Post(':id/assessment/revision')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Resource.RISK, Action.UPDATE)
  async submitGrcRevision(
    @Param('id') id: string,
    @Body() dto: SubmitAssessmentDto,
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
    @Headers('x-organization-id') organizationId: string = DEFAULT_ORG_ID,
  ) {
    return this.workflowService.submitGrcRevision(id, organizationId, dto, userId, userEmail);
  }

  // ===========================================
  // Risk Treatment
  // ===========================================

  /**
   * Submit treatment decision (Risk Owner)
   * POST /api/risks/workflow/:id/treatment/decision
   */
  @Post(':id/treatment/decision')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Resource.RISK, Action.UPDATE)
  async submitTreatmentDecision(
    @Param('id') id: string,
    @Body() dto: SubmitTreatmentDecisionDto,
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
    @Headers('x-organization-id') organizationId: string = DEFAULT_ORG_ID,
  ) {
    return this.workflowService.submitTreatmentDecision(id, organizationId, dto, userId, userEmail);
  }

  /**
   * Set executive approver (GRC SME)
   * POST /api/risks/workflow/:id/treatment/set-approver
   */
  @Post(':id/treatment/set-approver')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Resource.RISK, Action.UPDATE)
  async setExecutiveApprover(
    @Param('id') id: string,
    @Body() dto: SetExecutiveApproverDto,
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
    @Headers('x-organization-id') organizationId: string = DEFAULT_ORG_ID,
  ) {
    return this.workflowService.setExecutiveApprover(id, organizationId, dto, userId, userEmail);
  }

  /**
   * Submit executive decision (Executive Approver)
   * POST /api/risks/workflow/:id/treatment/executive-decision
   */
  @Post(':id/treatment/executive-decision')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Resource.RISK, Action.UPDATE)
  async submitExecutiveDecision(
    @Param('id') id: string,
    @Body() dto: ExecutiveDecisionDto,
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
    @Headers('x-organization-id') organizationId: string = DEFAULT_ORG_ID,
  ) {
    return this.workflowService.submitExecutiveDecision(id, organizationId, dto, userId, userEmail);
  }

  /**
   * Submit mitigation update (Risk Owner)
   * POST /api/risks/workflow/:id/treatment/mitigation-update
   */
  @Post(':id/treatment/mitigation-update')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Resource.RISK, Action.UPDATE)
  async submitMitigationUpdate(
    @Param('id') id: string,
    @Body() dto: MitigationUpdateDto,
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
    @Headers('x-organization-id') organizationId: string = DEFAULT_ORG_ID,
  ) {
    return this.workflowService.submitMitigationUpdate(id, organizationId, dto, userId, userEmail);
  }

  // ===========================================
  // Workflow State
  // ===========================================

  /**
   * Get complete workflow state for a risk
   * GET /api/risks/workflow/:id/state
   */
  @Get(':id/state')
  @RequirePermission(Resource.RISK, Action.READ)
  async getWorkflowState(
    @Param('id') id: string,
    @Headers('x-organization-id') organizationId: string = DEFAULT_ORG_ID,
  ) {
    return this.workflowService.getWorkflowState(id, organizationId);
  }
}

