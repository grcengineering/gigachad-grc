import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { ScimService } from './scim.service';
import {
  ScimUserResource,
  ScimGroupResource,
  ScimListResponse,
  CreateScimUserDto,
  UpdateScimUserDto,
  CreateScimGroupDto,
  UpdateScimGroupDto,
  PatchScimDto,
  ScimQueryDto,
} from './dto/scim.dto';
import { ConfigService } from '@nestjs/config';

/**
 * SCIM 2.0 API Controller
 * 
 * Implements RFC 7643 (SCIM Core Schema) and RFC 7644 (SCIM Protocol)
 * 
 * Authentication: Bearer token in Authorization header
 * The token should be configured per-organization in the SCIM settings
 */
@ApiTags('SCIM 2.0')
@ApiHeader({ name: 'Authorization', description: 'Bearer <SCIM_TOKEN>' })
@Controller('scim/v2')
export class ScimController {
  private readonly scimTokens: Map<string, string> = new Map();

  constructor(
    private readonly scimService: ScimService,
    private readonly configService: ConfigService,
  ) {
    // In production, tokens would be stored in database per-organization
    // For now, use environment variable
    const defaultToken = this.configService.get('SCIM_TOKEN') || 'scim-development-token';
    const defaultOrgId = this.configService.get('DEFAULT_ORG_ID') || 'org-1';
    this.scimTokens.set(defaultToken, defaultOrgId);
  }

  private validateToken(authHeader: string): string {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7);
    const organizationId = this.scimTokens.get(token);

    if (!organizationId) {
      throw new UnauthorizedException('Invalid SCIM token');
    }

