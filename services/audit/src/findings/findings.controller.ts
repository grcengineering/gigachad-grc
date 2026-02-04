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
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FindingsService } from './findings.service';
import { CreateFindingDto } from './dto/create-finding.dto';
import { UpdateFindingDto } from './dto/update-finding.dto';
import { DevAuthGuard } from '../auth/dev-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    organizationId: string;
    email: string;
    role: string;
  };
}

@ApiTags('Findings')
@ApiBearerAuth()
@Controller('findings')
@UseGuards(DevAuthGuard)
export class FindingsController {
  constructor(private readonly findingsService: FindingsService) {}

  @Post()
  create(@Body() createFindingDto: CreateFindingDto, @Req() req: AuthenticatedRequest) {
    return this.findingsService.create(createFindingDto, req.user.userId);
  }

  @Get()
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('auditId') auditId?: string,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('category') category?: string,
    @Query('remediationOwner') remediationOwner?: string
  ) {
    return this.findingsService.findAll(req.user.organizationId, {
      auditId,
      status,
      severity,
      category,
      remediationOwner,
    });
  }

  @Get('stats')
  getStats(@Req() req: AuthenticatedRequest) {
    return this.findingsService.getStats(req.user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.findingsService.findOne(id, req.user.organizationId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateFindingDto: UpdateFindingDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.findingsService.update(id, req.user.organizationId, updateFindingDto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.findingsService.delete(id, req.user.organizationId);
  }

  @Post('bulk/status')
  bulkUpdateStatus(
    @Body() body: { ids: string[]; status: string },
    @Req() req: AuthenticatedRequest
  ) {
    if (body.ids.length > 100) {
      throw new BadRequestException('Maximum 100 items per bulk operation');
    }
    return this.findingsService.bulkUpdateStatus(body.ids, req.user.organizationId, body.status);
  }
}
