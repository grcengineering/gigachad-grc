import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import {
  SessionListQueryDto,
  InvalidateSessionDto,
  SessionStatsDto,
  SessionSettingsDto,
  UpdateSessionSettingsDto,
} from './dto/session.dto';
import { CurrentUser, UserContext, Roles, RolesGuard } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@ApiTags('Sessions')
@ApiBearerAuth()
@UseGuards(DevAuthGuard, RolesGuard)
@Controller('api/sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user sessions' })
  async getMySessions(
    @CurrentUser() user: UserContext,
    @Headers('x-session-id') sessionId: string,
    @Query() query: SessionListQueryDto,
  ) {
    return this.sessionsService.getUserSessions(
      user.organizationId,
      user.userId,
      sessionId || '',
      query,
    );
  }

  @Delete('me/:sessionId')
  @ApiOperation({ summary: 'Invalidate one of my sessions' })
  async invalidateMySession(
    @CurrentUser() user: UserContext,
    @Headers('x-session-id') currentSessionId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: InvalidateSessionDto,
  ): Promise<void> {
    return this.sessionsService.invalidateSession(
      user.organizationId,
      sessionId,
      currentSessionId || '',
      dto.reason,
    );
  }

  @Delete('me')
  @ApiOperation({ summary: 'Invalidate all my sessions except current' })
  @ApiResponse({ status: 200, description: 'Number of sessions invalidated' })
  async invalidateAllMySessions(
    @CurrentUser() user: UserContext,
    @Headers('x-session-id') currentSessionId: string,
    @Body() dto: InvalidateSessionDto,
  ): Promise<{ invalidated: number }> {
    const count = await this.sessionsService.invalidateAllUserSessions(
      user.organizationId,
      user.userId,
      currentSessionId || '',
      dto.reason,
    );
    return { invalidated: count };
  }

  // Admin endpoints
  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'List all sessions (admin only)' })
  async getAllSessions(
    @CurrentUser() user: UserContext,
    @Query() query: SessionListQueryDto,
  ) {
    return this.sessionsService.getAllSessions(user.organizationId, query);
  }

  @Get('stats')
  @Roles('admin')
  @ApiOperation({ summary: 'Get session statistics' })
  @ApiResponse({ status: 200, type: SessionStatsDto })
  async getStats(@CurrentUser() user: UserContext): Promise<SessionStatsDto> {
    return this.sessionsService.getSessionStats(user.organizationId);
  }

  @Get('settings')
  @Roles('admin')
  @ApiOperation({ summary: 'Get session settings' })
  @ApiResponse({ status: 200, type: SessionSettingsDto })
  async getSettings(@CurrentUser() user: UserContext): Promise<SessionSettingsDto> {
    return this.sessionsService.getSessionSettings(user.organizationId);
  }

  @Put('settings')
  @Roles('admin')
  @ApiOperation({ summary: 'Update session settings' })
  @ApiResponse({ status: 200, type: SessionSettingsDto })
  async updateSettings(
    @CurrentUser() user: UserContext,
    @Body() dto: UpdateSessionSettingsDto,
  ): Promise<SessionSettingsDto> {
    return this.sessionsService.updateSessionSettings(user.organizationId, dto);
  }

  @Delete('user/:userId')
  @Roles('admin')
  @ApiOperation({ summary: 'Invalidate all sessions for a user' })
  async invalidateUserSessions(
    @CurrentUser() user: UserContext,
    @Headers('x-session-id') currentSessionId: string,
    @Param('userId') userId: string,
    @Body() dto: InvalidateSessionDto,
  ): Promise<{ invalidated: number }> {
    const count = await this.sessionsService.invalidateAllUserSessions(
      user.organizationId,
      userId,
      currentSessionId || '',
      dto.reason,
    );
    return { invalidated: count };
  }

  @Delete('all')
  @Roles('admin')
  @ApiOperation({ summary: 'Invalidate all sessions (except current)' })
  async invalidateAllSessions(
    @CurrentUser() user: UserContext,
    @Headers('x-session-id') currentSessionId: string,
    @Body() dto: InvalidateSessionDto,
  ): Promise<{ invalidated: number }> {
    const count = await this.sessionsService.invalidateAllSessions(
      user.organizationId,
      currentSessionId || '',
      dto.reason,
    );
    return { invalidated: count };
  }

  @Delete(':sessionId')
  @Roles('admin')
  @ApiOperation({ summary: 'Invalidate a specific session' })
  async invalidateSession(
    @CurrentUser() user: UserContext,
    @Headers('x-session-id') currentSessionId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: InvalidateSessionDto,
  ): Promise<void> {
    return this.sessionsService.invalidateSession(
      user.organizationId,
      sessionId,
      currentSessionId || '',
      dto.reason,
    );
  }
}
