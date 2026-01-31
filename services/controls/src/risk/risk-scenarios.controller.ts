 
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { RiskScenariosService } from './risk-scenarios.service';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Resource, Action } from '../permissions/dto/permission.dto';
import {
  CreateRiskScenarioDto,
  UpdateRiskScenarioDto,
  ListRiskScenariosQueryDto,
  CloneScenarioDto,
} from './dto/risk-scenario.dto';

@Controller('api/risk-scenarios')
@UseGuards(DevAuthGuard, PermissionGuard)
export class RiskScenariosController {
  constructor(private readonly riskScenariosService: RiskScenariosService) {}

  @Get()
  @RequirePermission(Resource.RISK, Action.READ)
  async list(
    @Headers('x-organization-id') organizationId: string,
    @Query(new ValidationPipe({ transform: true })) query: ListRiskScenariosQueryDto,
  ) {
    return this.riskScenariosService.listScenarios(organizationId, query);
  }

  @Get('templates')
  @RequirePermission(Resource.RISK, Action.READ)
  async getTemplates(@Headers('x-organization-id') organizationId: string) {
    return this.riskScenariosService.getTemplates(organizationId);
  }

  @Get('library')
  @RequirePermission(Resource.RISK, Action.READ)
  async getLibrary() {
    // Get global library templates available to all organizations
    return this.riskScenariosService.getLibraryTemplates();
  }

  @Get('library/by-category')
  @RequirePermission(Resource.RISK, Action.READ)
  async getLibraryByCategory() {
    // Get library templates grouped by category
    return this.riskScenariosService.getLibraryByCategory();
  }

  @Get('categories')
  @RequirePermission(Resource.RISK, Action.READ)
  async getCategories(@Headers('x-organization-id') organizationId: string) {
    return this.riskScenariosService.getCategories(organizationId);
  }

  @Get('statistics')
  @RequirePermission(Resource.RISK, Action.READ)
  async getStatistics(@Headers('x-organization-id') organizationId: string) {
    return this.riskScenariosService.getStatistics(organizationId);
  }

  @Get(':id')
  @RequirePermission(Resource.RISK, Action.READ)
  async get(
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.riskScenariosService.getScenario(organizationId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(Resource.RISK, Action.CREATE)
  async create(
    @Headers('x-organization-id') organizationId: string,
    @Headers('x-user-id') userId: string,
    @Body(new ValidationPipe({ transform: true })) dto: CreateRiskScenarioDto,
  ) {
    return this.riskScenariosService.createScenario(organizationId, userId, dto);
  }

  @Put(':id')
  @RequirePermission(Resource.RISK, Action.UPDATE)
  async update(
    @Headers('x-organization-id') organizationId: string,
    @Headers('x-user-id') userId: string,
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true })) dto: UpdateRiskScenarioDto,
  ) {
    return this.riskScenariosService.updateScenario(organizationId, userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Resource.RISK, Action.DELETE)
  async delete(
    @Headers('x-organization-id') organizationId: string,
    @Headers('x-user-id') userId: string,
    @Param('id') id: string,
  ) {
    return this.riskScenariosService.deleteScenario(organizationId, userId, id);
  }

  @Post(':id/clone')
  @RequirePermission(Resource.RISK, Action.CREATE)
  async clone(
    @Headers('x-organization-id') organizationId: string,
    @Headers('x-user-id') userId: string,
    @Param('id') id: string,
    @Body() dto: CloneScenarioDto,
  ) {
    return this.riskScenariosService.cloneScenario(organizationId, userId, id, dto.newTitle);
  }

  @Post(':id/simulate')
  @RequirePermission(Resource.RISK, Action.UPDATE)
  async simulate(
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
    @Body() body: { controlEffectiveness?: number; mitigations?: string[] },
  ) {
    return this.riskScenariosService.runSimulation(organizationId, id, body);
  }

  @Post('bulk/from-templates')
  @RequirePermission(Resource.RISK, Action.CREATE)
  async bulkCreateFromTemplates(
    @Headers('x-organization-id') organizationId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { templateIds: string[] },
  ) {
    return this.riskScenariosService.bulkCreateFromTemplates(
      organizationId,
      userId,
      body.templateIds,
    );
  }
}

