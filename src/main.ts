import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { getAllowedOrigins } from './config/cors.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.set('trust proxy', 1);
  app.enableShutdownHooks();
  app.setGlobalPrefix('api', {
    exclude: [{ path: '', method: RequestMethod.GET }],
  });
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-Requested-With', 'Cookie'],
  });
  app.useStaticAssets('public');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  if (configService.get<string>('ENABLE_SWAGGER') === 'true' || process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Africa By Road API')
      .setDescription('Backend API for Africa By Road - Road trip community platform')
      .setVersion('1.0.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearerAuth')
      .addCookieAuth('token', { type: 'apiKey', in: 'cookie' }, 'cookieAuth')
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api-docs', app, swaggerDocument, { jsonDocumentUrl: 'api-docs.json' });

    // Write static swagger JSON to project root
    try {
      const swaggerPath = path.join(process.cwd(), 'swagger.json');
      fs.writeFileSync(swaggerPath, JSON.stringify(swaggerDocument, null, 2));
      logger.log(`Swagger specification written to ${swaggerPath}`);
    } catch (err) {
      logger.warn(`Failed to write swagger.json: ${(err as Error).message}`);
    }
  }

  await app.init();

  // Registered after app.init() so Nest's own controllers/routes are matched first;
  // this only catches requests nothing else handled, mirroring the old notFoundHandler.
  app.use((req: Request, res: Response) => {
    res.status(404).json({ message: `Route ${req.originalUrl} not found` });
  });

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Server running on port ${port}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
