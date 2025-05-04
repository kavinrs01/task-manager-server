import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtConfig } from './jwt.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [JwtConfig],
      isGlobal: true,
      cache: true,
    }),
  ],
})
export class AppConfigModule {}
