import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';

// Legacy local-disk dir (still served statically at /uploads for old files).
export const UPLOAD_DIR = join(process.cwd(), 'uploads');

/**
 * Storage abstraction. If S3-compatible env is configured (Cloudflare R2, AWS S3,
 * Backblaze B2, Supabase Storage), files go to that bucket and a public URL is
 * returned. Otherwise files fall back to the local disk (dev / no-config).
 *
 * Returned value:
 *  - S3:   absolute URL (https://…/key) — used as-is by the frontend.
 *  - local: "/uploads/key" — relative, served by the API and proxied by web.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger('StorageService');
  private readonly bucket = process.env.S3_BUCKET;
  private readonly publicUrl = process.env.S3_PUBLIC_URL?.replace(/\/$/, '');
  private readonly client = this.makeClient();

  constructor(private readonly prisma: PrismaService) {}

  isRemote(): boolean {
    return Boolean(this.client && this.bucket && this.publicUrl);
  }

  private makeClient(): S3Client | null {
    if (!process.env.S3_ENDPOINT || !process.env.S3_ACCESS_KEY_ID) return null;
    return new S3Client({
      region: process.env.S3_REGION ?? 'auto', // R2 uses "auto"
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
      },
      forcePathStyle: true,
    });
  }

  async save(buffer: Buffer, originalName: string, mime: string): Promise<string> {
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    if (this.isRemote()) {
      try {
        await this.client!.send(
          new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: buffer, ContentType: mime }),
        );
        return `${this.publicUrl}/${key}`;
      } catch (err) {
        // Don't 500 if the bucket/credentials are misconfigured — log the real
        // reason and fall back to the persistent DB store so uploads keep working.
        const e = err as { name?: string; message?: string };
        this.logger.error(
          `S3 upload failed (${e?.name ?? 'Error'}: ${e?.message ?? err}) — falling back to DB store. ` +
            `Check S3_ENDPOINT/S3_REGION (Supabase needs the real project region, not "auto"), ` +
            `S3_BUCKET, keys and that the bucket is public.`,
        );
      }
    }

    // Persistent fallback: store the bytes in the database (survives restarts on
    // the free tier, unlike the ephemeral container disk). Served via GET /api/uploads/:id.
    const row = await this.prisma.upload.create({
      data: { mime, data: buffer, size: buffer.length },
    });
    return `/api/uploads/${row.id}`;
  }

  /** Fetch a DB-stored upload for serving. */
  async getUpload(id: string): Promise<{ mime: string; data: Buffer } | null> {
    const row = await this.prisma.upload.findUnique({ where: { id } });
    return row ? { mime: row.mime, data: Buffer.from(row.data) } : null;
  }
}
