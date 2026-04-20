import { Module } from '@nestjs/common';
import { PuntosControlController } from './puntos-control.controller';
import { PuntosControlService } from './puntos-control.service';

@Module({
  controllers: [PuntosControlController],
  providers: [PuntosControlService],
})
export class PuntosControlModule {}
