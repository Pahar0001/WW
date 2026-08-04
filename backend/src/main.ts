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

  // За балансировщиком Render ровно один прокси. Без этого `req.ip` — адрес
  // прокси (все клиенты слипаются в один счётчик ограничителя частоты), а с
  // разбором `X-Forwarded-For` вручную адрес подделывается клиентом.
  app.set('trust proxy', 1);

  // CORS. Прежняя настройка `origin: '*'` вместе с `credentials: true` не
  // работала вовсе: браузер отвергает звёздочку в ответе на запрос с
  // учётными данными — то есть межсайтовые запросы с авторизацией не проходили,
  // а выглядело это как «CORS открыт всем».
  //
  // Браузеру CORS здесь и не нужен: страница всегда обращается к своему origin,
  // а Next-сервер форвардит запрос на API (см. frontend/src/lib/proxy.ts).
  // Поэтому по умолчанию отключаем межсайтовые запросы совсем и включаем их
  // только явным списком адресов в CORS_ORIGIN.
  const corsOrigins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
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
