import { Module } from '@nestjs/common';
import { ControlsController } from './controls.controller';
import { ControlsService } from './controls.service';
import { ImplementationsController } from './implementations.controller';
import { ImplementationsService } from './implementations.service';

@Module({
  controllers: [ControlsController, ImplementationsController],
  providers: [ControlsService, ImplementationsService],
  exports: [ControlsService, ImplementationsService],
})
export class ControlsModule {}



