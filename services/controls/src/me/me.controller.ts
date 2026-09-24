import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { CreateApiKeyDto } from '../api-keys/dto/api-key.dto';
import { UpdatePreferencesDto } from '../notifications/dto/notification.dto';
import { MeService } from './me.service';
import { ChangeMyPasswordDto, DisableTotpDto, UpdateMeDto } from './dto/me.dto';

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

@ApiTags('My Account')
@ApiBearerAuth()
@UseGuards(DevAuthGuard)
@Controller('api/me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user profile and preferences' })
  getMe(@CurrentUser() user: UserContext) {
    return this.meService.getMe(user.organizationId, user.userId);
  }

  @Put()
  @ApiOperation({ summary: 'Update current user profile and timezone' })
  updateMe(@CurrentUser() user: UserContext, @Body() dto: UpdateMeDto) {
    return this.meService.updateMe(user.organizationId, user.userId, dto);
  }

  @Post('avatar')
  @ApiOperation({ summary: 'Upload current user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: AVATAR_MAX_BYTES },
      fileFilter: (_request, file, callback) => {
        if (!AVATAR_MIME_TYPES.has(file.mimetype)) {
          callback(new BadRequestException('Avatar must be a JPEG, PNG, or WebP image'), false);
          return;
        }
        callback(null, true);
      },
    })
  )
  uploadAvatar(@CurrentUser() user: UserContext, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No avatar file uploaded');
    }
    return this.meService.uploadAvatar(user.organizationId, user.userId, file);
  }

  @Get('avatar')
  @ApiOperation({ summary: 'Download current user avatar' })
  async getAvatar(@CurrentUser() user: UserContext, @Res() response: Response): Promise<void> {
    const avatar = await this.meService.getAvatar(user.organizationId, user.userId);
    response.set({
      'Content-Type': avatar.contentType,
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    });
    avatar.stream.pipe(response);
  }

  @Post('password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password or return the provider-managed flow' })
  changePassword(@CurrentUser() user: UserContext, @Body() dto: ChangeMyPasswordDto) {
    return this.meService.changePassword(user.organizationId, user.userId, dto);
  }

  @Get('totp')
  @ApiOperation({ summary: 'Get TOTP enrollment status' })
  getTotp(@CurrentUser() user: UserContext) {
    return this.meService.getTotpStatus(user.organizationId, user.userId);
  }

  @Post('totp/setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Begin identity-provider TOTP enrollment' })
  beginTotp(@CurrentUser() user: UserContext) {
    return this.meService.beginTotpSetup(user.organizationId, user.userId);
  }

  @Delete('totp')
  @ApiOperation({ summary: 'Remove current user TOTP credentials' })
  disableTotp(@CurrentUser() user: UserContext, @Body() dto: DisableTotpDto) {
    return this.meService.disableTotp(user.organizationId, user.userId, dto.currentPassword);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'List current user identity-provider sessions' })
  getSessions(@CurrentUser() user: UserContext) {
    return this.meService.getSessions(user.organizationId, user.userId);
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke one current user identity-provider session' })
  revokeSession(@CurrentUser() user: UserContext, @Param('sessionId') sessionId: string) {
    return this.meService.revokeSession(user.organizationId, user.userId, sessionId);
  }

  @Post('api-keys')
  @ApiOperation({ summary: 'Create a personal API key' })
  createApiKey(@CurrentUser() user: UserContext, @Body() dto: CreateApiKeyDto) {
    return this.meService.createApiKey(user.organizationId, user.userId, user.email, dto);
  }

  @Delete('api-keys/:keyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a personal API key' })
  revokeApiKey(@CurrentUser() user: UserContext, @Param('keyId') keyId: string) {
    return this.meService.revokeApiKey(user.organizationId, user.userId, user.email, keyId);
  }

  @Put('notifications')
  @ApiOperation({ summary: 'Update current user notification preferences' })
  async updateNotifications(@CurrentUser() user: UserContext, @Body() dto: UpdatePreferencesDto) {
    await this.meService.updateNotificationPreferences(user.userId, dto.preferences);
    return { success: true };
  }
}
