import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() body: { name: string; email: string; password: string },
  ) {
    const { name, email, password } = body;
    return await this.authService.register(name, email, password);
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const { email, password } = body;
    return await this.authService.login(email, password);
  }

  @Post('refresh')
  async refreshTokens(@Body() body: { refreshToken: string }) {
    return await this.authService.refreshTokens(body.refreshToken);
  }
}