    return organizationId;
  }

  // ==================== Users ====================

  @Get('Users')
  @ApiOperation({ summary: 'List users (SCIM)' })
  @ApiResponse({ status: 200, description: 'SCIM ListResponse' })
  async listUsers(
    @Headers('authorization') authHeader: string,
    @Query() query: ScimQueryDto,
  ): Promise<ScimListResponse<ScimUserResource>> {
    const organizationId = this.validateToken(authHeader);
    return this.scimService.listUsers(organizationId, query);
  }

  @Get('Users/:id')
  @ApiOperation({ summary: 'Get user by ID (SCIM)' })
  @ApiResponse({ status: 200, type: ScimUserResource })
  async getUser(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<ScimUserResource> {
    const organizationId = this.validateToken(authHeader);
    return this.scimService.getUser(organizationId, id);
  }

  @Post('Users')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create user (SCIM)' })
  @ApiResponse({ status: 201, type: ScimUserResource })
  async createUser(
    @Headers('authorization') authHeader: string,
    @Body() dto: CreateScimUserDto,
  ): Promise<ScimUserResource> {
    const organizationId = this.validateToken(authHeader);
    return this.scimService.createUser(organizationId, dto);
  }

  @Put('Users/:id')
  @ApiOperation({ summary: 'Replace user (SCIM)' })
  @ApiResponse({ status: 200, type: ScimUserResource })
  async updateUser(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() dto: UpdateScimUserDto,
  ): Promise<ScimUserResource> {
    const organizationId = this.validateToken(authHeader);
    return this.scimService.updateUser(organizationId, id, dto);
  }

  @Patch('Users/:id')
  @ApiOperation({ summary: 'Patch user (SCIM)' })
  @ApiResponse({ status: 200, type: ScimUserResource })
  async patchUser(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() dto: PatchScimDto,
  ): Promise<ScimUserResource> {
    const organizationId = this.validateToken(authHeader);
    return this.scimService.patchUser(organizationId, id, dto);
  }

  @Delete('Users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user (SCIM)' })
  @ApiResponse({ status: 204 })
  async deleteUser(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<void> {
    const organizationId = this.validateToken(authHeader);
    return this.scimService.deleteUser(organizationId, id);
  }

  // ==================== Groups ====================

  @Get('Groups')
  @ApiOperation({ summary: 'List groups (SCIM)' })
  @ApiResponse({ status: 200, description: 'SCIM ListResponse' })
  async listGroups(
    @Headers('authorization') authHeader: string,
    @Query() query: ScimQueryDto,
  ): Promise<ScimListResponse<ScimGroupResource>> {
    const organizationId = this.validateToken(authHeader);
    return this.scimService.listGroups(organizationId, query);
  }

  @Get('Groups/:id')
  @ApiOperation({ summary: 'Get group by ID (SCIM)' })
  @ApiResponse({ status: 200, type: ScimGroupResource })
  async getGroup(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<ScimGroupResource> {
    const organizationId = this.validateToken(authHeader);
    return this.scimService.getGroup(organizationId, id);
  }

  @Post('Groups')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create group (SCIM)' })
  @ApiResponse({ status: 201, type: ScimGroupResource })
  async createGroup(
    @Headers('authorization') authHeader: string,
    @Body() dto: CreateScimGroupDto,
  ): Promise<ScimGroupResource> {
    const organizationId = this.validateToken(authHeader);
    return this.scimService.createGroup(organizationId, dto);
  }

  @Put('Groups/:id')
  @ApiOperation({ summary: 'Replace group (SCIM)' })
  @ApiResponse({ status: 200, type: ScimGroupResource })
  async updateGroup(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() dto: UpdateScimGroupDto,
  ): Promise<ScimGroupResource> {
    const organizationId = this.validateToken(authHeader);
    return this.scimService.updateGroup(organizationId, id, dto);
  }

  @Patch('Groups/:id')
  @ApiOperation({ summary: 'Patch group (SCIM)' })
  @ApiResponse({ status: 200, type: ScimGroupResource })
  async patchGroup(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() dto: PatchScimDto,
  ): Promise<ScimGroupResource> {
    const organizationId = this.validateToken(authHeader);
    return this.scimService.patchGroup(organizationId, id, dto);
  }

  @Delete('Groups/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete group (SCIM)' })
  @ApiResponse({ status: 204 })
  async deleteGroup(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<void> {
    const organizationId = this.validateToken(authHeader);
    return this.scimService.deleteGroup(organizationId, id);
  }

  // ==================== Service Provider Config ====================

  @Get('ServiceProviderConfig')
  @ApiOperation({ summary: 'Get SCIM service provider configuration' })
  async getServiceProviderConfig() {
    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
      documentationUri: 'https://docs.gigachad-grc.io/scim',
      patch: { supported: true },
      bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
      filter: { supported: true, maxResults: 100 },
      changePassword: { supported: false },
      sort: { supported: true },
      etag: { supported: false },
      authenticationSchemes: [
        {
          type: 'oauthbearertoken',
          name: 'OAuth Bearer Token',
          description: 'Authentication scheme using the OAuth Bearer Token Standard',
          specUri: 'https://www.rfc-editor.org/rfc/rfc6750',
          primary: true,
        },
      ],
    };
  }

  @Get('Schemas')
  @ApiOperation({ summary: 'Get SCIM schemas' })
  async getSchemas() {
    return {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: 2,
      Resources: [
        {
          id: 'urn:ietf:params:scim:schemas:core:2.0:User',
          name: 'User',
          description: 'User Account',
        },
        {
          id: 'urn:ietf:params:scim:schemas:core:2.0:Group',
          name: 'Group',
          description: 'Group',
        },
      ],
    };
  }

  @Get('ResourceTypes')
  @ApiOperation({ summary: 'Get SCIM resource types' })
  async getResourceTypes() {
    return {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: 2,
      Resources: [
        {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
          id: 'User',
          name: 'User',
          endpoint: '/scim/v2/Users',
          schema: 'urn:ietf:params:scim:schemas:core:2.0:User',
        },
        {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
          id: 'Group',
          name: 'Group',
          endpoint: '/scim/v2/Groups',
          schema: 'urn:ietf:params:scim:schemas:core:2.0:Group',
        },
      ],
    };
  }
}
