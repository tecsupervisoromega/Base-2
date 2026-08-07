import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EmpleadosService } from './empleados.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('empleados')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('empleados')
export class EmpleadosController {
  constructor(private readonly empleados: EmpleadosService) {}

  @Get()
  list(
    @CurrentUser() u: AuthUser,
    @Query('tecnicos') tecnicos?: string,
  ) {
    return this.empleados.list(u.empresaId, tecnicos === 'true');
  }
}
