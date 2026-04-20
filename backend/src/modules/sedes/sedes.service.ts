import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SedesService {
  constructor(private readonly prisma: PrismaService) {}

  list(empresaId: string, clienteId?: string) {
    return this.prisma.sede.findMany({
      where: { empresaId, ...(clienteId ? { clienteId } : {}) },
      include: { cliente: { select: { id: true, razonSocial: true, numero: true } } },
      orderBy: { nombre: 'asc' },
      take: 200,
    });
  }

  async findOne(empresaId: string, id: string) {
    const s = await this.prisma.sede.findFirst({
      where: { id, empresaId },
      include: { cliente: true, planos: true, puntosControl: true, zonas: true },
    });
    if (!s) throw new NotFoundException('Sede no encontrada');
    return s;
  }

  create(empresaId: string, data: any) {
    return this.prisma.sede.create({ data: { ...data, empresaId } });
  }

  async update(empresaId: string, id: string, data: any) {
    await this.findOne(empresaId, id);
    return this.prisma.sede.update({ where: { id }, data });
  }

  // Buscar sedes cercanas a un punto (haversine)
  async nearby(empresaId: string, lat: number, lng: number, radioKm = 20) {
    const sedes = await this.prisma.sede.findMany({
      where: { empresaId, lat: { not: null }, lng: { not: null } },
    });
    return sedes
      .map((s) => ({
        ...s,
        distanciaKm: haversine(lat, lng, s.lat!, s.lng!),
      }))
      .filter((s) => s.distanciaKm <= radioKm)
      .sort((a, b) => a.distanciaKm - b.distanciaKm)
      .slice(0, 50);
  }
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
