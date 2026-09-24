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
import { VendorsService } from './vendors.service';
import { VendorAIService, SOC2AnalysisResult } from '../ai/vendor-ai.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { CurrentUser, UserContext, Roles, RolesGuard } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@Controller('api/vendors')
@UseGuards(DevAuthGuard, RolesGuard)
export class VendorsController {
  constructor(
    private readonly vendorsService: VendorsService,
    private readonly vendorAIService: VendorAIService
  ) {}

  @Post()
  @Roles('admin', 'compliance_manager', 'tprm_manager', 'auditor')
  create(@Body() createVendorDto: CreateVendorDto, @CurrentUser() user: UserContext) {
    return this.vendorsService.create(createVendorDto, user.userId, user.organizationId);
  }

  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('tier') tier?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @CurrentUser() user?: UserContext
  ) {
    // SECURITY: Include organizationId to ensure tenant isolation (IDOR prevention)
    return this.vendorsService.findAll({
      category,
      tier,
      status,
      search,
      organizationId: user?.organizationId,
    });
  }

  @Get('dashboard-stats')
  getDashboardStats(@CurrentUser() user: UserContext) {
    // SECURITY: Pass organizationId to ensure tenant isolation (IDOR prevention)
    return this.vendorsService.getDashboardStats(user.organizationId);
  }

  @Get('reviews-due')
  getVendorsDueForReview(@CurrentUser() user: UserContext) {
    return this.vendorsService.getVendorsDueForReview(user.organizationId);
  }

  @Patch(':id/complete-review')
  @Roles('admin', 'compliance_manager', 'tprm_manager', 'auditor')
  completeReview(@Param('id') id: string, @CurrentUser() user: UserContext) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.vendorsService.updateReviewDates(id, user.userId, user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UserContext) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.vendorsService.findOne(id, user.organizationId);
  }

  @Patch(':id')
  @Roles('admin', 'compliance_manager', 'tprm_manager', 'auditor')
  update(
    @Param('id') id: string,
    @Body() updateVendorDto: UpdateVendorDto,
    @CurrentUser() user: UserContext
  ) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.vendorsService.update(id, updateVendorDto, user.userId, user.organizationId);
  }

  @Patch(':id/risk-score')
  @Roles('admin', 'compliance_manager', 'tprm_manager', 'auditor')
  updateRiskScore(
    @Param('id') id: string,
    @Body('inherentRiskScore') inherentRiskScore: string,
    @CurrentUser() user: UserContext
  ) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.vendorsService.updateRiskScore(
      id,
      inherentRiskScore,
      user.userId,
      user.organizationId
    );
  }

  @Delete(':id')
  @Roles('admin', 'compliance_manager', 'tprm_manager', 'auditor')
  remove(@Param('id') id: string, @CurrentUser() user: UserContext) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.vendorsService.remove(id, user.userId, user.organizationId);
  }

  // ============================================
  // AI Analysis Endpoints
  // ============================================

  @Post(':vendorId/documents/:documentId/analyze')
  @Roles('admin', 'compliance_manager', 'tprm_manager', 'auditor')
  analyzeDocument(
    @Param('vendorId') vendorId: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: UserContext
  ) {
    return this.vendorAIService.analyzeSOC2Report(
      vendorId,
      documentId,
      user.userId,
      user.organizationId
    );
  }

  @Get(':vendorId/documents/:documentId/analysis')
  getDocumentAnalysis(@Param('documentId') documentId: string, @CurrentUser() user: UserContext) {
    // SECURITY: Pass organizationId to ensure tenant isolation (IDOR prevention)
    return this.vendorAIService.getPreviousAnalysis(documentId, user.organizationId);
  }

  @Post(':vendorId/documents/:documentId/create-assessment')
  @Roles('admin', 'compliance_manager', 'tprm_manager', 'auditor')
  createAssessmentFromAnalysis(
    @Param('vendorId') vendorId: string,
    @Param('documentId') _documentId: string,
    @Body() analysis: SOC2AnalysisResult,
    @CurrentUser() user: UserContext
  ) {
    return this.vendorAIService.createAssessmentFromAnalysis(
      vendorId,
      analysis,
      user.userId,
      user.organizationId
    );
  }
}
