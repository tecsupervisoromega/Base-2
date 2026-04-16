import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrdenesTrabajoService } from './ordenes-trabajo.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('ordenes-trabajo')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('ordenes-trabajo')
export class OrdenesTrabajoController {
  constructor(private readonly odts: OrdenesTrabajoService) {}

  @Get()
  list(
    @CurrentUser() u: AuthUser,
    @Query('estado') estado?: string,
    @Query('tecnicoId') tecnicoId?: string,
    @Query('fecha') fecha?: string,
  ) {
    return this.odts.list(u.empresaId, { estado, tecnicoId, fecha });
  }

  @Get('mi-dia')
  miDia(@CurrentUser() u: AuthUser, @Query('fecha') fecha: string) {
    if (!u.empleadoId) return [];
    return this.odts.misOdts(u.empresaId, u.empleadoId, fecha);
  }

  @Get(':id')
  get(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.odts.findOne(u.empresaId, id);
  }

  @Post()
  create(@CurrentUser() u: AuthUser, @Body() body: any) {
    return this.odts.create(u.empresaId, body);
  }

  @Patch(':id/asignar')
  asignar(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() body: { empleadoIds: string[] },
  ) {
    return this.odts.asignar(u.empresaId, id, body.empleadoIds);
  }

  @Patch(':id/iniciar')
  iniciar(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.odts.iniciar(u.empresaId, id);
  }

  @Patch(':id/cerrar')
  cerrar(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() body: any) {
    return this.odts.cerrar(u.empresaId, id, body);
  }
}
