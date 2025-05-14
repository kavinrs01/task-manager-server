import { registerAs } from '@nestjs/config';

export const JwtConfig = registerAs('jwtconfig', () => ({
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN,
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
  jwtSecret: process.env.JWT_SECRET,
}));
