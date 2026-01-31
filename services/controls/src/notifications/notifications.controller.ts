 
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Put,
  Headers,
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

@Controller('api/notifications')
@UseGuards(DevAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ===========================
  // Get Notifications
  // ===========================

  @Get()
  async findAll(
    @Headers('x-user-id') userId: string = 'default-user',
    @Query() filters: NotificationFilterDto,
  ) {
    return this.notificationsService.findAll(userId, filters);
  }

  @Get('unread-count')
  async getUnreadCount(
    @Headers('x-user-id') userId: string = 'default-user',
  ): Promise<{ count: number }> {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Get('stats')
  async getStats(
    @Headers('x-user-id') userId: string = 'default-user',
  ): Promise<NotificationStatsDto> {
    return this.notificationsService.getStats(userId);
  }

  @Get(':id')
  async findOne(
    @Headers('x-user-id') userId: string = 'default-user',
    @Param('id') id: string,
  ) {
    return this.notificationsService.findOne(userId, id);
  }

  // ===========================
  // Mark as Read
  // ===========================

  @Post('mark-read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Headers('x-user-id') userId: string = 'default-user',
    @Body() dto: MarkReadDto,
  ): Promise<{ updated: number }> {
    return this.notificationsService.markAsRead(userId, dto);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  async markOneAsRead(
    @Headers('x-user-id') userId: string = 'default-user',
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    await this.notificationsService.markOneAsRead(userId, id);
    return { success: true };
  }

  // ===========================
  // Delete Notifications
  // ===========================

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Headers('x-user-id') userId: string = 'default-user',
    @Param('id') id: string,
  ): Promise<void> {
    await this.notificationsService.delete(userId, id);
  }

  @Delete()
  async deleteAll(
    @Headers('x-user-id') userId: string = 'default-user',
  ): Promise<{ deleted: number }> {
    return this.notificationsService.deleteAll(userId);
  }

  // ===========================
  // Preferences
  // ===========================

  @Get('preferences/list')
  async getPreferences(
    @Headers('x-user-id') userId: string = 'default-user',
  ): Promise<NotificationPreferenceResponseDto[]> {
    return this.notificationsService.getPreferences(userId);
  }

  @Put('preferences')
  async updatePreferences(
    @Headers('x-user-id') userId: string = 'default-user',
    @Body() dto: UpdatePreferencesDto,
  ): Promise<{ success: boolean }> {
    await this.notificationsService.updatePreferences(userId, dto.preferences);
    return { success: true };
  }
}

