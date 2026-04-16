import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { EmpresasModule } from './modules/empresas/empresas.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { SedesModule } from './modules/sedes/sedes.module';
import { PuntosControlModule } from './modules/puntos-control/puntos-control.module';
import { OrdenesTrabajoModule } from './modules/ordenes-trabajo/ordenes-trabajo.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    EmpresasModule,
    ClientesModule,
    SedesModule,
    PuntosControlModule,
    OrdenesTrabajoModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
