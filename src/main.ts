import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { Settings } from 'luxon';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
async function bootstrap() {
  Settings.defaultZone = 'Asia/Kolkata';
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: (_, callback) => {
      callback(null, true);
    },
    methods: 'GET, POST, PUT, DELETE, OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
    credentials: true,
  });
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips unknown properties
      forbidNonWhitelisted: true, // throws an error for unknown properties
      transform: true, // transforms input to the correct type (e.g. string to number/date)
    }),
  );
  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(`🚀 Application is running on: http://localhost:${port}`);
}
bootstrap();
