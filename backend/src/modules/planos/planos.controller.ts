import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PlanosService } from './planos.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('planos')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('planos')
export class PlanosController {
  constructor(private readonly svc: PlanosService) {}

  @Get()
  list(@CurrentUser() u: AuthUser, @Query('sedeId') sedeId: string) {
    return this.svc.listBySede(u.empresaId, sedeId);
  }

  @Get(':id')
  get(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.findOne(u.empresaId, id);
  }

  @Post()
  create(@CurrentUser() u: AuthUser, @Body() body: any) {
    return this.svc.create(u.empresaId, body);
  }

  @Patch(':id')
  update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() body: any) {
    return this.svc.update(u.empresaId, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.remove(u.empresaId, id);
  }

  @Patch(':id/posiciones')
  guardarPosiciones(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() body: { puntos: Array<{ id: string; x: number; y: number; planoId?: string | null }> },
  ) {
    return this.svc.guardarPosiciones(u.empresaId, id, body.puntos ?? []);
  }
}
