import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrdenesTrabajoService {
  constructor(private readonly prisma: PrismaService) {}

  list(empresaId: string, filtros: { estado?: string; tecnicoId?: string; fecha?: string }) {
    return this.prisma.ordenTrabajo.findMany({
      where: {
        empresaId,
        ...(filtros.estado ? { estado: filtros.estado as any } : {}),
        ...(filtros.tecnicoId
          ? { empleados: { some: { empleadoId: filtros.tecnicoId } } }
          : {}),
        ...(filtros.fecha ? { fechaBloqueo: new Date(filtros.fecha) } : {}),
      },
      include: {
        cliente: { select: { id: true, razonSocial: true } },
        sede: { select: { id: true, nombre: true, direccion: true, lat: true, lng: true } },
        empleados: { include: { empleado: { select: { id: true, nombre: true } } } },
      },
      orderBy: [{ fechaBloqueo: 'desc' }, { numero: 'desc' }],
      take: 200,
    });
  }

  async findOne(empresaId: string, id: string) {
    const odt = await this.prisma.ordenTrabajo.findFirst({
      where: { id, empresaId },
      include: {
        cliente: true,
        sede: true,
        contrato: true,
        lineaNegocio: true,
        empleados: { include: { empleado: true } },
        puntosControl: { include: { puntoControl: { include: { tipo: true } } } },
        operaciones: { include: { tipoOperacion: true } },
        tratamientos: true,
        diagnosis: true,
      },
    });
    if (!odt) throw new NotFoundException('OT no encontrada');
    return odt;
  }

  create(empresaId: string, data: any) {
    return this.prisma.ordenTrabajo.create({
      data: {
        ...data,
        empresaId,
        estado: data.estado ?? 'creada',
      },
    });
  }

  async asignar(empresaId: string, id: string, empleadoIds: string[]) {
    await this.prisma.ordenTrabajoEmpleado.deleteMany({ where: { odtId: id } });
    await this.prisma.ordenTrabajoEmpleado.createMany({
      data: empleadoIds.map((empId, idx) => ({
        odtId: id,
        empleadoId: empId,
        esPrincipal: idx === 0,
      })),
    });
    return this.prisma.ordenTrabajo.update({
      where: { id },
      data: { estadoAsignacion: 'asignada', estado: 'asignada' },
    });
  }

  iniciar(empresaId: string, id: string) {
    return this.prisma.ordenTrabajo.update({
      where: { id },
      data: { estado: 'en_curso', horaInicioReal: new Date() },
    });
  }

  async cerrar(
    empresaId: string,
    id: string,
    data: { personaFirmante?: string; dniFirmante?: string; firmaUrl?: string; lat?: number; lng?: number; notaPublica?: string },
  ) {
    return this.prisma.ordenTrabajo.update({
      where: { id },
      data: {
        estado: 'finalizada',
        horaFinReal: new Date(),
        horaCierre: new Date(),
        personaFirmante: data.personaFirmante,
        dniFirmante: data.dniFirmante,
        firmaUrl: data.firmaUrl,
        latCierre: data.lat,
        lngCierre: data.lng,
        notaPublica: data.notaPublica,
      },
    });
  }

  // Vista "mi dia" del tecnico
  misOdts(empresaId: string, empleadoId: string, fecha: string) {
    const date = new Date(fecha);
    const finDia = new Date(date);
    finDia.setDate(finDia.getDate() + 1);
    return this.prisma.ordenTrabajo.findMany({
      where: {
        empresaId,
        empleados: { some: { empleadoId } },
        fechaBloqueo: { gte: date, lt: finDia },
      },
      include: {
        cliente: { select: { razonSocial: true, telefono: true } },
        sede: { select: { nombre: true, direccion: true, lat: true, lng: true } },
      },
      orderBy: { horaInicioBloqueo: 'asc' },
    });
  }
}
