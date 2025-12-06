import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { CustomIntegrationService } from './custom/custom-integration.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, CustomIntegrationService],
  exports: [IntegrationsService, CustomIntegrationService],
})
export class IntegrationsModule {}

