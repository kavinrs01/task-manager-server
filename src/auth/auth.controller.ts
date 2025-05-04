import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Public } from '../decorators/public.decorator';
import { AuthService } from './auth.service';
import { CurrentUser } from '../decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  async register(
    @Body() body: { name: string; email: string; password: string },
  ) {
    const { name, email, password } = body;
    return await this.authService.register(name, email, password);
  }

  @Post('login')
  @Public()
  async login(@Body() body: { email: string; password: string }) {
    const { email, password } = body;
    return await this.authService.login(email, password);
  }

  @Post('refresh')
  @Public()
  async refreshTokens(@Body() body: { refreshToken: string }) {
    return await this.authService.refreshTokens(body.refreshToken);
  }

  @Get('me')
  async getMe(@CurrentUser() user: any) {
    return this.authService.getMe(user.id);
  }
}
