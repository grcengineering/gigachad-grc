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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { BCDRPlansService } from './bcdr-plans.service';
import { CreateBCDRPlanDto, UpdateBCDRPlanDto, BCDRPlanFilterDto } from './dto/bcdr.dto';
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Resource, Action } from '../permissions/dto/permission.dto';

@ApiTags('bcdr/plans')
@ApiBearerAuth()
@Controller('api/bcdr/plans')
@UseGuards(DevAuthGuard, PermissionGuard)
export class BCDRPlansController {
  constructor(private readonly plansService: BCDRPlansService) {}

  @Get()
  @ApiOperation({ summary: 'List BC/DR plans' })
  @ApiResponse({ status: 200, description: 'List of BC/DR plans' })
  @RequirePermission(Resource.BCDR, Action.READ)
  async findAll(
    @CurrentUser() user: UserContext,
    @Query() filters: BCDRPlanFilterDto,
  ) {
    return this.plansService.findAll(user.organizationId, filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get BC/DR plan statistics' })
  @RequirePermission(Resource.BCDR, Action.READ)
  async getStats(@CurrentUser() user: UserContext) {
    return this.plansService.getStats(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get BC/DR plan details' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @RequirePermission(Resource.BCDR, Action.READ)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.plansService.findOne(id, user.organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a BC/DR plan' })
  @ApiResponse({ status: 201, description: 'Plan created' })
  @RequirePermission(Resource.BCDR, Action.CREATE)
  async create(
    @CurrentUser() user: UserContext,
    @Body() dto: CreateBCDRPlanDto,
  ) {
    return this.plansService.create(
      user.organizationId,
      user.userId,
      dto,
      user.email,
      user.name,
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a BC/DR plan (PUT)' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @RequirePermission(Resource.BCDR, Action.UPDATE)
  async update(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Body() dto: UpdateBCDRPlanDto,
  ) {
    return this.plansService.update(
      id,
      user.organizationId,
      user.userId,
      dto,
      user.email,
      user.name,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a BC/DR plan (PATCH)' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @RequirePermission(Resource.BCDR, Action.UPDATE)
  async partialUpdate(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Body() dto: UpdateBCDRPlanDto,
  ) {
    return this.plansService.update(
      id,
      user.organizationId,
      user.userId,
      dto,
      user.email,
      user.name,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a BC/DR plan' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @RequirePermission(Resource.BCDR, Action.DELETE)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.plansService.delete(
      id,
      user.organizationId,
      user.userId,
      user.email,
      user.name,
    );
  }

  @Post(':id/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload plan document' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        versionNumber: { type: 'string' },
      },
    },
  })
  @RequirePermission(Resource.BCDR, Action.UPDATE)
  async uploadDocument(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @UploadedFile() file: Express.Multer.File,
    @Body('versionNumber') versionNumber?: string,
  ) {
    return this.plansService.uploadDocument(
      id,
      user.organizationId,
      user.userId,
      file,
      versionNumber,
    );
  }

  @Post(':id/controls')
  @ApiOperation({ summary: 'Link a control to the plan' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @RequirePermission(Resource.BCDR, Action.UPDATE)
  async linkControl(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Body() body: { controlId: string; notes?: string },
  ) {
    return this.plansService.linkControl(id, body.controlId, user.userId, body.notes);
  }

  @Delete(':id/controls/:controlId')
  @ApiOperation({ summary: 'Unlink a control from the plan' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiParam({ name: 'controlId', description: 'Control ID' })
  @RequirePermission(Resource.BCDR, Action.UPDATE)
  async unlinkControl(
    @Param('id') id: string,
    @Param('controlId') controlId: string,
  ) {
    return this.plansService.unlinkControl(id, controlId);
  }
}

