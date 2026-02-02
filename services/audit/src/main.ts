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

  // Enable CORS - use environment variable for consistency across services
  const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'];
  if (!process.env.CORS_ORIGINS && process.env.NODE_ENV === 'production') {
    logger.warn('CORS_ORIGINS not set - using localhost defaults. Configure CORS_ORIGINS for production.');
  }
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('GigaChad GRC - Audit API')
    .setDescription('API for managing internal and external compliance audits')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3007;
  await app.listen(port);
  logger.log(`Audit service running on port ${port}`);
}
bootstrap();
