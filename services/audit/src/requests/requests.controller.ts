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
import { Roles, RolesGuard } from '@gigachad-grc/shared';

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
@UseGuards(DevAuthGuard, RolesGuard)
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @Roles('admin', 'compliance_manager', 'auditor')
  @ApiOperation({ summary: 'Create a new audit request' })
  @ApiResponse({ status: 201, description: 'Request created successfully' })
  create(@Body() createRequestDto: CreateAuditRequestDto, @Req() req: AuthenticatedRequest) {
    const normalizedDto = {
      ...createRequestDto,
      organizationId: req.user.organizationId,
      assignedTo: createRequestDto.assignedTo || createRequestDto.assigneeId,
    };
    return this.requestsService.create(normalizedDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all audit requests' })
  @ApiResponse({ status: 200, description: 'Returns all requests' })
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('auditId') auditId?: string,
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('category') category?: string
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
  @Roles('admin', 'compliance_manager', 'auditor')
  @ApiOperation({ summary: 'Update a request' })
  @ApiResponse({ status: 200, description: 'Request updated successfully' })
  update(
    @Param('id') id: string,
    @Body() updateRequestDto: UpdateAuditRequestDto,
    @Req() req: AuthenticatedRequest
  ) {
    const { organizationId } = req.user;
    return this.requestsService.update(id, organizationId, {
      ...updateRequestDto,
      assignedTo: updateRequestDto.assignedTo || updateRequestDto.assigneeId,
    });
  }

  @Delete(':id')
  @Roles('admin', 'compliance_manager', 'auditor')
  @ApiOperation({ summary: 'Delete a request' })
  @ApiResponse({ status: 200, description: 'Request deleted successfully' })
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const { organizationId } = req.user;
    return this.requestsService.delete(id, organizationId);
  }

  @Post(':id/comments')
  @Roles('admin', 'compliance_manager', 'auditor')
  @ApiOperation({ summary: 'Add comment to request' })
  @ApiResponse({ status: 201, description: 'Comment added successfully' })
  addComment(
    @Param('id') requestId: string,
    @Body() body: { content: string; isInternal?: boolean },
    @Req() req: AuthenticatedRequest
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
  getComments(@Param('id') requestId: string, @Req() req: AuthenticatedRequest) {
    // SECURITY: Pass organizationId to ensure tenant isolation (IDOR prevention)
    const { organizationId } = req.user;
    return this.requestsService.getComments(requestId, organizationId);
  }
}
