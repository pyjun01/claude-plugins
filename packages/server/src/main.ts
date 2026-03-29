import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => {
        const constraints = errors[0]?.constraints ?? {};
        const message =
          constraints.isString ??
          constraints.isNotEmpty ??
          Object.values(constraints)[0] ??
          'Validation failed';
        return new BadRequestException(message);
      },
    }),
  );
  await app.listen(3001);
  console.log('Server running on http://localhost:3001');
}
bootstrap();
