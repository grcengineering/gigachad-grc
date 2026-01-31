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
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CollectorsService } from './collectors.service';
import { CreateCollectorDto, UpdateCollectorDto, TestCollectorDto } from './dto/collector.dto';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Resource, Action } from '../permissions/dto/permission.dto';

interface AuthenticatedRequest extends Request {
  user: { userId: string; organizationId: string; email?: string };
}

@ApiTags('evidence-collectors')
@ApiBearerAuth()
@Controller('api/controls/:controlId/implementations/:implementationId/collectors')
@UseGuards(DevAuthGuard, PermissionGuard)
export class CollectorsController {
  constructor(private readonly collectorsService: CollectorsService) {}

  @Get()
  @ApiOperation({ summary: 'List all evidence collectors for a control' })
  @ApiParam({ name: 'controlId', description: 'Control ID' })
  @ApiParam({ name: 'implementationId', description: 'Implementation ID' })
  @RequirePermission(Resource.CONTROLS, Action.READ, 'controlId')
  findAll(
    @Req() req: AuthenticatedRequest,
    @Param('controlId') controlId: string,
    @Param('implementationId') implementationId: string,
  ) {
    return this.collectorsService.findAllForControl(
      controlId,
      implementationId,
      req.user.organizationId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single evidence collector' })
  @ApiParam({ name: 'controlId', description: 'Control ID' })
  @ApiParam({ name: 'implementationId', description: 'Implementation ID' })
  @ApiParam({ name: 'id', description: 'Collector ID' })
  @RequirePermission(Resource.CONTROLS, Action.READ, 'controlId')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.collectorsService.findOne(id, req.user.organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new evidence collector' })
  @ApiParam({ name: 'controlId', description: 'Control ID' })
  @ApiParam({ name: 'implementationId', description: 'Implementation ID' })
  @RequirePermission(Resource.CONTROLS, Action.UPDATE, 'controlId')
  create(
    @Req() req: AuthenticatedRequest,
    @Param('controlId') controlId: string,
    @Param('implementationId') implementationId: string,
    @Body() dto: CreateCollectorDto,
  ) {
    return this.collectorsService.create(
      controlId,
      implementationId,
      req.user.organizationId,
      req.user.userId,
      dto,
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an evidence collector' })
  @ApiParam({ name: 'controlId', description: 'Control ID' })
  @ApiParam({ name: 'implementationId', description: 'Implementation ID' })
  @ApiParam({ name: 'id', description: 'Collector ID' })
  @RequirePermission(Resource.CONTROLS, Action.UPDATE, 'controlId')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCollectorDto,
  ) {
    return this.collectorsService.update(
      id,
      req.user.organizationId,
      req.user.userId,
      dto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an evidence collector' })
  @ApiParam({ name: 'controlId', description: 'Control ID' })
  @ApiParam({ name: 'implementationId', description: 'Implementation ID' })
  @ApiParam({ name: 'id', description: 'Collector ID' })
  @RequirePermission(Resource.CONTROLS, Action.UPDATE, 'controlId')
  delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.collectorsService.delete(
      id,
      req.user.organizationId,
      req.user.userId,
    );
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test an evidence collector configuration' })
  @ApiParam({ name: 'controlId', description: 'Control ID' })
  @ApiParam({ name: 'implementationId', description: 'Implementation ID' })
  @ApiParam({ name: 'id', description: 'Collector ID' })
  @RequirePermission(Resource.CONTROLS, Action.UPDATE, 'controlId')
  test(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: TestCollectorDto,
  ) {
    return this.collectorsService.test(
      id,
      req.user.organizationId,
      req.user.userId,
      dto,
    );
  }

  @Post(':id/run')
  @ApiOperation({ summary: 'Run an evidence collector to collect evidence' })
  @ApiParam({ name: 'controlId', description: 'Control ID' })
  @ApiParam({ name: 'implementationId', description: 'Implementation ID' })
  @ApiParam({ name: 'id', description: 'Collector ID' })
  @RequirePermission(Resource.CONTROLS, Action.UPDATE, 'controlId')
  run(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.collectorsService.run(
      id,
      req.user.organizationId,
      req.user.userId,
    );
  }

  @Get(':id/runs')
  @ApiOperation({ summary: 'Get run history for an evidence collector' })
  @ApiParam({ name: 'controlId', description: 'Control ID' })
  @ApiParam({ name: 'implementationId', description: 'Implementation ID' })
  @ApiParam({ name: 'id', description: 'Collector ID' })
  getRuns(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    return this.collectorsService.getRuns(id, req.user.organizationId, limit);
  }
}



