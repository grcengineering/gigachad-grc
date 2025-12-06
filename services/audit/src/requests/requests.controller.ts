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
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RequestsService } from './requests.service';
import { CreateAuditRequestDto } from './dto/create-request.dto';
import { UpdateAuditRequestDto } from './dto/update-request.dto';
import { DevAuthGuard } from '../auth/dev-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    organizationId: string;
    email: string;
    role: string;
  };
}

@ApiTags('Audit Requests')
@ApiBearerAuth()
@Controller('api/audit-requests')
@UseGuards(DevAuthGuard)
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new audit request' })
  @ApiResponse({ status: 201, description: 'Request created successfully' })
  create(@Body() createRequestDto: CreateAuditRequestDto, @Req() req: AuthenticatedRequest) {
    return this.requestsService.create(createRequestDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all audit requests' })
  @ApiResponse({ status: 200, description: 'Returns all requests' })
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('auditId') auditId?: string,
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('category') category?: string,
  ) {
    const { organizationId } = req.user;
    return this.requestsService.findAll(organizationId, {
      auditId,
      status,
      assignedTo,
      category,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get request by ID' })
  @ApiResponse({ status: 200, description: 'Returns the request' })
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const { organizationId } = req.user;
    return this.requestsService.findOne(id, organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a request' })
  @ApiResponse({ status: 200, description: 'Request updated successfully' })
  update(
    @Param('id') id: string,
    @Body() updateRequestDto: UpdateAuditRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { organizationId } = req.user;
    return this.requestsService.update(id, organizationId, updateRequestDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a request' })
  @ApiResponse({ status: 200, description: 'Request deleted successfully' })
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const { organizationId } = req.user;
    return this.requestsService.delete(id, organizationId);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add comment to request' })
  @ApiResponse({ status: 201, description: 'Comment added successfully' })
  addComment(
    @Param('id') requestId: string,
    @Body() body: { content: string; isInternal?: boolean },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.requestsService.addComment(requestId, {
      content: body.content,
      isInternal: body.isInternal || false,
      authorType: 'internal_user',
      authorId: req.user.userId,
      authorName: req.user.email,
    });
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get request comments' })
  @ApiResponse({ status: 200, description: 'Returns comments' })
  getComments(@Param('id') requestId: string) {
    return this.requestsService.getComments(requestId);
  }
}
