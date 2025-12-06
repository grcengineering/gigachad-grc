import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { FrameworksModule } from './frameworks/frameworks.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { MappingsModule } from './mappings/mappings.module';
import { EventsModule } from '@gigachad-grc/shared';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    EventsModule,
    FrameworksModule,
    AssessmentsModule,
    MappingsModule,
  ],
})
export class AppModule {}



