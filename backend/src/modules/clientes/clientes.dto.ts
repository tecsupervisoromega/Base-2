import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

const TIPOS = ['empresa', 'particular', 'gobierno'] as const;
const ESTADOS = ['activo', 'inactivo', 'potencial'] as const;

export class CreateClienteDto {
  @IsString() @IsNotEmpty() numero!: string;
  @IsString() @IsNotEmpty() razonSocial!: string;
  @IsString() @IsOptional() nombreFantasia?: string;
  @IsEnum(TIPOS) @IsOptional() tipo?: (typeof TIPOS)[number];
  @IsString() @IsOptional() cuit?: string;
  @IsString() @IsOptional() dni?: string;
  @IsString() @IsOptional() email?: string;
  @IsString() @IsOptional() telefono?: string;
  @IsString() @IsOptional() movil?: string;
  @IsString() @IsOptional() direccion?: string;
  @IsString() @IsOptional() localidad?: string;
  @IsString() @IsOptional() provincia?: string;
  @IsString() @IsOptional() codigoPostal?: string;
  @IsString() @IsOptional() observaciones?: string;
  @IsEnum(ESTADOS) @IsOptional() estado?: (typeof ESTADOS)[number];
}

export class UpdateClienteDto extends CreateClienteDto {
  @IsString() @IsOptional() declare numero: string;
  @IsString() @IsOptional() declare razonSocial: string;
}
