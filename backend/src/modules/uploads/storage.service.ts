import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { extname, join } from 'path';

// Where local-disk files live (also served statically at /uploads, see main.ts).
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
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extname(originalName).toLowerCase()}`;

    if (this.isRemote()) {
      try {
        await this.client!.send(
          new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: buffer, ContentType: mime }),
        );
        return `${this.publicUrl}/${key}`;
      } catch (err) {
        // Don't 500 the whole upload if the bucket/credentials are misconfigured
        // — log the real reason and fall back to local disk so the feature works.
        const e = err as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } };
        this.logger.error(
          `S3 upload failed (${e?.name ?? 'Error'}: ${e?.message ?? err}) — falling back to local disk. ` +
            `Check S3_ENDPOINT/S3_REGION (Supabase needs the real project region, not "auto"), ` +
            `S3_BUCKET, keys and that the bucket is public.`,
        );
      }
    }

    // Local fallback (also the dev / no-S3 path). Ephemeral on Render free tier.
    if (!existsSync(UPLOAD_DIR)) await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(join(UPLOAD_DIR, key), buffer);
    if (!this.isRemote() && !this.warned) {
      this.logger.warn('S3 not configured — using local disk (ephemeral on Render free).');
      this.warned = true;
    }
    return `/uploads/${key}`;
  }
  private warned = false;
}
