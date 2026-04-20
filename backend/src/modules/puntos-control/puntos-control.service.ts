import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PuntosControlService {
  constructor(private readonly prisma: PrismaService) {}

  listBySede(empresaId: string, sedeId: string) {
    return this.prisma.puntoControl.findMany({
      where: { empresaId, sedeId, desinstalado: false },
      include: { tipo: true, zona: true, plano: true },
      orderBy: [{ orden: 'asc' }, { codigo: 'asc' }],
    });
  }

  async findOne(empresaId: string, id: string) {
    const pc = await this.prisma.puntoControl.findFirst({
      where: { id, empresaId },
      include: { tipo: true, zona: true, plano: true, sede: true },
    });
    if (!pc) throw new NotFoundException('Punto de control no encontrado');
    return pc;
  }

  create(empresaId: string, data: any) {
    return this.prisma.puntoControl.create({ data: { ...data, empresaId } });
  }

  update(empresaId: string, id: string, data: any) {
    return this.prisma.puntoControl.update({
      where: { id },
      data,
    });
  }

  // Mover punto en el plano (x,y)
  mover(empresaId: string, id: string, x: number, y: number) {
    return this.prisma.puntoControl.update({
      where: { id },
      data: { x, y },
    });
  }

  desinstalar(empresaId: string, id: string, motivo: string) {
    return this.prisma.puntoControl.update({
      where: { id },
      data: { desinstalado: true, motivoDesinstalacion: motivo, revisable: false },
    });
  }
}
