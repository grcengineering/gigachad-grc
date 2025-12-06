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
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@ApiTags('comments')
@ApiBearerAuth()
@Controller('api/comments')
@UseGuards(DevAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get comments for an entity' })
  async findByEntity(
    @CurrentUser() user: UserContext,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.commentsService.findByEntity(
      user.organizationId,
      entityType,
      entityId,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a comment' })
  async create(
    @CurrentUser() user: UserContext,
    @Body() body: {
      entityType: string;
      entityId: string;
      content: string;
      parentId?: string;
    },
  ) {
    return this.commentsService.create(
      user.organizationId,
      user.userId,
      body,
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a comment' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Body() body: { content?: string; isResolved?: boolean },
  ) {
    return this.commentsService.update(
      id,
      user.organizationId,
      user.userId,
      body,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a comment' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.commentsService.delete(id, user.organizationId, user.userId);
  }
}



