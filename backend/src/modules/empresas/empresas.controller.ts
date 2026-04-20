import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EmpresasService } from './empresas.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('empresas')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('empresas')
export class EmpresasController {
  constructor(private readonly empresas: EmpresasService) {}

  @Get('me')
  findMine(@CurrentUser() user: AuthUser) {
    return this.empresas.findById(user.empresaId);
  }
}
