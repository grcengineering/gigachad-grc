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
    @Query('organizationId') organizationId: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('framework') framework?: string,
    @Query('isPublic') isPublic?: string,
    @Query('search') search?: string,
  ) {
    return this.knowledgeBaseService.findAll(organizationId, {
      category,
      status,
      framework,
      isPublic,
      search,
    });
  }

  @Get('stats')
  getStats(@Query('organizationId') organizationId: string) {
    return this.knowledgeBaseService.getStats(organizationId);
  }

  @Get('search')
  search(
    @Query('organizationId') organizationId: string,
    @Query('q') query: string,
  ) {
    return this.knowledgeBaseService.search(organizationId, query);
  }

  @Get('public')
  getPublicEntries(
    @Query('organizationId') organizationId: string,
    @Query('category') category?: string,
  ) {
    return this.knowledgeBaseService.getPublicEntries(organizationId, category);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.knowledgeBaseService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateKnowledgeBaseDto: UpdateKnowledgeBaseDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.knowledgeBaseService.update(id, updateKnowledgeBaseDto, user.userId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.knowledgeBaseService.remove(id, user.userId);
  }

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.knowledgeBaseService.approve(id, user.userId);
  }

  @Post(':id/use')
  incrementUsage(@Param('id') id: string) {
    return this.knowledgeBaseService.incrementUsage(id);
  }
}
