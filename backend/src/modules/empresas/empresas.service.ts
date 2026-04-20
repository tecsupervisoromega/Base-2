import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EmpresasService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.empresa.findMany({ orderBy: { nombre: 'asc' } });
  }

  findById(id: string) {
    return this.prisma.empresa.findUnique({ where: { id } });
  }
}
