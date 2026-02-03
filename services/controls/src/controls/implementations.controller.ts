import {
  Controller,
  Get,
  Put,
  Post,
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
  ApiParam,
} from '@nestjs/swagger';
import { ImplementationsService } from './implementations.service';
import {
  UpdateImplementationDto,
  CreateControlTestDto,
  ImplementationFilterDto,
  BulkUpdateImplementationsDto,
} from './dto/implementation.dto';
import {
  Roles,
  RolesGuard,
  CurrentUser,
  UserContext,
} from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@ApiTags('implementations')
@ApiBearerAuth()
@Controller('api/implementations')
@UseGuards(DevAuthGuard, RolesGuard)
export class ImplementationsController {
  constructor(private readonly implementationsService: ImplementationsService) {}

  @Get()
  @ApiOperation({ summary: 'List control implementations' })
  @ApiResponse({ status: 200, description: 'Returns paginated implementations' })
  async findAll(
    @CurrentUser() user: UserContext,
    @Query() filters: ImplementationFilterDto,
  ) {
    return this.implementationsService.findAll(user.organizationId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get implementation by ID' })
  @ApiParam({ name: 'id', description: 'Implementation ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.implementationsService.findOne(id, user.organizationId);
  }

  @Put(':id')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Update implementation status' })
  @ApiParam({ name: 'id', description: 'Implementation ID' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Body() dto: UpdateImplementationDto,
  ) {
    return this.implementationsService.update(
      id,
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Post('bulk-update')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Bulk update implementations' })
  async bulkUpdate(
    @CurrentUser() user: UserContext,
    @Body() dto: BulkUpdateImplementationsDto,
  ) {
    return this.implementationsService.bulkUpdate(
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Post(':id/tests')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Record a control test' })
  @ApiParam({ name: 'id', description: 'Implementation ID' })
  async createTest(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Body() dto: CreateControlTestDto,
  ) {
    return this.implementationsService.createTest(
      id,
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Get(':id/tests')
  @ApiOperation({ summary: 'Get test history for implementation' })
  @ApiParam({ name: 'id', description: 'Implementation ID' })
  async getTestHistory(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.implementationsService.getTestHistory(id, user.organizationId);
  }

  @Post('initialize')
  @Roles('admin')
  @ApiOperation({ summary: 'Initialize implementations for all controls' })
  async initialize(@CurrentUser() user: UserContext) {
    return this.implementationsService.initializeForOrganization(
      user.organizationId,
      user.userId,
    );
  }
}

