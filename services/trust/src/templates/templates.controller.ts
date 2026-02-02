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
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@Controller('answer-templates')
@UseGuards(DevAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  create(
    @Body() dto: CreateTemplateDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.templatesService.create(dto, user.userId);
  }

  @Get()
  findAll(
    @Query('organizationId') organizationId: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.templatesService.findAll(organizationId, {
      category,
      status,
      search,
    });
  }

  @Get('stats')
  getStats(@Query('organizationId') organizationId: string) {
    return this.templatesService.getStats(organizationId);
  }

  @Get('categories')
  getCategories(@Query('organizationId') organizationId: string) {
    return this.templatesService.getCategories(organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UserContext) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.templatesService.findOne(id, user.organizationId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
    @CurrentUser() user: UserContext,
  ) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.templatesService.update(id, dto, user.userId, user.organizationId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.templatesService.remove(id, user.userId, user.organizationId);
  }

  @Post(':id/archive')
  archive(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.templatesService.archive(id, user.userId, user.organizationId);
  }

  @Post(':id/unarchive')
  unarchive(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.templatesService.unarchive(id, user.userId, user.organizationId);
  }

  @Post(':id/apply')
  applyTemplate(
    @Param('id') id: string,
    @Body() body: { variables: Record<string, string> },
    @CurrentUser() user: UserContext,
  ) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.templatesService.applyTemplate(id, body.variables || {}, user.organizationId);
  }

  @Post(':id/use')
  incrementUsage(@Param('id') id: string, @CurrentUser() user: UserContext) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.templatesService.incrementUsage(id, user.organizationId);
  }
}

