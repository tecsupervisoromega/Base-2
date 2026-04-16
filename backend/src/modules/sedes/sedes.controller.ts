import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SedesService } from './sedes.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('sedes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('sedes')
export class SedesController {
  constructor(private readonly sedes: SedesService) {}

  @Get()
  list(@CurrentUser() u: AuthUser, @Query('clienteId') clienteId?: string) {
    return this.sedes.list(u.empresaId, clienteId);
  }

  @Get('nearby')
  nearby(
    @CurrentUser() u: AuthUser,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radio') radio?: string,
  ) {
    return this.sedes.nearby(u.empresaId, Number(lat), Number(lng), radio ? Number(radio) : 20);
  }

  @Get(':id')
  get(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.sedes.findOne(u.empresaId, id);
  }

  @Post()
  create(@CurrentUser() u: AuthUser, @Body() body: any) {
    return this.sedes.create(u.empresaId, body);
  }

  @Patch(':id')
  update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() body: any) {
    return this.sedes.update(u.empresaId, id, body);
  }
}
