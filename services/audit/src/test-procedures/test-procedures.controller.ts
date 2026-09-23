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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import {
  TestProceduresService,
  CreateTestProcedureDto,
  UpdateTestProcedureDto,
  RecordTestResultDto,
} from './test-procedures.service';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { Roles, RolesGuard } from '@gigachad-grc/shared';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    organizationId: string;
  };
}

@ApiTags('Test Procedures')
@ApiBearerAuth()
@UseGuards(DevAuthGuard, RolesGuard)
@Controller('api/audit/test-procedures')
export class TestProceduresController {
  constructor(private readonly testProceduresService: TestProceduresService) {}

  @Post()
  @Roles('admin', 'compliance_manager', 'auditor')
  @ApiOperation({ summary: 'Create a test procedure' })
  create(@Body() dto: CreateTestProcedureDto, @Req() req: AuthenticatedRequest) {
    return this.testProceduresService.create(req.user.organizationId, dto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List test procedures' })
  findAll(
    @Query('auditId') auditId: string,
    @Query('controlId') controlId: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.testProceduresService.findAll(req.user.organizationId, auditId, controlId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get test procedure statistics' })
  getStats(@Query('auditId') auditId: string, @Req() req: AuthenticatedRequest) {
    return this.testProceduresService.getStats(req.user.organizationId, auditId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a test procedure' })
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.testProceduresService.findOne(id, req.user.organizationId);
  }

  @Put(':id')
  @Roles('admin', 'compliance_manager', 'auditor')
  @ApiOperation({ summary: 'Update a test procedure' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTestProcedureDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.testProceduresService.update(id, req.user.organizationId, dto);
  }

  @Post(':id/record-result')
  @Roles('admin', 'compliance_manager', 'auditor')
  @ApiOperation({ summary: 'Record test result' })
  recordResult(
    @Param('id') id: string,
    @Body() dto: RecordTestResultDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.testProceduresService.recordResult(
      id,
      req.user.organizationId,
      dto,
      req.user.userId
    );
  }

  @Post(':id/review')
  @Roles('admin', 'compliance_manager', 'auditor')
  @ApiOperation({ summary: 'Review test procedure' })
  review(
    @Param('id') id: string,
    @Body() body: { notes: string },
    @Req() req: AuthenticatedRequest
  ) {
    return this.testProceduresService.review(
      id,
      req.user.organizationId,
      body.notes,
      req.user.userId
    );
  }

  @Delete(':id')
  @Roles('admin', 'compliance_manager', 'auditor')
  @ApiOperation({ summary: 'Delete a test procedure' })
  delete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.testProceduresService.delete(id, req.user.organizationId);
  }
}
