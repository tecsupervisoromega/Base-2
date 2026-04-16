import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClientesService } from './clientes.service';
import { CreateClienteDto, UpdateClienteDto } from './clientes.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('clientes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientes: ClientesService) {}

  @Get()
  list(@CurrentUser() u: AuthUser, @Query('q') q?: string) {
    return this.clientes.list(u.empresaId, q);
  }

  @Get(':id')
  get(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.clientes.findOne(u.empresaId, id);
  }

  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateClienteDto) {
    return this.clientes.create(u.empresaId, dto);
  }

  @Patch(':id')
  update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateClienteDto) {
    return this.clientes.update(u.empresaId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.clientes.remove(u.empresaId, id);
  }
}
