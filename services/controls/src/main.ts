import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from '@gigachad-grc/shared';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn', 'log']
        : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Security middleware with CSP for API services
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      // Prevent clickjacking
      frameguard: { action: 'deny' },
      // Prevent MIME type sniffing
      noSniff: true,
      // Prevent XSS attacks
      xssFilter: true,
    })
  );

  // Response compression
  app.use(compression());

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      // Reject requests with non-whitelisted properties to prevent mass assignment attacks
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // CORS - fail fast in production if not configured
  const corsOrigins = process.env.CORS_ORIGINS?.split(',');
  if (!corsOrigins && process.env.NODE_ENV === 'production') {
    logger.error('CORS_ORIGINS environment variable is required in production');
    process.exit(1);
  }
  app.enableCors({
    origin: corsOrigins || [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-user-id',
      'x-organization-id',
      'x-request-id',
    ],
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('GigaChad GRC - Controls API')
    .setDescription('Controls Management and Evidence Library API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('controls')
    .addTag('implementations')
    .addTag('evidence')
    .addTag('dashboard')
    .addTag('health')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`Controls service running on port ${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/api/docs`);
  logger.log(`Health check available at http://localhost:${port}/health`);
}

bootstrap();
