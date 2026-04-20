import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PuntosControlService } from './puntos-control.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('puntos-control')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('puntos-control')
export class PuntosControlController {
  constructor(private readonly pc: PuntosControlService) {}

  @Get()
  list(@CurrentUser() u: AuthUser, @Query('sedeId') sedeId: string) {
    return this.pc.listBySede(u.empresaId, sedeId);
  }

  @Get(':id')
  get(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.pc.findOne(u.empresaId, id);
  }

  @Post()
  create(@CurrentUser() u: AuthUser, @Body() body: any) {
    return this.pc.create(u.empresaId, body);
  }

  @Patch(':id')
  update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() body: any) {
    return this.pc.update(u.empresaId, id, body);
  }

  @Patch(':id/mover')
  mover(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() body: { x: number; y: number },
  ) {
    return this.pc.mover(u.empresaId, id, body.x, body.y);
  }

  @Patch(':id/desinstalar')
  desinstalar(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() body: { motivo: string },
  ) {
    return this.pc.desinstalar(u.empresaId, id, body.motivo);
  }
}
