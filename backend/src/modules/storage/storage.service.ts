import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Client as MinioClient } from 'minio';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client!: MinioClient;
  private bucket!: string;
  private publicEndpoint!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT', 'http://localhost:9000');
    const url = new URL(endpoint);
    this.publicEndpoint = endpoint.replace(/\/$/, '');
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'base2');

    this.client = new MinioClient({
      endPoint: url.hostname,
      port: Number(url.port || (url.protocol === 'https:' ? 443 : 80)),
      useSSL: url.protocol === 'https:',
      accessKey: this.config.get<string>('MINIO_ROOT_USER', 'base2'),
      secretKey: this.config.get<string>('MINIO_ROOT_PASSWORD', 'base2_dev_minio'),
    });
  }

  // URL prefirmada para que el cliente suba un archivo directo a MinIO
  async presignUpload(prefix: string, filename: string, contentType: string) {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${prefix}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${safeName}`;
    const uploadUrl = await this.client.presignedPutObject(this.bucket, key, 60 * 5);
    const publicUrl = `${this.publicEndpoint}/${this.bucket}/${key}`;
    return { key, uploadUrl, publicUrl, contentType };
  }

  // URL prefirmada de descarga (por si el bucket no es publico)
  async presignDownload(key: string, expiresSec = 3600) {
    return this.client.presignedGetObject(this.bucket, key, expiresSec);
  }

  // Subida directa desde el servidor (para firmas en base64 por ejemplo)
  async putBuffer(prefix: string, filename: string, buffer: Buffer, contentType: string) {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${prefix}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${safeName}`;
    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': contentType,
    });
    return {
      key,
      publicUrl: `${this.publicEndpoint}/${this.bucket}/${key}`,
    };
  }
}
