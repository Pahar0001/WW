import {
  BadRequestException,
  Controller,
  Module,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/auth.guards';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';

// Where uploaded images are stored. Served statically at /uploads (see main.ts).
// In Docker this path is backed by a named volume so images persist.
export const UPLOAD_DIR = join(process.cwd(), 'uploads');
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

const IMAGE_MIME = /^image\/(png|jpe?g|webp|gif|avif)$/;

@Controller('uploads')
class UploadsController {
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => {
          const safe = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
          cb(null, safe + extname(file.originalname).toLowerCase());
        },
      }),
      limits: { fileSize: 6 * 1024 * 1024 }, // 6 MB
      fileFilter: (_req, file, cb) => {
        cb(null, IMAGE_MIME.test(file.mimetype));
      },
    }),
  )
  // `file` typed loosely to avoid pulling @types/multer.
  upload(@UploadedFile() file: { filename?: string } | undefined) {
    if (!file?.filename) {
      throw new BadRequestException('Файл не получен или это не изображение.');
    }
    // Return a path; the frontend prefixes it with the API origin.
    return { path: `/uploads/${file.filename}` };
  }
}

@Module({ controllers: [UploadsController] })
export class UploadsModule {}
