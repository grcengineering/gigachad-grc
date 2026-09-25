import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { MCPClientService } from './mcp-client.service';
import { MCPCredentialsService } from './mcp-credentials.service';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Resource, Action } from '../permissions/dto/permission.dto';
import { CallToolDto, GetPromptDto, ReadResourceDto } from './dto/mcp.dto';
import { CurrentUser, UserContext } from '@gigachad-grc/shared';

@ApiTags('MCP Servers')
@ApiBearerAuth()
@Controller('api/mcp')
@UseGuards(DevAuthGuard, PermissionGuard)
export class MCPController {
  constructor(
    private readonly mcpClient: MCPClientService,
    private readonly credentialsService: MCPCredentialsService
  ) {}

  // ============================================
  // Server Management
  // ============================================

  @Get('servers')
  @ApiOperation({ summary: 'List all MCP servers and their status' })
  @ApiResponse({
    status: 200,
    description: 'List of servers',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          status: { type: 'string' },
          description: { type: 'string' },
        },
      },
    },
  })
  @RequirePermission(Resource.INTEGRATIONS, Action.READ)
  getServers(@CurrentUser() user: UserContext) {
    return this.mcpClient.getServers(user.organizationId);
  }

  @Get('servers/:serverId/status')
  @ApiOperation({ summary: 'Get detailed status of an MCP server' })
  @ApiParam({ name: 'serverId', description: 'Server ID' })
  @RequirePermission(Resource.INTEGRATIONS, Action.READ)
  getServerStatus(
    @Param('serverId') serverId: string,
    @CurrentUser() user: UserContext
  ) {
    const status = this.mcpClient.getServerStatus(serverId, user.organizationId);
    if (!status) {
      throw new NotFoundException('MCP server not found');
    }
    return {
      id: status.config.id,
      name: status.config.name,
      status: status.status,
      startedAt: status.startedAt,
      lastError: status.lastError,
      restartCount: status.restartCount,
      capabilities: status.config.capabilities,
    };
  }

  @Post('servers/:serverId/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start an MCP server' })
  @ApiParam({ name: 'serverId', description: 'Server ID' })
  @RequirePermission(Resource.INTEGRATIONS, Action.UPDATE)
  async startServer(
    @Param('serverId') serverId: string,
    @CurrentUser() user: UserContext
  ) {
    await this.mcpClient.startServer(serverId, user.organizationId);
    return { success: true, message: `Server ${serverId} started` };
  }

  @Post('servers/:serverId/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop an MCP server' })
  @ApiParam({ name: 'serverId', description: 'Server ID' })
  @RequirePermission(Resource.INTEGRATIONS, Action.UPDATE)
  async stopServer(
    @Param('serverId') serverId: string,
    @CurrentUser() user: UserContext
  ) {
    await this.mcpClient.stopServer(serverId, user.organizationId);
    return { success: true, message: `Server ${serverId} stopped` };
  }

  @Post('servers/:serverId/restart')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restart an MCP server' })
  @ApiParam({ name: 'serverId', description: 'Server ID' })
  @RequirePermission(Resource.INTEGRATIONS, Action.UPDATE)
  async restartServer(
    @Param('serverId') serverId: string,
    @CurrentUser() user: UserContext
  ) {
    await this.mcpClient.restartServer(serverId, user.organizationId);
    return { success: true, message: `Server ${serverId} restarted` };
  }

  @Get('servers/:serverId/credentials')
  @ApiOperation({ summary: 'Get masked organization credentials for an MCP server' })
  @RequirePermission(Resource.INTEGRATIONS, Action.READ)
  async getCredentials(
    @Param('serverId') serverId: string,
    @CurrentUser() user: UserContext
  ) {
    if (!this.mcpClient.getServerStatus(serverId, user.organizationId)) {
      throw new NotFoundException('MCP server not found');
    }
    return {
      configured: Boolean(
        await this.credentialsService.getCredentials(user.organizationId, serverId)
      ),
      env: await this.credentialsService.getMaskedCredentials(user.organizationId, serverId),
    };
  }

  @Put('servers/:serverId/credentials')
  @ApiOperation({ summary: 'Store encrypted organization credentials for an MCP server' })
  @RequirePermission(Resource.INTEGRATIONS, Action.UPDATE)
  async storeCredentials(
    @Param('serverId') serverId: string,
    @Body()
    body: {
      env: Record<string, string>;
      configuredIntegrations?: string[];
    },
    @CurrentUser() user: UserContext
  ) {
    const state = this.mcpClient.getServerStatus(serverId, user.organizationId);
    if (!state) throw new NotFoundException('MCP server not found');
    if (
      !body.env ||
      typeof body.env !== 'object' ||
      Array.isArray(body.env) ||
      Object.values(body.env).some((value) => typeof value !== 'string')
    ) {
      throw new BadRequestException('env must be an object containing string values');
    }
    await this.credentialsService.storeCredentials(
      user.organizationId,
      serverId,
      serverId,
      state.config.name,
      body.env || {},
      body.configuredIntegrations || [],
      user.userId
    );
    if (state.status === 'running') {
      await this.mcpClient.restartServer(serverId, user.organizationId);
    }
    return { success: true };
  }

  @Delete('servers/:serverId/credentials')
  @ApiOperation({ summary: 'Delete organization credentials for an MCP server' })
  @RequirePermission(Resource.INTEGRATIONS, Action.UPDATE)
  async deleteCredentials(
    @Param('serverId') serverId: string,
    @CurrentUser() user: UserContext
  ) {
    const state = this.mcpClient.getServerStatus(serverId, user.organizationId);
    if (!state) throw new NotFoundException('MCP server not found');
    await this.credentialsService.deleteCredentials(
      user.organizationId,
      user.userId,
      serverId
    );
    if (state.status === 'running') {
      await this.mcpClient.restartServer(serverId, user.organizationId);
    }
    return { success: true };
  }

  // ============================================
  // Tools
  // ============================================

  @Get('servers/:serverId/tools')
  @ApiOperation({ summary: 'List available tools for a server' })
  @ApiParam({ name: 'serverId', description: 'Server ID' })
  @RequirePermission(Resource.INTEGRATIONS, Action.READ)
  getServerTools(
    @Param('serverId') serverId: string,
    @CurrentUser() user: UserContext
  ) {
    return this.mcpClient.getTools(serverId, user.organizationId);
  }

  @Get('tools')
  @ApiOperation({ summary: 'List all available tools across all servers' })
  @RequirePermission(Resource.INTEGRATIONS, Action.READ)
  getAllTools(@CurrentUser() user: UserContext) {
    return this.mcpClient.getAllTools(user.organizationId);
  }

  @Post('servers/:serverId/tools/call')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Call a tool on an MCP server' })
  @ApiParam({ name: 'serverId', description: 'Server ID' })
  @ApiBody({ type: CallToolDto })
  @RequirePermission(Resource.INTEGRATIONS, Action.CREATE)
  async callTool(
    @Param('serverId') serverId: string,
    @Body() dto: CallToolDto,
    @CurrentUser() user: UserContext
  ) {
    const result = await this.mcpClient.callTool(
      serverId,
      dto.toolName,
      dto.params,
      user.organizationId
    );
    return { result };
  }

  // ============================================
  // Resources
  // ============================================

  @Get('servers/:serverId/resources')
  @ApiOperation({ summary: 'List resources from an MCP server' })
  @ApiParam({ name: 'serverId', description: 'Server ID' })
  @RequirePermission(Resource.INTEGRATIONS, Action.READ)
  async listResources(
    @Param('serverId') serverId: string,
    @CurrentUser() user: UserContext
  ) {
    return this.mcpClient.listResources(serverId, user.organizationId);
  }

  @Post('servers/:serverId/resources/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Read a resource from an MCP server' })
  @ApiParam({ name: 'serverId', description: 'Server ID' })
  @ApiBody({ type: ReadResourceDto })
  @RequirePermission(Resource.INTEGRATIONS, Action.READ)
  async readResource(
    @Param('serverId') serverId: string,
    @Body() dto: ReadResourceDto,
    @CurrentUser() user: UserContext
  ) {
    return this.mcpClient.readResource(serverId, dto.uri, user.organizationId);
  }

  // ============================================
  // Prompts
  // ============================================

  @Get('servers/:serverId/prompts')
  @ApiOperation({ summary: 'List prompts from an MCP server' })
  @ApiParam({ name: 'serverId', description: 'Server ID' })
  @RequirePermission(Resource.AI, Action.READ)
  async listPrompts(
    @Param('serverId') serverId: string,
    @CurrentUser() user: UserContext
  ) {
    return this.mcpClient.listPrompts(serverId, user.organizationId);
  }

  @Post('servers/:serverId/prompts/get')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a prompt from an MCP server' })
  @ApiParam({ name: 'serverId', description: 'Server ID' })
  @ApiBody({ type: GetPromptDto })
  @RequirePermission(Resource.AI, Action.READ)
  async getPrompt(
    @Param('serverId') serverId: string,
    @Body() dto: GetPromptDto,
    @CurrentUser() user: UserContext
  ) {
    return this.mcpClient.getPrompt(serverId, dto.name, dto.args, user.organizationId);
  }
}
