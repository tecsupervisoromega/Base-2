import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RevisionesService } from './revisiones.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('revisiones')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller()
export class RevisionesController {
  constructor(private readonly svc: RevisionesService) {}

  // Puntos de control de una OT (con revision actual si existe)
  @Get('ordenes-trabajo/:odtId/puntos-control')
  puntosDeOdt(@CurrentUser() u: AuthUser, @Param('odtId') odtId: string) {
    return this.svc.puntosDeOdt(u.empresaId, odtId);
  }

  // Catalogo de preguntas por tipo de punto de control
  @Get('preguntas-revision')
  preguntasPorTipo(@CurrentUser() u: AuthUser, @Query('tipoPuntoControlId') tipoPuntoControlId: string) {
    return this.svc.preguntasPorTipo(u.empresaId, tipoPuntoControlId);
  }

  // Catalogo de productos biocidas activos
  @Get('productos/catalogo')
  productosCatalogo(@CurrentUser() u: AuthUser) {
    return this.svc.productosCatalogo(u.empresaId);
  }

  @Post('revisiones/iniciar')
  iniciar(
    @CurrentUser() u: AuthUser,
    @Body() body: { odtId: string; puntoControlId: string; lat?: number; lng?: number },
  ) {
    return this.svc.iniciar(u.empresaId, {
      ...body,
      empleadoId: u.empleadoId ?? undefined,
    });
  }

  @Get('revisiones/:id')
  findOne(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.findOne(u.empresaId, id);
  }

  @Patch('revisiones/:id/finalizar')
  finalizar(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() body: any) {
    return this.svc.finalizar(u.empresaId, id, body);
  }

  @Post('revisiones/:id/fotos')
  addFoto(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() body: { url: string; descripcion?: string },
  ) {
    return this.svc.addFoto(u.empresaId, id, body.url, body.descripcion);
  }

  @Delete('revisiones/:id/fotos/:fotoId')
  removeFoto(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Param('fotoId') fotoId: string,
  ) {
    return this.svc.removeFoto(u.empresaId, id, fotoId);
  }
}
