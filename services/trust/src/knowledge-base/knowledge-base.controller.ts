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
import { KnowledgeBaseService } from './knowledge-base.service';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';
import { UpdateKnowledgeBaseDto } from './dto/update-knowledge-base.dto';
import { BulkCreateKnowledgeBaseDto } from './dto/bulk-create-knowledge-base.dto';
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@Controller('knowledge-base')
@UseGuards(DevAuthGuard)
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Post()
  create(
    @Body() createKnowledgeBaseDto: CreateKnowledgeBaseDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.knowledgeBaseService.create(createKnowledgeBaseDto, user.userId);
  }

  @Post('bulk')
  bulkCreate(
    @Body() bulkCreateDto: BulkCreateKnowledgeBaseDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.knowledgeBaseService.bulkCreate(bulkCreateDto.entries, user.userId);
  }

  @Get()
  findAll(
    @CurrentUser() user: UserContext,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('framework') framework?: string,
    @Query('isPublic') isPublic?: string,
    @Query('search') search?: string,
  ) {
    return this.knowledgeBaseService.findAll(user.organizationId, {
      category,
      status,
      framework,
      isPublic,
      search,
    });
  }

  @Get('stats')
  getStats(@CurrentUser() user: UserContext) {
    return this.knowledgeBaseService.getStats(user.organizationId);
  }

  @Get('search')
  search(
    @CurrentUser() user: UserContext,
    @Query('q') query: string,
  ) {
    return this.knowledgeBaseService.search(user.organizationId, query);
  }

  @Get('public')
  getPublicEntries(
    @CurrentUser() user: UserContext,
    @Query('category') category?: string,
  ) {
    return this.knowledgeBaseService.getPublicEntries(user.organizationId, category);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UserContext) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.knowledgeBaseService.findOne(id, user.organizationId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateKnowledgeBaseDto: UpdateKnowledgeBaseDto,
    @CurrentUser() user: UserContext,
  ) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.knowledgeBaseService.update(id, updateKnowledgeBaseDto, user.userId, user.organizationId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.knowledgeBaseService.remove(id, user.userId, user.organizationId);
  }

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.knowledgeBaseService.approve(id, user.userId, user.organizationId);
  }

  @Post(':id/use')
  incrementUsage(@Param('id') id: string, @CurrentUser() user: UserContext) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.knowledgeBaseService.incrementUsage(id, user.organizationId);
  }
}
