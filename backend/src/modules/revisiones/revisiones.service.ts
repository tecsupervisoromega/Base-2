import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type IniciarRevisionDto = {
  odtId: string;
  puntoControlId: string;
  empleadoId?: string;
  lat?: number;
  lng?: number;
};

type ResponderRevisionDto = {
  estadoConservacion?: 'bueno' | 'regular' | 'malo' | 'sustituido' | 'desinstalado';
  hayIncidencia?: boolean;
  seCambiaElCebo?: boolean;
  seSustituyeDispositivo?: boolean;
  inaccesible?: boolean;
  observaciones?: string;
  datoGrafico1?: number;
  datoGrafico2?: number;
  respuestas?: Array<{
    preguntaId: string;
    codigoPregunta: string;
    textoPregunta: string;
    respuesta?: string;
    orden?: number;
  }>;
  productos?: Array<{
    productoId: string;
    cantidad: number;
    unidadMedida?: string;
    lote?: string;
    fechaCaducidad?: string;
    dosificacion?: string;
    agenteACombatir?: string;
  }>;
};

@Injectable()
export class RevisionesService {
  constructor(private readonly prisma: PrismaService) {}

  // Puntos de control asociados a la OT (o todos los de la sede si la OT no los preselecciono)
  async puntosDeOdt(empresaId: string, odtId: string) {
    const odt = await this.prisma.ordenTrabajo.findFirst({
      where: { id: odtId, empresaId },
      select: { id: true, sedeId: true },
    });
    if (!odt) throw new NotFoundException('OT no encontrada');

    const asignados = await this.prisma.ordenTrabajoPuntoControl.findMany({
      where: { odtId },
      select: { puntoControlId: true },
    });
    const idsAsignados = asignados.map((a) => a.puntoControlId);

    const puntos = await this.prisma.puntoControl.findMany({
      where: {
        empresaId,
        sedeId: odt.sedeId,
        desinstalado: false,
        ...(idsAsignados.length > 0 ? { id: { in: idsAsignados } } : {}),
      },
      include: { tipo: true, zona: true },
      orderBy: [{ orden: 'asc' }, { codigo: 'asc' }],
    });

    // Adjuntamos ultima revision de esta OT por cada punto
    const revisiones = await this.prisma.revision.findMany({
      where: { odtId, empresaId },
      select: { id: true, puntoControlId: true, estado: true, hayIncidencia: true, fecha: true },
    });
    const byPc: Record<string, (typeof revisiones)[0]> = {};
    for (const r of revisiones) byPc[r.puntoControlId] = r;

    return puntos.map((p) => ({
      ...p,
      revisionActual: byPc[p.id] ?? null,
    }));
  }

  // Catalogo de preguntas del checklist por tipo de punto de control
  preguntasPorTipo(empresaId: string, tipoPuntoControlId: string) {
    return this.prisma.preguntaRevision.findMany({
      where: { empresaId, tipoPuntoControlId },
      orderBy: { orden: 'asc' },
    });
  }

  async iniciar(empresaId: string, data: IniciarRevisionDto) {
    const existente = await this.prisma.revision.findFirst({
      where: { empresaId, odtId: data.odtId, puntoControlId: data.puntoControlId },
      include: { respuestas: true, productos: true, fotos: true },
    });
    if (existente) return existente;

    return this.prisma.revision.create({
      data: {
        empresaId,
        odtId: data.odtId,
        puntoControlId: data.puntoControlId,
        empleadoId: data.empleadoId,
        lat: data.lat,
        lng: data.lng,
        estado: 'pendiente',
      },
    });
  }

  async findOne(empresaId: string, id: string) {
    const r = await this.prisma.revision.findFirst({
      where: { id, empresaId },
      include: {
        respuestas: { orderBy: { orden: 'asc' } },
        productos: { include: { producto: true } },
        fotos: true,
        puntoControl: { include: { tipo: true } },
      },
    });
    if (!r) throw new NotFoundException('Revision no encontrada');
    return r;
  }

  async finalizar(empresaId: string, id: string, data: ResponderRevisionDto) {
    const r = await this.prisma.revision.findFirst({ where: { id, empresaId } });
    if (!r) throw new NotFoundException('Revision no encontrada');

    const estado = data.inaccesible ? 'inaccesible' : 'realizada';

    return this.prisma.$transaction(async (tx) => {
      // Reemplazar respuestas
      if (data.respuestas) {
        await tx.preguntaRespuestaRevision.deleteMany({ where: { revisionId: id } });
        if (data.respuestas.length > 0) {
          await tx.preguntaRespuestaRevision.createMany({
            data: data.respuestas.map((x, idx) => ({
              revisionId: id,
              preguntaId: x.preguntaId,
              codigoPregunta: x.codigoPregunta,
              textoPregunta: x.textoPregunta,
              respuesta: x.respuesta,
              orden: x.orden ?? idx,
            })),
          });
        }
      }

      // Reemplazar productos aplicados
      if (data.productos) {
        await tx.lineaProductoRevision.deleteMany({ where: { revisionId: id } });
        if (data.productos.length > 0) {
          await tx.lineaProductoRevision.createMany({
            data: data.productos.map((p) => ({
              revisionId: id,
              productoId: p.productoId,
              cantidad: p.cantidad as any,
              unidadMedida: p.unidadMedida,
              lote: p.lote,
              fechaCaducidad: p.fechaCaducidad ? new Date(p.fechaCaducidad) : null,
              dosificacion: p.dosificacion,
              agenteACombatir: p.agenteACombatir,
            })),
          });
        }
      }

      return tx.revision.update({
        where: { id },
        data: {
          estado: estado as any,
          estadoConservacion: data.estadoConservacion as any,
          hayIncidencia: data.hayIncidencia ?? false,
          seCambiaElCebo: data.seCambiaElCebo ?? false,
          seSustituyeDispositivo: data.seSustituyeDispositivo ?? false,
          inaccesible: data.inaccesible ?? false,
          observaciones: data.observaciones,
          datoGrafico1: data.datoGrafico1 as any,
          datoGrafico2: data.datoGrafico2 as any,
        },
        include: { respuestas: true, productos: true, fotos: true },
      });
    });
  }

  async addFoto(empresaId: string, revisionId: string, url: string, descripcion?: string) {
    const r = await this.prisma.revision.findFirst({ where: { id: revisionId, empresaId } });
    if (!r) throw new NotFoundException('Revision no encontrada');
    return this.prisma.fotoRevision.create({
      data: { revisionId, url, descripcion },
    });
  }

  async removeFoto(empresaId: string, revisionId: string, fotoId: string) {
    const r = await this.prisma.revision.findFirst({ where: { id: revisionId, empresaId } });
    if (!r) throw new NotFoundException('Revision no encontrada');
    await this.prisma.fotoRevision.delete({ where: { id: fotoId } });
    return { ok: true };
  }

  // Productos disponibles (para el selector en la PWA)
  productosCatalogo(empresaId: string) {
    return this.prisma.producto.findMany({
      where: { empresaId, obsoleto: false },
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        nombreComercial: true,
        materiaActiva: true,
        registro: true,
        unidadMedida: true,
        dosificacion: true,
      },
    });
  }
}
