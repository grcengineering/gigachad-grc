 
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Put,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import {
  NotificationFilterDto,
  MarkReadDto,
  UpdatePreferencesDto,
  NotificationStatsDto,
  NotificationPreferenceResponseDto,
} from './dto/notification.dto';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { CurrentUser, UserContext } from '@gigachad-grc/shared';

@Controller('api/notifications')
@UseGuards(DevAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ===========================
  // Get Notifications
  // ===========================

  @Get()
  async findAll(
    @CurrentUser() user: UserContext,
    @Query() filters: NotificationFilterDto,
  ) {
    // SECURITY: User ID extracted from authenticated context, not client-provided header
    return this.notificationsService.findAll(user.userId, filters);
  }

  @Get('unread-count')
  async getUnreadCount(
    @CurrentUser() user: UserContext,
  ): Promise<{ count: number }> {
    // SECURITY: User ID extracted from authenticated context, not client-provided header
    const count = await this.notificationsService.getUnreadCount(user.userId);
    return { count };
  }

  @Get('stats')
  async getStats(
    @CurrentUser() user: UserContext,
  ): Promise<NotificationStatsDto> {
    // SECURITY: User ID extracted from authenticated context, not client-provided header
    return this.notificationsService.getStats(user.userId);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
  ) {
    // SECURITY: User ID extracted from authenticated context, not client-provided header
    return this.notificationsService.findOne(user.userId, id);
  }

  // ===========================
  // Mark as Read
  // ===========================

  @Post('mark-read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @CurrentUser() user: UserContext,
    @Body() dto: MarkReadDto,
  ): Promise<{ updated: number }> {
    // SECURITY: User ID extracted from authenticated context, not client-provided header
    return this.notificationsService.markAsRead(user.userId, dto);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  async markOneAsRead(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    // SECURITY: User ID extracted from authenticated context, not client-provided header
    await this.notificationsService.markOneAsRead(user.userId, id);
    return { success: true };
  }

  // ===========================
  // Delete Notifications
  // ===========================

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
  ): Promise<void> {
    // SECURITY: User ID extracted from authenticated context, not client-provided header
    await this.notificationsService.delete(user.userId, id);
  }

  @Delete()
  async deleteAll(
    @CurrentUser() user: UserContext,
  ): Promise<{ deleted: number }> {
    // SECURITY: User ID extracted from authenticated context, not client-provided header
    return this.notificationsService.deleteAll(user.userId);
  }

  // ===========================
  // Preferences
  // ===========================

  @Get('preferences/list')
  async getPreferences(
    @CurrentUser() user: UserContext,
  ): Promise<NotificationPreferenceResponseDto[]> {
    // SECURITY: User ID extracted from authenticated context, not client-provided header
    return this.notificationsService.getPreferences(user.userId);
  }

  @Put('preferences')
  async updatePreferences(
    @CurrentUser() user: UserContext,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<{ success: boolean }> {
    // SECURITY: User ID extracted from authenticated context, not client-provided header
    await this.notificationsService.updatePreferences(user.userId, dto.preferences);
    return { success: true };
  }
}

