import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CustomFieldsService } from './custom-fields.service';
import {
  CreateCustomFieldDto,
  UpdateCustomFieldDto,
  CustomFieldDto,
  SetCustomFieldValueDto,
  CustomFieldValueDto,
  EntityCustomFieldsDto,
  CustomFieldListQueryDto,
  CustomFieldEntityType,
} from './dto/custom-field.dto';
import { CurrentUser, UserContext, Roles, RolesGuard } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@ApiTags('Custom Fields')
@ApiBearerAuth()
@UseGuards(DevAuthGuard, RolesGuard)
@Controller('api/custom-fields')
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  // Field Definition CRUD
  @Get()
  @ApiOperation({ summary: 'List custom field definitions' })
  async listFields(
    @CurrentUser() user: UserContext,
    @Query() query: CustomFieldListQueryDto,
  ) {
    return this.customFieldsService.listFields(user.organizationId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a custom field definition' })
  @ApiResponse({ status: 200, type: CustomFieldDto })
  async getField(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
  ): Promise<CustomFieldDto> {
    return this.customFieldsService.getField(user.organizationId, id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a custom field definition' })
  @ApiResponse({ status: 201, type: CustomFieldDto })
  async createField(
    @CurrentUser() user: UserContext,
    @Body() dto: CreateCustomFieldDto,
  ): Promise<CustomFieldDto> {
    return this.customFieldsService.createField(
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update a custom field definition' })
  @ApiResponse({ status: 200, type: CustomFieldDto })
  async updateField(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
    @Body() dto: UpdateCustomFieldDto,
  ): Promise<CustomFieldDto> {
    return this.customFieldsService.updateField(user.organizationId, id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a custom field definition' })
  async deleteField(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
  ): Promise<void> {
    return this.customFieldsService.deleteField(user.organizationId, id);
  }

  // Entity Field Values
  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Get all custom field values for an entity' })
  @ApiResponse({ status: 200, type: EntityCustomFieldsDto })
  async getEntityFieldValues(
    @CurrentUser() user: UserContext,
    @Param('entityType') entityType: CustomFieldEntityType,
    @Param('entityId') entityId: string,
  ): Promise<EntityCustomFieldsDto> {
    return this.customFieldsService.getEntityFieldValues(
      user.organizationId,
      entityType,
      entityId,
    );
  }

  @Post('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Set a custom field value for an entity' })
  @ApiResponse({ status: 200, type: CustomFieldValueDto })
  async setEntityFieldValue(
    @CurrentUser() user: UserContext,
    @Param('entityType') entityType: CustomFieldEntityType,
    @Param('entityId') entityId: string,
    @Body() dto: SetCustomFieldValueDto,
  ): Promise<CustomFieldValueDto> {
    return this.customFieldsService.setEntityFieldValue(
      user.organizationId,
      user.userId,
      entityType,
      entityId,
      dto,
    );
  }

  @Delete('entity/:entityType/:entityId/:fieldIdOrSlug')
  @ApiOperation({ summary: 'Delete a custom field value for an entity' })
  async deleteEntityFieldValue(
    @CurrentUser() user: UserContext,
    @Param('entityType') entityType: CustomFieldEntityType,
    @Param('entityId') entityId: string,
    @Param('fieldIdOrSlug') fieldIdOrSlug: string,
  ): Promise<void> {
    return this.customFieldsService.deleteEntityFieldValue(
      user.organizationId,
      entityType,
      entityId,
      fieldIdOrSlug,
    );
  }
}
