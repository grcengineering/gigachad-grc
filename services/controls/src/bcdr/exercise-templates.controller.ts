import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
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
import { AuthGuard } from '../auth/auth.guard';
import { TenantScopeGuard } from '../common/tenant-scope.guard';

/**
 * Controller for BC/DR exercise template endpoints.
 *
 * Provides access to pre-built tabletop exercise scenarios
 * and custom template management.
 */
@ApiTags('BC/DR Exercise Templates')
@ApiBearerAuth()
@Controller('bcdr/exercise-templates')
@UseGuards(AuthGuard, TenantScopeGuard)
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
    @Req() req: any,
  ) {
    return this.templatesService.findAll(req.organizationId, filters);
  }

  /**
   * Get template categories with counts
   */
  @Get('categories')
  @ApiOperation({ summary: 'Get template categories' })
  @ApiResponse({ status: 200, description: 'Category list with counts' })
  async getCategories(@Req() req: any) {
    return this.templatesService.getCategories(req.organizationId);
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
    @Req() req: any,
  ) {
    return this.templatesService.cloneToOrganization(
      id,
      req.organizationId,
      req.userId,
      req.userEmail,
      req.userName,
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
    @Req() req: any,
  ) {
    return this.templatesService.create(
      req.organizationId,
      req.userId,
      dto,
      req.userEmail,
      req.userName,
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
    @Req() req: any,
  ) {
    return this.templatesService.createFromTest(
      testId,
      req.organizationId,
      req.userId,
      title,
      req.userEmail,
      req.userName,
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
    @Req() req: any,
  ) {
    return this.templatesService.update(
      id,
      req.organizationId,
      req.userId,
      dto,
      req.userEmail,
      req.userName,
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
    @Req() req: any,
  ) {
    return this.templatesService.delete(
      id,
      req.organizationId,
      req.userId,
      req.userEmail,
      req.userName,
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
