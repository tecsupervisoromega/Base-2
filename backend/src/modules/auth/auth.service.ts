import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(empresaCuit: string, username: string, password: string) {
    const empresa = await this.prisma.empresa.findUnique({ where: { cuit: empresaCuit } });
    if (!empresa) throw new UnauthorizedException('Empresa no encontrada');

    const usuario = await this.prisma.usuario.findFirst({
      where: {
        empresaId: empresa.id,
        OR: [{ username }, { email: username }],
        estado: 'activo',
      },
    });
    if (!usuario) throw new UnauthorizedException('Credenciales invalidas');

    const ok = await bcrypt.compare(password, usuario.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciales invalidas');

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimaConexion: new Date() },
    });

    const payload = {
      sub: usuario.id,
      empresaId: usuario.empresaId,
      tipo: usuario.tipo,
      empleadoId: usuario.empleadoId,
    };
    const token = await this.jwt.signAsync(payload);
    return {
      accessToken: token,
      user: {
        id: usuario.id,
        username: usuario.username,
        email: usuario.email,
        tipo: usuario.tipo,
        empresaId: usuario.empresaId,
        empleadoId: usuario.empleadoId,
      },
      empresa: { id: empresa.id, nombre: empresa.nombre, cuit: empresa.cuit },
    };
  }

  async hashPassword(plain: string) {
    return bcrypt.hash(plain, 10);
  }
}
