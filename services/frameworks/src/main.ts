import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Security middleware with CSP for API services
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      frameguard: { action: 'deny' },
      noSniff: true,
      xssFilter: true,
    })
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  // CORS - fail fast in production if not configured
  const corsOrigins = process.env.CORS_ORIGINS?.split(',');
  if (!corsOrigins && process.env.NODE_ENV === 'production') {
    logger.error('CORS_ORIGINS environment variable is required in production');
    process.exit(1);
  }
  app.enableCors({
    origin: corsOrigins || ['http://localhost:3000'],
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('GigaChad GRC - Frameworks API')
    .setDescription('Framework Readiness and Gap Analysis API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('frameworks')
    .addTag('assessments')
    .addTag('mappings')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3002;
  await app.listen(port);

  logger.log(`Frameworks service running on port ${port}`);
}

bootstrap();
