import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { configureApp } from './bootstrap/configure-app';
import { EnvironmentVariables } from './config/environment';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService<EnvironmentVariables, true>);

  configureApp(app, configService);

  await app.listen(configService.getOrThrow<number>('PORT'));
}
void bootstrap();
