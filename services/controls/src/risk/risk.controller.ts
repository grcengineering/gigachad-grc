import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { RiskService } from './risk.service';
import { DevAuthGuard, User } from '../auth/dev-auth.guard';
import type { UserContext } from '@gigachad-grc/shared';
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
    @User() user: UserContext
  ) {
    // Use lightweight endpoint for better performance
    return this.riskService.findAllLight(user.organizationId, filters, page, limit, user.userId);
  }

  @Get('full')
  @RequirePermission(Resource.RISK, Action.READ)
  async listRisksFull(
    @Query() filters: RiskFilterDto,
    @Query('page', new PaginationPagePipe()) page: number,
    @Query('limit', new PaginationLimitPipe()) limit: number,
    @User() user: UserContext
  ) {
    // Full endpoint for exports or when full data is needed
    return this.riskService.findAll(user.organizationId, filters, page, limit, user.userId);
  }

  @Get('dashboard')
  @RequirePermission(Resource.RISK, Action.READ)
  async getDashboard(@User() user: UserContext) {
    return this.riskService.getDashboard(user.organizationId);
  }

  @Get('heatmap')
  @RequirePermission(Resource.RISK, Action.READ)
  async getHeatmap(@User() user: UserContext) {
    return this.riskService.getHeatmap(user.organizationId);
  }

  @Get('trend')
  @RequirePermission(Resource.RISK, Action.READ)
  async getTrend(@Query('days') days: string = '90', @User() user: UserContext) {
    return this.riskService.getTrend(user.organizationId, parseInt(days, 10));
  }

  @Get(':id')
  @RequirePermission(Resource.RISK, Action.READ)
  async getRisk(@Param('id') id: string, @User() user: UserContext) {
    return this.riskService.findOne(id, user.organizationId);
  }

  @Post()
  @RequirePermission(Resource.RISK, Action.CREATE)
  async createRisk(@Body() dto: CreateRiskDto, @User() user: UserContext) {
    return this.riskService.create(user.organizationId, dto, user.userId, user.email);
  }

  @Put(':id')
  @RequirePermission(Resource.RISK, Action.UPDATE)
  async updateRisk(@Param('id') id: string, @Body() dto: UpdateRiskDto, @User() user: UserContext) {
    return this.riskService.update(id, user.organizationId, dto, user.userId, user.email);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Resource.RISK, Action.DELETE)
  async deleteRisk(@Param('id') id: string, @User() user: UserContext) {
    await this.riskService.delete(id, user.organizationId, user.userId, user.email);
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
    @User() user: UserContext
  ) {
    return this.riskService.validateRisk(id, user.organizationId, dto, user.userId, user.email);
  }

  // Start risk assessment (Actual Risk -> Risk Analysis In Progress)
  @Post(':id/start-assessment')
  @RequirePermission(Resource.RISK, Action.UPDATE)
  async startAssessment(
    @Param('id') id: string,
    @Body() body: { riskAssessorId: string },
    @User() user: UserContext
  ) {
    return this.riskService.startAssessment(
      id,
      user.organizationId,
      body.riskAssessorId,
      user.userId,
      user.email
    );
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
    @User() user: UserContext
  ) {
    return this.riskService.submitAssessment(id, user.organizationId, dto, user.userId, user.email);
  }

  // GRC SME reviews assessment (approve or decline)
  @Post(':id/assessment/review')
  @RequirePermission(Resource.RISK, Action.UPDATE)
  async reviewAssessment(
    @Param('id') id: string,
    @Body() dto: ReviewAssessmentDto,
    @User() user: UserContext
  ) {
    return this.riskService.reviewAssessment(id, user.organizationId, dto, user.userId, user.email);
  }

  // GRC SME completes revision
  @Post(':id/assessment/revision')
  @RequirePermission(Resource.RISK, Action.UPDATE)
  async completeRevision(
    @Param('id') id: string,
    @Body() dto: ReviseAssessmentDto,
    @User() user: UserContext
  ) {
    return this.riskService.completeRevision(id, user.organizationId, dto, user.userId, user.email);
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
    @User() user: UserContext
  ) {
    return this.riskService.submitTreatmentDecision(
      id,
      user.organizationId,
      dto,
      user.userId,
      user.email
    );
  }

  // GRC SME assigns executive approver
  @Post(':id/treatment/assign-approver')
  @RequirePermission(Resource.RISK, Action.UPDATE)
  async assignExecutiveApprover(
    @Param('id') id: string,
    @Body() dto: AssignExecutiveApproverDto,
    @User() user: UserContext
  ) {
    return this.riskService.assignExecutiveApprover(
      id,
      user.organizationId,
      dto,
      user.userId,
      user.email
    );
  }

  // Executive approves or denies
  @Post(':id/treatment/executive-approval')
  @RequirePermission(Resource.RISK, Action.UPDATE)
  async submitExecutiveApproval(
    @Param('id') id: string,
    @Body() dto: ExecutiveApprovalDto,
    @User() user: UserContext
  ) {
    return this.riskService.submitExecutiveApproval(
      id,
      user.organizationId,
      dto,
      user.userId,
      user.email
    );
  }

  // Risk Owner updates mitigation status
  @Post(':id/treatment/mitigation-update')
  @RequirePermission(Resource.RISK, Action.UPDATE)
  async updateMitigationStatus(
    @Param('id') id: string,
    @Body() dto: UpdateMitigationStatusDto,
    @User() user: UserContext
  ) {
    return this.riskService.updateMitigationStatus(
      id,
      user.organizationId,
      dto,
      user.userId,
      user.email
    );
  }

  // Legacy treatment update (backwards compatibility)
  @Put(':id/treatment')
  async updateTreatment(
    @Param('id') id: string,
    @Body() dto: UpdateTreatmentDto,
    @User() user: UserContext
  ) {
    return this.riskService.updateTreatment(id, user.organizationId, dto, user.userId, user.email);
  }

  // Mark risk as reviewed
  @Post(':id/review')
  async markReviewed(
    @Param('id') id: string,
    @Body() body: { notes?: string },
    @User() user: UserContext
  ) {
    return this.riskService.markReviewed(
      id,
      user.organizationId,
      user.userId,
      user.email,
      body.notes
    );
  }

  // ===========================
  // Risk-Asset Linking
  // ===========================

  @Post(':id/assets')
  @HttpCode(HttpStatus.CREATED)
  async linkAssets(@Param('id') id: string, @Body() dto: LinkAssetsDto, @User() user: UserContext) {
    await this.riskService.linkAssets(
      id,
      user.organizationId,
      dto.assetIds,
      user.userId,
      user.email
    );
    return { success: true };
  }

  @Delete(':id/assets/:assetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlinkAsset(
    @Param('id') id: string,
    @Param('assetId') assetId: string,
    @User() user: UserContext
  ) {
    await this.riskService.unlinkAsset(id, assetId, user.organizationId, user.userId, user.email);
  }

  // ===========================
  // Risk-Control Linking
  // ===========================

  @Post(':id/controls')
  @HttpCode(HttpStatus.CREATED)
  async linkControl(
    @Param('id') id: string,
    @Body() dto: LinkControlDto,
    @User() user: UserContext
  ) {
    await this.riskService.linkControl(id, user.organizationId, dto, user.userId, user.email);
    return { success: true };
  }

  @Put(':id/controls/:controlId')
  async updateControlEffectiveness(
    @Param('id') id: string,
    @Param('controlId') controlId: string,
    @Body() dto: UpdateControlEffectivenessDto,
    @User() user: UserContext
  ) {
    await this.riskService.updateControlEffectiveness(
      id,
      controlId,
      user.organizationId,
      dto,
      user.userId,
      user.email
    );
    return { success: true };
  }

  @Delete(':id/controls/:controlId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlinkControl(
    @Param('id') id: string,
    @Param('controlId') controlId: string,
    @User() user: UserContext
  ) {
    await this.riskService.unlinkControl(
      id,
      controlId,
      user.organizationId,
      user.userId,
      user.email
    );
  }

  // ===========================
  // Risk Scenarios
  // ===========================

  @Get(':id/scenarios')
  async getScenarios(@Param('id') id: string, @User() user: UserContext) {
    return this.riskService.getScenarios(id, user.organizationId);
  }

  @Post(':id/scenarios')
  async createScenario(
    @Param('id') id: string,
    @Body() dto: CreateScenarioDto,
    @User() user: UserContext
  ) {
    return this.riskService.createScenario(id, user.organizationId, dto, user.userId, user.email);
  }

  @Put(':id/scenarios/:scenarioId')
  async updateScenario(
    @Param('id') id: string,
    @Param('scenarioId') scenarioId: string,
    @Body() dto: UpdateScenarioDto,
    @User() user: UserContext
  ) {
    return this.riskService.updateScenario(
      id,
      scenarioId,
      user.organizationId,
      dto,
      user.userId,
      user.email
    );
  }

  @Delete(':id/scenarios/:scenarioId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteScenario(
    @Param('id') id: string,
    @Param('scenarioId') scenarioId: string,
    @User() user: UserContext
  ) {
    await this.riskService.deleteScenario(
      id,
      scenarioId,
      user.organizationId,
      user.userId,
      user.email
    );
  }
}
