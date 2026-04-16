import { Module } from '@nestjs/common';
import { RevisionesController } from './revisiones.controller';
import { RevisionesService } from './revisiones.service';

@Module({
  controllers: [RevisionesController],
  providers: [RevisionesService],
})
export class RevisionesModule {}
