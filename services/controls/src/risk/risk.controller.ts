 
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { RiskService } from './risk.service';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Resource, Action } from '../permissions/dto/permission.dto';
import { PaginationLimitPipe, PaginationPagePipe } from '../common/pagination.pipe';
import {
  CreateRiskDto,
  UpdateRiskDto,
  ValidateRiskDto,
  SubmitAssessmentDto,
  ReviewAssessmentDto,
  ReviseAssessmentDto,
  SubmitTreatmentDecisionDto,
  AssignExecutiveApproverDto,
  ExecutiveApprovalDto,
  UpdateMitigationStatusDto,
  UpdateTreatmentDto,
  RiskFilterDto,
  LinkControlDto,
  UpdateControlEffectivenessDto,
  CreateScenarioDto,
  UpdateScenarioDto,
  LinkAssetsDto,
} from './dto/risk.dto';

@Controller('api/risks')
@UseGuards(DevAuthGuard, PermissionGuard)
export class RiskController {
  constructor(private readonly riskService: RiskService) {}

  // ===========================
  // Risk CRUD
  // ===========================

  @Get()
  @RequirePermission(Resource.RISK, Action.READ)
  async listRisks(
    @Query() filters: RiskFilterDto,
    @Query('page', new PaginationPagePipe()) page: number,
    @Query('limit', new PaginationLimitPipe()) limit: number,
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    // Use lightweight endpoint for better performance
    return this.riskService.findAllLight(orgId, filters, page, limit);
  }

  @Get('full')
  @RequirePermission(Resource.RISK, Action.READ)
  async listRisksFull(
    @Query() filters: RiskFilterDto,
    @Query('page', new PaginationPagePipe()) page: number,
    @Query('limit', new PaginationLimitPipe()) limit: number,
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    // Full endpoint for exports or when full data is needed
    return this.riskService.findAll(orgId, filters, page, limit);
  }

  @Get('dashboard')
  @RequirePermission(Resource.RISK, Action.READ)
  async getDashboard(
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    return this.riskService.getDashboard(orgId);
  }

  @Get('heatmap')
  @RequirePermission(Resource.RISK, Action.READ)
  async getHeatmap(
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    return this.riskService.getHeatmap(orgId);
  }

  @Get('trend')
  @RequirePermission(Resource.RISK, Action.READ)
  async getTrend(
    @Query('days') days: string = '90',
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    return this.riskService.getTrend(orgId, parseInt(days, 10));
  }

  @Get(':id')
  @RequirePermission(Resource.RISK, Action.READ)
  async getRisk(
    @Param('id') id: string,
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    return this.riskService.findOne(id, orgId);
  }

  @Post()
  @RequirePermission(Resource.RISK, Action.CREATE)
  async createRisk(
    @Body() dto: CreateRiskDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
  ) {
    return this.riskService.create(orgId, dto, userId, userEmail);
  }

  @Put(':id')
  @RequirePermission(Resource.RISK, Action.UPDATE)
  async updateRisk(
    @Param('id') id: string,
    @Body() dto: UpdateRiskDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
  ) {
    return this.riskService.update(id, orgId, dto, userId, userEmail);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Resource.RISK, Action.DELETE)
  async deleteRisk(
    @Param('id') id: string,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
  ) {
    await this.riskService.delete(id, orgId, userId, userEmail);
  }

  // ===========================
  // Risk Intake Workflow
  // ===========================

  // GRC SME validates risk (Risk Identified -> Actual Risk or Not A Risk)
  @Post(':id/validate')
  @RequirePermission(Resource.RISK, Action.UPDATE)
  async validateRisk(
    @Param('id') id: string,
    @Body() dto: ValidateRiskDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
  ) {
    return this.riskService.validateRisk(id, orgId, dto, userId, userEmail);
  }

  // Start risk assessment (Actual Risk -> Risk Analysis In Progress)
  @Post(':id/start-assessment')
  @RequirePermission(Resource.RISK, Action.UPDATE)
  async startAssessment(
    @Param('id') id: string,
    @Body() body: { riskAssessorId: string },
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
  ) {
    return this.riskService.startAssessment(id, orgId, body.riskAssessorId, userId, userEmail);
  }

  // ===========================
  // Risk Assessment Workflow
  // ===========================

  // Risk Assessor submits assessment
  @Post(':id/assessment/submit')
  @RequirePermission(Resource.RISK, Action.UPDATE)
  async submitAssessment(
    @Param('id') id: string,
    @Body() dto: SubmitAssessmentDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
  ) {
    return this.riskService.submitAssessment(id, orgId, dto, userId, userEmail);
  }

  // GRC SME reviews assessment (approve or decline)
  @Post(':id/assessment/review')
  @RequirePermission(Resource.RISK, Action.UPDATE)
  async reviewAssessment(
    @Param('id') id: string,
    @Body() dto: ReviewAssessmentDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
  ) {
    return this.riskService.reviewAssessment(id, orgId, dto, userId, userEmail);
  }

