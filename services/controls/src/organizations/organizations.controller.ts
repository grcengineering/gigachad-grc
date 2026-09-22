import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Action, Resource } from '../permissions/dto/permission.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    organizationId: string;
  };
}

@ApiTags('organization')
@ApiBearerAuth()
@Controller('api/organization')
@UseGuards(DevAuthGuard, PermissionGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get the current organization profile and settings' })
  @RequirePermission(Resource.SETTINGS, Action.READ)
  getCurrent(@Req() req: AuthenticatedRequest) {
    return this.organizationsService.getCurrent(req.user.organizationId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update the current organization profile and settings' })
  @RequirePermission(Resource.SETTINGS, Action.UPDATE)
  updateCurrent(@Req() req: AuthenticatedRequest, @Body() dto: UpdateOrganizationDto) {
    return this.organizationsService.updateCurrent(req.user.organizationId, req.user.userId, dto);
  }
}
