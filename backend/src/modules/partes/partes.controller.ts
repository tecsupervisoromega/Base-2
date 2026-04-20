import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PartesService } from './partes.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('partes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('ordenes-trabajo')
export class PartesController {
  constructor(private readonly partes: PartesService) {}

  @Get(':id/parte.pdf')
  async partePdf(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.partes.generarParteOdt(u.empresaId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="parte-${id}.pdf"`);
    res.send(buffer);
  }
}