  // GRC SME completes revision
  @Post(':id/assessment/revision')
  @RequirePermission(Resource.RISK, Action.UPDATE)
  async completeRevision(
    @Param('id') id: string,
    @Body() dto: ReviseAssessmentDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
  ) {
    return this.riskService.completeRevision(id, orgId, dto, userId, userEmail);
  }

  // ===========================
  // Risk Treatment Workflow
  // ===========================

  // Risk Owner submits treatment decision
  @Post(':id/treatment/decision')
  @RequirePermission(Resource.RISK, Action.UPDATE)
  async submitTreatmentDecision(
    @Param('id') id: string,
    @Body() dto: SubmitTreatmentDecisionDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
  ) {
    return this.riskService.submitTreatmentDecision(id, orgId, dto, userId, userEmail);
  }

  // GRC SME assigns executive approver
  @Post(':id/treatment/assign-approver')
  @RequirePermission(Resource.RISK, Action.UPDATE)
  async assignExecutiveApprover(
    @Param('id') id: string,
    @Body() dto: AssignExecutiveApproverDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
  ) {
    return this.riskService.assignExecutiveApprover(id, orgId, dto, userId, userEmail);
  }

  // Executive approves or denies
  @Post(':id/treatment/executive-approval')
  @RequirePermission(Resource.RISK, Action.UPDATE)
  async submitExecutiveApproval(
    @Param('id') id: string,
    @Body() dto: ExecutiveApprovalDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
  ) {
    return this.riskService.submitExecutiveApproval(id, orgId, dto, userId, userEmail);
  }

  // Risk Owner updates mitigation status
  @Post(':id/treatment/mitigation-update')
  @RequirePermission(Resource.RISK, Action.UPDATE)
  async updateMitigationStatus(
    @Param('id') id: string,
    @Body() dto: UpdateMitigationStatusDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
  ) {
    return this.riskService.updateMitigationStatus(id, orgId, dto, userId, userEmail);
  }

  // Legacy treatment update (backwards compatibility)
  @Put(':id/treatment')
  async updateTreatment(
    @Param('id') id: string,
    @Body() dto: UpdateTreatmentDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
  ) {
    return this.riskService.updateTreatment(id, orgId, dto, userId, userEmail);
  }

  // Mark risk as reviewed
  @Post(':id/review')
  async markReviewed(
    @Param('id') id: string,
    @Body() body: { notes?: string },
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
  ) {
    return this.riskService.markReviewed(id, orgId, userId, userEmail, body.notes);
  }

  // ===========================
  // Risk-Asset Linking
  // ===========================

  @Post(':id/assets')
  @HttpCode(HttpStatus.CREATED)
  async linkAssets(
    @Param('id') id: string,
    @Body() dto: LinkAssetsDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
  ) {
    await this.riskService.linkAssets(id, orgId, dto.assetIds, userId, userEmail);
    return { success: true };
  }

  @Delete(':id/assets/:assetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlinkAsset(
    @Param('id') id: string,
    @Param('assetId') assetId: string,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
  ) {
    await this.riskService.unlinkAsset(id, assetId, orgId, userId, userEmail);
  }

  // ===========================
  // Risk-Control Linking
  // ===========================

  @Post(':id/controls')
  @HttpCode(HttpStatus.CREATED)
  async linkControl(
    @Param('id') id: string,
    @Body() dto: LinkControlDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
  ) {
    await this.riskService.linkControl(id, orgId, dto, userId, userEmail);
    return { success: true };
  }

  @Put(':id/controls/:controlId')
  async updateControlEffectiveness(
    @Param('id') id: string,
    @Param('controlId') controlId: string,
    @Body() dto: UpdateControlEffectivenessDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
  ) {
    await this.riskService.updateControlEffectiveness(id, controlId, orgId, dto, userId, userEmail);
    return { success: true };
  }

  @Delete(':id/controls/:controlId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlinkControl(
    @Param('id') id: string,
    @Param('controlId') controlId: string,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
  ) {
    await this.riskService.unlinkControl(id, controlId, orgId, userId, userEmail);
  }

  // ===========================
  // Risk Scenarios
  // ===========================

  @Get(':id/scenarios')
  async getScenarios(
    @Param('id') id: string,
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    return this.riskService.getScenarios(id, orgId);
  }

  @Post(':id/scenarios')
  async createScenario(
    @Param('id') id: string,
    @Body() dto: CreateScenarioDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
  ) {
    return this.riskService.createScenario(id, orgId, dto, userId, userEmail);
  }

  @Put(':id/scenarios/:scenarioId')
  async updateScenario(
    @Param('id') id: string,
    @Param('scenarioId') scenarioId: string,
    @Body() dto: UpdateScenarioDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
  ) {
    return this.riskService.updateScenario(id, scenarioId, orgId, dto, userId, userEmail);
  }

  @Delete(':id/scenarios/:scenarioId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteScenario(
    @Param('id') id: string,
    @Param('scenarioId') scenarioId: string,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
  ) {
    await this.riskService.deleteScenario(id, scenarioId, orgId, userId, userEmail);
  }
}
