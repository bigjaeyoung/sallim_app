import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { cors: true });
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  console.warn(`[sallim-api] listening on http://localhost:${port}`);
}

bootstrap().catch((err: unknown) => {
  console.error('[sallim-api] failed to start', err);
  process.exit(1);
});
