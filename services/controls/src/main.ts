import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      // Don't forbid non-whitelisted properties - needed for multipart file uploads
      forbidNonWhitelisted: false,
    }),
  );

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
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
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`Controls service running on port ${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap();

