import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('storage')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  // El cliente (PWA / web) pide una URL prefirmada y sube el archivo directo a MinIO
  @Post('presign')
  async presign(
    @CurrentUser() u: AuthUser,
    @Body() body: { prefix?: string; filename: string; contentType: string },
  ) {
    const prefix = `empresas/${u.empresaId}/${body.prefix ?? 'uploads'}`;
    return this.storage.presignUpload(prefix, body.filename, body.contentType);
  }

  // Subida de firma en dataURL base64 desde la PWA
  @Post('firma')
  async firma(
    @CurrentUser() u: AuthUser,
    @Body() body: { dataUrl: string; odtId: string },
  ) {
    const match = /^data:(image\/[a-z]+);base64,(.+)$/i.exec(body.dataUrl ?? '');
    if (!match) {
      return { error: 'dataUrl invalido' };
    }
    const [, contentType, b64] = match;
    const buffer = Buffer.from(b64, 'base64');
    const ext = contentType.split('/')[1] ?? 'png';
    const prefix = `empresas/${u.empresaId}/firmas`;
    const { publicUrl } = await this.storage.putBuffer(
      prefix,
      `firma-${body.odtId}.${ext}`,
      buffer,
      contentType,
    );
    return { url: publicUrl };
  }
}
