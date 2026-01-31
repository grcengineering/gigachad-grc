 
import { Module } from '@nestjs/common';
import { ServiceNowService } from './servicenow.service';
import { ServiceNowController } from './servicenow.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ServiceNowService],
  controllers: [ServiceNowController],
  exports: [ServiceNowService],
})
export class ServiceNowModule {}
