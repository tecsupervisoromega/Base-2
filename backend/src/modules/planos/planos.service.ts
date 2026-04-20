import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlanosService {
  constructor(private readonly prisma: PrismaService) {}

  listBySede(empresaId: string, sedeId: string) {
    return this.prisma.planoSede.findMany({
      where: { empresaId, sedeId },
      orderBy: [{ activo: 'desc' }, { orden: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(empresaId: string, id: string) {
    const p = await this.prisma.planoSede.findFirst({
      where: { id, empresaId },
      include: {
        puntosControl: {
          where: { desinstalado: false },
          include: { tipo: true, zona: true },
          orderBy: [{ orden: 'asc' }, { codigo: 'asc' }],
        },
      },
    });
    if (!p) throw new NotFoundException('Plano no encontrado');
    return p;
  }

  async create(
    empresaId: string,
    data: {
      sedeId: string;
      nombre: string;
      archivoUrl: string;
      tipo?: 'imagen' | 'pdf' | 'svg';
      ancho?: number;
      alto?: number;
      orden?: number;
      activo?: boolean;
    },
  ) {
    // Verificar que la sede pertenece a la empresa
    const sede = await this.prisma.sede.findFirst({
      where: { id: data.sedeId, empresaId },
    });
    if (!sede) throw new NotFoundException('Sede no encontrada');

    return this.prisma.planoSede.create({
      data: {
        empresaId,
        sedeId: data.sedeId,
        nombre: data.nombre,
        archivoUrl: data.archivoUrl,
        tipo: (data.tipo ?? 'imagen') as any,
        ancho: data.ancho,
        alto: data.alto,
        orden: data.orden ?? 0,
        activo: data.activo ?? true,
      },
    });
  }

  async update(empresaId: string, id: string, data: any) {
    const p = await this.prisma.planoSede.findFirst({ where: { id, empresaId } });
    if (!p) throw new NotFoundException('Plano no encontrado');
    return this.prisma.planoSede.update({ where: { id }, data });
  }

  async remove(empresaId: string, id: string) {
    const p = await this.prisma.planoSede.findFirst({ where: { id, empresaId } });
    if (!p) throw new NotFoundException('Plano no encontrado');
    // Desasignar puntos antes de borrar
    await this.prisma.puntoControl.updateMany({
      where: { planoId: id },
      data: { planoId: null },
    });
    await this.prisma.planoSede.delete({ where: { id } });
    return { ok: true };
  }

  // Asocia/mueve un conjunto de puntos al plano con coords (usado por el editor drag&drop)
  async guardarPosiciones(
    empresaId: string,
    planoId: string,
    puntos: Array<{ id: string; x: number; y: number; planoId?: string | null }>,
  ) {
    const plano = await this.prisma.planoSede.findFirst({ where: { id: planoId, empresaId } });
    if (!plano) throw new NotFoundException('Plano no encontrado');

    await this.prisma.$transaction(
      puntos.map((p) =>
        this.prisma.puntoControl.update({
          where: { id: p.id },
          data: { x: p.x, y: p.y, planoId: p.planoId === null ? null : planoId },
        }),
      ),
    );
    await this.prisma.planoSede.update({
      where: { id: planoId },
      data: { ultimaActualizacionPC: new Date() },
    });
    return { ok: true, count: puntos.length };
  }
}
