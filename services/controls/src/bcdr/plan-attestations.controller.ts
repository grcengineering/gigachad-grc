import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PlanAttestationsService } from './plan-attestations.service';
import {
  RequestAttestationDto,
  SubmitAttestationDto,
  AttestationFilterDto,
} from './dto/bcdr.dto';
import { AuthGuard } from '../auth/auth.guard';
import { TenantScopeGuard } from '../common/tenant-scope.guard';

/**
 * Controller for BC/DR plan attestation endpoints.
 *
 * Provides REST API endpoints for managing plan attestations,
 * including requesting, submitting, and viewing attestation history.
 *
 * @tags BC/DR, Attestations
 */
@ApiTags('BC/DR Attestations')
@ApiBearerAuth()
@Controller('bcdr')
@UseGuards(AuthGuard, TenantScopeGuard)
export class PlanAttestationsController {
  constructor(private readonly attestationsService: PlanAttestationsService) {}

  /**
   * Request attestation from plan owner
   */
  @Post('plans/:planId/attestations/request')
  @ApiOperation({ summary: 'Request plan attestation from owner' })
  @ApiParam({ name: 'planId', description: 'BC/DR Plan ID' })
  @ApiResponse({ status: 201, description: 'Attestation request created' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async requestAttestation(
    @Param('planId') planId: string,
    @Body() dto: RequestAttestationDto,
    @Req() req: any,
  ) {
    return this.attestationsService.requestAttestation(
      req.organizationId,
      planId,
      req.userId,
      dto,
      req.userEmail,
      req.userName,
    );
  }

  /**
   * Submit attestation response (attest or decline)
   */
  @Post('attestations/:id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit attestation response' })
  @ApiParam({ name: 'id', description: 'Attestation ID' })
  @ApiResponse({ status: 200, description: 'Attestation submitted' })
  @ApiResponse({ status: 400, description: 'Invalid submission or already completed' })
  @ApiResponse({ status: 404, description: 'Attestation not found' })
  async submitAttestation(
    @Param('id') id: string,
    @Body() dto: SubmitAttestationDto,
    @Req() req: any,
  ) {
    return this.attestationsService.submitAttestation(
      id,
      req.userId,
      dto,
      req.userEmail,
      req.userName,
    );
  }

  /**
   * Get attestation history for a plan
   */
  @Get('plans/:planId/attestations')
  @ApiOperation({ summary: 'Get attestation history for a plan' })
  @ApiParam({ name: 'planId', description: 'BC/DR Plan ID' })
  @ApiResponse({ status: 200, description: 'Attestation history' })
  async getAttestationHistory(
    @Param('planId') planId: string,
    @Req() req: any,
  ) {
    return this.attestationsService.getAttestationHistory(
      planId,
      req.organizationId,
    );
  }

  /**
   * Get pending attestations for current user
   */
  @Get('attestations/pending')
  @ApiOperation({ summary: 'Get pending attestations for current user' })
  @ApiResponse({ status: 200, description: 'List of pending attestations' })
  async getPendingAttestations(@Req() req: any) {
    return this.attestationsService.getPendingAttestations(
      req.userId,
      req.organizationId,
    );
  }

  /**
   * Get single attestation by ID
   */
  @Get('attestations/:id')
  @ApiOperation({ summary: 'Get attestation details' })
  @ApiParam({ name: 'id', description: 'Attestation ID' })
  @ApiResponse({ status: 200, description: 'Attestation details' })
  @ApiResponse({ status: 404, description: 'Attestation not found' })
  async getAttestation(@Param('id') id: string) {
    return this.attestationsService.findOne(id);
  }

  /**
   * List all attestations with filters
   */
  @Get('attestations')
  @ApiOperation({ summary: 'List all attestations' })
  @ApiResponse({ status: 200, description: 'Paginated attestation list' })
  async listAttestations(
    @Query() filters: AttestationFilterDto,
    @Req() req: any,
  ) {
    return this.attestationsService.findAll(req.organizationId, filters);
  }

  /**
   * Get attestation statistics for dashboard
   */
  @Get('attestations/stats')
  @ApiOperation({ summary: 'Get attestation statistics' })
  @ApiResponse({ status: 200, description: 'Attestation statistics' })
  async getAttestationStats(@Req() req: any) {
    return this.attestationsService.getStats(req.organizationId);
  }
}
