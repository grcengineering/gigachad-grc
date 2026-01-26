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
import { ApiKeysService } from './api-keys.service';
import {
  CreateApiKeyDto,
  UpdateApiKeyDto,
  ApiKeyFilterDto,
  API_KEY_SCOPES,
} from './dto/api-key.dto';
import { PermissionGuard } from '../auth/permission.guard';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Resource, Action } from '../permissions/dto/permission.dto';
import { PaginationLimitPipe, PaginationPagePipe } from '../common/pagination.pipe';

@Controller('api/api-keys')
@UseGuards(DevAuthGuard, PermissionGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  /**
   * List all API keys for the organization
   */
  @Get()
  @RequirePermission(Resource.SETTINGS, Action.READ)
  async listApiKeys(
    @Query() filters: ApiKeyFilterDto,
    @Query('page', new PaginationPagePipe()) page: number,
    @Query('limit', new PaginationLimitPipe({ default: 50 })) limit: number,
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    return this.apiKeysService.findAll(orgId, filters, page, limit);
  }

  /**
   * Get API key statistics
   */
  @Get('stats')
  @RequirePermission(Resource.SETTINGS, Action.READ)
  async getApiKeyStats(
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    return this.apiKeysService.getStats(orgId);
  }

  /**
   * Get available scopes
   */
  @Get('scopes')
  @RequirePermission(Resource.SETTINGS, Action.READ)
  async getAvailableScopes() {
    return {
      scopes: API_KEY_SCOPES,
    };
  }

  /**
   * Get a single API key by ID
   */
  @Get(':id')
  @RequirePermission(Resource.SETTINGS, Action.READ)
  async getApiKey(
    @Param('id') id: string,
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    return this.apiKeysService.findOne(id, orgId);
  }

  /**
   * Create a new API key
   * The full key is only returned once - store it securely
   */
  @Post()
  @RequirePermission(Resource.SETTINGS, Action.CREATE)
  async createApiKey(
    @Body() dto: CreateApiKeyDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') actorId: string,
    @Headers('x-user-email') actorEmail?: string,
  ) {
    return this.apiKeysService.create(orgId, dto, actorId, actorEmail);
  }

  /**
   * Update an API key
   */
  @Put(':id')
  @RequirePermission(Resource.SETTINGS, Action.UPDATE)
  async updateApiKey(
    @Param('id') id: string,
    @Body() dto: UpdateApiKeyDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') actorId?: string,
    @Headers('x-user-email') actorEmail?: string,
  ) {
    return this.apiKeysService.update(id, orgId, dto, actorId, actorEmail);
  }

  /**
   * Revoke an API key (deactivate without deleting)
   */
  @Post(':id/revoke')
  @RequirePermission(Resource.SETTINGS, Action.UPDATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeApiKey(
    @Param('id') id: string,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') actorId?: string,
    @Headers('x-user-email') actorEmail?: string,
  ) {
    await this.apiKeysService.revoke(id, orgId, actorId, actorEmail);
  }

  /**
   * Regenerate an API key
   * Creates a new key value, invalidating the old one
   * The new key is only returned once
   */
  @Post(':id/regenerate')
  @RequirePermission(Resource.SETTINGS, Action.UPDATE)
  async regenerateApiKey(
    @Param('id') id: string,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') actorId?: string,
    @Headers('x-user-email') actorEmail?: string,
  ) {
    return this.apiKeysService.regenerate(id, orgId, actorId, actorEmail);
  }

  /**
   * Delete an API key permanently
   */
  @Delete(':id')
  @RequirePermission(Resource.SETTINGS, Action.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteApiKey(
    @Param('id') id: string,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') actorId?: string,
    @Headers('x-user-email') actorEmail?: string,
  ) {
    await this.apiKeysService.delete(id, orgId, actorId, actorEmail);
  }
}
