import { Module } from '@nestjs/common';
import { FrameworksController, UsersController } from './frameworks.controller';
import { FrameworksService } from './frameworks.service';

@Module({
  controllers: [FrameworksController, UsersController],
  providers: [FrameworksService],
  exports: [FrameworksService],
})
export class FrameworksModule {}

