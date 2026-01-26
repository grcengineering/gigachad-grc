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
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PortalService } from './portal.service';
import {
  PortalLoginDto,
  CreatePortalUserDto,
  UpdatePortalUserDto,
} from './dto/portal.dto';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@Controller('api')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  /**
   * Get client IP from request
   */
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string') {
      return realIp;
    }
    return req.ip || req.socket.remoteAddress || '0.0.0.0';
  }

  // ===========================
  // Portal Authentication (Public)
  // ===========================

  /**
   * Authenticate with access code
   */
  @Post('audit-portal/auth')
  async authenticate(
    @Body() dto: PortalLoginDto,
    @Req() req: Request,
  ) {
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];
    return this.portalService.authenticate(dto, ipAddress, userAgent);
  }

  /**
   * Refresh portal session
   */
  @Post('audit-portal/auth/refresh')
  async refreshSession(
    @Body() dto: PortalLoginDto,
    @Req() req: Request,
  ) {
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];
    return this.portalService.authenticate(dto, ipAddress, userAgent);
  }

  // ===========================
  // Portal User Management (Admin)
  // ===========================

  /**
   * List portal users for an audit
   */
  @Get('audits/:auditId/portal/users')
  @UseGuards(DevAuthGuard)
  async listPortalUsers(
    @Param('auditId') auditId: string,
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    return this.portalService.listPortalUsers(auditId, orgId);
  }

  /**
   * Create a new portal user
   */
  @Post('audits/:auditId/portal/users')
  @UseGuards(DevAuthGuard)
  async createPortalUser(
    @Param('auditId') auditId: string,
    @Body() dto: CreatePortalUserDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') actorId: string,
  ) {
    return this.portalService.createPortalUser(auditId, orgId, dto, actorId);
  }

  /**
   * Update a portal user
   */
  @Put('audits/:auditId/portal/users/:userId')
  @UseGuards(DevAuthGuard)
  async updatePortalUser(
    @Param('auditId') auditId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdatePortalUserDto,
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    return this.portalService.updatePortalUser(auditId, userId, orgId, dto);
  }

  /**
   * Delete a portal user
   */
  @Delete('audits/:auditId/portal/users/:userId')
  @UseGuards(DevAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePortalUser(
    @Param('auditId') auditId: string,
    @Param('userId') userId: string,
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    await this.portalService.deletePortalUser(auditId, userId, orgId);
  }

  /**
   * Get access logs for an audit
   */
  @Get('audits/:auditId/portal/logs')
  @UseGuards(DevAuthGuard)
  async getAccessLogs(
    @Param('auditId') auditId: string,
    @Query('limit') limit: string = '100',
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    return this.portalService.getAccessLogs(auditId, orgId, parseInt(limit, 10));
  }

  /**
   * Bulk create portal users
   */
  @Post('audits/:auditId/portal/users/bulk')
  @UseGuards(DevAuthGuard)
  async bulkCreatePortalUsers(
    @Param('auditId') auditId: string,
    @Body() users: CreatePortalUserDto[],
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') actorId: string,
  ) {
    const results = [];
    for (const user of users) {
      try {
        const created = await this.portalService.createPortalUser(auditId, orgId, user, actorId);
        results.push({ success: true, user: created });
      } catch (error: any) {
        results.push({ success: false, email: user.email, error: error.message });
      }
    }
    return {
      created: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }
}
