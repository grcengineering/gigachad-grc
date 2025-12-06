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
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CollectorsService } from './collectors.service';
import { CreateCollectorDto, UpdateCollectorDto, TestCollectorDto } from './dto/collector.dto';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@ApiTags('evidence-collectors')
@ApiBearerAuth()
@Controller('api/controls/:controlId/implementations/:implementationId/collectors')
@UseGuards(DevAuthGuard)
export class CollectorsController {
  constructor(private readonly collectorsService: CollectorsService) {}

  @Get()
  @ApiOperation({ summary: 'List all evidence collectors for a control' })
  @ApiParam({ name: 'controlId', description: 'Control ID' })
  @ApiParam({ name: 'implementationId', description: 'Implementation ID' })
  findAll(
    @Request() req: any,
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
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.collectorsService.findOne(id, req.user.organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new evidence collector' })
  @ApiParam({ name: 'controlId', description: 'Control ID' })
  @ApiParam({ name: 'implementationId', description: 'Implementation ID' })
  create(
    @Request() req: any,
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
  update(
    @Request() req: any,
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
  delete(@Request() req: any, @Param('id') id: string) {
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
  test(
    @Request() req: any,
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
  run(@Request() req: any, @Param('id') id: string) {
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
    @Request() req: any,
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    return this.collectorsService.getRuns(id, req.user.organizationId, limit);
  }
}



