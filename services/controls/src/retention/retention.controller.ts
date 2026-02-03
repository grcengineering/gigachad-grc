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
import { RetentionService } from './retention.service';
import {
  CreateRetentionPolicyDto,
  UpdateRetentionPolicyDto,
  RetentionPolicyDto,
  RetentionPolicyListQueryDto,
  RunRetentionPolicyDto,
  RetentionRunResultDto,
} from './dto/retention.dto';
import { CurrentUser, UserContext, Roles, RolesGuard } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@ApiTags('Retention Policies')
@ApiBearerAuth()
@UseGuards(DevAuthGuard, RolesGuard)
@Roles('admin')
@Controller('api/retention-policies')
export class RetentionController {
  constructor(private readonly retentionService: RetentionService) {}

  @Get()
  @ApiOperation({ summary: 'List retention policies' })
  async listPolicies(
    @CurrentUser() user: UserContext,
    @Query() query: RetentionPolicyListQueryDto,
  ) {
    return this.retentionService.listPolicies(user.organizationId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a retention policy' })
  @ApiResponse({ status: 200, type: RetentionPolicyDto })
  async getPolicy(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
  ): Promise<RetentionPolicyDto> {
    return this.retentionService.getPolicy(user.organizationId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a retention policy' })
  @ApiResponse({ status: 201, type: RetentionPolicyDto })
  async createPolicy(
    @CurrentUser() user: UserContext,
    @Body() dto: CreateRetentionPolicyDto,
  ): Promise<RetentionPolicyDto> {
    return this.retentionService.createPolicy(
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a retention policy' })
  @ApiResponse({ status: 200, type: RetentionPolicyDto })
  async updatePolicy(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
    @Body() dto: UpdateRetentionPolicyDto,
  ): Promise<RetentionPolicyDto> {
    return this.retentionService.updatePolicy(user.organizationId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a retention policy' })
  async deletePolicy(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
  ): Promise<void> {
    return this.retentionService.deletePolicy(user.organizationId, id);
  }

  @Post(':id/run')
  @ApiOperation({ summary: 'Run a retention policy (dry run by default)' })
  @ApiResponse({ status: 200, type: RetentionRunResultDto })
  async runPolicy(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
    @Body() dto: RunRetentionPolicyDto,
  ): Promise<RetentionRunResultDto> {
    return this.retentionService.runPolicy(user.organizationId, id, dto);
  }
}
