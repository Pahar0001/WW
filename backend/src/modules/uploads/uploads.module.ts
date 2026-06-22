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
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/auth.guards';
import { StorageService, UPLOAD_DIR } from './storage.service';

export { UPLOAD_DIR };

// Images (gallery/hero) + PDFs (tickets/documents for Phase 1).
const ALLOWED = /^(image\/(png|jpe?g|webp|gif|avif)|application\/pdf)$/;

interface UploadedBuffer {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

@Controller('uploads')
class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB (covers PDFs)
      fileFilter: (_req, file, cb) => cb(null, ALLOWED.test(file.mimetype)),
    }),
  )
  async upload(@UploadedFile() file: UploadedBuffer | undefined) {
    if (!file?.buffer) {
      throw new BadRequestException('Файл не получен или тип не поддерживается (изображение или PDF).');
    }
    const path = await this.storage.save(file.buffer, file.originalname, file.mimetype);
    return { path };
  }
}

@Module({ controllers: [UploadsController], providers: [StorageService], exports: [StorageService] })
export class UploadsModule {}
