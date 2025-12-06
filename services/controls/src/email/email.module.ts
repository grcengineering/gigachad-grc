import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailTemplatesService } from './email-templates.service';

@Module({
  imports: [ConfigModule],
  providers: [EmailService, EmailTemplatesService],
  exports: [EmailService, EmailTemplatesService],
})
export class EmailModule {}
