import { Module } from '@nestjs/common';
import { PhishingController } from './phishing.controller';
import { PhishingService } from './phishing.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailModule } from '../../email/email.module';
import { PhishingScheduler } from './phishing.scheduler';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [PhishingController],
  providers: [PhishingService, PhishingScheduler],
  exports: [PhishingService],
})
export class PhishingModule {}

