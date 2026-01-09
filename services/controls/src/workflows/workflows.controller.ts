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
import { WorkflowsService } from './workflows.service';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  WorkflowDto,
  CreateApprovalRequestDto,
  ApprovalActionDto,
  ApprovalRequestDto,
  ApprovalRequestListQueryDto,
  WorkflowListQueryDto,
} from './dto/workflow.dto';
import { CurrentUser, UserContext, Roles } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@ApiTags('Approval Workflows')
@ApiBearerAuth()
@UseGuards(DevAuthGuard)
@Controller('api/workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  // ==================== Workflow Definitions ====================

  @Get()
  @ApiOperation({ summary: 'List workflow definitions' })
  async listWorkflows(
    @CurrentUser() user: UserContext,
    @Query() query: WorkflowListQueryDto,
  ) {
    return this.workflowsService.listWorkflows(user.organizationId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a workflow definition' })
  @ApiResponse({ status: 200, type: WorkflowDto })
  async getWorkflow(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
  ): Promise<WorkflowDto> {
    return this.workflowsService.getWorkflow(user.organizationId, id);
  }

  @Post()
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Create a workflow definition' })
  @ApiResponse({ status: 201, type: WorkflowDto })
  async createWorkflow(
    @CurrentUser() user: UserContext,
    @Body() dto: CreateWorkflowDto,
  ): Promise<WorkflowDto> {
    return this.workflowsService.createWorkflow(
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Put(':id')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Update a workflow definition' })
  @ApiResponse({ status: 200, type: WorkflowDto })
  async updateWorkflow(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
    @Body() dto: UpdateWorkflowDto,
  ): Promise<WorkflowDto> {
    return this.workflowsService.updateWorkflow(user.organizationId, id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a workflow definition' })
  async deleteWorkflow(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
  ): Promise<void> {
    return this.workflowsService.deleteWorkflow(user.organizationId, id);
  }

  // ==================== Approval Requests ====================

  @Get('requests')
  @ApiOperation({ summary: 'List approval requests' })
  async listApprovalRequests(
    @CurrentUser() user: UserContext,
    @Query() query: ApprovalRequestListQueryDto,
  ) {
    return this.workflowsService.listApprovalRequests(
      user.organizationId,
      user.userId,
      query,
    );
  }

  @Get('requests/pending')
  @ApiOperation({ summary: 'List approval requests pending my action' })
  async listPendingApprovals(@CurrentUser() user: UserContext) {
    return this.workflowsService.listApprovalRequests(
      user.organizationId,
      user.userId,
      { pendingMyApproval: true },
    );
  }

  @Get('requests/:id')
  @ApiOperation({ summary: 'Get an approval request' })
  @ApiResponse({ status: 200, type: ApprovalRequestDto })
  async getApprovalRequest(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
  ): Promise<ApprovalRequestDto> {
    return this.workflowsService.getApprovalRequest(user.organizationId, id);
  }

  @Post('requests')
  @ApiOperation({ summary: 'Create an approval request' })
  @ApiResponse({ status: 201, type: ApprovalRequestDto })
  async createApprovalRequest(
    @CurrentUser() user: UserContext,
    @Body() dto: CreateApprovalRequestDto,
  ): Promise<ApprovalRequestDto> {
    return this.workflowsService.createApprovalRequest(
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Post('requests/:id/action')
  @ApiOperation({ summary: 'Approve or reject a request' })
  @ApiResponse({ status: 200, type: ApprovalRequestDto })
  async approveOrReject(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
    @Body() dto: ApprovalActionDto,
  ): Promise<ApprovalRequestDto> {
    return this.workflowsService.approveOrReject(
      user.organizationId,
      user.userId,
      id,
      dto,
    );
  }

  @Delete('requests/:id')
  @ApiOperation({ summary: 'Cancel an approval request' })
  async cancelRequest(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
  ): Promise<void> {
    return this.workflowsService.cancelRequest(
      user.organizationId,
      user.userId,
      id,
    );
  }
}
