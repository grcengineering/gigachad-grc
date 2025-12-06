import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuditsModule } from './audits/audits.module';
import { RequestsModule } from './requests/requests.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuditsModule,
    RequestsModule,
  ],
})
export class AppModule {}
