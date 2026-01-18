import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '@gigachad-grc/shared';

// Controllers
import { BusinessProcessesController } from './business-processes.controller';
import { BCDRPlansController } from './bcdr-plans.controller';
import { DRTestsController } from './dr-tests.controller';
import { RunbooksController } from './runbooks.controller';
import { CommunicationPlansController } from './communication-plans.controller';
import { BCDRDashboardController } from './bcdr-dashboard.controller';
import { PlanAttestationsController } from './plan-attestations.controller';
import { ExerciseTemplatesController } from './exercise-templates.controller';
import { RecoveryTeamsController } from './recovery-teams.controller';
import { BCDRIncidentsController } from './bcdr-incidents.controller';

// Services
import { BusinessProcessesService } from './business-processes.service';
import { BCDRPlansService } from './bcdr-plans.service';
import { DRTestsService } from './dr-tests.service';
import { RunbooksService } from './runbooks.service';
import { CommunicationPlansService } from './communication-plans.service';
import { BCDRDashboardService } from './bcdr-dashboard.service';
import { RecoveryStrategiesService } from './recovery-strategies.service';
import { PlanAttestationsService } from './plan-attestations.service';
import { ExerciseTemplatesService } from './exercise-templates.service';
import { RecoveryTeamsService } from './recovery-teams.service';
import { BCDRIncidentsService } from './bcdr-incidents.service';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    NotificationsModule,
    StorageModule.forRoot(),
  ],
  controllers: [
    BusinessProcessesController,
    BCDRPlansController,
    DRTestsController,
    RunbooksController,
    CommunicationPlansController,
    BCDRDashboardController,
    PlanAttestationsController,
    ExerciseTemplatesController,
    RecoveryTeamsController,
    BCDRIncidentsController,
  ],
  providers: [
    BusinessProcessesService,
    BCDRPlansService,
    DRTestsService,
    RunbooksService,
    CommunicationPlansService,
    BCDRDashboardService,
    RecoveryStrategiesService,
    PlanAttestationsService,
    ExerciseTemplatesService,
    RecoveryTeamsService,
    BCDRIncidentsService,
  ],
  exports: [
    BusinessProcessesService,
    BCDRPlansService,
    DRTestsService,
    RunbooksService,
    CommunicationPlansService,
    BCDRDashboardService,
    RecoveryStrategiesService,
    PlanAttestationsService,
    ExerciseTemplatesService,
    RecoveryTeamsService,
    BCDRIncidentsService,
  ],
})
export class BCDRModule {}

