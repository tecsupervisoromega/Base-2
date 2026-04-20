import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClienteDto, UpdateClienteDto } from './clientes.dto';

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  list(empresaId: string, q?: string) {
    return this.prisma.cliente.findMany({
      where: {
        empresaId,
        ...(q
          ? {
              OR: [
                { razonSocial: { contains: q, mode: 'insensitive' } },
                { numero: { contains: q, mode: 'insensitive' } },
                { cuit: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { razonSocial: 'asc' },
      take: 100,
    });
  }

  async findOne(empresaId: string, id: string) {
    const c = await this.prisma.cliente.findFirst({
      where: { id, empresaId },
      include: { sedes: true },
    });
    if (!c) throw new NotFoundException('Cliente no encontrado');
    return c;
  }

  create(empresaId: string, dto: CreateClienteDto) {
    return this.prisma.cliente.create({
      data: { ...dto, empresaId },
    });
  }

  async update(empresaId: string, id: string, dto: UpdateClienteDto) {
    await this.findOne(empresaId, id);
    return this.prisma.cliente.update({ where: { id }, data: dto });
  }

  async remove(empresaId: string, id: string) {
    await this.findOne(empresaId, id);
    return this.prisma.cliente.delete({ where: { id } });
  }
}
