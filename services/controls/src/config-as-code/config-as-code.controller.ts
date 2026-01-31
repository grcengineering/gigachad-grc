import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Resource, Action } from '../permissions/dto/permission.dto';
import { ConfigAsCodeService } from './config-as-code.service';

interface AuthenticatedRequest extends Request {
  user: { userId: string; organizationId: string; email?: string };
}
import {
  ExportConfigDto,
  ExportConfigResponseDto,
} from './dto/export-config.dto';
import {
  ImportConfigDto,
  ImportConfigResponseDto,
} from './dto/import-config.dto';

@ApiTags('config-as-code')
@ApiBearerAuth()
@Controller('api/config-as-code')
@UseGuards(DevAuthGuard, PermissionGuard)
export class ConfigAsCodeController {
  constructor(private readonly configAsCodeService: ConfigAsCodeService) {}

  @Post('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export current GRC state to configuration format' })
  @ApiResponse({
    status: 200,
    description: 'Configuration exported successfully',
    type: ExportConfigResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @RequirePermission(Resource.SETTINGS, Action.UPDATE)
  async exportConfig(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ExportConfigDto,
  ): Promise<ExportConfigResponseDto> {
    return this.configAsCodeService.exportConfig(
      req.user.organizationId,
      req.user.userId,
      dto,
    );
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Import configuration and apply changes' })
  @ApiResponse({
    status: 200,
    description: 'Configuration imported successfully',
    type: ImportConfigResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid configuration format' })
  @RequirePermission(Resource.SETTINGS, Action.UPDATE)
  async importConfig(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ImportConfigDto,
  ): Promise<ImportConfigResponseDto> {
    return this.configAsCodeService.importConfig(
      req.user.organizationId,
      req.user.userId,
      dto,
    );
  }
}

