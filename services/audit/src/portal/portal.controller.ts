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
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PortalService } from './portal.service';
import {
  PortalLoginDto,
  CreatePortalUserDto,
  UpdatePortalUserDto,
} from './dto/portal.dto';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api')
export class PortalController {
  constructor(
    private readonly portalService: PortalService,
    private readonly prisma: PrismaService,
  ) {}

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

  // ===========================
  // Portal Data Endpoints (Portal Authenticated)
  // ===========================

  /**
   * Validate portal access code and return session info
   */
  private async validatePortalAccess(accessCode: string, req: Request) {
    if (!accessCode) {
      throw new UnauthorizedException('Access code required');
    }
    
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];
    
    // This reuses the authenticate method which already validates the access code
    return this.portalService.authenticate({ accessCode }, ipAddress, userAgent);
  }

  /**
   * Get audit requests for portal user
   */
  @Get('audit-portal/requests')
  async getPortalRequests(
    @Headers('x-portal-access-code') accessCode: string,
    @Req() req: Request,
    @Query('status') status?: string,
  ) {
    const session = await this.validatePortalAccess(accessCode, req);
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];

    // Log access
    await this.portalService.logAccess(
      session.auditId,
      session.portalUserId !== 'legacy' ? session.portalUserId : null,
      accessCode,
      'view_requests',
      ipAddress,
      userAgent,
      true,
    );

    // Get requests for this audit
    const requests = await this.prisma.auditRequest.findMany({
      where: {
        auditId: session.auditId,
        deletedAt: null,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        assignedToUser: { select: { displayName: true, email: true } },
      },
    });

    return {
      success: true,
      data: requests.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        status: r.status,
        dueDate: r.dueDate?.toISOString(),
        priority: r.priority,
        createdAt: r.createdAt.toISOString(),
        controlId: r.controlId,
        requirementRef: r.requirementRef,
        assignee: r.assignedToUser ? {
          name: r.assignedToUser.displayName,
          email: r.assignedToUser.email,
        } : null,
      })),
    };
  }

  /**
   * Get a specific request by ID
   */
  @Get('audit-portal/requests/:requestId')
  async getPortalRequest(
    @Headers('x-portal-access-code') accessCode: string,
    @Param('requestId') requestId: string,
    @Req() req: Request,
  ) {
    const session = await this.validatePortalAccess(accessCode, req);
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];

    const request = await this.prisma.auditRequest.findFirst({
      where: { id: requestId, auditId: session.auditId, deletedAt: null },
      include: {
        assignedToUser: { select: { displayName: true, email: true } },
        evidence: true,
        comments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    }) as any;

    if (!request) {
      throw new UnauthorizedException('Request not found');
    }

    await this.portalService.logAccess(
      session.auditId,
      session.portalUserId !== 'legacy' ? session.portalUserId : null,
      accessCode,
      'view_request_detail',
      ipAddress,
      userAgent,
      true,
      `Viewed request: ${request.title}`,
    );

    return {
      success: true,
      data: {
        id: request.id,
        title: request.title,
        description: request.description,
        status: request.status,
        dueDate: request.dueDate?.toISOString(),
        priority: request.priority,
        createdAt: request.createdAt.toISOString(),
        controlId: request.controlId,
        requirementRef: request.requirementRef,
        assignee: request.assignedToUser ? {
          name: request.assignedToUser.displayName,
          email: request.assignedToUser.email,
        } : null,
        evidence: (request.evidence || []).map((e: any) => ({
          id: e.id,
          title: e.title,
          fileName: e.filename,
          fileSize: e.size,
          uploadedAt: e.createdAt?.toISOString(),
          status: e.reviewStatus,
        })),
        comments: (request.comments || []).map((c: any) => ({
          id: c.id,
          content: c.content,
          createdAt: c.createdAt?.toISOString(),
          author: { name: c.authorName },
        })),
      },
    };
  }

  /**
   * Get evidence for a request
   */
  @Get('audit-portal/requests/:requestId/evidence')
  async getPortalEvidence(
    @Headers('x-portal-access-code') accessCode: string,
    @Param('requestId') requestId: string,
    @Req() req: Request,
  ) {
    const session = await this.validatePortalAccess(accessCode, req);
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];

    const request = await this.prisma.auditRequest.findFirst({
      where: { id: requestId, auditId: session.auditId, deletedAt: null },
      include: {
        evidence: true,
      },
    }) as any;

    if (!request) {
      throw new UnauthorizedException('Request not found');
    }

    await this.portalService.logAccess(
      session.auditId,
      session.portalUserId !== 'legacy' ? session.portalUserId : null,
      accessCode,
      'view_evidence',
      ipAddress,
      userAgent,
      true,
    );

    return {
      success: true,
      data: (request.evidence || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        fileName: e.filename,
        fileSize: e.size,
        fileType: e.mimeType,
        status: e.reviewStatus,
        uploadedAt: e.createdAt?.toISOString(),
        uploadedBy: e.uploadedBy,
      })),
    };
  }

  /**
   * Post a comment on a request
   */
  @Post('audit-portal/requests/:requestId/comments')
  async addPortalComment(
    @Headers('x-portal-access-code') accessCode: string,
    @Param('requestId') requestId: string,
    @Body() body: { content: string },
    @Req() req: Request,
  ) {
    const session = await this.validatePortalAccess(accessCode, req);
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];

    // Check if user has comment permission
    if (!session.permissions.canComment) {
      throw new UnauthorizedException('You do not have permission to comment');
    }

    const request = await this.prisma.auditRequest.findFirst({
      where: { id: requestId, auditId: session.auditId, deletedAt: null },
    });

    if (!request) {
      throw new UnauthorizedException('Request not found');
    }

    // Get the portal user ID or use a fallback for legacy
    const portalUserId = session.portalUserId !== 'legacy' ? session.portalUserId : null;
    
    // Create comment from external auditor
    const comment = await this.prisma.auditRequestComment.create({
      data: {
        request: { connect: { id: requestId } },
        content: body.content,
        authorType: 'external_auditor',
        authorId: portalUserId,
        authorName: session.auditorName,
        isInternal: false,
      },
    });

    await this.portalService.logAccess(
      session.auditId,
      portalUserId,
      accessCode,
      'add_comment',
      ipAddress,
      userAgent,
      true,
      `Added comment on request: ${request.title}`,
    );

    return {
      success: true,
      data: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        author: { name: session.auditorName, email: session.auditorEmail },
      },
    };
  }

  /**
   * Get comments for a request
   */
  @Get('audit-portal/requests/:requestId/comments')
  async getPortalComments(
    @Headers('x-portal-access-code') accessCode: string,
    @Param('requestId') requestId: string,
    @Req() req: Request,
  ) {
    const session = await this.validatePortalAccess(accessCode, req);
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];

    const request = await this.prisma.auditRequest.findFirst({
      where: { id: requestId, auditId: session.auditId, deletedAt: null },
      include: {
        comments: {
          where: { isInternal: false }, // Only show non-internal comments to auditors
          orderBy: { createdAt: 'asc' },
        },
      },
    }) as any;

    if (!request) {
      throw new UnauthorizedException('Request not found');
    }

    await this.portalService.logAccess(
      session.auditId,
      session.portalUserId !== 'legacy' ? session.portalUserId : null,
      accessCode,
      'view_comments',
      ipAddress,
      userAgent,
      true,
    );

    return {
      success: true,
      data: (request.comments || []).map((c: any) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt?.toISOString(),
        author: { name: c.authorName },
      })),
    };
  }
}
