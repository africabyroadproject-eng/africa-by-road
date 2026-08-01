import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';
import { basename } from 'path';
import { randomUUID } from 'crypto';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf']);

function hasValidSignature(file: Express.Multer.File): boolean {
  const bytes = file.buffer;
  if (file.mimetype === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.mimetype === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (file.mimetype === 'application/pdf') return bytes.subarray(0, 5).toString('ascii') === '%PDF-';
  return false;
}
export interface StoredDocument {
  name: string;
  storageKey: string;
  resourceType: string;
  format: string;
  bytes: number;
  uploadedAt: Date;
}

@Injectable()
export class DocumentStorageService {
  private readonly configured: boolean;

  constructor(configService: ConfigService) {
    const cloudName = configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = configService.get<string>('CLOUDINARY_API_SECRET');
    this.configured = Boolean(cloudName && apiKey && apiSecret);
    if (this.configured) cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  }

  async upload(file: Express.Multer.File, touristId: string, documentType: string): Promise<StoredDocument> {
    if (!this.configured) throw new ServiceUnavailableException('Document storage is not configured');
    if (!ALLOWED_TYPES.has(file.mimetype) || !hasValidSignature(file)) {
      throw new BadRequestException('Only valid JPEG, PNG, and PDF documents are allowed');
    }

    const cleanName = basename(file.originalname).replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 200);
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          type: 'authenticated',
          folder: `africa-by-road/documents/${touristId}`,
          public_id: `${documentType}-${randomUUID()}`,
          use_filename: false,
        },
        (error, uploadResult) => {
          if (error || !uploadResult) reject(error || new Error('Document upload failed'));
          else resolve(uploadResult);
        },
      );
      stream.end(file.buffer);
    });

    return {
      name: cleanName,
      storageKey: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
      bytes: result.bytes,
      uploadedAt: new Date(),
    };
  }
}
