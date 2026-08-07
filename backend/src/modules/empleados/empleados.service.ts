import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EmpleadosService {
  constructor(private readonly prisma: PrismaService) {}

  list(empresaId: string, soloTecnicos?: boolean) {
    return this.prisma.empleado.findMany({
      where: {
        empresaId,
        activo: true,
        ...(soloTecnicos ? { esTecnico: true } : {}),
      },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        email: true,
        telefono: true,
        esTecnico: true,
        esDirectorTecnico: true,
        cargo: true,
        color: true,
        carnePlagasNumero: true,
        carnePlagasTipo: true,
        carnePlagasVencimiento: true,
      },
      orderBy: [{ apellidos: 'asc' }, { nombre: 'asc' }],
    });
  }
}
