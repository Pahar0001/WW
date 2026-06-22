import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { UPLOAD_DIR } from './modules/uploads/uploads.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  // Serve uploaded images at /uploads (outside the /api prefix).
  app.useStaticAssets(UPLOAD_DIR, { prefix: '/uploads/' });
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
    credentials: true,
  });
  // Request validation is handled per-controller with zod (see modules); no
  // class-validator dependency required.
  // PORT is the convention used by Render/Railway/Heroku; fall back to API_PORT.
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`Vela API listening on http://localhost:${port}/api`);
}
bootstrap();
