import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { WorkpapersService, CreateWorkpaperDto, UpdateWorkpaperDto } from './workpapers.service';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { Roles, RolesGuard } from '@gigachad-grc/shared';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    organizationId: string;
  };
}

@ApiTags('Audit Workpapers')
@ApiBearerAuth()
@UseGuards(DevAuthGuard, RolesGuard)
@Controller('api/audit/workpapers')
export class WorkpapersController {
  constructor(private readonly workpapersService: WorkpapersService) {}

  @Post()
  @Roles('admin', 'compliance_manager', 'auditor')
  @ApiOperation({ summary: 'Create a workpaper' })
  create(@Body() dto: CreateWorkpaperDto, @Req() req: AuthenticatedRequest) {
    return this.workpapersService.create(req.user.organizationId, dto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List workpapers' })
  findAll(@Query('auditId') auditId: string, @Req() req: AuthenticatedRequest) {
    return this.workpapersService.findAll(req.user.organizationId, auditId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a workpaper' })
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.workpapersService.findOne(id, req.user.organizationId);
  }

  @Put(':id')
  @Roles('admin', 'compliance_manager', 'auditor')
  @ApiOperation({ summary: 'Update a workpaper' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkpaperDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.workpapersService.update(id, req.user.organizationId, dto, req.user.userId);
  }

  @Post(':id/submit')
  @Roles('admin', 'compliance_manager', 'auditor')
  @ApiOperation({ summary: 'Submit workpaper for review' })
  submit(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.workpapersService.submitForReview(id, req.user.organizationId, req.user.userId);
  }

  @Post(':id/review')
  @Roles('admin', 'compliance_manager', 'auditor')
  @ApiOperation({ summary: 'Review a workpaper' })
  review(
    @Param('id') id: string,
    @Body() body: { approved: boolean; notes: string },
    @Req() req: AuthenticatedRequest
  ) {
    return this.workpapersService.review(
      id,
      req.user.organizationId,
      body.approved,
      body.notes,
      req.user.userId
    );
  }

  @Post(':id/approve')
  @Roles('admin', 'compliance_manager', 'auditor')
  @ApiOperation({ summary: 'Approve a workpaper' })
  approve(
    @Param('id') id: string,
    @Body() body: { notes?: string },
    @Req() req: AuthenticatedRequest
  ) {
    return this.workpapersService.approve(
      id,
      req.user.organizationId,
      body.notes || '',
      req.user.userId
    );
  }

  @Delete(':id')
  @Roles('admin', 'compliance_manager', 'auditor')
  @ApiOperation({ summary: 'Delete a workpaper' })
  delete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.workpapersService.delete(id, req.user.organizationId);
  }
}
