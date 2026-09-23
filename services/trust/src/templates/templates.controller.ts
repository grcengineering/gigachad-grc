import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TemplatesService, CreateTemplateDto, UpdateTemplateDto } from './templates.service';
import { CurrentUser, UserContext, Roles, RolesGuard } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@Controller('answer-templates')
@UseGuards(DevAuthGuard, RolesGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @Roles('admin', 'compliance_manager', 'auditor')
  create(@Body() dto: CreateTemplateDto, @CurrentUser() user: UserContext) {
    return this.templatesService.create(user.organizationId, dto, user.userId);
  }

  @Get()
  findAll(
    @CurrentUser() user: UserContext,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('search') search?: string
  ) {
    // SECURITY: Organization ID extracted from authenticated context, not query param
    return this.templatesService.findAll(user.organizationId, {
      category,
      status,
      search,
    });
  }

  @Get('stats')
  getStats(@CurrentUser() user: UserContext) {
    // SECURITY: Organization ID extracted from authenticated context, not query param
    return this.templatesService.getStats(user.organizationId);
  }

  @Get('categories')
  getCategories(@CurrentUser() user: UserContext) {
    // SECURITY: Organization ID extracted from authenticated context, not query param
    return this.templatesService.getCategories(user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UserContext) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.templatesService.findOne(id, user.organizationId);
  }

  @Patch(':id')
  @Roles('admin', 'compliance_manager', 'auditor')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
    @CurrentUser() user: UserContext
  ) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.templatesService.update(id, dto, user.userId, user.organizationId);
  }

  @Delete(':id')
  @Roles('admin', 'compliance_manager', 'auditor')
  remove(@Param('id') id: string, @CurrentUser() user: UserContext) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.templatesService.remove(id, user.userId, user.organizationId);
  }

  @Post(':id/archive')
  @Roles('admin', 'compliance_manager', 'auditor')
  archive(@Param('id') id: string, @CurrentUser() user: UserContext) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.templatesService.archive(id, user.userId, user.organizationId);
  }

  @Post(':id/unarchive')
  @Roles('admin', 'compliance_manager', 'auditor')
  unarchive(@Param('id') id: string, @CurrentUser() user: UserContext) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.templatesService.unarchive(id, user.userId, user.organizationId);
  }

  @Post(':id/apply')
  @Roles('admin', 'compliance_manager', 'auditor')
  applyTemplate(
    @Param('id') id: string,
    @Body() body: { variables: Record<string, string> },
    @CurrentUser() user: UserContext
  ) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.templatesService.applyTemplate(id, body.variables || {}, user.organizationId);
  }

  @Post(':id/use')
  @Roles('admin', 'compliance_manager', 'auditor')
  incrementUsage(@Param('id') id: string, @CurrentUser() user: UserContext) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.templatesService.incrementUsage(id, user.organizationId);
  }
}
