import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Action, Resource } from '../permissions/dto/permission.dto';
import { FrameworkCatalogService } from './catalog.service';

interface AuthenticatedRequest extends Request {
  user: { userId: string; organizationId: string; email?: string };
}

@Controller('api/frameworks/catalog')
@UseGuards(DevAuthGuard, PermissionGuard)
export class FrameworkCatalogController {
  constructor(private readonly catalogService: FrameworkCatalogService) {}

  /**
   * List all available frameworks in the catalog
   */
  @Get()
  @RequirePermission(Resource.FRAMEWORKS, Action.READ)
  listCatalogFrameworks() {
    return this.catalogService.listAvailableFrameworks();
  }

  /**
   * Get catalog status - which frameworks are activated for the organization
   */
  @Get('status')
  @RequirePermission(Resource.FRAMEWORKS, Action.READ)
  async getCatalogStatus(@Req() req: AuthenticatedRequest) {
    return this.catalogService.getCatalogStatus(req.user.organizationId);
  }

  /**
   * Get detailed framework with all requirements (preview before activation)
   */
  @Get(':catalogId')
  @RequirePermission(Resource.FRAMEWORKS, Action.READ)
  getFrameworkDetails(@Param('catalogId') catalogId: string) {
    return this.catalogService.getFrameworkDetails(catalogId);
  }

  /**
   * Activate a framework from the catalog for the organization
   */
  @Post(':catalogId/activate')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(Resource.FRAMEWORKS, Action.CREATE)
  async activateFramework(@Param('catalogId') catalogId: string, @Req() req: AuthenticatedRequest) {
    return this.catalogService.activateFramework(
      req.user.organizationId,
      catalogId,
      req.user.userId
    );
  }

  /**
   * Get all activated frameworks for the organization
   */
  @Get('activated/list')
  @RequirePermission(Resource.FRAMEWORKS, Action.READ)
  async getActivatedFrameworks(@Req() req: AuthenticatedRequest) {
    return this.catalogService.getActivatedFrameworks(req.user.organizationId);
  }

  /**
   * Check if a specific framework is activated
   */
  @Get(':catalogId/status')
  @RequirePermission(Resource.FRAMEWORKS, Action.READ)
  async isFrameworkActivated(
    @Param('catalogId') catalogId: string,
    @Req() req: AuthenticatedRequest
  ) {
    const isActivated = await this.catalogService.isFrameworkActivated(
      req.user.organizationId,
      catalogId
    );
    return { catalogId, isActivated };
  }

  /**
   * Deactivate a framework (soft-delete)
   */
  @Delete(':frameworkId/deactivate')
  @RequirePermission(Resource.FRAMEWORKS, Action.DELETE)
  async deactivateFramework(
    @Param('frameworkId') frameworkId: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.catalogService.deactivateFramework(
      req.user.organizationId,
      frameworkId,
      req.user.userId
    );
  }
}
