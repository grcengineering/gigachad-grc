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
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ExerciseTemplatesService } from './exercise-templates.service';
import {
  CreateExerciseTemplateDto,
  ExerciseTemplateFilterDto,
} from './dto/bcdr.dto';
import { DevAuthGuard } from '../auth/dev-auth.guard';

/**
 * Controller for BC/DR exercise template endpoints.
 *
 * Provides access to pre-built tabletop exercise scenarios
 * and custom template management.
 */
@ApiTags('BC/DR Exercise Templates')
@ApiBearerAuth()
@Controller('api/bcdr/exercise-templates')
@UseGuards(DevAuthGuard)
export class ExerciseTemplatesController {
  constructor(private readonly templatesService: ExerciseTemplatesService) {}

  /**
   * List all available templates
   */
  @Get()
  @ApiOperation({ summary: 'List exercise templates' })
  @ApiResponse({ status: 200, description: 'Paginated template list' })
  async listTemplates(
    @Query() filters: ExerciseTemplateFilterDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.templatesService.findAll(user.organizationId, filters);
  }

  /**
   * Get template categories with counts
   */
  @Get('categories')
  @ApiOperation({ summary: 'Get template categories' })
  @ApiResponse({ status: 200, description: 'Category list with counts' })
  async getCategories(@CurrentUser() user: UserContext) {
    return this.templatesService.getCategories(user.organizationId);
  }

  /**
   * Get single template by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get template details' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template details' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async getTemplate(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  /**
   * Clone a template to organization
   */
  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone template to organization' })
  @ApiParam({ name: 'id', description: 'Template ID to clone' })
  @ApiResponse({ status: 201, description: 'Cloned template' })
  async cloneTemplate(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.templatesService.cloneToOrganization(
      id,
      user.organizationId,
      user.userId,
      user.email,
      user.name,
    );
  }

  /**
   * Create a custom template
   */
  @Post()
  @ApiOperation({ summary: 'Create custom template' })
  @ApiResponse({ status: 201, description: 'Created template' })
  async createTemplate(
    @Body() dto: CreateExerciseTemplateDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.templatesService.create(
      user.organizationId,
      user.userId,
      dto,
      user.email,
      user.name,
    );
  }

  /**
   * Create template from completed DR test
   */
  @Post('from-test/:testId')
  @ApiOperation({ summary: 'Create template from DR test' })
  @ApiParam({ name: 'testId', description: 'DR Test ID' })
  @ApiResponse({ status: 201, description: 'Created template' })
  async createFromTest(
    @Param('testId') testId: string,
    @Body('title') title: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.templatesService.createFromTest(
      testId,
      user.organizationId,
      user.userId,
      title,
      user.email,
      user.name,
    );
  }

  /**
   * Update a template
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Updated template' })
  @ApiResponse({ status: 409, description: 'Cannot modify global template' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: Partial<CreateExerciseTemplateDto>,
    @CurrentUser() user: UserContext,
  ) {
    return this.templatesService.update(
      id,
      user.organizationId,
      user.userId,
      dto,
      user.email,
      user.name,
    );
  }

  /**
   * Delete a template
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template deleted' })
  @ApiResponse({ status: 409, description: 'Cannot delete global template' })
  async deleteTemplate(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.templatesService.delete(
      id,
      user.organizationId,
      user.userId,
      user.email,
      user.name,
    );
  }

  /**
   * Seed global templates (admin only)
   */
  @Post('seed')
  @ApiOperation({ summary: 'Seed global templates' })
  @ApiResponse({ status: 200, description: 'Seeding result' })
  async seedTemplates() {
    return this.templatesService.seedGlobalTemplates();
  }
}
