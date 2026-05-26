import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);

  app.use(cookieParser());

  await app.listen(process.env.PORT ?? 4000);
  console.log('connect success with port 4000');
}
bootstrap();
