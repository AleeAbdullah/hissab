import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { HttpExceptionFilter } from '../common/http/http-exception.filter';
import { EnvironmentVariables } from '../config/environment';

export function configureApp(
  app: NestExpressApplication,
  configService: ConfigService<EnvironmentVariables, true>,
): void {
  app.enableShutdownHooks();
  app.use(helmet());
  app.setGlobalPrefix('v1', {
    exclude: [
      { path: 'health/live', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
    ],
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );

  if (configService.getOrThrow('SWAGGER_ENABLED')) {
    const openApiConfig = new DocumentBuilder()
      .setTitle('Hissab API')
      .setDescription(
        'REST API for Hissab shared expenses and personal finance tracking.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const openApiDocument = SwaggerModule.createDocument(app, openApiConfig, {
      operationIdFactory: (controllerKey, methodKey) =>
        `${controllerKey.replace(/Controller$/, '')}_${methodKey}`,
    });

    SwaggerModule.setup('docs', app, openApiDocument, {
      jsonDocumentUrl: 'docs/openapi.json',
    });
  }
}
