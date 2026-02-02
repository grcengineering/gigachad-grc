import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // SECURITY: Add Helmet for security headers
  app.use(helmet({
    contentSecurityPolicy: false, // Disable for API service
  }));

  // Enable CORS - use CORS_ORIGINS (plural) for consistency across services
  const corsOrigins = process.env.CORS_ORIGINS?.split(',') || process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:3000'];
  if (!process.env.CORS_ORIGINS && process.env.NODE_ENV === 'production') {
    logger.warn('CORS_ORIGINS not set - using localhost defaults. Configure CORS_ORIGINS for production.');
  }
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('TPRM Service API')
    .setDescription('Third Party Risk Management API')
    .setVersion('1.0')
    .addTag('vendors')
    .addTag('assessments')
    .addTag('contracts')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3005;
  await app.listen(port);
  logger.log(`TPRM service running on port ${port}`);
}

bootstrap();
