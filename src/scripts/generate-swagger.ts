import { MongoMemoryServer } from 'mongodb-memory-server';

async function generate() {
  console.log('Starting in-memory MongoDB server...');
  const mongod = await MongoMemoryServer.create();
  
  // Set required environment variables before importing modules
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_TEST_URI = mongod.getUri();
  process.env.JWT_SECRET = 'temporary-secret-for-swagger-generation';

  // Dynamic imports to ensure env variables are loaded first
  const { AppModule } = await import('../app.module');
  const { NestFactory } = await import('@nestjs/core');
  const { DocumentBuilder, SwaggerModule } = await import('@nestjs/swagger');
  const fs = await import('fs');
  const path = await import('path');

  console.log('Bootstrapping NestJS application...');
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');

  console.log('Generating Swagger document...');
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Africa By Road API')
    .setDescription('Backend API for Africa By Road - Road trip community platform')
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearerAuth')
    .addCookieAuth('token', { type: 'apiKey', in: 'cookie' }, 'cookieAuth')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  const swaggerPath = path.join(process.cwd(), 'swagger.json');
  fs.writeFileSync(swaggerPath, JSON.stringify(swaggerDocument, null, 2));

  console.log('Cleaning up...');
  await app.close();
  await mongod.stop();
  console.log(`Swagger spec generated successfully at ${swaggerPath}`);
  process.exit(0);
}

generate().catch((err) => {
  console.error('Swagger generation failed:', err);
  process.exit(1);
});
